import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AIAnalysisPanel } from '@/components/ai';
import { getCampaigns } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  formatImpressionShare,
  getStatusVariant,
} from '@/lib/format';
import type { Campaign, PaginatedResponse, CampaignFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

export function CampaignsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<Campaign> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CampaignFilters>({
    page: 1,
    limit: 50,
    sortBy: 'costMicros',
    sortOrder: 'DESC',
  });
  const [searchInput, setSearchInput] = useState('');

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
  ];

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Campagne</h2>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Cerca campagna..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
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

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pageCount={data?.meta.totalPages || 1}
        pageIndex={(filters.page || 1) - 1}
        pageSize={filters.limit || 50}
        total={data?.meta.total || 0}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page: page + 1 }))}
        onPageSizeChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
        onSortChange={(sortBy, sortOrder) =>
          setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }))
        }
      />
    </div>
  );
}
