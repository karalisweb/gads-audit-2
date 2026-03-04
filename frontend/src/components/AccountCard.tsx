import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Key, Trash2, Calendar, Wrench, DollarSign, Target, Megaphone, TrendingUp, TrendingDown, AlertTriangle, Bot, Clock, Repeat, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { AccountWithStats, UpdateAccountScheduleDto, UpdateAccountStrategyDto } from '@/api/audit';

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' },
];

const FREQUENCIES = [
  { value: 'weekly' as const, label: 'Ogni settimana' },
  { value: 'biweekly' as const, label: 'Ogni 2 settimane' },
  { value: 'monthly' as const, label: 'Ogni mese' },
];

const BUSINESS_TYPES = [
  { value: '', label: 'Non specificato' },
  { value: 'hotel', label: 'Hotel / Struttura' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'services', label: 'Servizi' },
  { value: 'lead_gen', label: 'Lead Generation' },
  { value: 'local_business', label: 'Attivita Locale' },
  { value: 'other', label: 'Altro' },
];

const PRIMARY_OBJECTIVES = [
  { value: '', label: 'Non specificato' },
  { value: 'brand_awareness', label: 'Brand Awareness' },
  { value: 'leads', label: 'Contatti / Richieste' },
  { value: 'conversions', label: 'Conversioni / Vendite' },
  { value: 'traffic', label: 'Traffico' },
  { value: 'calls', label: 'Chiamate' },
];

interface AccountCardProps {
  account: AccountWithStats;
  onRevealSecret?: (accountId: string) => void;
  onDelete?: (account: AccountWithStats) => void;
  onScheduleUpdate?: (accountId: string, data: UpdateAccountScheduleDto) => void;
  onStrategyUpdate?: (accountId: string, data: UpdateAccountStrategyDto) => void;
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

export function AccountCard({ account, onRevealSecret, onDelete, onScheduleUpdate, onStrategyUpdate, showActions = true }: AccountCardProps) {
  const stats = account.stats;
  const trends = account.trends;
  const timeDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const strategyDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [localEnabled, setLocalEnabled] = useState(account.scheduleEnabled);
  const [localDays, setLocalDays] = useState<number[]>(account.scheduleDays || []);
  const [localTime, setLocalTime] = useState(account.scheduleTime || '07:00');
  const [localFrequency, setLocalFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>(account.scheduleFrequency || 'weekly');

  // Strategy state
  const [strategyExpanded, setStrategyExpanded] = useState(false);
  const [localBusinessType, setLocalBusinessType] = useState(account.businessType || '');
  const [localObjective, setLocalObjective] = useState(account.primaryObjective || '');
  const [localNotes, setLocalNotes] = useState(account.strategyNotes || '');

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

  const handleToggleSchedule = () => {
    const newEnabled = !localEnabled;
    setLocalEnabled(newEnabled);
    onScheduleUpdate?.(account.id, { scheduleEnabled: newEnabled });
  };

  const handleToggleDay = (day: number) => {
    const newDays = localDays.includes(day)
      ? localDays.filter(d => d !== day)
      : [...localDays, day];
    setLocalDays(newDays);
    onScheduleUpdate?.(account.id, { scheduleDays: newDays });
  };

  const handleTimeChange = (time: string) => {
    setLocalTime(time);
    // Debounce per evitare troppe chiamate API
    if (timeDebounceRef.current) clearTimeout(timeDebounceRef.current);
    timeDebounceRef.current = setTimeout(() => {
      onScheduleUpdate?.(account.id, { scheduleTime: time });
    }, 500);
  };

  const handleFrequencyChange = (frequency: 'weekly' | 'biweekly' | 'monthly') => {
    setLocalFrequency(frequency);
    onScheduleUpdate?.(account.id, { scheduleFrequency: frequency });
  };

  const handleBusinessTypeChange = (value: string) => {
    setLocalBusinessType(value);
    onStrategyUpdate?.(account.id, { businessType: value || undefined });
  };

  const handleObjectiveChange = (value: string) => {
    setLocalObjective(value);
    onStrategyUpdate?.(account.id, { primaryObjective: value || undefined });
  };

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    if (strategyDebounceRef.current) clearTimeout(strategyDebounceRef.current);
    strategyDebounceRef.current = setTimeout(() => {
      onStrategyUpdate?.(account.id, { strategyNotes: value });
    }, 800);
  };

  const hasStrategy = !!(account.businessType || account.primaryObjective || account.strategyNotes);

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

        {/* Schedule AI Audit */}
        {onScheduleUpdate && (
          <div className="border border-border rounded-lg p-3 mb-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">Audit AI</span>
              </div>
              <button
                type="button"
                onClick={handleToggleSchedule}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  localEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    localEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>

            {localEnabled && (
              <div className="space-y-2">
                {/* Day pills */}
                <div className="flex gap-1">
                  {DAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleDay(day.value)}
                      className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${
                        localDays.includes(day.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>

                {/* Time picker + Frequency */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <input
                      type="time"
                      value={localTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className="h-7 px-2 text-xs rounded border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <Repeat className="h-3 w-3 text-muted-foreground" />
                    <select
                      value={localFrequency}
                      onChange={(e) => handleFrequencyChange(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                      className="h-7 px-1.5 text-xs rounded border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring flex-1"
                    >
                      {FREQUENCIES.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Strategy */}
        {onStrategyUpdate && (
          <div className="border border-border rounded-lg p-3 mb-3 bg-muted/20">
            <button
              type="button"
              onClick={() => setStrategyExpanded(!strategyExpanded)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">Strategia</span>
                {hasStrategy && !strategyExpanded && (
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {BUSINESS_TYPES.find(b => b.value === account.businessType)?.label || ''}
                    {account.primaryObjective ? ` · ${PRIMARY_OBJECTIVES.find(o => o.value === account.primaryObjective)?.label || ''}` : ''}
                  </span>
                )}
              </div>
              {strategyExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>

            {strategyExpanded && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <select
                    value={localBusinessType}
                    onChange={(e) => handleBusinessTypeChange(e.target.value)}
                    className="h-7 px-1.5 text-xs rounded border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring flex-1"
                  >
                    {BUSINESS_TYPES.map(bt => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                  <select
                    value={localObjective}
                    onChange={(e) => handleObjectiveChange(e.target.value)}
                    className="h-7 px-1.5 text-xs rounded border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring flex-1"
                  >
                    {PRIMARY_OBJECTIVES.map(obj => (
                      <option key={obj.value} value={obj.value}>{obj.label}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={localNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Note strategiche (es: deve battere Booking sulle ricerche brand...)"
                  rows={2}
                  maxLength={2000}
                  className="w-full px-2 py-1.5 text-xs rounded border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            )}
          </div>
        )}

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
