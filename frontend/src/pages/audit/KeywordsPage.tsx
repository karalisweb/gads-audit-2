import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getKeywords } from '@/api/audit';
import { useIsMobile } from '@/hooks/useIsMobile';
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

// Card espandibile per mobile
function KeywordCardMobile({
  keyword,
  isOpen,
  onToggle,
  accountId,
  onRefresh,
}: {
  keyword: Keyword;
  isOpen: boolean;
  onToggle: () => void;
  accountId: string;
  onRefresh: () => void;
}) {
  const cost = parseFloat(keyword.costMicros) || 0;
  const conv = parseFloat(keyword.conversions) || 0;
  const value = parseFloat(keyword.conversionsValue) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const roas = cost > 0 ? (value * 1000000) / cost : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={getStatusVariant(keyword.status)} className="text-xs shrink-0">
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
                  {keyword.adGroupName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Costo</p>
                  <p className="text-sm font-semibold">{formatCurrency(keyword.costMicros)}</p>
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
                <p className="text-sm font-medium">{formatNumber(keyword.impressions)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Click</p>
                <p className="text-sm font-medium">{formatNumber(keyword.clicks)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="text-sm font-medium">{formatCtr(keyword.ctr)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CPC medio</p>
                <p className="text-sm font-medium">{formatCurrency(keyword.averageCpcMicros)}</p>
              </div>
            </div>

            {/* Conversioni */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Conversioni</p>
                <p className="text-sm font-medium">{formatNumber(keyword.conversions)}</p>
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

            {/* Quality Score */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CTR prev.</p>
                <p className="text-sm font-medium">{keyword.expectedCtr || '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Esp. LP</p>
                <p className="text-sm font-medium">{keyword.landingPageExperience || '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Pert. ann.</p>
                <p className="text-sm font-medium">{keyword.creativeRelevance || '-'}</p>
              </div>
            </div>

            {/* Quota impressioni */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">QI Ricerca</p>
                <p className="text-sm font-medium">
                  {keyword.searchImpressionShare ? `${(parseFloat(keyword.searchImpressionShare) * 100).toFixed(1)}%` : '-'}
                </p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">QI persa rank</p>
                <p className="text-sm font-medium">
                  {keyword.searchImpressionShareLostRank ? `${(parseFloat(keyword.searchImpressionShareLostRank) * 100).toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>

            {/* URL e azioni */}
            {keyword.finalUrl && (
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground mb-1">URL finale</p>
                <a
                  href={keyword.finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline break-all"
                >
                  {keyword.finalUrl}
                </a>
              </div>
            )}

            {/* Azioni */}
            <div className="pt-2">
              <ModifyButton
                accountId={accountId}
                entityType="keyword"
                entityId={keyword.keywordId}
                entityName={keyword.keywordText}
                currentValue={{
                  status: keyword.status,
                  finalUrl: keyword.finalUrl,
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

export function KeywordsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<Keyword> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<KeywordFilters>({
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
      const result = await getKeywords(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load keywords:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters]);

  // Filtra per stato (client-side)
  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === 'all') return data.data;
    return data.data.filter(k => k.status === statusFilter);
  }, [data, statusFilter]);

  // Conta per stato
  const statusCounts = useMemo(() => {
    if (!data?.data) return { ENABLED: 0, PAUSED: 0, REMOVED: 0 };
    return data.data.reduce((acc, k) => {
      acc[k.status] = (acc[k.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

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
        <h2 className="text-xl sm:text-2xl font-bold">Keywords</h2>
        <div className="flex items-center gap-2">
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
          placeholder="Cerca keyword..."
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
                {filteredData.map((keyword) => (
                  <KeywordCardMobile
                    key={keyword.id}
                    keyword={keyword}
                    isOpen={openCards.has(keyword.id)}
                    onToggle={() => toggleCard(keyword.id)}
                    accountId={accountId!}
                    onRefresh={loadData}
                  />
                ))}
                {filteredData.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nessuna keyword trovata
                  </div>
                )}
              </div>

              {/* Info risultati */}
              {filteredData.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {filteredData.length} keywords
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Desktop: Tabella */
        <DataTable
          columns={getColumns(accountId!, loadData)}
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
