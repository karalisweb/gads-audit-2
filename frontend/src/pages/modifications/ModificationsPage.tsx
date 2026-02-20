import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, AlertCircle, Clock, Loader2, Plus, Eye, Code, ExternalLink, CheckCircle2, XCircle, ChevronDown, ChevronRight, TableIcon, LayoutList, Zap, Shield } from 'lucide-react';
import { CreateModificationModal } from './CreateModificationModal';
import {
  getModifications,
  getModificationSummary,
  approveModification,
  rejectModification,
  cancelModification,
  bulkApproveModifications,
  bulkRejectModifications,
} from '@/api/modifications';
import type {
  Modification,
  ModificationFilters,
  ModificationSummary,
  ModificationStatus,
  PaginatedResponse,
} from '@/types';
import type { ModificationEntityType } from '@/types/modification';
import {
  getStatusColor,
  getStatusLabel,
  getModificationTypeLabel,
  getEntityTypeLabel,
  getPriorityLabel,
  getPriorityColor,
} from '@/types/modification';

// URL pubblico dello script Google Ads (file statico)
const SCRIPT_URL = '/scripts/google-ads-modifier.js';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Parsa una stringa di metriche tecnica e la rende leggibile
function formatMetricString(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return str
    // Stato attuale campagna/strategia
    .replace(/Stato attuale: strategia=\[([^\]]+)\]/g, 'Strategia: $1')
    // Impression Share
    .replace(/ImpressionShare\s*[=:]?\s*([\d.]+)/gi, (_m, v) => `IS ${(parseFloat(v) * 100).toFixed(0)}%`)
    .replace(/IS[=:]\s*([\d.]+%)/gi, 'IS $1')
    .replace(/IS[=:]\s*([\d.]+)(?!%)/gi, (_m, v) => {
      const n = parseFloat(v);
      return n < 1 ? `IS ${(n * 100).toFixed(0)}%` : `IS ${n}%`;
    })
    // Lost IS
    .replace(/Lost IS \(rank\)\s*([\d.]+)/gi, (_m, v) => `Perso rank ${(parseFloat(v) * 100).toFixed(0)}%`)
    .replace(/Lost to rank[=:]\s*([\d.]+%)/gi, 'Perso rank $1')
    .replace(/Lost to rank[=:]\s*([\d.]+)(?!%)/gi, (_m, v) => {
      const n = parseFloat(v);
      return n < 1 ? `Perso rank ${(n * 100).toFixed(0)}%` : `Perso rank ${n}%`;
    })
    .replace(/Lost to budget[=:]\s*n\/a/gi, '')
    .replace(/Lost to budget[=:]\s*([\d.]+)/gi, (_m, v) => `Perso budget ${(parseFloat(v) * 100).toFixed(0)}%`)
    // CTR
    .replace(/CTR\s*([\d.]+)\s*\(~?([\d.]+)%?\)/gi, 'CTR $2%')
    .replace(/CTR[=:]\s*([\d.]+%)/gi, 'CTR $1')
    .replace(/CTR[=:]\s*([\d.]+)(?!%)/gi, (_m, v) => {
      const n = parseFloat(v);
      return n < 1 ? `CTR ${(n * 100).toFixed(1)}%` : `CTR ${n}%`;
    })
    // QS
    .replace(/QS[=:]\s*n\/a/gi, 'QS n/d')
    .replace(/QS[=:]\s*([\d]+)/gi, 'QS $1')
    .replace(/qualityScore[=:]\s*0;\s*campi vuoti/gi, 'QS: nessun dato')
    // Cost / CPA / Conv
    .replace(/Cost[=:]\s*/gi, 'Costo ')
    .replace(/Conversions?\s*([\d.]+)/gi, 'Conv $1')
    .replace(/CPA[=:]\s*/gi, 'CPA ')
    .replace(/CPC bid[=:]\s*/gi, 'CPC ')
    .replace(/Strength[=:]\s*/gi, 'Qualità ')
    // Separatori
    .replace(/\s*[;,|]\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim()
    // Pulisci punti finali vuoti
    .replace(/·\s*$/g, '')
    .replace(/^\s*·/g, '');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // Budget (in micros)
    if ('budget' in obj && typeof obj.budget === 'number') {
      return `€${(Number(obj.budget) / 1000000).toFixed(2)}`;
    }
    // CPC Bid - solo se è numerico
    if ('cpcBid' in obj) {
      const bid = Number(obj.cpcBid);
      if (!isNaN(bid) && bid > 0) {
        // Se è in micros (>100) o valore diretto
        return bid > 100 ? `€${(bid / 1000000).toFixed(2)}` : `€${bid.toFixed(2)}`;
      }
      // cpcBid testuale → è un suggerimento, mostrare troncato
      const text = String(obj.cpcBid);
      return text.length > 60 ? text.slice(0, 60) + '…' : text;
    }
    if ('cpcBidMicros' in obj && !('cpcBid' in obj)) {
      return `€${(Number(obj.cpcBidMicros) / 1000000).toFixed(2)}`;
    }
    if ('targetCpa' in obj) {
      return `CPA €${(Number(obj.targetCpa) / 1000000).toFixed(2)}`;
    }
    if ('targetRoas' in obj) {
      return `ROAS ${Number(obj.targetRoas).toFixed(2)}`;
    }
    // Status
    if ('status' in obj) {
      return obj.status === 'ENABLED' ? 'Attivo' : obj.status === 'PAUSED' ? 'In pausa' : String(obj.status);
    }
    // Negative keywords
    if ('text' in obj && 'matchType' in obj) {
      const level = obj.level === 'CAMPAIGN' ? 'Campagna' : obj.level === 'AD_GROUP' ? 'Gruppo' : obj.level === 'ACCOUNT' ? 'Account' : '';
      return `${obj.text} (${String(obj.matchType).toLowerCase()}${level ? ', ' + level : ''})`;
    }
    if ('text' in obj && 'removed' in obj) {
      return `${obj.text} (rimuovi)`;
    }
    // Keyword add
    if ('text' in obj && !('matchType' in obj) && !('removed' in obj)) {
      return String(obj.text);
    }
    // URLs
    if ('finalUrl' in obj) return String(obj.finalUrl);
    if ('finalUrls' in obj && Array.isArray(obj.finalUrls)) return `${obj.finalUrls.length} URL`;
    // Ads
    if ('headlines' in obj && Array.isArray(obj.headlines)) return `${obj.headlines.length} titoli`;
    if ('descriptions' in obj && Array.isArray(obj.descriptions)) return `${obj.descriptions.length} descrizioni`;
    // Keyword
    if ('keyword' in obj) return String(obj.keyword);
    // Conversion
    if ('isPrimary' in obj) return obj.isPrimary ? 'Primaria' : 'Secondaria';
    if ('defaultValue' in obj) return `€${Number(obj.defaultValue).toFixed(2)}`;
    // Suggerimento testuale (optimize, restructure, scale, improve_quality_score)
    if ('suggestedValue' in obj) {
      const text = String(obj.suggestedValue);
      return text.length > 80 ? text.slice(0, 80) + '…' : text;
    }
    // beforeValue con campo "value" (metriche tecniche)
    if ('value' in obj && typeof obj.value === 'string') {
      return formatMetricString(obj.value);
    }
    // Fallback generico
    const keys = Object.keys(obj).filter(k => k !== 'source' && k !== 'action');
    if (keys.length === 0) return '-';
    if (keys.length === 1) return String(obj[keys[0]]);
    return keys.map(k => String(obj[k])).join(' · ');
  }
  return String(value);
}

// Check if value has complex data that needs a detail view
function hasComplexData(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  // Standard complex types
  if ('headlines' in obj || 'descriptions' in obj || 'finalUrls' in obj) return true;
  // Long suggestedValue text
  if ('suggestedValue' in obj && String(obj.suggestedValue).length > 80) return true;
  // Long cpcBid text (non-numeric)
  if ('cpcBid' in obj && isNaN(Number(obj.cpcBid)) && String(obj.cpcBid).length > 60) return true;
  return false;
}

// Parse AI notes into structured parts
function parseNotes(notes: string | null | undefined): { priority: string; rationale: string; impact: string } | null {
  if (!notes) return null;
  const priorityMatch = notes.match(/\[AI - Priorita:\s*(high|medium|low)\]/i);
  const parts = notes.split(' | ');
  const priority = priorityMatch ? priorityMatch[1] : '';
  const rationale = parts.length > 1 ? parts[1] : '';
  const impactPart = parts.find(p => p.startsWith('Impatto atteso:'));
  const impact = impactPart ? impactPart.replace('Impatto atteso: ', '') : '';
  return { priority, rationale, impact };
}

const REJECT_REASONS = [
  'Non sono d\'accordo',
  'Non porta benefici',
  'Budget insufficiente',
  'Rischio troppo alto',
  'Da valutare più avanti',
  'Già gestito manualmente',
];

export function ModificationsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<Modification> | null>(
    null,
  );
  const [summary, setSummary] = useState<ModificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ModificationFilters>({
    page: 1,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModification, setDetailModification] = useState<Modification | null>(null);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');

  const fetchData = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const appliedFilters: ModificationFilters = {
        ...filters,
        status:
          statusFilter !== 'all'
            ? (statusFilter as ModificationStatus)
            : undefined,
        priority:
          priorityFilter !== 'all'
            ? priorityFilter
            : undefined,
      };
      const [modsResult, summaryResult] = await Promise.all([
        getModifications(accountId, appliedFilters),
        getModificationSummary(accountId),
      ]);
      setData(modsResult);
      setSummary(summaryResult);
    } catch (err) {
      console.error('Error fetching modifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveModification(id);
      fetchData();
    } catch (err) {
      console.error('Error approving:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedModId) return;
    setActionLoading(selectedModId);
    try {
      await rejectModification(selectedModId, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedModId(null);
      fetchData();
    } catch (err) {
      console.error('Error rejecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await cancelModification(id);
      fetchData();
    } catch (err) {
      console.error('Error cancelling:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Expose handleCancel for future use (e.g., cancel button on pending modifications)
  void handleCancel;

  const openRejectDialog = (id: string) => {
    setSelectedModId(id);
    setRejectDialogOpen(true);
  };

  // Quick reject inline (dropdown with preset reasons)
  const handleQuickReject = async (id: string, reason: string) => {
    setActionLoading(id);
    try {
      await rejectModification(id, reason);
      fetchData();
    } catch (err) {
      console.error('Error quick rejecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Computed: pending high priority and negative keyword counts for smart bulk actions
  const pendingGroupCounts = useMemo(() => {
    if (!data) return { highPriority: 0, negativeKeywords: 0, highPriorityIds: [] as string[], negativeKeywordIds: [] as string[] };
    const pendingMods = data.data.filter(m => m.status === 'pending');
    const highPriority = pendingMods.filter(m => m.priority === 'high');
    const negativeKeywords = pendingMods.filter(m => m.modificationType === 'negative_keyword.add');
    return {
      highPriority: highPriority.length,
      negativeKeywords: negativeKeywords.length,
      highPriorityIds: highPriority.map(m => m.id),
      negativeKeywordIds: negativeKeywords.map(m => m.id),
    };
  }, [data]);

  // Group data by entityType for grouped view
  const groupedData = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, { mods: Modification[]; pendingCount: number; highPriorityCount: number }>();
    data.data.forEach(mod => {
      const key = mod.entityType;
      if (!groups.has(key)) {
        groups.set(key, { mods: [], pendingCount: 0, highPriorityCount: 0 });
      }
      const group = groups.get(key)!;
      group.mods.push(mod);
      if (mod.status === 'pending') {
        group.pendingCount++;
        if (mod.priority === 'high') group.highPriorityCount++;
      }
    });
    return Array.from(groups.entries()).map(([entityType, data]) => ({
      entityType,
      ...data,
    }));
  }, [data]);

  const handleBulkApproveByGroup = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await bulkApproveModifications(ids);
      fetchData();
    } catch (err) {
      console.error('Error bulk approving group:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  // Progress bar computed values
  const progressStats = useMemo(() => {
    if (!summary) return null;
    const processed = (summary.byStatus.applied || 0) + (summary.byStatus.rejected || 0) + (summary.byStatus.failed || 0);
    const pending = (summary.byStatus.pending || 0) + (summary.byStatus.approved || 0) + (summary.byStatus.processing || 0);
    const total = processed + pending;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    return { processed, pending, total, percentage };
  }, [summary]);

  // Get selected pending modification IDs
  const getSelectedPendingIds = (): string[] => {
    if (!data) return [];
    return Object.keys(rowSelection)
      .filter(idx => rowSelection[idx])
      .map(idx => data.data[parseInt(idx)])
      .filter(mod => mod && mod.status === 'pending')
      .map(mod => mod.id);
  };

  const selectedPendingCount = getSelectedPendingIds().length;
  const selectedCount = Object.keys(rowSelection).filter(idx => rowSelection[idx]).length;

  const handleBulkApprove = async () => {
    const ids = getSelectedPendingIds();
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await bulkApproveModifications(ids);
      setRowSelection({});
      fetchData();
    } catch (err) {
      console.error('Error bulk approving:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkReject = async () => {
    const ids = getSelectedPendingIds();
    if (ids.length === 0 || !bulkRejectReason.trim()) return;
    setBulkLoading(true);
    try {
      await bulkRejectModifications(ids, bulkRejectReason);
      setRowSelection({});
      setBulkRejectDialogOpen(false);
      setBulkRejectReason('');
      fetchData();
    } catch (err) {
      console.error('Error bulk rejecting:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const columns: ColumnDef<Modification>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 accent-primary"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 accent-primary"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {getStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priorita',
      cell: ({ row }) => {
        const p = row.original.priority;
        if (!p) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <Badge className={getPriorityColor(p)}>
            {getPriorityLabel(p)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'entityType',
      header: 'Tipo',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {getEntityTypeLabel(row.original.entityType)}
          </p>
          <p className="text-xs text-muted-foreground">
            {getModificationTypeLabel(row.original.modificationType)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'entityName',
      header: 'Entità',
      size: 200,
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium break-words whitespace-normal">
            {row.original.entityName || row.original.entityId}
          </p>
          <p className="text-xs text-muted-foreground break-all">
            ID: {row.original.entityId}
          </p>
        </div>
      ),
    },
    {
      id: 'change',
      header: 'Modifica',
      size: 350,
      cell: ({ row }) => {
        const mod = row.original;
        const showDetailBtn = hasComplexData(mod.beforeValue) || hasComplexData(mod.afterValue);
        const aiNotes = parseNotes(mod.notes);
        const beforeStr = formatValue(mod.beforeValue);
        const afterStr = formatValue(mod.afterValue);

        return (
          <div className="text-sm max-w-[350px] space-y-1">
            {/* Before → After compatto */}
            {beforeStr !== '-' ? (
              <div className="flex items-start gap-1.5 flex-wrap">
                <span className="text-muted-foreground break-words whitespace-normal">{beforeStr}</span>
                <span className="text-muted-foreground shrink-0">→</span>
                <span className="font-medium text-primary break-words whitespace-normal">{afterStr}</span>
              </div>
            ) : (
              <div>
                <span className="font-medium text-primary break-words whitespace-normal">{afterStr}</span>
              </div>
            )}

            {/* Motivazione AI sintetica */}
            {aiNotes && aiNotes.rationale && (
              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-normal">
                {aiNotes.rationale}
              </p>
            )}

            {/* Impatto atteso */}
            {aiNotes && aiNotes.impact && (
              <p className="text-xs text-green-600 whitespace-normal">
                📈 {aiNotes.impact.length > 80 ? aiNotes.impact.slice(0, 80) + '…' : aiNotes.impact}
              </p>
            )}

            {/* Dettagli button */}
            {(showDetailBtn || (aiNotes && aiNotes.rationale && aiNotes.rationale.length > 120)) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setDetailModification(mod);
                  setDetailModalOpen(true);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                Dettagli
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdBy',
      header: 'Creata da',
      size: 140,
      cell: ({ row }) => (
        <div className="max-w-[140px]">
          <p className="text-sm break-words whitespace-normal">{row.original.createdBy?.email || 'Analisi automatica'}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: 'result',
      header: 'Risultato',
      cell: ({ row }) => {
        const mod = row.original;
        if (mod.status === 'applied') {
          return (
            <div className="text-sm text-green-600">
              <Check className="h-4 w-4 inline mr-1" />
              {mod.resultMessage || 'Applicata'}
            </div>
          );
        }
        if (mod.status === 'failed') {
          return (
            <div className="text-sm text-red-600">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              <span className="break-words">{mod.resultMessage || 'Errore'}</span>
            </div>
          );
        }
        if (mod.status === 'rejected') {
          return (
            <div
              className="text-sm text-red-600"
              title={mod.rejectionReason || ''}
            >
              <X className="h-4 w-4 inline mr-1" />
              Rifiutata
            </div>
          );
        }
        if (mod.status === 'processing') {
          return (
            <div className="text-sm text-purple-600">
              <Loader2 className="h-4 w-4 inline mr-1 animate-spin" />
              In elaborazione
            </div>
          );
        }
        return null;
      },
    },
    {
      id: 'actions',
      header: 'Azioni',
      cell: ({ row }) => {
        const mod = row.original;
        const isLoading = actionLoading === mod.id;

        if (mod.status === 'pending') {
          return (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => handleApprove(mod.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {REJECT_REASONS.map((reason) => (
                    <DropdownMenuItem
                      key={reason}
                      onClick={() => handleQuickReject(mod.id, reason)}
                      className="text-sm cursor-pointer"
                    >
                      {reason}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={() => openRejectDialog(mod.id)}
                    className="text-sm cursor-pointer text-muted-foreground"
                  >
                    Altro motivo...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }

        if (mod.status === 'approved') {
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              In attesa script
            </div>
          );
        }

        return null;
      },
    },
  ];

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modifiche Google Ads</h1>
          <p className="text-muted-foreground">
            Gestisci le modifiche pendenti e visualizza lo storico
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScriptModalOpen(true)}>
            <Code className="h-4 w-4 mr-2" />
            Script Google Ads
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Modifica
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <SummaryCard
            label="Totale"
            value={summary.total}
            onClick={() => setStatusFilter('all')}
            active={statusFilter === 'all'}
          />
          <SummaryCard
            label="In Attesa"
            value={summary.byStatus.pending || 0}
            color="bg-yellow-500"
            onClick={() => setStatusFilter('pending')}
            active={statusFilter === 'pending'}
          />
          <SummaryCard
            label="Approvate"
            value={summary.byStatus.approved || 0}
            color="bg-blue-500"
            onClick={() => setStatusFilter('approved')}
            active={statusFilter === 'approved'}
          />
          <SummaryCard
            label="In Elaborazione"
            value={summary.byStatus.processing || 0}
            color="bg-purple-500"
            onClick={() => setStatusFilter('processing')}
            active={statusFilter === 'processing'}
          />
          <SummaryCard
            label="Applicate"
            value={summary.byStatus.applied || 0}
            color="bg-green-500"
            onClick={() => setStatusFilter('applied')}
            active={statusFilter === 'applied'}
          />
          <SummaryCard
            label="Fallite"
            value={summary.byStatus.failed || 0}
            color="bg-red-500"
            onClick={() => setStatusFilter('failed')}
            active={statusFilter === 'failed'}
          />
          <SummaryCard
            label="Rifiutate"
            value={summary.byStatus.rejected || 0}
            color="bg-gray-500"
            onClick={() => setStatusFilter('rejected')}
            active={statusFilter === 'rejected'}
          />
        </div>
      )}

      {/* Progress Bar */}
      {progressStats && progressStats.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Progresso: {progressStats.processed} processate su {progressStats.total}
            </span>
            <span className="font-medium text-foreground">{progressStats.percentage}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressStats.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters + View Toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="pending">In Attesa</SelectItem>
            <SelectItem value="approved">Approvate</SelectItem>
            <SelectItem value="processing">In Elaborazione</SelectItem>
            <SelectItem value="applied">Applicate</SelectItem>
            <SelectItem value="failed">Fallite</SelectItem>
            <SelectItem value="rejected">Rifiutate</SelectItem>
            <SelectItem value="cancelled">Annullate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtra per priorita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le priorita</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Bassa</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {/* Smart Bulk Approve Buttons */}
          {pendingGroupCounts.highPriority > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleBulkApproveByGroup(pendingGroupCounts.highPriorityIds)}
              disabled={bulkLoading}
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              Approva {pendingGroupCounts.highPriority} alta priorità
            </Button>
          )}
          {pendingGroupCounts.negativeKeywords > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => handleBulkApproveByGroup(pendingGroupCounts.negativeKeywordIds)}
              disabled={bulkLoading}
            >
              <Shield className="h-3.5 w-3.5 mr-1" />
              Approva {pendingGroupCounts.negativeKeywords} negative
            </Button>
          )}

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}
              title="Vista tabella"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-2 transition-colors ${viewMode === 'grouped' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}
              title="Vista raggruppata"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-lg">
          <span className="text-sm font-medium">
            {selectedCount} selezionat{selectedCount === 1 ? 'a' : 'e'}
            {selectedPendingCount < selectedCount && (
              <span className="text-muted-foreground"> ({selectedPendingCount} in attesa)</span>
            )}
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={handleBulkApprove}
              disabled={bulkLoading || selectedPendingCount === 0}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Approva ({selectedPendingCount})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={() => setBulkRejectDialogOpen(true)}
              disabled={bulkLoading || selectedPendingCount === 0}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rifiuta ({selectedPendingCount})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRowSelection({})}
            >
              Deseleziona
            </Button>
          </div>
        </div>
      )}

      {/* Desktop: Data Table or Grouped View */}
      <div className="hidden md:block">
        {viewMode === 'table' && data && (
          <DataTable
            columns={columns}
            data={data.data}
            pageCount={data.meta?.totalPages || Math.ceil((data.meta?.total || 0) / filters.limit!)}
            pageSize={filters.limit!}
            pageIndex={(filters.page || 1) - 1}
            total={data.meta?.total || 0}
            onPageChange={(pageIdx) => setFilters((f) => ({ ...f, page: pageIdx + 1 }))}
            enableRowSelection={(row) => row.original.status === 'pending'}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        )}

        {/* Grouped View */}
        {viewMode === 'grouped' && data && (
          <div className="space-y-3">
            {groupedData.map((group) => (
              <GroupedEntitySection
                key={group.entityType}
                entityType={group.entityType}
                modifications={group.mods}
                pendingCount={group.pendingCount}
                highPriorityCount={group.highPriorityCount}
                onApprove={handleApprove}
                onQuickReject={handleQuickReject}
                onOpenRejectDialog={openRejectDialog}
                onViewDetail={(mod) => { setDetailModification(mod); setDetailModalOpen(true); }}
                actionLoading={actionLoading}
              />
            ))}
            {groupedData.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna modifica trovata con i filtri attuali
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile: Card View */}
      <div className="md:hidden">
        {data && data.data.length > 0 ? (
          <div className="space-y-3">
            {data.data.map((mod) => (
              <MobileModificationCard
                key={mod.id}
                mod={mod}
                onApprove={handleApprove}
                onQuickReject={handleQuickReject}
                onOpenRejectDialog={openRejectDialog}
                onViewDetail={(m) => { setDetailModification(m); setDetailModalOpen(true); }}
                actionLoading={actionLoading}
              />
            ))}
            {/* Mobile Pagination */}
            {data.meta && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page || 1) <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
                >
                  Precedente
                </Button>
                <span className="text-sm text-muted-foreground">
                  {filters.page || 1} / {data.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page || 1) >= data.meta.totalPages}
                  onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
                >
                  Successiva
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Nessuna modifica trovata
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Modifica</DialogTitle>
            <DialogDescription>
              Seleziona un motivo o scrivi una nota personalizzata.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    rejectReason === reason
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-transparent text-muted-foreground border-border hover:border-red-400 hover:text-red-400'
                  }`}
                  onClick={() => setRejectReason(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Note aggiuntive (opzionale)..."
              value={REJECT_REASONS.includes(rejectReason) ? '' : rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading !== null}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Rifiuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={bulkRejectDialogOpen} onOpenChange={setBulkRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta {selectedPendingCount} Modifiche</DialogTitle>
            <DialogDescription>
              Seleziona un motivo o scrivi una nota personalizzata.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    bulkRejectReason === reason
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-transparent text-muted-foreground border-border hover:border-red-400 hover:text-red-400'
                  }`}
                  onClick={() => setBulkRejectReason(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Note aggiuntive (opzionale)..."
              value={REJECT_REASONS.includes(bulkRejectReason) ? '' : bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkRejectDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={!bulkRejectReason.trim() || bulkLoading}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Rifiuta {selectedPendingCount} modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modification Modal */}
      {accountId && (
        <CreateModificationModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          accountId={accountId}
          onSuccess={fetchData}
        />
      )}

      {/* Detail Modal for complex modifications */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Dettagli Modifica</DialogTitle>
            <DialogDescription>
              {detailModification?.entityName || detailModification?.entityId} - {detailModification && getModificationTypeLabel(detailModification.modificationType)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {detailModification && (
              <>
                {/* Before Value */}
                {detailModification.beforeValue && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Situazione attuale</h4>
                    <ModificationValueDisplay value={detailModification.beforeValue} />
                  </div>
                )}
                {/* After Value */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-primary">Modifica proposta</h4>
                  <ModificationValueDisplay value={detailModification.afterValue} />
                </div>
                {/* AI Notes */}
                {detailModification.notes && (() => {
                  const aiNotes = parseNotes(detailModification.notes);
                  if (!aiNotes || !aiNotes.rationale) return null;
                  return (
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">Motivazione AI</h4>
                        {aiNotes.priority && (
                          <Badge className={
                            aiNotes.priority === 'high' ? 'bg-red-600' :
                            aiNotes.priority === 'medium' ? 'bg-yellow-600' :
                            'bg-blue-600'
                          }>
                            {aiNotes.priority === 'high' ? 'Alta' : aiNotes.priority === 'medium' ? 'Media' : 'Bassa'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-normal">{aiNotes.rationale}</p>
                      {aiNotes.impact && (
                        <div className="rounded-md bg-green-950/20 border border-green-800/30 p-3">
                          <p className="text-sm text-green-500">
                            <span className="font-medium">Impatto atteso:</span> {aiNotes.impact}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Script Modal */}
      <Dialog open={scriptModalOpen} onOpenChange={setScriptModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Script Google Ads</DialogTitle>
            <DialogDescription>
              Configura lo script una sola volta per eseguire automaticamente le modifiche approvate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <h4 className="font-medium">Setup iniziale (una tantum):</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Vai su Google Ads {'>'} Strumenti e impostazioni {'>'} Script</li>
                <li>Clicca su <strong>+</strong> per creare un nuovo script</li>
                <li>Apri lo script dal link qui sotto e copia tutto il codice</li>
                <li>Incolla il codice nello script Google Ads</li>
                <li>Sostituisci <code className="bg-muted px-1 rounded">IL_TUO_SHARED_SECRET_QUI</code> con lo Shared Secret dell'account</li>
                <li>Autorizza lo script quando richiesto</li>
                <li>Imposta una schedulazione (es. ogni ora, ogni giorno)</li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Link allo script:</p>
              <a
                href={SCRIPT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-2 text-sm break-all"
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                {window.location.origin}{SCRIPT_URL}
              </a>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>Come funziona:</strong> Una volta configurato, lo script gira automaticamente secondo la schedulazione impostata.
                Legge le modifiche "Approvate", le esegue su Google Ads, e aggiorna lo stato nel sistema.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Lo script deve essere configurato una sola volta.
                Dopo il setup, tutte le modifiche approvate verranno eseguite automaticamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScriptModalOpen(false)}>
              Chiudi
            </Button>
            <Button asChild>
              <a href={SCRIPT_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Apri Script
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component to display modification values nicely
function ModificationValueDisplay({ value }: { value: Record<string, unknown> }) {
  // Headlines
  if ('headlines' in value && Array.isArray(value.headlines)) {
    const headlines = value.headlines as { text: string; pinnedField?: string | null }[];
    return (
      <div className="rounded-md bg-muted p-3 space-y-1">
        {headlines.map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-5">{i + 1}.</span>
            <span className="flex-1">{h.text}</span>
            {h.pinnedField && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                Pin {h.pinnedField.replace('HEADLINE_', '')}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Descriptions
  if ('descriptions' in value && Array.isArray(value.descriptions)) {
    const descriptions = value.descriptions as { text: string; pinnedField?: string | null }[];
    return (
      <div className="rounded-md bg-muted p-3 space-y-2">
        {descriptions.map((d, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground w-5">{i + 1}.</span>
            <span className="flex-1">{d.text}</span>
            {d.pinnedField && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                Pin {d.pinnedField.replace('DESCRIPTION_', '')}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Final URLs
  if ('finalUrls' in value && Array.isArray(value.finalUrls)) {
    return (
      <div className="rounded-md bg-muted p-3 space-y-1">
        {(value.finalUrls as string[]).map((url, i) => (
          <div key={i} className="text-sm break-all">
            <span className="text-muted-foreground">{i + 1}.</span> {url}
          </div>
        ))}
      </div>
    );
  }

  // Generic display
  return (
    <div className="rounded-md bg-muted p-3 space-y-1">
      {Object.entries(value).map(([key, val]) => (
        <div key={key} className="text-sm">
          <span className="text-muted-foreground">{key}:</span>{' '}
          <span className="font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = 'bg-primary',
  onClick,
  active,
}: {
  label: string;
  value: number;
  color?: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all ${
        active ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </button>
  );
}

// =========================================================================
// Grouped View Component
// =========================================================================

function GroupedEntitySection({
  entityType,
  modifications,
  pendingCount,
  highPriorityCount,
  onApprove,
  onQuickReject,
  onOpenRejectDialog,
  onViewDetail,
  actionLoading,
}: {
  entityType: string;
  modifications: Modification[];
  pendingCount: number;
  highPriorityCount: number;
  onApprove: (id: string) => void;
  onQuickReject: (id: string, reason: string) => void;
  onOpenRejectDialog: (id: string) => void;
  onViewDetail: (mod: Modification) => void;
  actionLoading: string | null;
}) {
  const [isOpen, setIsOpen] = useState(pendingCount > 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-semibold text-foreground">
              {getEntityTypeLabel(entityType as ModificationEntityType)}
            </span>
            <Badge variant="outline" className="text-xs">
              {modifications.length}
            </Badge>
            {pendingCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                {pendingCount} pending
              </Badge>
            )}
            {highPriorityCount > 0 && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                {highPriorityCount} urgenti
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-1 pl-4 border-l-2 border-border ml-2">
          {modifications.map((mod) => (
            <GroupedModificationRow
              key={mod.id}
              mod={mod}
              onApprove={onApprove}
              onQuickReject={onQuickReject}
              onOpenRejectDialog={onOpenRejectDialog}
              onViewDetail={onViewDetail}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function GroupedModificationRow({
  mod,
  onApprove,
  onQuickReject,
  onOpenRejectDialog,
  onViewDetail,
  actionLoading,
}: {
  mod: Modification;
  onApprove: (id: string) => void;
  onQuickReject: (id: string, reason: string) => void;
  onOpenRejectDialog: (id: string) => void;
  onViewDetail: (mod: Modification) => void;
  actionLoading: string | null;
}) {
  const isLoading = actionLoading === mod.id;
  const beforeStr = formatValue(mod.beforeValue);
  const afterStr = formatValue(mod.afterValue);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      {/* Status + Priority */}
      <div className="flex flex-col gap-1 items-center w-16 flex-shrink-0">
        <Badge className={`text-[10px] ${getStatusColor(mod.status)}`}>
          {getStatusLabel(mod.status)}
        </Badge>
        {mod.priority && (
          <Badge className={`text-[10px] ${getPriorityColor(mod.priority)}`}>
            {getPriorityLabel(mod.priority)}
          </Badge>
        )}
      </div>

      {/* Entity + Change */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {mod.entityName || mod.entityId}
        </p>
        <div className="text-xs text-muted-foreground mt-0.5">
          <span>{getModificationTypeLabel(mod.modificationType)}</span>
          {beforeStr !== '-' && (
            <span className="ml-2">
              {beforeStr.slice(0, 40)} → <span className="text-primary">{afterStr.slice(0, 40)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onViewDetail(mod)}
          title="Dettagli"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {mod.status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-green-600 border-green-600 hover:bg-green-50 px-2"
              onClick={() => onApprove(mod.id)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-red-600 border-red-600 hover:bg-red-50 px-2"
                  disabled={isLoading}
                >
                  <X className="h-3.5 w-3.5" />
                  <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {REJECT_REASONS.map((reason) => (
                  <DropdownMenuItem
                    key={reason}
                    onClick={() => onQuickReject(mod.id, reason)}
                    className="text-sm cursor-pointer"
                  >
                    {reason}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => onOpenRejectDialog(mod.id)}
                  className="text-sm cursor-pointer text-muted-foreground"
                >
                  Altro motivo...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Mobile Card View Component
// =========================================================================

function MobileModificationCard({
  mod,
  onApprove,
  onQuickReject,
  onOpenRejectDialog,
  onViewDetail,
  actionLoading,
}: {
  mod: Modification;
  onApprove: (id: string) => void;
  onQuickReject: (id: string, reason: string) => void;
  onOpenRejectDialog: (id: string) => void;
  onViewDetail: (mod: Modification) => void;
  actionLoading: string | null;
}) {
  const isLoading = actionLoading === mod.id;
  const beforeStr = formatValue(mod.beforeValue);
  const afterStr = formatValue(mod.afterValue);
  const aiNotes = parseNotes(mod.notes);

  return (
    <div className="border rounded-lg bg-card p-4 space-y-3">
      {/* Top row: Status + Priority + Entity Type */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`text-xs ${getStatusColor(mod.status)}`}>
          {getStatusLabel(mod.status)}
        </Badge>
        {mod.priority && (
          <Badge className={`text-xs ${getPriorityColor(mod.priority)}`}>
            {getPriorityLabel(mod.priority)}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {getEntityTypeLabel(mod.entityType)}
        </span>
      </div>

      {/* Entity name */}
      <div>
        <p className="font-medium text-sm text-foreground">
          {mod.entityName || mod.entityId}
        </p>
        <p className="text-xs text-muted-foreground">
          {getModificationTypeLabel(mod.modificationType)}
        </p>
      </div>

      {/* Before → After */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        {beforeStr !== '-' ? (
          <div className="text-sm">
            <span className="text-muted-foreground">{beforeStr.slice(0, 60)}{beforeStr.length > 60 ? '...' : ''}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="font-medium text-primary">{afterStr.slice(0, 60)}{afterStr.length > 60 ? '...' : ''}</span>
          </div>
        ) : (
          <p className="text-sm font-medium text-primary">
            {afterStr.slice(0, 80)}{afterStr.length > 80 ? '...' : ''}
          </p>
        )}
      </div>

      {/* AI Rationale (truncated) */}
      {aiNotes && aiNotes.rationale && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {aiNotes.rationale}
        </p>
      )}

      {/* Result info for non-pending */}
      {mod.status === 'applied' && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          {mod.resultMessage || 'Applicata'}
        </p>
      )}
      {mod.status === 'failed' && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {mod.resultMessage || 'Errore'}
        </p>
      )}
      {mod.status === 'rejected' && mod.rejectionReason && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <X className="h-3 w-3" />
          {mod.rejectionReason}
        </p>
      )}

      {/* Action buttons for pending */}
      {mod.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(mod.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Approva
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Rifiuta
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {REJECT_REASONS.map((reason) => (
                <DropdownMenuItem
                  key={reason}
                  onClick={() => onQuickReject(mod.id, reason)}
                  className="text-sm cursor-pointer"
                >
                  {reason}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => onOpenRejectDialog(mod.id)}
                className="text-sm cursor-pointer text-muted-foreground"
              >
                Altro motivo...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* View Detail button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={() => onViewDetail(mod)}
      >
        <Eye className="h-3 w-3 mr-1" />
        Vedi Dettagli
      </Button>
    </div>
  );
}
