import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getCampaigns } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  formatImpressionShare,
  getStatusVariant,
} from '@/lib/format';
import type { Campaign, PaginatedResponse, CampaignFilters } from '@/types/audit';

const columns: ColumnDef<Campaign>[] = [
  {
    accessorKey: 'campaignName',
    header: 'Campagna',
    cell: ({ row }) => (
      <div className="max-w-[300px]">
        <p className="font-medium truncate">{row.original.campaignName}</p>
        <p className="text-xs text-gray-500">{row.original.campaignId}</p>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => (
      <Badge variant={getStatusVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'biddingStrategyType',
    header: 'Strategia',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.biddingStrategyType?.replace(/_/g, ' ')}</span>
    ),
  },
  {
    accessorKey: 'impressions',
    header: 'Impressioni',
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
    accessorKey: 'conversionsValue',
    header: 'Valore Conv.',
    cell: ({ row }) => formatCurrency(parseFloat(row.original.conversionsValue) * 1000000),
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
    accessorKey: 'searchImpressionShare',
    header: 'QI Ricerca',
    cell: ({ row }) => formatImpressionShare(row.original.searchImpressionShare),
  },
  {
    accessorKey: 'searchImpressionShareLostRank',
    header: 'QI Persa (Rank)',
    cell: ({ row }) => formatImpressionShare(row.original.searchImpressionShareLostRank),
  },
];

export function CampaignsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<Campaign> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CampaignFilters>({
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
