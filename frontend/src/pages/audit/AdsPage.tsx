import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AIAnalysisPanel } from '@/components/ai';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

function AdCard({ ad }: { ad: Ad }) {
  const [isOpen, setIsOpen] = useState(false);

  const cost = parseFloat(ad.costMicros) || 0;
  const conv = parseFloat(ad.conversions) || 0;
  const clicks = parseFloat(ad.clicks) || 0;
  const value = parseFloat(ad.conversionsValue) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const roas = cost > 0 ? (value * 1000000) / cost : 0;
  const convRate = clicks > 0 ? (conv / clicks) * 100 : 0;

  const headlinesCount = ad.headlines?.length || 0;
  const descriptionsCount = ad.descriptions?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={getStatusVariant(ad.status)} className="text-xs">
                    {ad.status}
                  </Badge>
                  <Badge variant={getAdStrengthVariant(ad.adStrength)} className="text-xs">
                    {ad.adStrength || '-'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ad.adType?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{ad.adGroupName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ad.campaignName}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Titoli ({headlinesCount})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Descrizioni ({descriptionsCount})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-4 gap-3 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Costo</p>
                    <p className="text-sm font-medium">{formatCurrency(ad.costMicros)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conv.</p>
                    <p className="text-sm font-medium">{formatNumber(ad.conversions)}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Titoli */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Titoli ({ad.headlines?.length || 0})</h4>
                {ad.headlines && ad.headlines.length > 0 ? (
                  <ul className="space-y-1">
                    {ad.headlines.map((h, i) => (
                      <li key={i} className="text-sm py-1 px-2 bg-background rounded border">
                        {typeof h === 'object' ? h.text : h}
                        {typeof h === 'object' && h.pinnedField && (
                          <span className="ml-2 text-xs text-blue-600">
                            (Pinnato: {h.pinnedField})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun titolo</p>
                )}
              </div>

              {/* Descrizioni */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Descrizioni ({ad.descriptions?.length || 0})</h4>
                {ad.descriptions && ad.descriptions.length > 0 ? (
                  <ul className="space-y-1">
                    {ad.descriptions.map((d, i) => (
                      <li key={i} className="text-sm py-1 px-2 bg-background rounded border">
                        {typeof d === 'object' ? d.text : d}
                        {typeof d === 'object' && d.pinnedField && (
                          <span className="ml-2 text-xs text-blue-600">
                            (Pinnato: {d.pinnedField})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuna descrizione</p>
                )}
              </div>
            </div>

            {/* URL e Path */}
            {ad.finalUrls && ad.finalUrls.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">URL finale</h4>
                {ad.finalUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block truncate"
                  >
                    {url}
                  </a>
                ))}
                {(ad.path1 || ad.path2) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Path: /{ad.path1 || ''}{ad.path2 ? `/${ad.path2}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Metriche dettagliate */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Metriche dettagliate</h4>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Impr.</p>
                  <p className="text-sm font-medium">{formatNumber(ad.impressions)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Click</p>
                  <p className="text-sm font-medium">{formatNumber(ad.clicks)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CTR</p>
                  <p className="text-sm font-medium">{formatCtr(ad.ctr)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPC medio</p>
                  <p className="text-sm font-medium">{formatCurrency(ad.averageCpcMicros)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valore conv.</p>
                  <p className="text-sm font-medium">
                    {value > 0 ? formatCurrency(value * 1000000) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tasso conv.</p>
                  <p className="text-sm font-medium">
                    {convRate > 0 ? `${convRate.toFixed(2)}%` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tel.</p>
                  <p className="text-sm font-medium">{formatNumber(ad.phoneCalls)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chat</p>
                  <p className="text-sm font-medium">{formatNumber(ad.messageChats)}</p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AdsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PaginatedResponse<Ad> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const campaignIdFilter = searchParams.get('campaignId');
  const adGroupIdFilter = searchParams.get('adGroupId');
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
      const apiFilters = {
        ...filters,
        ...(campaignIdFilter && { campaignId: campaignIdFilter }),
        ...(adGroupIdFilter && { adGroupId: adGroupIdFilter }),
      };
      const result = await getAds(accountId, apiFilters);
      setData(result);
    } catch (err) {
      console.error('Failed to load ads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters, campaignIdFilter, adGroupIdFilter]);

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

  const pageIndex = (filters.page || 1) - 1;
  const pageSize = filters.limit || 50;
  const pageCount = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Annunci</h2>
          {(campaignIdFilter || adGroupIdFilter) && (
            <p className="text-sm text-muted-foreground">
              Filtrato per {campaignIdFilter ? 'campagna' : 'ad group'}
            </p>
          )}
        </div>
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data?.data.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                Nessun annuncio trovato
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
    </div>
  );
}
