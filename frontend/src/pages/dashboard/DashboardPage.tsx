import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getAccounts } from '@/api/audit';
import type { GoogleAdsAccount } from '@/types/audit';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Play,
  MoreHorizontal,
  DollarSign,
  Target,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'priority' | 'dashboard';

interface AccountWithStats extends GoogleAdsAccount {
  stats?: {
    budget?: number;
    cpa?: number;
    conversions?: number;
    trend?: number;
    urgentIssues?: number;
    modulesCompleted?: number;
    modulesTotal?: number;
  };
}

export function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('priority');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await getAccounts();
      // Add mock stats for now - these would come from the API
      const accountsWithStats = response.map((acc: GoogleAdsAccount) => ({
        ...acc,
        stats: {
          budget: Math.floor(Math.random() * 50000) + 5000,
          cpa: Math.floor(Math.random() * 100) + 10,
          conversions: Math.floor(Math.random() * 500) + 50,
          trend: Math.random() > 0.5 ? Math.random() * 30 : -Math.random() * 20,
          urgentIssues: Math.floor(Math.random() * 10),
          modulesCompleted: Math.floor(Math.random() * 23),
          modulesTotal: 23,
        },
      }));
      setAccounts(accountsWithStats);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const priorityAccounts = accounts.filter((acc) => (acc.stats?.urgentIssues || 0) > 0);
  const otherAccounts = accounts.filter((acc) => (acc.stats?.urgentIssues || 0) === 0);

  return (
    <div className="p-6">
      {/* View Toggle */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setViewMode('priority')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            viewMode === 'priority'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Priorit&agrave;
        </button>
        <button
          onClick={() => setViewMode('dashboard')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            viewMode === 'dashboard'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Dashboard
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'priority' ? (
        <div className="space-y-8">
          {/* Priority Accounts */}
          {priorityAccounts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Account con problemi urgenti
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {priorityAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>
          )}

          {/* Other Accounts */}
          {otherAccounts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Altri Account
              </h2>
              <div className="space-y-2">
                {otherAccounts.map((account) => (
                  <AccountRow key={account.id} account={account} />
                ))}
              </div>
            </section>
          )}

          {accounts.length === 0 && (
            <Card className="bg-card">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Nessun account configurato
                </p>
                <Button asChild>
                  <Link to="/accounts">Aggiungi Account</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({ account }: { account: AccountWithStats }) {
  const stats = account.stats;
  const trendPositive = (stats?.trend || 0) >= 0;

  return (
    <Card className="bg-card hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            {(stats?.urgentIssues || 0) > 0 && (
              <Badge className="badge-urgent mb-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats?.urgentIssues} urgenti
              </Badge>
            )}
            <h3 className="text-lg font-semibold text-foreground">
              {account.customerName || account.customerId}
            </h3>
            <p className="text-sm text-muted-foreground">{account.customerId}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Module Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Moduli completati</span>
            <span className="text-foreground">
              {stats?.modulesCompleted}/{stats?.modulesTotal}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${((stats?.modulesCompleted || 0) / (stats?.modulesTotal || 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Budget
            </p>
            <p className="text-lg font-semibold text-foreground">
              &euro;{stats?.budget?.toLocaleString('it-IT')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              CPA
            </p>
            <p className="text-lg font-semibold text-foreground">
              &euro;{stats?.cpa?.toLocaleString('it-IT')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Conv.
            </p>
            <p className="text-lg font-semibold text-foreground">
              {stats?.conversions?.toLocaleString('it-IT')}
            </p>
          </div>
        </div>

        {/* Trend */}
        <div
          className={cn(
            'flex items-center gap-1 text-sm mb-4',
            trendPositive ? 'trend-positive' : 'trend-negative'
          )}
        >
          {trendPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{Math.abs(stats?.trend || 0).toFixed(1)}% vs mese precedente</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button asChild className="flex-1" size="sm">
            <Link to={`/audit/${account.id}/dashboard`}>
              <Eye className="h-4 w-4 mr-2" />
              Visualizza
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/audit/${account.id}/issues`}>
              <Play className="h-4 w-4 mr-2" />
              Audit
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountRow({ account }: { account: AccountWithStats }) {
  const stats = account.stats;

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-4">
        <div>
          <h4 className="font-medium text-foreground">
            {account.customerName || account.customerId}
          </h4>
          <p className="text-sm text-muted-foreground">{account.customerId}</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Moduli</p>
          <p className="text-sm font-medium text-foreground">
            {stats?.modulesCompleted}/{stats?.modulesTotal}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="text-sm font-medium text-foreground">
            &euro;{stats?.budget?.toLocaleString('it-IT')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/audit/${account.id}/dashboard`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
