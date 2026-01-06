import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AIAnalysisPanel } from '@/components/ai';
import { getAds } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  getStatusVariant,
  getAdStrengthVariant,
} from '@/lib/format';
import type { Ad, PaginatedResponse, BaseFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

const columns: ColumnDef<Ad>[] = [
  {
    accessorKey: 'campaignName',
    header: 'Campagna',
    cell: ({ row }) => (
      <span className="text-xs truncate max-w-[120px] block">{row.original.campaignName}</span>
    ),
  },
  {
    accessorKey: 'adGroupName',
    header: 'Gruppo',
    cell: ({ row }) => (
      <span className="text-xs truncate max-w-[120px] block">{row.original.adGroupName}</span>
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
    accessorKey: 'adType',
    header: 'Tipo',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.adType?.replace(/_/g, ' ')}</span>
    ),
  },
  {
    accessorKey: 'adStrength',
    header: 'Efficacia',
    cell: ({ row }) => (
      <Badge variant={getAdStrengthVariant(row.original.adStrength)} className="text-xs">
        {row.original.adStrength || '-'}
      </Badge>
    ),
  },
  {
    id: 'headlines',
    header: 'Titoli',
    cell: ({ row }) => (
      <div className="max-w-[250px]">
        {row.original.headlines?.map((h, i) => (
          <p key={i} className="text-xs truncate">{typeof h === 'object' ? h.text : h}</p>
        ))}
        {(!row.original.headlines || row.original.headlines.length === 0) && (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
    ),
  },
  {
    id: 'descriptions',
    header: 'Descrizioni',
    cell: ({ row }) => (
      <div className="max-w-[250px]">
        {row.original.descriptions?.map((d, i) => (
          <p key={i} className="text-xs truncate">{typeof d === 'object' ? d.text : d}</p>
        ))}
        {(!row.original.descriptions || row.original.descriptions.length === 0) && (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
    ),
  },
  {
    id: 'finalUrls',
    header: 'URL finale',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        {row.original.finalUrls?.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline truncate block"
          >
            {url}
          </a>
        ))}
        {(!row.original.finalUrls || row.original.finalUrls.length === 0) && (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
    ),
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
    accessorKey: 'averageCpcMicros',
    header: 'CPC medio',
    cell: ({ row }) => formatCurrency(row.original.averageCpcMicros),
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
    header: 'Costo/conv',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return conv > 0 ? formatCurrency(cost / conv) : '-';
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
    id: 'convRate',
    header: 'Tasso conv',
    cell: ({ row }) => {
      const clicks = parseFloat(row.original.clicks) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return clicks > 0 ? `${((conv / clicks) * 100).toFixed(2)}%` : '-';
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
    accessorKey: 'phoneCalls',
    header: 'Telefonate',
    cell: ({ row }) => formatNumber(row.original.phoneCalls),
  },
  {
    accessorKey: 'messageChats',
    header: 'Chat',
    cell: ({ row }) => formatNumber(row.original.messageChats),
  },
];

export function AdsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<Ad> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<BaseFilters>({
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
      const result = await getAds(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load ads:', err);
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

  const handleCreateDecisions = (recommendations: AIRecommendation[]) => {
    console.log('Raccomandazioni approvate:', recommendations);
    alert(`${recommendations.length} raccomandazioni approvate!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Annunci</h2>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Cerca annuncio..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          {accountId && (
            <AIAnalysisPanel
              accountId={accountId}
              moduleId={15}
              moduleName="Efficacia annunci"
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
