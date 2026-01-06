import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getNegativeKeywords } from '@/api/audit';
import { formatMatchType } from '@/lib/format';
import type { NegativeKeyword, PaginatedResponse, BaseFilters } from '@/types/audit';

const columns: ColumnDef<NegativeKeyword>[] = [
  {
    accessorKey: 'keywordText',
    header: 'Keyword Negativa',
    cell: ({ row }) => (
      <p className="font-medium">{row.original.keywordText}</p>
    ),
  },
  {
    accessorKey: 'matchType',
    header: 'Match Type',
    cell: ({ row }) => formatMatchType(row.original.matchType),
  },
  {
    accessorKey: 'level',
    header: 'Livello',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.level}
      </Badge>
    ),
  },
  {
    accessorKey: 'campaignName',
    header: 'Campagna',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.campaignName || '-'}</span>
    ),
  },
  {
    accessorKey: 'adGroupName',
    header: 'Ad Group',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.adGroupName || '-'}</span>
    ),
  },
  {
    accessorKey: 'sharedSetName',
    header: 'Lista Condivisa',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.sharedSetName || '-'}</span>
    ),
  },
];

export function NegativeKeywordsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<NegativeKeyword> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<BaseFilters>({
    page: 1,
    limit: 50,
    sortBy: 'keywordText',
    sortOrder: 'ASC',
  });
  const [searchInput, setSearchInput] = useState('');

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const result = await getNegativeKeywords(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load negative keywords:', err);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Negative Keywords</h2>
        <Input
          placeholder="Cerca negativa..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />
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
