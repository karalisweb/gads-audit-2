import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, Building2, TrendingUp, Target, BarChart3, Plus, Copy, Check, Key } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import { apiClient } from '@/api/client';
import { getAccountsWithStats, type AccountWithStats } from '@/api/audit';

interface CreatedAccount {
  id: string;
  customerId: string;
  customerName: string;
  sharedSecret: string;
}

export function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await getAccountsWithStats();
      setAccounts(data || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

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
      loadAccounts(); // Refresh the list
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

  const handleSelectAccount = (accountId: string) => {
    navigate(`/audit/${accountId}/dashboard`);
  };

  const handleOpenRevealDialog = (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation(); // Don't trigger card click
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Seleziona Account</h1>
          <p className="text-muted-foreground mt-2">
            Scegli un account Google Ads per visualizzare l'audit
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Seleziona Account</h1>
        <p className="text-muted-foreground mt-2">
          Scegli un account Google Ads per visualizzare l'audit
        </p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca account per nome o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredAccounts.length} account</Badge>

        <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Account
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

      {filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nessun account trovato</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery
                ? 'Prova a modificare la ricerca'
                : 'Non ci sono account con dati importati'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => {
            const stats = account.stats;
            return (
              <Card
                key={account.id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => handleSelectAccount(account.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {account.customerName || account.customerId}
                  </CardTitle>
                  <CardDescription>ID: {account.customerId}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Spesa</p>
                        <p className="font-medium">
                          {stats ? formatCurrency(stats.cost * 1000000) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">CPA</p>
                        <p className="font-medium">
                          {stats && stats.cpa > 0 ? formatCurrency(stats.cpa * 1000000) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Conv.</p>
                        <p className="font-medium">
                          {stats ? formatNumber(stats.conversions) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Campagne attive:</span>{' '}
                      <span className="font-medium">{stats?.activeCampaigns || 0}/{stats?.totalCampaigns || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ROAS:</span>{' '}
                      <span className="font-medium">{stats && stats.roas > 0 ? stats.roas.toFixed(2) : '-'}</span>
                    </div>
                  </div>
                  {account.lastImportDate && (
                    <p className="text-xs text-muted-foreground mt-4">
                      Ultimo aggiornamento:{' '}
                      {new Date(account.lastImportDate).toLocaleDateString('it-IT')}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1" variant="outline">
                      Visualizza Audit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleOpenRevealDialog(e, account.id)}
                      title="Mostra Chiave Segreta"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
    </div>
  );
}
