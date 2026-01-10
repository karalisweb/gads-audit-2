import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { AIAnalysisPanel } from '@/components/ai';
import { Ban, Plus, X, LayoutGrid, Table2 } from 'lucide-react';
import { getSearchTerms, getCampaigns, getAdGroups } from '@/api/audit';
import { createModification } from '@/api/modifications';
import { formatCurrency, formatNumber, formatCtr } from '@/lib/format';
import type { SearchTerm, Campaign, AdGroup, PaginatedResponse, SearchTermFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

// Column definitions for table view
const createColumns = (
  onAddNegative: (term: SearchTerm, level: 'campaign' | 'adgroup', matchType: string) => void
): ColumnDef<SearchTerm>[] => [
  {
    accessorKey: 'searchTerm',
    header: 'Termine di ricerca',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <p className="font-medium truncate">{row.original.searchTerm}</p>
      </div>
    ),
  },
  {
    accessorKey: 'keywordText',
    header: 'Keyword',
    cell: ({ row }) => (
      <span className="text-sm truncate max-w-[150px] block">{row.original.keywordText || '-'}</span>
    ),
  },
  {
    accessorKey: 'matchTypeTriggered',
    header: 'Match',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.matchTypeTriggered || '-'}</span>
    ),
  },
  {
    accessorKey: 'campaignName',
    header: 'Campagna',
    cell: ({ row }) => (
      <span className="text-sm truncate max-w-[150px] block">{row.original.campaignName}</span>
    ),
  },
  {
    accessorKey: 'adGroupName',
    header: 'Gruppo annunci',
    cell: ({ row }) => (
      <span className="text-sm truncate max-w-[150px] block">{row.original.adGroupName}</span>
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
    id: 'cpc',
    header: 'CPC',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const clicks = parseFloat(row.original.clicks) || 0;
      return clicks > 0 ? formatCurrency(cost / clicks) : '-';
    },
  },
  {
    accessorKey: 'conversions',
    header: 'Conv.',
    cell: ({ row }) => {
      const conv = parseFloat(row.original.conversions) || 0;
      const cost = parseFloat(row.original.costMicros) || 0;
      const noConversions = conv === 0 && cost > 0;
      return (
        <span className={noConversions ? 'text-orange-600 font-medium' : ''}>
          {formatNumber(row.original.conversions)}
        </span>
      );
    },
  },
  {
    accessorKey: 'conversionsValue',
    header: 'Val. Conv.',
    cell: ({ row }) => formatCurrency(row.original.conversionsValue),
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
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        onClick={() => onAddNegative(row.original, 'campaign', 'EXACT')}
        title="Aggiungi come negativa"
      >
        <Ban className="h-4 w-4" />
      </Button>
    ),
  },
];

function SearchTermCard({
  term,
  onAddNegative,
}: {
  term: SearchTerm;
  onAddNegative: (term: SearchTerm, level: 'campaign' | 'adgroup', matchType: string) => void;
}) {
  const cost = parseFloat(term.costMicros) || 0;
  const conv = parseFloat(term.conversions) || 0;
  const clicks = parseFloat(term.clicks) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const cpc = clicks > 0 ? cost / clicks : 0;

  // Determine if this might be a problematic search term
  const hasSpend = cost > 0;
  const noConversions = conv === 0;
  const isPotentialNegative = hasSpend && noConversions;

  return (
    <div className={`border rounded-lg bg-card p-3 ${isPotentialNegative ? 'border-orange-300' : ''}`}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-medium break-words">{term.searchTerm}</p>
            {isPotentialNegative && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Potenziale negativa
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 ml-auto lg:hidden"
              onClick={() => onAddNegative(term, 'campaign', 'EXACT')}
              title="Aggiungi come negativa"
            >
              <Ban className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>Keyword: {term.keywordText || '-'}</span>
            <span>•</span>
            <span>{term.matchTypeTriggered}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">
            {term.campaignName} → {term.adGroupName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Impr.</p>
              <p className="text-sm font-medium">{formatNumber(term.impressions)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Click</p>
              <p className="text-sm font-medium">{formatNumber(term.clicks)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costo</p>
              <p className="text-sm font-medium">{formatCurrency(term.costMicros)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CPC</p>
              <p className="text-sm font-medium">{cpc > 0 ? formatCurrency(cpc) : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conv.</p>
              <p className={`text-sm font-medium ${noConversions && hasSpend ? 'text-orange-600' : ''}`}>
                {formatNumber(term.conversions)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CPA</p>
              <p className="text-sm font-medium">{cpa > 0 ? formatCurrency(cpa) : '-'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 hidden lg:flex"
            onClick={() => onAddNegative(term, 'campaign', 'EXACT')}
            title="Aggiungi come negativa"
          >
            <Ban className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SearchTermsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<SearchTerm> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SearchTermFilters>({
    page: 1,
    limit: 50,
    sortBy: 'costMicros',
    sortOrder: 'DESC',
  });
  const [searchInput, setSearchInput] = useState('');

  // View mode: 'cards' (compact) or 'table' (extended with all columns)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Campaign/AdGroup filter options
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>('');

  // Negative keyword dialog state
  const [negativeDialogOpen, setNegativeDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<SearchTerm | null>(null);
  const [negativeLevel, setNegativeLevel] = useState<'campaign' | 'adgroup'>('campaign');
  const [negativeMatchType, setNegativeMatchType] = useState<string>('EXACT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handler for opening negative keyword dialog
  const handleOpenNegativeDialog = useCallback((
    term: SearchTerm,
    level: 'campaign' | 'adgroup',
    matchType: string,
  ) => {
    setSelectedTerm(term);
    setNegativeLevel(level);
    setNegativeMatchType(matchType);
    setNegativeDialogOpen(true);
  }, []);

  // Create columns with the dialog opener
  const columns = createColumns(handleOpenNegativeDialog);

  // Load campaigns for filter
  useEffect(() => {
    if (!accountId) return;
    getCampaigns(accountId, { limit: 500, sortBy: 'campaignName', sortOrder: 'ASC' })
      .then((result) => setCampaigns(result.data))
      .catch(console.error);
  }, [accountId]);

  // Load ad groups when campaign is selected
  useEffect(() => {
    if (!accountId || !selectedCampaignId) {
      setAdGroups([]);
      return;
    }
    getAdGroups(accountId, { campaignId: selectedCampaignId, limit: 500, sortBy: 'adGroupName', sortOrder: 'ASC' })
      .then((result) => setAdGroups(result.data))
      .catch(console.error);
  }, [accountId, selectedCampaignId]);

  const loadData = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const result = await getSearchTerms(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load search terms:', err);
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

  const handleCampaignChange = (value: string) => {
    setSelectedCampaignId(value);
    setSelectedAdGroupId(''); // Reset ad group when campaign changes
    setFilters((prev) => ({
      ...prev,
      campaignId: value || undefined,
      adGroupId: undefined,
      page: 1,
    }));
  };

  const handleAdGroupChange = (value: string) => {
    setSelectedAdGroupId(value);
    setFilters((prev) => ({
      ...prev,
      adGroupId: value || undefined,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setSelectedCampaignId('');
    setSelectedAdGroupId('');
    setSearchInput('');
    setFilters({
      page: 1,
      limit: 50,
      sortBy: 'costMicros',
      sortOrder: 'DESC',
    });
  };

  const handleCreateNegative = async () => {
    if (!selectedTerm || !accountId) return;

    setIsSubmitting(true);
    try {
      await createModification({
        accountId: accountId,
        entityType: 'negative_keyword',
        entityId: negativeLevel === 'campaign'
          ? selectedTerm.campaignId
          : selectedTerm.adGroupId,
        entityName: selectedTerm.searchTerm,
        modificationType: 'negative_keyword.add',
        beforeValue: undefined,
        afterValue: {
          keyword: selectedTerm.searchTerm,
          matchType: negativeMatchType,
          level: negativeLevel,
          campaignId: selectedTerm.campaignId,
          campaignName: selectedTerm.campaignName,
          adGroupId: negativeLevel === 'adgroup' ? selectedTerm.adGroupId : undefined,
          adGroupName: negativeLevel === 'adgroup' ? selectedTerm.adGroupName : undefined,
        },
      });

      setNegativeDialogOpen(false);
      setSelectedTerm(null);
      alert('Keyword negativa creata! Vai alla pagina Modifiche per approvarla.');
    } catch (err) {
      console.error('Failed to create negative keyword modification:', err);
      alert('Errore durante la creazione della modifica');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDecisions = (recommendations: AIRecommendation[]) => {
    console.log('Raccomandazioni approvate:', recommendations);
    alert(`${recommendations.length} raccomandazioni approvate!`);
  };

  const pageIndex = (filters.page || 1) - 1;
  const pageSize = filters.limit || 50;
  const pageCount = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  const hasActiveFilters = selectedCampaignId || selectedAdGroupId || searchInput;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Search Terms</h2>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
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
              moduleId={22}
              moduleName="Analisi termini di ricerca"
              onCreateDecisions={handleCreateDecisions}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCampaignId || 'all'} onValueChange={(v) => handleCampaignChange(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Tutte le campagne" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le campagne</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.campaignId} value={c.campaignId}>
                {c.campaignName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedAdGroupId || 'all'}
          onValueChange={(v) => handleAdGroupChange(v === 'all' ? '' : v)}
          disabled={!selectedCampaignId}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Tutti gli ad group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli ad group</SelectItem>
            {adGroups.map((ag) => (
              <SelectItem key={ag.adGroupId} value={ag.adGroupId}>
                {ag.adGroupName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Cerca search term..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Pulisci filtri
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Ban className="h-4 w-4 text-orange-600" />
        <span>Clicca l'icona per aggiungere un termine come keyword negativa</span>
      </div>

      {/* Table View (Extended) */}
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

      {/* Cards View (Compact) */}
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
                {data?.data.map((term) => (
                  <SearchTermCard
                    key={term.id}
                    term={term}
                    onAddNegative={handleOpenNegativeDialog}
                  />
                ))}
                {(!data?.data || data.data.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nessun search term trovato
                  </div>
                )}
              </div>

              {/* Pagination for cards view */}
              {total > 0 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, total)} di{' '}
                    {total.toLocaleString()} risultati
                  </div>
                  <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">Righe per pagina</p>
                      <select
                        className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                        value={pageSize}
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
                        disabled={pageIndex === 0}
                      >
                        {'<<'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((prev) => ({ ...prev, page: pageIndex }))}
                        disabled={pageIndex === 0}
                      >
                        {'<'}
                      </Button>
                      <span className="text-sm">
                        Pagina {pageIndex + 1} di {pageCount || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((prev) => ({ ...prev, page: pageIndex + 2 }))}
                        disabled={pageIndex >= pageCount - 1}
                      >
                        {'>'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((prev) => ({ ...prev, page: pageCount }))}
                        disabled={pageIndex >= pageCount - 1}
                      >
                        {'>>'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Negative Keyword Dialog */}
      <Dialog open={negativeDialogOpen} onOpenChange={setNegativeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Keyword Negativa</DialogTitle>
            <DialogDescription>
              Aggiungi "{selectedTerm?.searchTerm}" come keyword negativa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Livello</label>
              <Select
                value={negativeLevel}
                onValueChange={(v) => setNegativeLevel(v as 'campaign' | 'adgroup')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">
                    Campagna ({selectedTerm?.campaignName})
                  </SelectItem>
                  <SelectItem value="adgroup">
                    Ad Group ({selectedTerm?.adGroupName})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo di corrispondenza</label>
              <Select value={negativeMatchType} onValueChange={setNegativeMatchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXACT">Esatta [keyword]</SelectItem>
                  <SelectItem value="PHRASE">A frase "keyword"</SelectItem>
                  <SelectItem value="BROAD">Generica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Riepilogo:</p>
              <p>
                Keyword: <code className="bg-background px-1 rounded">{selectedTerm?.searchTerm}</code>
              </p>
              <p>
                Match: <code className="bg-background px-1 rounded">{negativeMatchType}</code>
              </p>
              <p>
                {negativeLevel === 'campaign' ? 'Campagna' : 'Ad Group'}:{' '}
                {negativeLevel === 'campaign' ? selectedTerm?.campaignName : selectedTerm?.adGroupName}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNegativeDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateNegative} disabled={isSubmitting}>
              <Plus className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Creazione...' : 'Crea Modifica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
