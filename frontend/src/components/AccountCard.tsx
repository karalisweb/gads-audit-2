import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Key, Trash2, Calendar, Wrench, DollarSign, Target, Megaphone, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { AccountWithStats } from '@/api/audit';

interface AccountCardProps {
  account: AccountWithStats;
  onRevealSecret?: (accountId: string) => void;
  onDelete?: (account: AccountWithStats) => void;
  showActions?: boolean;
}

function TrendBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  if (value === 0) return null;
  // inverted = true means lower is better (cost, CPA)
  const isPositive = inverted ? value < 0 : value > 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

function HealthScoreBadge({ score }: { score: number }) {
  let color = 'bg-red-500';
  if (score >= 75) color = 'bg-green-500';
  else if (score >= 50) color = 'bg-yellow-500';
  else if (score >= 25) color = 'bg-orange-500';

  return (
    <div className="flex items-center gap-1.5" title={`Health Score: ${score}/100`}>
      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
        <span className="text-xs font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

export function AccountCard({ account, onRevealSecret, onDelete, showActions = true }: AccountCardProps) {
  const stats = account.stats;
  const trends = account.trends;

  const handleRevealClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRevealSecret?.(account.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(account);
  };

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* Header: Nome, ID e Health Score */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-foreground truncate">
                {account.customerName || account.customerId}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              ID: {account.customerId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats && stats.urgentIssues > 0 && (
              <div className="flex items-center gap-1 text-red-500" title={`${stats.urgentIssues} problemi urgenti`}>
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">{stats.urgentIssues}</span>
              </div>
            )}
            {account.healthScore !== null && (
              <HealthScoreBadge score={account.healthScore} />
            )}
          </div>
        </div>

        {/* Date: Ultimo aggiornamento e Ultima modifica */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Agg.: {account.lastImportDate
                ? new Date(account.lastImportDate).toLocaleDateString('it-IT')
                : '-'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wrench className="h-3 w-3" />
            <span>
              Mod.: {account.lastModificationDate
                ? new Date(account.lastModificationDate).toLocaleDateString('it-IT')
                : '-'}
            </span>
          </div>
        </div>

        {/* Stats Grid: Costo, Conv, CPA, CTR, Camp */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span className="text-[10px]">Costo</span>
              </div>
              {trends && <TrendBadge value={trends.cost} inverted />}
            </div>
            <p className="text-sm font-semibold text-foreground">
              {stats ? formatCurrency(stats.cost * 1000000) : '-'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-3 w-3" />
                <span className="text-[10px]">Conv.</span>
              </div>
              {trends && <TrendBadge value={trends.conversions} />}
            </div>
            <p className="text-sm font-semibold text-foreground">
              {stats ? formatNumber(stats.conversions) : '-'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Megaphone className="h-3 w-3" />
                <span className="text-[10px]">Camp.</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {stats?.activeCampaigns || 0}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">CPA</span>
              {trends && <TrendBadge value={trends.cpa} inverted />}
            </div>
            <p className="text-sm font-semibold text-foreground">
              {stats && stats.cpa > 0 ? `€${stats.cpa.toFixed(2)}` : '-'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">CTR</span>
              {trends && <TrendBadge value={trends.ctr} />}
            </div>
            <p className="text-sm font-semibold text-foreground">
              {stats && stats.ctr > 0 ? `${stats.ctr.toFixed(2)}%` : '-'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            asChild
            className="flex-1 h-9 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link to={`/audit/${account.id}/campaigns`}>
              Visualizza Audit
            </Link>
          </Button>
          {showActions && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handleRevealClick}
                title="Mostra Chiave Segreta"
              >
                <Key className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                onClick={handleDeleteClick}
                title="Elimina Account"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
