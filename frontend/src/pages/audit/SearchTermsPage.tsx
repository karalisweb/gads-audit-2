import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AIAnalysisPanel } from '@/components/ai';
import { Ban, Plus, X, ChevronDown, ChevronRight, Search, Download, CheckCheck, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { exportToCsv, microsToDecimal, formatPercent } from '@/lib/export-csv';
import { getSearchTerms, getCampaigns, getAdGroups } from '@/api/audit';
import { usePeriodEntityMetrics } from '@/hooks/usePeriodEntityMetrics';
import { createModification } from '@/api/modifications';
import { formatCurrency, formatNumber, formatCtr } from '@/lib/format';
import type { SearchTerm, Campaign, AdGroup, PaginatedResponse, SearchTermFilters } from '@/types/audit';
// AIRecommendation type no longer needed - AIAnalysisPanel handles the full flow

// Selection helpers passed into the column factory
interface SelectionApi {
  isSelected: (id: string) => boolean;
  toggleRow: (term: SearchTerm) => void;
  allPageSelected: boolean;
  somePageSelected: boolean;
  togglePage: (checked: boolean) => void;
}

// Column definitions for table view
const createColumns = (
  onAddNegative: (term: SearchTerm, level: 'campaign' | 'adgroup', matchType: string) => void,
  selection: SelectionApi,
  hasChanges?: boolean,
  getEntityChanges?: (id: string) => Record<string, number> | null,
): ColumnDef<SearchTerm>[] => [
  {
    id: 'select',
    header: () => (
      <Checkbox
        aria-label="Seleziona tutti in pagina"
        checked={selection.allPageSelected ? true : selection.somePageSelected ? 'indeterminate' : false}
        onCheckedChange={(v) => selection.togglePage(v === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Seleziona termine"
        checked={selection.isSelected(row.original.id)}
        onCheckedChange={() => selection.toggleRow(row.original)}
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'searchTerm',
    header: 'Termine di ricerca',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <p className="font-medium truncate">{row.original.searchTerm}</p>
      </div>
    ),
  },
  {
    accessorKey: 'keywordText',
    header: 'Keyword',
    cell: ({ row }) => (
      <span className="text-sm truncate max-w-[150px] block">{row.original.keywordText || '-'}</span>
    ),
  },
  {
    accessorKey: 'matchTypeTriggered',
    header: 'Match',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.matchTypeTriggered || '-'}</span>
    ),
  },
  {
    accessorKey: 'campaignName',
    header: 'Campagna',
    cell: ({ row }) => (
      <span className="text-sm truncate max-w-[150px] block">{row.original.campaignName}</span>
    ),
  },
  {
    accessorKey: 'adGroupName',
    header: 'Gruppo annunci',
    cell: ({ row }) => (
      <span className="text-sm truncate max-w-[150px] block">{row.original.adGroupName}</span>
    ),
  },
  {
    accessorKey: 'impressions',
    header: 'Impr.',
    cell: ({ row }) => {
      const changes = hasChanges && getEntityChanges ? getEntityChanges(row.original.searchTerm) : null;
      return (
        <span className="whitespace-nowrap">
          {formatNumber(row.original.impressions)}
          {changes && changes.impressions !== undefined && changes.impressions !== 0 && (
            <span className={`ml-1 text-[10px] font-medium ${changes.impressions > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {changes.impressions > 0 ? '+' : ''}{changes.impressions.toFixed(0)}%
            </span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: 'clicks',
    header: 'Click',
    cell: ({ row }) => {
      const changes = hasChanges && getEntityChanges ? getEntityChanges(row.original.searchTerm) : null;
      return (
        <span className="whitespace-nowrap">
          {formatNumber(row.original.clicks)}
          {changes && changes.clicks !== undefined && changes.clicks !== 0 && (
            <span className={`ml-1 text-[10px] font-medium ${changes.clicks > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {changes.clicks > 0 ? '+' : ''}{changes.clicks.toFixed(0)}%
            </span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: 'ctr',
    header: 'CTR',
    cell: ({ row }) => {
      const changes = hasChanges && getEntityChanges ? getEntityChanges(row.original.searchTerm) : null;
      return (
        <span className="whitespace-nowrap">
          {formatCtr(row.original.ctr)}
          {changes && changes.ctr !== undefined && changes.ctr !== 0 && (
            <span className={`ml-1 text-[10px] font-medium ${changes.ctr > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {changes.ctr > 0 ? '+' : ''}{changes.ctr.toFixed(0)}%
            </span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: 'costMicros',
    header: 'Costo',
    cell: ({ row }) => {
      const changes = hasChanges && getEntityChanges ? getEntityChanges(row.original.searchTerm) : null;
      return (
        <span className="whitespace-nowrap">
          {formatCurrency(row.original.costMicros)}
          {changes && changes.cost !== undefined && changes.cost !== 0 && (
            <span className={`ml-1 text-[10px] font-medium ${changes.cost > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {changes.cost > 0 ? '+' : ''}{changes.cost.toFixed(0)}%
            </span>
          )}
        </span>
      );
    },
  },
  {
    id: 'cpc',
    header: 'CPC',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const clicks = parseFloat(row.original.clicks) || 0;
      const changes = hasChanges && getEntityChanges ? getEntityChanges(row.original.searchTerm) : null;
      return (
        <span className="whitespace-nowrap">
          {clicks > 0 ? formatCurrency(cost / clicks) : '-'}
          {changes && changes.cpc !== undefined && changes.cpc !== 0 && (
            <span className={`ml-1 text-[10px] font-medium ${changes.cpc > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {changes.cpc > 0 ? '+' : ''}{changes.cpc.toFixed(0)}%
            </span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: 'conversions',
    header: 'Conv.',
    cell: ({ row }) => {
      const conv = parseFloat(row.original.conversions) || 0;
      const cost = parseFloat(row.original.costMicros) || 0;
      const noConversions = conv === 0 && cost > 0;
      const changes = hasChanges && getEntityChanges ? getEntityChanges(row.original.searchTerm) : null;
      return (
        <span className={`whitespace-nowrap ${noConversions ? 'text-orange-600 font-medium' : ''}`}>
          {formatNumber(row.original.conversions)}
          {changes && changes.conversions !== undefined && changes.conversions !== 0 && (
            <span className={`ml-1 text-[10px] font-medium ${changes.conversions > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {changes.conversions > 0 ? '+' : ''}{changes.conversions.toFixed(0)}%
            </span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: 'conversionsValue',
    header: 'Val. Conv.',
    cell: ({ row }) => formatCurrency(row.original.conversionsValue),
  },
  {
    id: 'cpa',
    header: 'CPA',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      const changes = hasChanges && getEntityChanges ? getEntityChanges(row.original.searchTerm) : null;
      return (
        <span className="whitespace-nowrap">
          {conv > 0 ? formatCurrency(cost / conv) : '-'}
          {changes && changes.cpa !== undefined && changes.cpa !== 0 && (
            <span className={`ml-1 text-[10px] font-medium ${changes.cpa > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {changes.cpa > 0 ? '+' : ''}{changes.cpa.toFixed(0)}%
            </span>
          )}
        </span>
      );
    },
  },
  {
    id: 'roas',
    header: 'ROAS',
    cell: ({ row }) => {
      const value = parseFloat(row.original.conversionsValue) || 0;
      const cost = parseFloat(row.original.costMicros) || 0;
      const changes = hasChanges && getEntityChanges ? getEntityChanges(row.original.searchTerm) : null;
      return (
        <span className="whitespace-nowrap">
          {cost > 0 ? `${((value * 1000000) / cost).toFixed(2)}` : '-'}
          {changes && changes.roas !== undefined && changes.roas !== 0 && (
            <span className={`ml-1 text-[10px] font-medium ${changes.roas > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {changes.roas > 0 ? '+' : ''}{changes.roas.toFixed(0)}%
            </span>
          )}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        onClick={() => onAddNegative(row.original, 'campaign', 'EXACT')}
        title="Aggiungi come negativa"
      >
        <Ban className="h-4 w-4" />
      </Button>
    ),
  },
];

// Mobile expandable card component
function SearchTermCardMobile({
  term,
  isOpen,
  onToggle,
  onAddNegative,
  isSelected,
  onToggleSelect,
}: {
  term: SearchTerm;
  isOpen: boolean;
  onToggle: () => void;
  onAddNegative: (term: SearchTerm, level: 'campaign' | 'adgroup', matchType: string) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const cost = parseFloat(term.costMicros) || 0;
  const conv = parseFloat(term.conversions) || 0;
  const clicks = parseFloat(term.clicks) || 0;
  const impressions = parseFloat(term.impressions) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const cpc = clicks > 0 ? cost / clicks : 0;
  const value = parseFloat(term.conversionsValue) || 0;
  const roas = cost > 0 ? (value * 1000000) / cost : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  // Determine if this might be a problematic search term
  const hasSpend = cost > 0;
  const noConversions = conv === 0;
  const isPotentialNegative = hasSpend && noConversions;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className={`border rounded-lg bg-card overflow-hidden ${isSelected ? 'border-primary ring-1 ring-primary' : isPotentialNegative ? 'border-orange-300' : ''}`}>
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-2">
              <div className="mt-0.5" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
                <Checkbox checked={isSelected} aria-label="Seleziona termine" />
              </div>
              <div className="mt-0.5">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{term.searchTerm}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{term.matchTypeTriggered || 'N/A'}</span>
                  <span>•</span>
                  <span className="truncate">{term.campaignName}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {isPotentialNegative && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                    ⚠️
                  </Badge>
                )}
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(term.costMicros)}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(term.clicks)} click</p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
            {/* Keyword info */}
            <div className="py-2 border-b">
              <p className="text-xs text-muted-foreground">Keyword attivata</p>
              <p className="text-sm font-medium">{term.keywordText || 'N/A'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {term.campaignName} → {term.adGroupName}
              </p>
            </div>

            {/* Performance metrics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2">
              <div>
                <p className="text-xs text-muted-foreground">Impressioni</p>
                <p className="text-sm font-medium">{formatNumber(term.impressions)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Click</p>
                <p className="text-sm font-medium">{formatNumber(term.clicks)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="text-sm font-medium">{formatCtr(ctr)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPC medio</p>
                <p className="text-sm font-medium">{cpc > 0 ? formatCurrency(cpc) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo</p>
                <p className="text-sm font-medium">{formatCurrency(term.costMicros)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversioni</p>
                <p className={`text-sm font-medium ${noConversions && hasSpend ? 'text-orange-600' : ''}`}>
                  {formatNumber(term.conversions)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valore conv.</p>
                <p className="text-sm font-medium">{formatCurrency(term.conversionsValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPA</p>
                <p className="text-sm font-medium">{cpa > 0 ? formatCurrency(cpa) : '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">ROAS</p>
                <p className="text-sm font-medium">{roas > 0 ? roas.toFixed(2) : '-'}</p>
              </div>
            </div>

            {/* Warning for potential negative */}
            {isPotentialNegative && (
              <div className="py-2 border-t">
                <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
                  <p className="text-xs text-orange-700">
                    ⚠️ Questo termine ha generato spesa senza conversioni
                  </p>
                </div>
              </div>
            )}

            {/* Action button */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNegative(term, 'campaign', 'EXACT');
                }}
              >
                <Ban className="h-4 w-4 mr-2" />
                Aggiungi come negativa
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}


export function SearchTermsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<SearchTerm> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SearchTermFilters>({
    page: 1,
    limit: 50,
    sortBy: 'costMicros',
    sortOrder: 'DESC',
  });
  const [searchInput, setSearchInput] = useState('');

  // Expanded card state for mobile
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const { hasData: hasPeriodData, getEntityMetrics, getEntityChanges, hasChanges } = usePeriodEntityMetrics('search_term');

  // Campaign/AdGroup filter options
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>('');

  // Negative keyword dialog state
  const [negativeDialogOpen, setNegativeDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<SearchTerm | null>(null);
  const [negativeLevel, setNegativeLevel] = useState<'campaign' | 'adgroup'>('campaign');
  const [negativeMatchType, setNegativeMatchType] = useState<string>('EXACT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handler for opening negative keyword dialog
  const handleOpenNegativeDialog = useCallback((
    term: SearchTerm,
    level: 'campaign' | 'adgroup',
    matchType: string,
  ) => {
    setSelectedTerm(term);
    setNegativeLevel(level);
    setNegativeMatchType(matchType);
    setNegativeDialogOpen(true);
  }, []);

  // ---- Bulk selection state ----
  const [selected, setSelected] = useState<Map<string, SearchTerm>>(new Map());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkLevel, setBulkLevel] = useState<'campaign' | 'adgroup'>('campaign');
  const [bulkMatchType, setBulkMatchType] = useState<string>('PHRASE');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [selectingAll, setSelectingAll] = useState(false);

  const pageIds = useMemo(() => (data?.data ?? []).map((t) => t.id), [data]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  const toggleRow = useCallback((term: SearchTerm) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(term.id)) next.delete(term.id);
      else next.set(term.id, term);
      return next;
    });
  }, []);

  const togglePage = useCallback((checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      (data?.data ?? []).forEach((t) => {
        if (checked) next.set(t.id, t);
        else next.delete(t.id);
      });
      return next;
    });
  }, [data]);

  const clearSelection = useCallback(() => setSelected(new Map()), []);

  const selectionApi: SelectionApi = {
    isSelected: (id) => selected.has(id),
    toggleRow,
    allPageSelected,
    somePageSelected: somePageSelected && !allPageSelected,
    togglePage,
  };

  // Fetch every page matching the current filters (campaign, ad group, search word)
  // and add them all to the selection — e.g. "tutti i termini che contengono uber"
  const selectAllMatching = useCallback(async () => {
    if (!accountId) return;
    setSelectingAll(true);
    try {
      const next = new Map(selected);
      const limit = 200;
      let page = 1;
      let totalPages = 1;
      do {
        const res = await getSearchTerms(accountId, { ...filters, page, limit });
        res.data.forEach((t) => next.set(t.id, t));
        totalPages = res.meta.totalPages || 1;
        page++;
      } while (page <= totalPages);
      setSelected(next);
    } catch (e) {
      console.error('Select all failed', e);
      alert('Errore durante la selezione di tutti i risultati');
    } finally {
      setSelectingAll(false);
    }
  }, [accountId, filters, selected]);

  // Bulk-create negative keyword modifications from the current selection
  const handleBulkCreateNegatives = useCallback(async () => {
    if (!accountId || selected.size === 0) return;
    const terms = Array.from(selected.values());
    setBulkSubmitting(true);
    setBulkProgress(0);
    let ok = 0;
    let fail = 0;
    const batchSize = 8;
    for (let i = 0; i < terms.length; i += batchSize) {
      const batch = terms.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((t) =>
          createModification({
            accountId,
            entityType: 'negative_keyword',
            entityId: bulkLevel === 'campaign' ? t.campaignId : t.adGroupId,
            entityName: t.searchTerm,
            modificationType: 'negative_keyword.add',
            beforeValue: undefined,
            afterValue: {
              keyword: t.searchTerm,
              matchType: bulkMatchType,
              level: bulkLevel,
              campaignId: t.campaignId,
              campaignName: t.campaignName,
              adGroupId: bulkLevel === 'adgroup' ? t.adGroupId : undefined,
              adGroupName: bulkLevel === 'adgroup' ? t.adGroupName : undefined,
            },
          }),
        ),
      );
      ok += results.filter((r) => r.status === 'fulfilled').length;
      fail += results.filter((r) => r.status === 'rejected').length;
      setBulkProgress(Math.min(i + batchSize, terms.length));
    }
    setBulkSubmitting(false);
    setBulkDialogOpen(false);
    clearSelection();
    alert(
      `Create ${ok} keyword negative${fail > 0 ? `, ${fail} fallite` : ''}. ` +
        'Vai alla pagina Modifiche per approvarle.',
    );
  }, [accountId, selected, bulkLevel, bulkMatchType, clearSelection]);

  // Create columns with the dialog opener
  const columns = createColumns(handleOpenNegativeDialog, selectionApi, hasChanges, getEntityChanges);

  // Load campaigns for filter
  useEffect(() => {
    if (!accountId) return;
    getCampaigns(accountId, { limit: 500, sortBy: 'campaignName', sortOrder: 'ASC' })
      .then((result) => setCampaigns(result.data))
      .catch(console.error);
  }, [accountId]);

  // Load ad groups when campaign is selected
  useEffect(() => {
    if (!accountId || !selectedCampaignId) {
      setAdGroups([]);
      return;
    }
    getAdGroups(accountId, { campaignId: selectedCampaignId, limit: 500, sortBy: 'adGroupName', sortOrder: 'ASC' })
      .then((result) => setAdGroups(result.data))
      .catch(console.error);
  }, [accountId, selectedCampaignId]);

  const loadData = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const result = await getSearchTerms(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load search terms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCampaignChange = (value: string) => {
    setSelectedCampaignId(value);
    setSelectedAdGroupId(''); // Reset ad group when campaign changes
    setFilters((prev) => ({
      ...prev,
      campaignId: value || undefined,
      adGroupId: undefined,
      page: 1,
    }));
  };

  const handleAdGroupChange = (value: string) => {
    setSelectedAdGroupId(value);
    setFilters((prev) => ({
      ...prev,
      adGroupId: value || undefined,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setSelectedCampaignId('');
    setSelectedAdGroupId('');
    setSearchInput('');
    setFilters({
      page: 1,
      limit: 50,
      sortBy: 'costMicros',
      sortOrder: 'DESC',
    });
  };

  const handleCreateNegative = async () => {
    if (!selectedTerm || !accountId) return;

    setIsSubmitting(true);
    try {
      await createModification({
        accountId: accountId,
        entityType: 'negative_keyword',
        entityId: negativeLevel === 'campaign'
          ? selectedTerm.campaignId
          : selectedTerm.adGroupId,
        entityName: selectedTerm.searchTerm,
        modificationType: 'negative_keyword.add',
        beforeValue: undefined,
        afterValue: {
          keyword: selectedTerm.searchTerm,
          matchType: negativeMatchType,
          level: negativeLevel,
          campaignId: selectedTerm.campaignId,
          campaignName: selectedTerm.campaignName,
          adGroupId: negativeLevel === 'adgroup' ? selectedTerm.adGroupId : undefined,
          adGroupName: negativeLevel === 'adgroup' ? selectedTerm.adGroupName : undefined,
        },
      });

      setNegativeDialogOpen(false);
      setSelectedTerm(null);
      alert('Keyword negativa creata! Vai alla pagina Modifiche per approvarla.');
    } catch (err) {
      console.error('Failed to create negative keyword modification:', err);
      alert('Errore durante la creazione della modifica');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Period metrics overlay
  const tableData = useMemo(() => {
    if (!data?.data) return [];
    if (!hasPeriodData) return data.data;
    return data.data.map(entity => {
      const pm = getEntityMetrics(entity.searchTerm);
      if (!pm) return entity;
      return {
        ...entity,
        impressions: String(pm.impressions),
        clicks: String(pm.clicks),
        costMicros: String(Math.round(pm.cost * 1_000_000)),
        conversions: String(pm.conversions),
        conversionsValue: String(pm.conversionsValue),
        ctr: String(pm.ctr / 100),
        averageCpcMicros: String(Math.round(pm.cpc * 1_000_000)),
      };
    });
  }, [data, hasPeriodData, getEntityMetrics]);

  const pageIndex = (filters.page || 1) - 1;
  const pageSize = filters.limit || 50;
  const pageCount = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  const hasActiveFilters = selectedCampaignId || selectedAdGroupId || searchInput;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Search Terms</h2>
        <div className="flex items-center gap-2">
          {data && data.data.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCsv(
                `search-terms-${accountId}`,
                data.data,
                [
                  { header: 'Termine di ricerca', accessor: (r) => r.searchTerm },
                  { header: 'Keyword', accessor: (r) => r.keywordText },
                  { header: 'Match type', accessor: (r) => r.matchTypeTriggered },
                  { header: 'Campagna', accessor: (r) => r.campaignName },
                  { header: 'Gruppo annunci', accessor: (r) => r.adGroupName },
                  { header: 'Impressioni', accessor: (r) => r.impressions },
                  { header: 'Click', accessor: (r) => r.clicks },
                  { header: 'CTR', accessor: (r) => formatPercent(r.ctr) },
                  { header: 'Costo', accessor: (r) => microsToDecimal(r.costMicros) },
                  { header: 'Conversioni', accessor: (r) => r.conversions },
                ],
              )}
              title="Esporta CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {accountId && (
            <AIAnalysisPanel
              accountId={accountId}
              moduleId={22}
              moduleName="Analisi termini di ricerca"
            />
          )}
        </div>
      </div>

      {/* Filters - responsive */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <Select value={selectedCampaignId || 'all'} onValueChange={(v) => handleCampaignChange(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[200px] md:w-[250px]">
            <SelectValue placeholder="Tutte le campagne" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le campagne</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.campaignId} value={c.campaignId}>
                {c.campaignName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedAdGroupId || 'all'}
          onValueChange={(v) => handleAdGroupChange(v === 'all' ? '' : v)}
          disabled={!selectedCampaignId}
        >
          <SelectTrigger className="w-full sm:w-[200px] md:w-[250px]">
            <SelectValue placeholder="Tutti gli ad group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli ad group</SelectItem>
            {adGroups.map((ag) => (
              <SelectItem key={ag.adGroupId} value={ag.adGroupId}>
                {ag.adGroupName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 flex-1 sm:flex-none">
          <Input
            placeholder="Cerca..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 sm:w-48 md:w-64"
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Ban className="h-4 w-4 text-orange-600" />
        <span>{isMobile ? 'Seleziona le card e aggiungi negative in blocco' : 'Spunta i termini (o usa «Seleziona tutti») per aggiungere negative in blocco'}</span>
        {total > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={selectAllMatching}
            disabled={selectingAll}
          >
            {selectingAll ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
            )}
            {searchInput
              ? `Seleziona tutti i ${total.toLocaleString()} con «${searchInput}»`
              : `Seleziona tutti i ${total.toLocaleString()} risultati`}
          </Button>
        )}
      </div>

      {/* Mobile: Expandable Cards */}
      {isMobile && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {tableData.map((term) => (
                  <SearchTermCardMobile
                    key={term.id}
                    term={term}
                    isOpen={expandedCardId === term.id}
                    onToggle={() => setExpandedCardId(expandedCardId === term.id ? null : term.id)}
                    onAddNegative={handleOpenNegativeDialog}
                    isSelected={selected.has(term.id)}
                    onToggleSelect={() => toggleRow(term)}
                  />
                ))}
                {tableData.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nessun search term trovato
                  </div>
                )}
              </div>

              {/* Mobile Pagination */}
              {total > 0 && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground text-center">
                    {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, total)} di {total.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters((prev) => ({ ...prev, page: pageIndex }))}
                      disabled={pageIndex === 0}
                    >
                      ← Prec
                    </Button>
                    <span className="text-sm px-2">
                      {pageIndex + 1} / {pageCount || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters((prev) => ({ ...prev, page: pageIndex + 2 }))}
                      disabled={pageIndex >= pageCount - 1}
                    >
                      Succ →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Desktop: Table View */}
      {!isMobile && (
        <DataTable
          columns={columns}
          data={tableData}
          isLoading={isLoading}
          pageCount={pageCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          total={total}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page: page + 1 }))}
          onPageSizeChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
          onSortChange={(sortBy, sortOrder) =>
            setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }))
          }
        />
      )}

      {/* Negative Keyword Dialog */}
      <Dialog open={negativeDialogOpen} onOpenChange={setNegativeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Keyword Negativa</DialogTitle>
            <DialogDescription>
              Aggiungi "{selectedTerm?.searchTerm}" come keyword negativa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Livello</label>
              <Select
                value={negativeLevel}
                onValueChange={(v) => setNegativeLevel(v as 'campaign' | 'adgroup')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">
                    Campagna ({selectedTerm?.campaignName})
                  </SelectItem>
                  <SelectItem value="adgroup">
                    Ad Group ({selectedTerm?.adGroupName})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo di corrispondenza</label>
              <Select value={negativeMatchType} onValueChange={setNegativeMatchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXACT">Esatta [keyword]</SelectItem>
                  <SelectItem value="PHRASE">A frase "keyword"</SelectItem>
                  <SelectItem value="BROAD">Generica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Riepilogo:</p>
              <p>
                Keyword: <code className="bg-background px-1 rounded">{selectedTerm?.searchTerm}</code>
              </p>
              <p>
                Match: <code className="bg-background px-1 rounded">{negativeMatchType}</code>
              </p>
              <p>
                {negativeLevel === 'campaign' ? 'Campagna' : 'Ad Group'}:{' '}
                {negativeLevel === 'campaign' ? selectedTerm?.campaignName : selectedTerm?.adGroupName}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNegativeDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateNegative} disabled={isSubmitting}>
              <Plus className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Creazione...' : 'Crea Modifica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] sm:w-auto">
          <div className="flex items-center gap-3 rounded-full border bg-background shadow-lg px-4 py-2">
            <span className="text-sm font-medium whitespace-nowrap">
              {selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}
            </span>
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => setBulkDialogOpen(true)}
            >
              <Ban className="h-4 w-4 mr-1.5" />
              Aggiungi come negative
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full h-8 w-8 p-0"
              onClick={clearSelection}
              title="Deseleziona tutto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk negative keyword dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={(o) => !bulkSubmitting && setBulkDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi {selected.size} keyword negative</DialogTitle>
            <DialogDescription>
              Verrà creata una modifica "negative_keyword.add" per ciascun termine selezionato.
              Ogni negativa viene aggiunta alla campagna/ad group del proprio termine.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Livello</label>
              <Select value={bulkLevel} onValueChange={(v) => setBulkLevel(v as 'campaign' | 'adgroup')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Campagna (del termine)</SelectItem>
                  <SelectItem value="adgroup">Ad Group (del termine)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo di corrispondenza</label>
              <Select value={bulkMatchType} onValueChange={setBulkMatchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXACT">Esatta [keyword]</SelectItem>
                  <SelectItem value="PHRASE">A frase "keyword"</SelectItem>
                  <SelectItem value="BROAD">Generica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <p>
                Negative da creare: <strong>{selected.size}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Le modifiche restano in stato "pending" finché non le approvi nella pagina Modifiche.
              </p>
            </div>

            {bulkSubmitting && (
              <div className="text-sm text-muted-foreground">
                Creazione in corso… {bulkProgress}/{selected.size}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkSubmitting}>
              Annulla
            </Button>
            <Button onClick={handleBulkCreateNegatives} disabled={bulkSubmitting}>
              {bulkSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {bulkSubmitting ? 'Creazione…' : `Crea ${selected.size} modifiche`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
