import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
import { AIAnalysisPanel } from '@/components/ai';
import { Ban, Plus } from 'lucide-react';
import { getSearchTerms } from '@/api/audit';
import { createDecision } from '@/api/decisions';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { SearchTerm, PaginatedResponse, SearchTermFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

function SearchTermCard({
  term,
  onAddNegative,
}: {
  term: SearchTerm;
  onAddNegative: (term: SearchTerm, level: 'campaign' | 'adgroup', matchType: string) => void;
}) {
  const cost = parseFloat(term.costMicros) || 0;
  const conv = parseFloat(term.conversions) || 0;
  const cpa = conv > 0 ? cost / conv : 0;

  // Determine if this might be a problematic search term
  const hasSpend = cost > 0;
  const noConversions = conv === 0;
  const isPotentialNegative = hasSpend && noConversions;

  return (
    <div className={`border rounded-lg bg-card p-3 ${isPotentialNegative ? 'border-orange-300' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium">{term.searchTerm}</p>
            {isPotentialNegative && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Potenziale negativa
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Keyword: {term.keywordText || '-'}</span>
            <span>•</span>
            <span>{term.matchTypeTriggered}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">
            {term.campaignName} → {term.adGroupName}
          </p>
        </div>
        <div className="grid grid-cols-5 gap-3 text-right shrink-0">
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
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

  // Negative keyword dialog state
  const [negativeDialogOpen, setNegativeDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<SearchTerm | null>(null);
  const [negativeLevel, setNegativeLevel] = useState<'campaign' | 'adgroup'>('campaign');
  const [negativeMatchType, setNegativeMatchType] = useState<string>('EXACT');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleOpenNegativeDialog = (
    term: SearchTerm,
    level: 'campaign' | 'adgroup',
    matchType: string,
  ) => {
    setSelectedTerm(term);
    setNegativeLevel(level);
    setNegativeMatchType(matchType);
    setNegativeDialogOpen(true);
  };

  const handleCreateNegative = async () => {
    if (!selectedTerm || !accountId) return;

    setIsSubmitting(true);
    try {
      const entityType = negativeLevel === 'campaign'
        ? 'negative_keyword_campaign'
        : 'negative_keyword_adgroup';

      await createDecision({
        auditId: accountId,
        moduleId: 22, // Search terms analysis module
        entityType,
        entityId: negativeLevel === 'campaign'
          ? selectedTerm.campaignId
          : selectedTerm.adGroupId,
        entityName: selectedTerm.searchTerm,
        actionType: 'ADD_AS_NEGATIVE',
        afterValue: {
          keyword: selectedTerm.searchTerm,
          matchType: negativeMatchType,
          campaignId: selectedTerm.campaignId,
          campaignName: selectedTerm.campaignName,
          adGroupId: negativeLevel === 'adgroup' ? selectedTerm.adGroupId : undefined,
          adGroupName: negativeLevel === 'adgroup' ? selectedTerm.adGroupName : undefined,
        },
        rationale: `Search term "${selectedTerm.searchTerm}" ha speso ${formatCurrency(selectedTerm.costMicros)} senza conversioni`,
      });

      setNegativeDialogOpen(false);
      setSelectedTerm(null);
      alert('Keyword negativa aggiunta alle decisioni! Vai alla pagina Decisioni per approvarla ed esportarla.');
    } catch (err) {
      console.error('Failed to create negative keyword decision:', err);
      alert('Errore durante la creazione della decisione');
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Search Terms</h2>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Cerca search term..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
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

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Ban className="h-4 w-4 text-orange-600" />
        <span>Clicca l'icona per aggiungere un termine come keyword negativa</span>
      </div>

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

          {/* Pagination */}
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
              {isSubmitting ? 'Creazione...' : 'Crea Decisione'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
