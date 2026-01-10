import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AIAnalysisPanel } from '@/components/ai';
import { ModifyButton } from '@/components/modifications';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LayoutGrid, Table2 } from 'lucide-react';
import { getKeywords } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  formatMatchType,
  formatQualityScore,
  getStatusVariant,
  getQualityScoreColor,
} from '@/lib/format';
import type { Keyword, PaginatedResponse, KeywordFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

function getColumns(accountId: string, onRefresh: () => void): ColumnDef<Keyword>[] {
  return [
  {
    accessorKey: 'keywordText',
    header: 'Keyword',
    cell: ({ row }) => (
      <div className="max-w-[180px]">
        <p className="font-medium truncate">{row.original.keywordText}</p>
        <p className="text-xs text-muted-foreground truncate">{row.original.adGroupName}</p>
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
    accessorKey: 'finalUrl',
    header: 'URL',
    cell: ({ row }) => {
      const url = row.original.finalUrl;
      if (!url) return <span className="text-muted-foreground">-</span>;
      // Estrai il dominio per mostrarlo in modo compatto
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs max-w-[150px] truncate block"
            title={url}
          >
            {domain}
          </a>
        );
      } catch {
        return (
          <span className="text-xs text-muted-foreground truncate max-w-[150px] block" title={url}>
            {url}
          </span>
        );
      }
    },
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
    accessorKey: 'qualityScore',
    header: 'QS',
    cell: ({ row }) => (
      <span className={`font-semibold ${getQualityScoreColor(row.original.qualityScore)}`}>
        {formatQualityScore(row.original.qualityScore)}
      </span>
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
    cell: ({ row }) => {
      const val = row.original.searchImpressionShare;
      return val ? `${(parseFloat(val) * 100).toFixed(1)}%` : '-';
    },
  },
  {
    accessorKey: 'searchImpressionShareLostRank',
    header: 'QI persa rank',
    cell: ({ row }) => {
      const val = row.original.searchImpressionShareLostRank;
      return val ? `${(parseFloat(val) * 100).toFixed(1)}%` : '-';
    },
  },
  {
    accessorKey: 'expectedCtr',
    header: 'CTR prev.',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.expectedCtr || '-'}</span>
    ),
  },
  {
    accessorKey: 'landingPageExperience',
    header: 'Esp. LP',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.landingPageExperience || '-'}</span>
    ),
  },
  {
    accessorKey: 'creativeRelevance',
    header: 'Pert. ann.',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.creativeRelevance || '-'}</span>
    ),
  },
  {
    accessorKey: 'phoneCalls',
    header: 'Tel.',
    cell: ({ row }) => formatNumber(row.original.phoneCalls),
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
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <ModifyButton
        accountId={accountId}
        entityType="keyword"
        entityId={row.original.keywordId}
        entityName={row.original.keywordText}
        currentValue={{
          status: row.original.status,
          finalUrl: row.original.finalUrl,
        }}
        onSuccess={onRefresh}
      />
    ),
  },
];
}

function KeywordCard({ keyword }: { keyword: Keyword }) {
  const [isOpen, setIsOpen] = useState(false);

  const cost = parseFloat(keyword.costMicros) || 0;
  const conv = parseFloat(keyword.conversions) || 0;
  const clicks = parseFloat(keyword.clicks) || 0;
  const value = parseFloat(keyword.conversionsValue) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const roas = cost > 0 ? (value * 1000000) / cost : 0;
  const convRate = clicks > 0 ? (conv / clicks) * 100 : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={getStatusVariant(keyword.status)} className="text-xs">
                    {keyword.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatMatchType(keyword.matchType)}
                  </span>
                  <span className={`text-xs font-semibold ${getQualityScoreColor(keyword.qualityScore)}`}>
                    QS: {formatQualityScore(keyword.qualityScore)}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{keyword.keywordText}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {keyword.adGroupName} • {keyword.campaignName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-4 gap-3 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Costo</p>
                    <p className="text-sm font-medium">{formatCurrency(keyword.costMicros)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conv.</p>
                    <p className="text-sm font-medium">{formatNumber(keyword.conversions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPA</p>
                    <p className="text-sm font-medium">{cpa > 0 ? formatCurrency(cpa) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ROAS</p>
                    <p className={`text-sm font-medium ${roas >= 1 ? 'text-green-600' : roas > 0 ? 'text-orange-600' : ''}`}>
                      {roas > 0 ? roas.toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Impressioni</p>
                <p className="text-sm font-medium">{formatNumber(keyword.impressions)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Click</p>
                <p className="text-sm font-medium">{formatNumber(keyword.clicks)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="text-sm font-medium">{formatCtr(keyword.ctr)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPC medio</p>
                <p className="text-sm font-medium">{formatCurrency(keyword.averageCpcMicros)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Valore conv.</p>
                <p className="text-sm font-medium">{value > 0 ? formatCurrency(value * 1000000) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tasso conv.</p>
                <p className="text-sm font-medium">{convRate > 0 ? `${convRate.toFixed(2)}%` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefonate</p>
                <p className="text-sm font-medium">{formatNumber(keyword.phoneCalls)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IS di ricerca</p>
                <p className="text-sm font-medium">
                  {keyword.searchImpressionShare ? `${(parseFloat(keyword.searchImpressionShare) * 100).toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Rilevanza annuncio</p>
                <p className="text-sm font-medium">{keyword.creativeRelevance || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Esperienza landing page</p>
                <p className="text-sm font-medium">{keyword.landingPageExperience || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CTR previsto</p>
                <p className="text-sm font-medium">{keyword.expectedCtr || '-'}</p>
              </div>
            </div>
            {keyword.finalUrl && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">URL finale</p>
                <a
                  href={keyword.finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate block"
                >
                  {keyword.finalUrl}
                </a>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

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
    console.log('Raccomandazioni approvate:', recommendations);
    alert(`${recommendations.length} raccomandazioni approvate!`);
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={getColumns(accountId!, loadData)}
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
              <KeywordCard key={keyword.id} keyword={keyword} />
            ))}
            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna keyword trovata
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
