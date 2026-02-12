import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAccountsWithStats, type AccountWithStats } from '@/api/audit';
import { Clock, Building2, DollarSign, Target, Activity, Megaphone } from 'lucide-react';
import { AccountCard } from '@/components/AccountCard';
import { formatCurrency, formatNumber } from '@/lib/format';

export function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await getAccountsWithStats();
      setAccounts(response);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Backend già ordina per health score (peggiori prima)
  // Fallback: ordina per ultima modifica (più vecchia prima)
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

      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
    </div>
  );
}
