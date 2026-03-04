import { useState, useMemo } from 'react';
import { Calendar, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PeriodSelection {
  dateFrom: string;
  dateTo: string;
  compare: boolean;
  preset: number | null; // 7, 14, 28, or null for custom
}

interface PeriodSelectorProps {
  value: PeriodSelection;
  onChange: (period: PeriodSelection) => void;
  compact?: boolean;
}

const PRESETS = [
  { days: 7, label: '7gg' },
  { days: 14, label: '14gg' },
  { days: 28, label: '28gg' },
];

function formatDateIt(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function getDefaultPeriod(preset = 7): PeriodSelection {
  return {
    dateFrom: getDateNDaysAgo(preset),
    dateTo: getDateNDaysAgo(1),
    compare: false,
    preset,
  };
}

export function PeriodSelector({ value, onChange, compact = false }: PeriodSelectorProps) {
  const [showCustom, setShowCustom] = useState(value.preset === null);

  const dateLabel = useMemo(() => {
    return `${formatDateIt(value.dateFrom)} - ${formatDateIt(value.dateTo)}`;
  }, [value.dateFrom, value.dateTo]);

  const handlePreset = (days: number) => {
    setShowCustom(false);
    onChange({
      dateFrom: getDateNDaysAgo(days),
      dateTo: getDateNDaysAgo(1),
      compare: value.compare,
      preset: days,
    });
  };

  const handleCustomToggle = () => {
    setShowCustom(!showCustom);
    if (!showCustom) {
      onChange({ ...value, preset: null });
    }
  };

  const handleDateChange = (field: 'dateFrom' | 'dateTo', val: string) => {
    onChange({ ...value, [field]: val, preset: null });
  };

  const handleCompareToggle = () => {
    onChange({ ...value, compare: !value.compare });
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', compact ? 'gap-1.5' : 'gap-2')}>
      {/* Preset buttons */}
      <div className="flex rounded-md border border-border">
        {PRESETS.map((p, i) => (
          <button
            key={p.days}
            onClick={() => handlePreset(p.days)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              i === 0 && 'rounded-l-md',
              i === PRESETS.length - 1 && 'rounded-r-md',
              i > 0 && 'border-l border-border',
              value.preset === p.days
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date display / custom picker toggle */}
      <button
        onClick={handleCustomToggle}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors',
          showCustom
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:bg-muted',
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>{dateLabel}</span>
      </button>

      {/* Custom date pickers */}
      {showCustom && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={value.dateFrom}
            onChange={(e) => handleDateChange('dateFrom', e.target.value)}
            className="h-7 px-2 text-xs rounded border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <input
            type="date"
            value={value.dateTo}
            onChange={(e) => handleDateChange('dateTo', e.target.value)}
            className="h-7 px-2 text-xs rounded border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {/* Compare toggle */}
      <button
        onClick={handleCompareToggle}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border transition-colors',
          value.compare
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:bg-muted',
        )}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        <span>Confronta</span>
      </button>
    </div>
  );
}
