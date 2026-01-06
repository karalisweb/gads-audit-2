import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AIAnalysisPanel } from '@/components/ai';
import { getKeywords } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  formatImpressionShare,
  formatMatchType,
  formatQualityScore,
  getStatusVariant,
  getQualityScoreColor,
} from '@/lib/format';
import type { Keyword, PaginatedResponse, KeywordFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

const columns: ColumnDef<Keyword>[] = [
  {
    accessorKey: 'keywordText',
    header: 'Keyword',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <p className="font-medium truncate">{row.original.keywordText}</p>
      </div>
    ),
  },
  {
    accessorKey: 'matchType',
    header: 'Match',
    cell: ({ row }) => (
      <span className="text-xs">{formatMatchType(row.original.matchType)}</span>
    ),
  },
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
    accessorKey: 'qualityScore',
    header: 'QS',
    cell: ({ row }) => (
      <span className={`font-semibold ${getQualityScoreColor(row.original.qualityScore)}`}>
        {formatQualityScore(row.original.qualityScore)}
      </span>
    ),
  },
  {
    accessorKey: 'finalUrl',
    header: 'URL',
    cell: ({ row }) => (
      row.original.finalUrl ? (
        <a
          href={row.original.finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline truncate max-w-[150px] block"
        >
          {row.original.finalUrl}
        </a>
      ) : <span className="text-muted-foreground">-</span>
    ),
  },
  {
    accessorKey: 'landingPageExperience',
    header: 'Esp. landing',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.landingPageExperience || '-'}</span>
    ),
  },
  {
    accessorKey: 'creativeRelevance',
    header: 'Pertinenza',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.creativeRelevance || '-'}</span>
    ),
  },
  {
    accessorKey: 'expectedCtr',
    header: 'CTR previsto',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.expectedCtr || '-'}</span>
    ),
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
    header: 'Telefonate',
    cell: ({ row }) => formatNumber(row.original.phoneCalls),
  },
];

export function KeywordsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<Keyword> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<KeywordFilters>({
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
      const result = await getKeywords(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load keywords:', err);
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
    // TODO: Implementare la creazione delle decisioni
    console.log('Raccomandazioni approvate:', recommendations);
    alert(`${recommendations.length} raccomandazioni approvate! (funzionalita decisioni in arrivo)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Keywords</h2>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Cerca keyword..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          {accountId && (
            <AIAnalysisPanel
              accountId={accountId}
              moduleId={19}
              moduleName="Prestazioni parole chiave"
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
