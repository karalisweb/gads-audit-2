import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodSelectorProps {
  selectedPeriod: 15 | 30;
  onPeriodChange: (period: 15 | 30) => void;
  lastAuditDate: string | null;
}

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  lastAuditDate,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Period Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Periodo:</span>
        <div className="flex rounded-md border border-border">
          <button
            onClick={() => onPeriodChange(15)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors rounded-l-md',
              selectedPeriod === 15
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            15 gg
          </button>
          <button
            onClick={() => onPeriodChange(30)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors rounded-r-md border-l border-border',
              selectedPeriod === 30
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            30 gg
          </button>
        </div>
      </div>

      {/* Last Audit Date */}
      {lastAuditDate && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Dati: {new Date(lastAuditDate).toLocaleDateString('it-IT')}</span>
        </div>
      )}
    </div>
  );
}
