import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getAccountsWithStats, type AccountWithStats } from '@/api/audit';
import {
  getPendingSummary,
  getRecentActivity,
  getNextAnalysis,
  type PendingSummary,
  type ActivityItem,
  type NextAnalysisInfo,
} from '@/api/modifications';
import {
  Clock,
  Building2,
  DollarSign,
  Target,
  Activity,
  Megaphone,
  ClipboardList,
  ArrowRight,
  Calendar,
  CheckCircle2,
  XCircle,
  Bot,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { AccountCard } from '@/components/AccountCard';
import { formatCurrency, formatNumber } from '@/lib/format';

// Helper: tempo relativo ("2 ore fa", "ieri", etc.)
function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'ora';
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHours < 24) return `${diffHours} or${diffHours === 1 ? 'a' : 'e'} fa`;
  if (diffDays === 1) return 'ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return date.toLocaleDateString('it-IT');
}

// Helper: icona per tipo attività
function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'approved':
      return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    case 'applied':
      return <Zap className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    case 'failed':
      return <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />;
    case 'ai_analysis':
      return <Bot className="h-4 w-4 text-purple-500 flex-shrink-0" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
}

export function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSummary, setPendingSummary] = useState<PendingSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [nextAnalysis, setNextAnalysis] = useState<NextAnalysisInfo | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [accountsData, pendingData, activityData, analysisData] = await Promise.all([
        getAccountsWithStats(),
        getPendingSummary().catch(() => null),
        getRecentActivity(10).catch(() => []),
        getNextAnalysis().catch(() => null),
      ]);
      setAccounts(accountsData);
      setPendingSummary(pendingData);
      setRecentActivity(activityData);
      setNextAnalysis(analysisData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Backend già ordina per health score (peggiori prima)
  const sortedAccounts = accounts;

  // Aggregate summary stats
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

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-24 w-full mb-6" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Account ordinati per health score (peggiori prima)
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════
          WIDGET: Da fare oggi (Priorità 1)
          Visibile solo se ci sono pending
          ═══════════════════════════════════════════════════════ */}
      {pendingSummary && pendingSummary.totalPending > 0 && (
        <Card className="mb-6 border-l-4 border-l-yellow-500 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-yellow-600" />
                <h2 className="font-semibold text-foreground">Da fare oggi</h2>
                <Badge variant="secondary" className="text-xs">
                  {pendingSummary.totalPending} pending
                </Badge>
                {pendingSummary.totalHighPriority > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {pendingSummary.totalHighPriority} alta priorità
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {pendingSummary.byAccount
                .filter((a) => a.pendingCount > 0)
                .map((account) => (
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
                      <Badge variant="outline" className="text-xs">
                        {account.pendingCount} modifiche
                      </Badge>
                      {account.highPriorityCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {account.highPriorityCount} urgenti
                        </Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
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

          {/* ═══════════════════════════════════════════════════════
              WIDGET: Prossima Analisi (Priorità 11)
              ═══════════════════════════════════════════════════════ */}
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

      {/* Account Cards */}
      {accounts.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Priorità Account
          </h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {sortedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                showActions={false}
              />
            ))}
          </div>
        </section>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nessun account configurato</h3>
            <p className="text-muted-foreground mt-2 text-sm mb-4">
              Aggiungi il tuo primo account Google Ads per iniziare
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/accounts">Aggiungi Account</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════
          WIDGET: Attività Recenti (Priorità 10)
          ═══════════════════════════════════════════════════════ */}
      {recentActivity.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Attività Recenti
          </h2>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="space-y-1">
                {recentActivity.map((item, index) => (
                  <div
                    key={`${item.timestamp}-${index}`}
                    className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="mt-0.5">
                      <ActivityIcon type={item.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-tight">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {item.accountName}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
