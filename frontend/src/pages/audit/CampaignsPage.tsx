import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AIAnalysisPanel } from '@/components/ai';
import { ModifyButton } from '@/components/modifications';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getCampaigns } from '@/api/audit';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  formatImpressionShare,
  getStatusVariant,
} from '@/lib/format';
import type { Campaign, PaginatedResponse, CampaignFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

// Card espandibile per mobile
function CampaignCardExpanded({
  campaign,
  isOpen,
  onToggle,
  onNavigate,
  accountId,
  onRefresh,
}: {
  campaign: Campaign;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  accountId: string;
  onRefresh: () => void;
}) {
  const cost = parseFloat(campaign.costMicros) || 0;
  const conv = parseFloat(campaign.conversions) || 0;
  const value = parseFloat(campaign.conversionsValue) || 0;
  const clicks = parseFloat(campaign.clicks) || 0;
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
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getStatusVariant(campaign.status)} className="text-xs shrink-0">
                    {campaign.status}
                  </Badge>
                  {campaign.searchImpressionShare && (
                    <span className="text-xs text-muted-foreground">
                      QI: {formatImpressionShare(campaign.searchImpressionShare)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{campaign.campaignName}</p>
                <p className="text-xs text-muted-foreground">{campaign.biddingStrategyType?.replace(/_/g, ' ')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Costo</p>
                  <p className="text-sm font-semibold">{formatCurrency(campaign.costMicros)}</p>
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
            {/* Metriche principali */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Impressioni</p>
                <p className="text-sm font-medium">{formatNumber(campaign.impressions)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Click</p>
                <p className="text-sm font-medium">{formatNumber(campaign.clicks)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="text-sm font-medium">{formatCtr(campaign.ctr)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CPC medio</p>
                <p className="text-sm font-medium">{formatCurrency(campaign.averageCpcMicros)}</p>
              </div>
            </div>

            {/* Conversioni */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Conversioni</p>
                <p className="text-sm font-medium">{formatNumber(campaign.conversions)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Valore conv.</p>
                <p className="text-sm font-medium">{formatCurrency(campaign.conversionsValue)}</p>
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

            {/* Quota impressioni */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">QI persa rank</p>
                <p className="text-sm font-medium">{formatImpressionShare(campaign.searchImpressionShareLostRank)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">QI persa budget</p>
                <p className="text-sm font-medium">{formatImpressionShare(campaign.searchImpressionShareLostBudget)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm font-medium">{formatCurrency(campaign.budgetMicros)}</p>
              </div>
            </div>

            {/* Metriche aggiuntive */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Tasso conv.</p>
                <p className="text-sm font-medium">{convRate > 0 ? `${convRate.toFixed(2)}%` : '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Val/conv</p>
                <p className="text-sm font-medium">{valuePerConv > 0 ? formatCurrency(valuePerConv) : '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">% Top</p>
                <p className="text-sm font-medium">{formatImpressionShare(campaign.topImpressionPercentage)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">% Abs Top</p>
                <p className="text-sm font-medium">{formatImpressionShare(campaign.absoluteTopImpressionPercentage)}</p>
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
                Vedi Ad Groups
              </Button>
              <ModifyButton
                accountId={accountId}
                entityType="campaign"
                entityId={campaign.campaignId}
                entityName={campaign.campaignName}
                currentValue={{
                  budget: campaign.budgetMicros,
                  status: campaign.status,
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

export function CampaignsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<Campaign> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CampaignFilters>({
    page: 1,
    limit: 50,
    sortBy: 'costMicros',
    sortOrder: 'DESC',
  });
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const result = await getCampaigns(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters]);

  // Filtra per stato (client-side per UX immediata)
  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === 'all') return data.data;
    return data.data.filter(c => c.status === statusFilter);
  }, [data, statusFilter]);

  // Conta per stato
  const statusCounts = useMemo(() => {
    if (!data?.data) return { ENABLED: 0, PAUSED: 0, REMOVED: 0 };
    return data.data.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

  const columns: ColumnDef<Campaign>[] = [
    {
      accessorKey: 'campaignName',
      header: 'Campagna',
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/audit/${accountId}/ad-groups?campaignId=${row.original.campaignId}`)}
          className="text-left hover:text-primary transition-colors"
        >
          <p className="font-medium truncate max-w-[200px] hover:underline">{row.original.campaignName}</p>
          <p className="text-xs text-muted-foreground">{row.original.biddingStrategyType?.replace(/_/g, ' ')}</p>
        </button>
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
      accessorKey: 'budgetMicros',
      header: 'Budget',
      cell: ({ row }) => formatCurrency(row.original.budgetMicros),
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
      accessorKey: 'topImpressionPercentage',
      header: '% top',
      cell: ({ row }) => formatImpressionShare(row.original.topImpressionPercentage),
    },
    {
      accessorKey: 'absoluteTopImpressionPercentage',
      header: '% abs top',
      cell: ({ row }) => formatImpressionShare(row.original.absoluteTopImpressionPercentage),
    },
    {
      accessorKey: 'phoneCalls',
      header: 'Tel.',
      cell: ({ row }) => formatNumber(row.original.phoneCalls),
    },
    {
      accessorKey: 'phoneImpressions',
      header: 'Impr. tel.',
      cell: ({ row }) => formatNumber(row.original.phoneImpressions),
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
          accountId={accountId!}
          entityType="campaign"
          entityId={row.original.campaignId}
          entityName={row.original.campaignName}
          currentValue={{
            budget: row.original.budgetMicros,
            status: row.original.status,
          }}
          onSuccess={loadData}
        />
      ),
    },
  ];

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCreateDecisions = (recommendations: AIRecommendation[]) => {
    console.log('Raccomandazioni approvate:', recommendations);
    alert(`${recommendations.length} raccomandazioni approvate!`);
  };

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
        <h2 className="text-xl sm:text-2xl font-bold">Campagne</h2>
        <div className="flex items-center gap-2">
          {accountId && (
            <AIAnalysisPanel
              accountId={accountId}
              moduleId={4}
              moduleName="Strategia di offerta"
              onCreateDecisions={handleCreateDecisions}
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
            <SelectItem value="all">Tutte ({data?.data?.length || 0})</SelectItem>
            <SelectItem value="ENABLED">Attive ({statusCounts.ENABLED || 0})</SelectItem>
            <SelectItem value="PAUSED">In pausa ({statusCounts.PAUSED || 0})</SelectItem>
            <SelectItem value="REMOVED">Rimosse ({statusCounts.REMOVED || 0})</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Cerca campagna..."
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
                {filteredData.map((campaign) => (
                  <CampaignCardExpanded
                    key={campaign.id}
                    campaign={campaign}
                    isOpen={openCards.has(campaign.id)}
                    onToggle={() => toggleCard(campaign.id)}
                    onNavigate={() => navigate(`/audit/${accountId}/ad-groups?campaignId=${campaign.campaignId}`)}
                    accountId={accountId!}
                    onRefresh={loadData}
                  />
                ))}
                {filteredData.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nessuna campagna trovata
                  </div>
                )}
              </div>

              {/* Info risultati */}
              {filteredData.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {filteredData.length} campagne
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Desktop: Tabella completa */
        <DataTable
          columns={columns}
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
