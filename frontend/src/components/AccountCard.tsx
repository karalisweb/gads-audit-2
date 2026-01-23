import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Key, Trash2, Calendar, Wrench, DollarSign, Target, Megaphone } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { AccountWithStats } from '@/api/audit';

interface AccountCardProps {
  account: AccountWithStats;
  onRevealSecret?: (accountId: string) => void;
  onDelete?: (account: AccountWithStats) => void;
  showActions?: boolean;
}

export function AccountCard({ account, onRevealSecret, onDelete, showActions = true }: AccountCardProps) {
  const stats = account.stats;

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
        {/* Header: Nome e ID */}
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

        {/* Stats: Costo, Conversioni, Campagne */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <DollarSign className="h-3 w-3" />
              <span className="text-[10px]">Costo</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {stats ? formatCurrency(stats.cost * 1000000) : '-'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Target className="h-3 w-3" />
              <span className="text-[10px]">Conv.</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {stats ? formatNumber(stats.conversions) : '-'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Megaphone className="h-3 w-3" />
              <span className="text-[10px]">Camp.</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {stats?.totalCampaigns || 0}
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
