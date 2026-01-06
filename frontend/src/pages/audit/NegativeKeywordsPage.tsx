import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { LayoutGrid, Table2 } from 'lucide-react';
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

function NegativeKeywordCard({ keyword }: { keyword: NegativeKeyword }) {
  return (
    <div className="border rounded-lg bg-card p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {keyword.level}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatMatchType(keyword.matchType)}
            </span>
          </div>
          <p className="text-sm font-medium">{keyword.keywordText}</p>
          {keyword.campaignName && (
            <p className="text-xs text-muted-foreground truncate">
              {keyword.campaignName}
              {keyword.adGroupName && ` > ${keyword.adGroupName}`}
            </p>
          )}
          {keyword.sharedSetName && (
            <p className="text-xs text-blue-600 truncate">
              Lista: {keyword.sharedSetName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

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
        <div className="flex items-center gap-4">
          <Input
            placeholder="Cerca negativa..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as 'cards' | 'table')}
          >
            <ToggleGroupItem value="cards" aria-label="Vista compatta" title="Vista compatta (cards)">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista estesa" title="Vista estesa (tabella)">
              <Table2 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={data?.data || []}
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
      ) : (
        <>
          <div className="space-y-2">
            {data?.data.map((keyword) => (
              <NegativeKeywordCard key={keyword.id} keyword={keyword} />
            ))}
            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna keyword negativa trovata
              </div>
            )}
          </div>

          {/* Pagination for cards view */}
          {(data?.meta.total || 0) > 0 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Mostrando {((filters.page || 1) - 1) * (filters.limit || 50) + 1}-
                {Math.min((filters.page || 1) * (filters.limit || 50), data?.meta.total || 0)} di{' '}
                {(data?.meta.total || 0).toLocaleString()} risultati
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Righe per pagina</p>
                  <select
                    className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                    value={filters.limit || 50}
                    onChange={(e) => setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  >
                    {[25, 50, 100, 200].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
                    disabled={(filters.page || 1) === 1}
                  >
                    {'<<'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                    disabled={(filters.page || 1) === 1}
                  >
                    {'<'}
                  </Button>
                  <span className="text-sm">
                    Pagina {filters.page || 1} di {data?.meta.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    disabled={(filters.page || 1) >= (data?.meta.totalPages || 1)}
                  >
                    {'>'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: data?.meta.totalPages || 1 }))}
                    disabled={(filters.page || 1) >= (data?.meta.totalPages || 1)}
                  >
                    {'>>'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
