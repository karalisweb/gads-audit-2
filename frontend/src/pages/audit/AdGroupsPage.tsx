import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AIAnalysisPanel } from '@/components/ai';
import { ModifyButton } from '@/components/modifications';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getAdGroups } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  formatImpressionShare,
  getStatusVariant,
} from '@/lib/format';
import type { AdGroup, Ad, PaginatedResponse, AdGroupFilters } from '@/types/audit';
// AIRecommendation type no longer needed - AIAnalysisPanel handles the full flow

// Table columns for extended view
function getColumns(accountId: string, onRefresh: () => void, navigate: (path: string) => void): ColumnDef<AdGroup>[] {
  return [
  {
    accessorKey: 'adGroupName',
    header: 'Gruppo annunci',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <button
          onClick={() => navigate(`/audit/${accountId}/ads?adGroupId=${row.original.adGroupId}`)}
          className="text-left hover:text-primary transition-colors"
        >
          <p className="font-medium truncate hover:underline">{row.original.adGroupName}</p>
        </button>
        <p className="text-xs text-muted-foreground truncate">{row.original.campaignName}</p>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => (
      <Badge variant={getStatusVariant(row.original.status)} className="text-xs">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'targetCpaMicros',
    header: 'CPA target',
    cell: ({ row }) => formatCurrency(row.original.targetCpaMicros),
  },
  {
    accessorKey: 'impressions',
    header: 'Impr.',
    cell: ({ row }) => formatNumber(row.original.impressions),
  },
  {
    accessorKey: 'clicks',
    header: 'Click',
    cell: ({ row }) => formatNumber(row.original.clicks),
  },
  {
    accessorKey: 'ctr',
    header: 'CTR',
    cell: ({ row }) => formatCtr(row.original.ctr),
  },
  {
    accessorKey: 'costMicros',
    header: 'Costo',
    cell: ({ row }) => formatCurrency(row.original.costMicros),
  },
  {
    accessorKey: 'averageCpcMicros',
    header: 'CPC',
    cell: ({ row }) => formatCurrency(row.original.averageCpcMicros),
  },
  {
    accessorKey: 'conversions',
    header: 'Conv.',
    cell: ({ row }) => formatNumber(row.original.conversions),
  },
  {
    id: 'cpa',
    header: 'CPA',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return conv > 0 ? formatCurrency(cost / conv) : '-';
    },
  },
  {
    id: 'roas',
    header: 'ROAS',
    cell: ({ row }) => {
      const value = parseFloat(row.original.conversionsValue) || 0;
      const cost = parseFloat(row.original.costMicros) || 0;
      return cost > 0 ? `${((value * 1000000) / cost).toFixed(2)}` : '-';
    },
  },
  {
    accessorKey: 'searchImpressionShare',
    header: 'QI',
    cell: ({ row }) => formatImpressionShare(row.original.searchImpressionShare),
  },
  {
    accessorKey: 'searchImpressionShareLostRank',
    header: 'QI persa rank',
    cell: ({ row }) => formatImpressionShare(row.original.searchImpressionShareLostRank),
  },
  {
    accessorKey: 'searchImpressionShareLostBudget',
    header: 'QI persa budget',
    cell: ({ row }) => formatImpressionShare(row.original.searchImpressionShareLostBudget),
  },
  {
    accessorKey: 'phoneCalls',
    header: 'Tel.',
    cell: ({ row }) => formatNumber(row.original.phoneCalls),
  },
  {
    accessorKey: 'messageChats',
    header: 'Chat',
    cell: ({ row }) => formatNumber(row.original.messageChats),
  },
  {
    id: 'convRate',
    header: 'Tasso conv.',
    cell: ({ row }) => {
      const clicks = parseFloat(row.original.clicks) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return clicks > 0 ? `${((conv / clicks) * 100).toFixed(2)}%` : '-';
    },
  },
  {
    id: 'valuePerConv',
    header: 'Val/conv',
    cell: ({ row }) => {
      const value = parseFloat(row.original.conversionsValue) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return conv > 0 ? formatCurrency((value / conv) * 1000000) : '-';
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <ModifyButton
        accountId={accountId}
        entityType="ad_group"
        entityId={row.original.adGroupId}
        entityName={row.original.adGroupName}
        currentValue={{
          status: row.original.status,
        }}
        onSuccess={onRefresh}
      />
    ),
  },
];
}

interface AdGroupWithAds extends AdGroup {
  ads?: Ad[];
  adsLoading?: boolean;
  adsLoaded?: boolean;
}

// Card espandibile per mobile con tutti i dati
function AdGroupCardMobile({
  adGroup,
  isOpen,
  onToggle,
  accountId,
  onRefresh,
  onNavigate,
}: {
  adGroup: AdGroup;
  isOpen: boolean;
  onToggle: () => void;
  accountId: string;
  onRefresh: () => void;
  onNavigate: () => void;
}) {
  const cost = parseFloat(adGroup.costMicros) || 0;
  const conv = parseFloat(adGroup.conversions) || 0;
  const value = parseFloat(adGroup.conversionsValue) || 0;
  const clicks = parseFloat(adGroup.clicks) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const roas = cost > 0 ? (value * 1000000) / cost : 0;
  const convRate = clicks > 0 ? (conv / clicks) * 100 : 0;
  const valuePerConv = conv > 0 ? (value / conv) * 1000000 : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={getStatusVariant(adGroup.status)} className="text-xs shrink-0">
                    {adGroup.status}
                  </Badge>
                  {adGroup.searchImpressionShare && (
                    <span className="text-xs text-muted-foreground">
                      QI: {formatImpressionShare(adGroup.searchImpressionShare)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{adGroup.adGroupName}</p>
                <p className="text-xs text-muted-foreground truncate">{adGroup.campaignName}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Costo</p>
                  <p className="text-sm font-semibold">{formatCurrency(adGroup.costMicros)}</p>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t bg-muted/30 p-3 space-y-3">
            {/* Metriche traffico */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Impressioni</p>
                <p className="text-sm font-medium">{formatNumber(adGroup.impressions)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Click</p>
                <p className="text-sm font-medium">{formatNumber(adGroup.clicks)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="text-sm font-medium">{formatCtr(adGroup.ctr)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CPC medio</p>
                <p className="text-sm font-medium">{formatCurrency(adGroup.averageCpcMicros)}</p>
              </div>
            </div>

            {/* Conversioni */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Conversioni</p>
                <p className="text-sm font-medium">{formatNumber(adGroup.conversions)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Valore conv.</p>
                <p className="text-sm font-medium">{value > 0 ? formatCurrency(value * 1000000) : '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CPA</p>
                <p className="text-sm font-medium">{cpa > 0 ? formatCurrency(cpa) : '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">ROAS</p>
                <p className={`text-sm font-medium ${roas >= 1 ? 'text-green-600' : roas > 0 ? 'text-orange-600' : ''}`}>
                  {roas > 0 ? roas.toFixed(2) : '-'}
                </p>
              </div>
            </div>

            {/* Quota impressioni e target */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">QI persa rank</p>
                <p className="text-sm font-medium">{formatImpressionShare(adGroup.searchImpressionShareLostRank)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">QI persa budget</p>
                <p className="text-sm font-medium">{formatImpressionShare(adGroup.searchImpressionShareLostBudget)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CPA Target</p>
                <p className="text-sm font-medium">{formatCurrency(adGroup.targetCpaMicros)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Tasso conv.</p>
                <p className="text-sm font-medium">{convRate > 0 ? `${convRate.toFixed(2)}%` : '-'}</p>
              </div>
            </div>

            {/* Altre metriche */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Val/conv</p>
                <p className="text-sm font-medium">{valuePerConv > 0 ? formatCurrency(valuePerConv) : '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Tel.</p>
                <p className="text-sm font-medium">{formatNumber(adGroup.phoneCalls)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Chat</p>
                <p className="text-sm font-medium">{formatNumber(adGroup.messageChats)}</p>
              </div>
            </div>

            {/* Azioni */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate();
                }}
              >
                Vedi Annunci
              </Button>
              <ModifyButton
                accountId={accountId}
                entityType="ad_group"
                entityId={adGroup.adGroupId}
                entityName={adGroup.adGroupName}
                currentValue={{
                  status: adGroup.status,
                }}
                onSuccess={onRefresh}
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AdGroupsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<AdGroupWithAds> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const campaignIdFilter = searchParams.get('campaignId');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  // Get campaign name from first result
  const campaignName = data?.data?.[0]?.campaignName || null;

  const clearFilter = () => {
    setSearchParams({});
  };
  const [filters, setFilters] = useState<AdGroupFilters>({
    page: 1,
    limit: 50,
    sortBy: 'costMicros',
    sortOrder: 'DESC',
  });
  const [searchInput, setSearchInput] = useState('');

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const apiFilters = {
        ...filters,
        ...(campaignIdFilter && { campaignId: campaignIdFilter }),
      };
      const result = await getAdGroups(accountId, apiFilters);
      setData(result as PaginatedResponse<AdGroupWithAds>);
    } catch (err) {
      console.error('Failed to load ad groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters, campaignIdFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filtra per stato (client-side)
  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === 'all') return data.data;
    return data.data.filter(ag => ag.status === statusFilter);
  }, [data, statusFilter]);

  // Conta per stato
  const statusCounts = useMemo(() => {
    if (!data?.data) return { ENABLED: 0, PAUSED: 0, REMOVED: 0 };
    return data.data.reduce((acc, ag) => {
      acc[ag.status] = (acc[ag.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

  const toggleCard = (id: string) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const pageIndex = (filters.page || 1) - 1;
  const pageSize = filters.limit || 50;
  const pageCount = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Gruppi di Annunci</h2>
          {campaignIdFilter && campaignName && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <button
                onClick={() => navigate(`/audit/${accountId}/campaigns`)}
                className="hover:text-primary hover:underline transition-colors"
              >
                Campagne
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground truncate max-w-[200px]">{campaignName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-2 hover:bg-destructive/10 hover:text-destructive"
                onClick={clearFilter}
                title="Rimuovi filtro"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {accountId && (
            <AIAnalysisPanel
              accountId={accountId}
              moduleId={7}
              moduleName="Gruppi di annunci"
            />
          )}
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti ({data?.data?.length || 0})</SelectItem>
            <SelectItem value="ENABLED">Attivi ({statusCounts.ENABLED || 0})</SelectItem>
            <SelectItem value="PAUSED">In pausa ({statusCounts.PAUSED || 0})</SelectItem>
            <SelectItem value="REMOVED">Rimossi ({statusCounts.REMOVED || 0})</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Cerca ad group..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Mobile: Card espandibili */}
      {isMobile ? (
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
                {filteredData.map((adGroup) => (
                  <AdGroupCardMobile
                    key={adGroup.id}
                    adGroup={adGroup}
                    isOpen={openCards.has(adGroup.id)}
                    onToggle={() => toggleCard(adGroup.id)}
                    accountId={accountId!}
                    onRefresh={loadData}
                    onNavigate={() => navigate(`/audit/${accountId}/ads?adGroupId=${adGroup.adGroupId}`)}
                  />
                ))}
                {filteredData.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nessun ad group trovato
                  </div>
                )}
              </div>

              {/* Info risultati */}
              {filteredData.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {filteredData.length} gruppi di annunci
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Desktop: Tabella */
        <DataTable
          columns={getColumns(accountId!, loadData, navigate)}
          data={filteredData}
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
    </div>
  );
}
