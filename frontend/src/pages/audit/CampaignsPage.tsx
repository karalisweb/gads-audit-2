import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { AIAnalysisPanel } from '@/components/ai';
import { ModifyButton } from '@/components/modifications';
import { LayoutGrid, Table2 } from 'lucide-react';
import { getCampaigns } from '@/api/audit';
import { useDefaultViewMode } from '@/hooks/useIsMobile';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  formatImpressionShare,
  getStatusVariant,
} from '@/lib/format';
import type { Campaign, PaginatedResponse, CampaignFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

// Card component for compact view
function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const cost = parseFloat(campaign.costMicros) || 0;
  const conv = parseFloat(campaign.conversions) || 0;
  const value = parseFloat(campaign.conversionsValue) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const roas = cost > 0 ? (value * 1000000) / cost : 0;

  return (
    <div
      className="border rounded-lg bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={getStatusVariant(campaign.status)} className="text-xs">
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
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-right">
          <div>
            <p className="text-xs text-muted-foreground">Costo</p>
            <p className="text-sm font-medium">{formatCurrency(campaign.costMicros)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Click</p>
            <p className="text-sm font-medium">{formatNumber(campaign.clicks)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conv.</p>
            <p className="text-sm font-medium">{formatNumber(campaign.conversions)}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">CPA</p>
            <p className="text-sm font-medium">{cpa > 0 ? formatCurrency(cpa) : '-'}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">ROAS</p>
            <p className={`text-sm font-medium ${roas >= 1 ? 'text-green-600' : roas > 0 ? 'text-orange-600' : ''}`}>
              {roas > 0 ? roas.toFixed(2) : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CampaignsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const defaultViewMode = useDefaultViewMode();
  const [data, setData] = useState<PaginatedResponse<Campaign> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CampaignFilters>({
    page: 1,
    limit: 50,
    sortBy: 'costMicros',
    sortOrder: 'DESC',
  });
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(defaultViewMode);

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

  const pageIndex = (filters.page || 1) - 1;
  const pageSize = filters.limit || 50;
  const pageCount = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Campagne</h2>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Input
            placeholder="Cerca..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full sm:w-48 md:w-64 order-1 sm:order-none"
          />
          <div className="flex items-center gap-2 order-none sm:order-1">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'cards' | 'table')}>
              <ToggleGroupItem value="cards" aria-label="Vista compatta" title="Vista compatta (cards)">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Vista estesa" title="Vista estesa (tabella)">
                <Table2 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
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
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <DataTable
          columns={columns}
          data={data?.data || []}
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

      {/* Cards View */}
      {viewMode === 'cards' && (
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
                {data?.data.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onClick={() => navigate(`/audit/${accountId}/ad-groups?campaignId=${campaign.campaignId}`)}
                  />
                ))}
                {(!data?.data || data.data.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nessuna campagna trovata
                  </div>
                )}
              </div>

              {/* Pagination for cards view */}
              {total > 0 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-muted-foreground">
                    {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, total)} di {total.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <select
                        className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                        value={pageSize}
                        onChange={(e) => setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                      >
                        {[25, 50, 100, 200].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))} disabled={pageIndex === 0}>{'«'}</Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setFilters((prev) => ({ ...prev, page: pageIndex }))} disabled={pageIndex === 0}>{'‹'}</Button>
                      <span className="text-sm px-2">{pageIndex + 1}/{pageCount}</span>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setFilters((prev) => ({ ...prev, page: pageIndex + 2 }))} disabled={pageIndex >= pageCount - 1}>{'›'}</Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setFilters((prev) => ({ ...prev, page: pageCount }))} disabled={pageIndex >= pageCount - 1}>{'»'}</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
