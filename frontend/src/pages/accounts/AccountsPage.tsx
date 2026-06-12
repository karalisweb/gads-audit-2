import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Building2,
  Plus,
  Copy,
  Check,
  DollarSign,
  Target,
  Activity,
  Megaphone,
  ClipboardList,
  Lightbulb,
  ArrowRight,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import {
  getAccountsWithStats,
  getPeriodMetricsAll,
  updateAccountSchedule,
  updateAccountStrategy,
  type AccountWithStats,
  type PeriodMetricsResponse,
  type UpdateAccountScheduleDto,
  type UpdateAccountStrategyDto,
} from '@/api/audit';
import {
  getPendingSummary,
  getNextAnalysis,
  type PendingSummary,
  type NextAnalysisInfo,
} from '@/api/modifications';
import { PeriodSelector, getDefaultPeriod, type PeriodSelection } from '@/components/period/PeriodSelector';
import { formatCurrency, formatNumber } from '@/lib/format';
import { AccountCard } from '@/components/AccountCard';

// Badge variazione percentuale periodo (inverted = per metriche dove "meno e' meglio")
function PeriodChangeBadge({ value, inverted = false }: { value: number | undefined; inverted?: boolean }) {
  if (!value || value === 0) return null;
  const isPositive = inverted ? value < 0 : value > 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

interface CreatedAccount {
  id: string;
  customerId: string;
  customerName: string;
  sharedSecret: string;
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Centro-azioni + KPI aggregati (ex-Dashboard)
  const [pendingSummary, setPendingSummary] = useState<PendingSummary | null>(null);
  const [nextAnalysis, setNextAnalysis] = useState<NextAnalysisInfo | null>(null);
  const [period, setPeriod] = useState<PeriodSelection>(getDefaultPeriod(7));
  const [periodMetrics, setPeriodMetrics] = useState<PeriodMetricsResponse | null>(null);

  // Form state for adding new account
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Success state - shows the secret after creation
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Reveal secret state
  const [revealDialogOpen, setRevealDialogOpen] = useState(false);
  const [revealAccountId, setRevealAccountId] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revealError, setRevealError] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
  const [copiedRevealedSecret, setCopiedRevealedSecret] = useState(false);

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<AccountWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const [data, pendingData, analysisData] = await Promise.all([
        getAccountsWithStats(),
        getPendingSummary().catch(() => null),
        getNextAnalysis().catch(() => null),
      ]);
      setAccounts(data || []);
      setPendingSummary(pendingData);
      setNextAnalysis(analysisData);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Metriche di periodo (ricaricate al cambio periodo)
  const loadPeriodMetrics = useCallback(async (p: PeriodSelection) => {
    try {
      const data = await getPeriodMetricsAll(p.dateFrom, p.dateTo, p.compare);
      setPeriodMetrics(data);
    } catch {
      setPeriodMetrics(null);
    }
  }, []);

  useEffect(() => {
    loadPeriodMetrics(period);
  }, [period, loadPeriodMetrics]);

  // "Da fare oggi": account con modifiche concrete fresche (alto impatto),
  // ordinati per urgenza. Le modifiche vengono prima delle raccomandazioni.
  const modificationAccounts = useMemo(
    () =>
      (pendingSummary?.byAccount || [])
        .filter((a) => a.modificationsCount > 0)
        .sort(
          (x, y) =>
            y.highPriorityModifications - x.highPriorityModifications ||
            y.modificationsCount - x.modificationsCount,
        ),
    [pendingSummary],
  );

  // Raccomandazioni advisory/manuali: blocco secondario, meno prominente
  const recommendationAccounts = useMemo(
    () =>
      (pendingSummary?.byAccount || [])
        .filter((a) => a.recommendationsCount > 0)
        .sort((x, y) => y.recommendationsCount - x.recommendationsCount),
    [pendingSummary],
  );

  // KPI aggregati (spesa, conversioni, campagne, health medio)
  const summary = useMemo(() => {
    const accountsWithStats = accounts.filter((a) => a.stats);
    if (accountsWithStats.length === 0) return null;

    const totalCost = accountsWithStats.reduce((sum, a) => sum + (a.stats?.cost || 0), 0);
    const totalConversions = accountsWithStats.reduce((sum, a) => sum + (a.stats?.conversions || 0), 0);
    const totalActiveCampaigns = accountsWithStats.reduce((sum, a) => sum + (a.stats?.activeCampaigns || 0), 0);
    const healthScores = accounts.filter((a) => a.healthScore !== null).map((a) => a.healthScore!);
    const avgHealthScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((sum, s) => sum + s, 0) / healthScores.length)
      : null;

    return { totalCost, totalConversions, totalActiveCampaigns, avgHealthScore };
  }, [accounts]);

  const filteredAccounts = accounts.filter(
    (account) =>
      (account.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.customerId.includes(searchQuery)
  );

  const handleCreateAccount = async () => {
    setFormError('');
    setIsSubmitting(true);

    try {
      const account = await apiClient.post<CreatedAccount>('/audit/accounts', {
        customerId: newCustomerId,
        customerName: newCustomerName,
      });
      setCreatedAccount(account);
      loadAccounts();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setFormError(error.message || 'Errore sconosciuto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setNewCustomerId('');
    setNewCustomerName('');
    setFormError('');
    setCreatedAccount(null);
    setCopiedSecret(false);
  };

  const handleCopySecret = async () => {
    if (createdAccount) {
      await navigator.clipboard.writeText(createdAccount.sharedSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleOpenRevealDialog = (accountId: string) => {
    setRevealAccountId(accountId);
    setRevealDialogOpen(true);
  };

  const handleCloseRevealDialog = () => {
    setRevealDialogOpen(false);
    setRevealAccountId(null);
    setRevealPassword('');
    setRevealedSecret(null);
    setRevealError('');
    setCopiedRevealedSecret(false);
  };

  const handleRevealSecret = async () => {
    if (!revealAccountId) return;
    setRevealError('');
    setIsRevealing(true);

    try {
      const result = await apiClient.post<{ sharedSecret: string }>(
        `/audit/accounts/${revealAccountId}/reveal-secret`,
        { password: revealPassword }
      );
      setRevealedSecret(result.sharedSecret);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setRevealError(error.message || 'Password non corretta');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopyRevealedSecret = async () => {
    if (revealedSecret) {
      await navigator.clipboard.writeText(revealedSecret);
      setCopiedRevealedSecret(true);
      setTimeout(() => setCopiedRevealedSecret(false), 2000);
    }
  };

  const handleScheduleUpdate = async (accountId: string, data: UpdateAccountScheduleDto) => {
    try {
      const updated = await updateAccountSchedule(accountId, data);
      setAccounts(prev => prev.map(a =>
        a.id === accountId
          ? { ...a, scheduleEnabled: updated.scheduleEnabled, scheduleDays: updated.scheduleDays, scheduleTime: updated.scheduleTime, scheduleFrequency: updated.scheduleFrequency }
          : a
      ));
    } catch (err) {
      console.error('Failed to update schedule:', err);
    }
  };

  const handleStrategyUpdate = async (accountId: string, data: UpdateAccountStrategyDto) => {
    try {
      const updated = await updateAccountStrategy(accountId, data);
      setAccounts(prev => prev.map(a =>
        a.id === accountId
          ? { ...a, businessType: updated.businessType, primaryObjective: updated.primaryObjective, strategyNotes: updated.strategyNotes }
          : a
      ));
    } catch (err) {
      console.error('Failed to update strategy:', err);
    }
  };

  const handleOpenDeleteDialog = (account: AccountWithStats) => {
    setDeleteAccount(account);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteAccount(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteAccount) return;
    setIsDeleting(true);

    try {
      await apiClient.delete(`/audit/accounts/${deleteAccount.id}`);
      loadAccounts();
      handleCloseDeleteDialog();
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Failed to delete account:', error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-20 w-full mb-3" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header + Period Selector */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Account Google Ads</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestisci e monitora i tuoi account pubblicitari
            </p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          DA FARE OGGI — MODIFICHE: cambiamenti concreti e applicabili
          (alto impatto), solo freschi (<=14gg) su account attivi.
          Le modifiche hanno priorita' sulle raccomandazioni.
          ═══════════════════════════════════════════════════════ */}
      {modificationAccounts.length > 0 && (
        <Card className="mb-4 border-l-4 border-l-yellow-500 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-5 w-5 text-yellow-600" />
              <h2 className="font-semibold text-foreground">Da fare oggi · Modifiche</h2>
              <Badge variant="secondary" className="text-xs">
                {modificationAccounts.reduce((s, a) => s + a.modificationsCount, 0)} modifiche
              </Badge>
            </div>
            <div className="space-y-2">
              {modificationAccounts.map((account) => (
                <Link
                  key={account.accountId}
                  to={`/audit/${account.accountId}/modifications`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {account.accountName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {account.highPriorityModifications > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {account.highPriorityModifications} urgenti
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {account.modificationsCount} modifiche
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════
          RACCOMANDAZIONI — suggerimenti advisory/manuali (impatto minore,
          non automatizzabili). Blocco secondario, meno prominente.
          ═══════════════════════════════════════════════════════ */}
      {recommendationAccounts.length > 0 && (
        <Card className="mb-6 border-l-4 border-l-border bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-medium text-muted-foreground">Raccomandazioni</h2>
              <Badge variant="secondary" className="text-xs">
                {recommendationAccounts.reduce((s, a) => s + a.recommendationsCount, 0)} suggerimenti
              </Badge>
            </div>
            <div className="space-y-2">
              {recommendationAccounts.map((account) => (
                <Link
                  key={account.accountId}
                  to={`/audit/${account.accountId}/modifications`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {account.accountName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {account.recommendationsCount} raccomandazioni
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Striscia KPI aggregati */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {periodMetrics?.hasDailyData && periodMetrics.current ? (
            <>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs">Spesa Totale</span>
                    </div>
                    {periodMetrics.changes && <PeriodChangeBadge value={periodMetrics.changes.cost} inverted />}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(periodMetrics.current.cost * 1000000)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span className="text-xs">Conversioni</span>
                    </div>
                    {periodMetrics.changes && <PeriodChangeBadge value={periodMetrics.changes.conversions} />}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {formatNumber(periodMetrics.current.conversions)}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Spesa Totale</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(summary.totalCost * 1000000)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">Conversioni Totali</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {formatNumber(summary.totalConversions)}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Megaphone className="h-4 w-4" />
                <span className="text-xs">Campagne Attive</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {summary.totalActiveCampaigns}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Health Score Medio</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-foreground">
                  {summary.avgHealthScore !== null ? `${summary.avgHealthScore}/100` : '-'}
                </p>
                {summary.avgHealthScore !== null && (
                  <div className={`w-3 h-3 rounded-full ${
                    summary.avgHealthScore >= 75 ? 'bg-green-500' :
                    summary.avgHealthScore >= 50 ? 'bg-yellow-500' :
                    summary.avgHealthScore >= 25 ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Prossima Analisi</span>
              </div>
              {nextAnalysis && nextAnalysis.enabled ? (
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {nextAnalysis.nextRunAt
                      ? new Date(nextAnalysis.nextRunAt).toLocaleDateString('it-IT', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })
                      : '-'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {nextAnalysis.nextRunAt
                      ? new Date(nextAnalysis.nextRunAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                      : ''}{' '}
                    {nextAnalysis.nextAccounts.slice(0, 2).join(', ')}
                    {nextAnalysis.nextAccounts.length > 2 && ` +${nextAnalysis.nextAccounts.length - 2}`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Non attiva</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Add */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{filteredAccounts.length} account</Badge>

          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              {!createdAccount ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Aggiungi Nuovo Account</DialogTitle>
                    <DialogDescription>
                      Inserisci i dati dell'account Google Ads che vuoi monitorare.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customerName">Nome Cliente</Label>
                      <Input
                        id="customerName"
                        placeholder="Es: Massimo Borio"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customerId">ID Account Google Ads</Label>
                      <Input
                        id="customerId"
                        placeholder="Es: 816-496-5072"
                        value={newCustomerId}
                        onChange={(e) => setNewCustomerId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Lo trovi in alto a destra nel tuo account Google Ads
                      </p>
                    </div>
                    {formError && (
                      <p className="text-sm text-destructive">{formError}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Annulla
                    </Button>
                    <Button
                      onClick={handleCreateAccount}
                      disabled={isSubmitting || !newCustomerId || !newCustomerName}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSubmitting ? 'Creazione...' : 'Crea Account'}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Account Creato!</DialogTitle>
                    <DialogDescription>
                      L'account "{createdAccount.customerName}" e' stato creato con successo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium">Customer ID</p>
                        <p className="text-sm text-muted-foreground">{createdAccount.customerId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Chiave Segreta (Shared Secret)</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Copia questa chiave e usala nello script Google Ads. Non la vedrai piu'!
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-background p-2 rounded border break-all">
                            {createdAccount.sharedSecret}
                          </code>
                          <Button size="sm" variant="outline" onClick={handleCopySecret}>
                            {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseDialog}>Chiudi</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Cards */}
      {filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nessun account trovato</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {searchQuery
                ? 'Prova a modificare la ricerca'
                : 'Aggiungi il tuo primo account Google Ads'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onRevealSecret={handleOpenRevealDialog}
              onDelete={handleOpenDeleteDialog}
              onScheduleUpdate={handleScheduleUpdate}
              onStrategyUpdate={handleStrategyUpdate}
            />
          ))}
        </div>
      )}

      {/* Dialog per rivelare la chiave segreta */}
      <Dialog open={revealDialogOpen} onOpenChange={(open) => !open && handleCloseRevealDialog()}>
        <DialogContent className="sm:max-w-md">
          {!revealedSecret ? (
            <>
              <DialogHeader>
                <DialogTitle>Conferma Password</DialogTitle>
                <DialogDescription>
                  Inserisci la tua password per visualizzare la chiave segreta.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="revealPassword">Password</Label>
                  <Input
                    id="revealPassword"
                    type="password"
                    placeholder="Inserisci la tua password"
                    value={revealPassword}
                    onChange={(e) => setRevealPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRevealSecret()}
                  />
                </div>
                {revealError && (
                  <p className="text-sm text-destructive">{revealError}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseRevealDialog}>
                  Annulla
                </Button>
                <Button
                  onClick={handleRevealSecret}
                  disabled={isRevealing || !revealPassword}
                >
                  {isRevealing ? 'Verifica...' : 'Mostra Chiave'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Chiave Segreta</DialogTitle>
                <DialogDescription>
                  Usa questa chiave nello script Google Ads.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-3 rounded border break-all">
                    {revealedSecret}
                  </code>
                  <Button size="sm" variant="outline" onClick={handleCopyRevealedSecret}>
                    {copiedRevealedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseRevealDialog}>Chiudi</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog per eliminare account */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && handleCloseDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina Account</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare l'account "{deleteAccount?.customerName || deleteAccount?.customerId}"?
              Questa azione non puo' essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
