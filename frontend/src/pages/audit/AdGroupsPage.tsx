import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AIAnalysisPanel } from '@/components/ai';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getAdGroups, getAds } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  formatImpressionShare,
  getStatusVariant,
  getAdStrengthVariant,
} from '@/lib/format';
import type { AdGroup, Ad, PaginatedResponse, AdGroupFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

interface AdGroupWithAds extends AdGroup {
  ads?: Ad[];
  adsLoading?: boolean;
  adsLoaded?: boolean;
}

function AdGroupCard({
  adGroup,
  accountId,
  onLoadAds,
}: {
  adGroup: AdGroupWithAds;
  accountId: string;
  onLoadAds: (adGroupId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const cost = parseFloat(adGroup.costMicros) || 0;
  const conv = parseFloat(adGroup.conversions) || 0;
  const value = parseFloat(adGroup.conversionsValue) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const roas = cost > 0 ? (value * 1000000) / cost : 0;

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    if (open && !adGroup.adsLoaded && !adGroup.adsLoading) {
      onLoadAds(adGroup.adGroupId);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={getStatusVariant(adGroup.status)} className="text-xs">
                    {adGroup.status}
                  </Badge>
                  {adGroup.searchImpressionShare && (
                    <span className="text-xs text-muted-foreground">
                      QI: {formatImpressionShare(adGroup.searchImpressionShare)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{adGroup.adGroupName}</p>
                <p className="text-xs text-muted-foreground truncate">{adGroup.campaignName}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-5 gap-3 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Costo</p>
                    <p className="text-sm font-medium">{formatCurrency(adGroup.costMicros)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Click</p>
                    <p className="text-sm font-medium">{formatNumber(adGroup.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conv.</p>
                    <p className="text-sm font-medium">{formatNumber(adGroup.conversions)}</p>
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
            {/* Metriche aggiuntive */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Impr.</p>
                <p className="text-sm font-medium">{formatNumber(adGroup.impressions)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="text-sm font-medium">{formatCtr(adGroup.ctr)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPC medio</p>
                <p className="text-sm font-medium">{formatCurrency(adGroup.averageCpcMicros)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPA Target</p>
                <p className="text-sm font-medium">{formatCurrency(adGroup.targetCpaMicros)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">QI persa rank</p>
                <p className="text-sm font-medium">{formatImpressionShare(adGroup.searchImpressionShareLostRank)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tel.</p>
                <p className="text-sm font-medium">{formatNumber(adGroup.phoneCalls)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chat</p>
                <p className="text-sm font-medium">{formatNumber(adGroup.messageChats)}</p>
              </div>
            </div>

            {/* Annunci */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">
                  Annunci {adGroup.ads ? `(${adGroup.ads.length})` : ''}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/audit/${accountId}/ads?adGroupId=${adGroup.adGroupId}`)}
                >
                  Vedi tutti
                </Button>
              </div>

              {adGroup.adsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : adGroup.ads && adGroup.ads.length > 0 ? (
                <div className="space-y-2">
                  {adGroup.ads.slice(0, 5).map((ad) => (
                    <div key={ad.id} className="p-3 bg-background rounded border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getStatusVariant(ad.status)} className="text-xs">
                              {ad.status}
                            </Badge>
                            <Badge variant={getAdStrengthVariant(ad.adStrength)} className="text-xs">
                              {ad.adStrength || '-'}
                            </Badge>
                          </div>
                          {/* Titoli */}
                          {ad.headlines && ad.headlines.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1">Titoli:</p>
                              <div className="flex flex-wrap gap-1">
                                {ad.headlines.slice(0, 3).map((h, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded">
                                    {typeof h === 'object' ? h.text : h}
                                  </span>
                                ))}
                                {ad.headlines.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{ad.headlines.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Descrizioni */}
                          {ad.descriptions && ad.descriptions.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs text-muted-foreground mb-1">Descrizioni:</p>
                              <p className="text-xs truncate max-w-md">
                                {typeof ad.descriptions[0] === 'object'
                                  ? ad.descriptions[0].text
                                  : ad.descriptions[0]}
                                {ad.descriptions.length > 1 && (
                                  <span className="text-muted-foreground"> +{ad.descriptions.length - 1}</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-right shrink-0">
                          <div>
                            <p className="text-xs text-muted-foreground">Costo</p>
                            <p className="text-sm font-medium">{formatCurrency(ad.costMicros)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Conv.</p>
                            <p className="text-sm font-medium">{formatNumber(ad.conversions)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">CTR</p>
                            <p className="text-sm font-medium">{formatCtr(ad.ctr)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {adGroup.ads.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{adGroup.ads.length - 5} altri annunci
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nessun annuncio in questo gruppo</p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AdGroupsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PaginatedResponse<AdGroupWithAds> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const campaignIdFilter = searchParams.get('campaignId');
  const [filters, setFilters] = useState<AdGroupFilters>({
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
      };
      const result = await getAdGroups(accountId, apiFilters);
      setData(result as PaginatedResponse<AdGroupWithAds>);
    } catch (err) {
      console.error('Failed to load ad groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters, campaignIdFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleLoadAds = useCallback(
    async (adGroupId: string) => {
      if (!accountId || !data) return;

      // Mark as loading
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((ag) =>
            ag.adGroupId === adGroupId ? { ...ag, adsLoading: true } : ag,
          ),
        };
      });

      try {
        const adsResult = await getAds(accountId, {
          adGroupId,
          limit: 10,
          sortBy: 'costMicros',
          sortOrder: 'DESC',
        });

        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((ag) =>
              ag.adGroupId === adGroupId
                ? { ...ag, ads: adsResult.data, adsLoading: false, adsLoaded: true }
                : ag,
            ),
          };
        });
      } catch (err) {
        console.error('Failed to load ads:', err);
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((ag) =>
              ag.adGroupId === adGroupId ? { ...ag, adsLoading: false, adsLoaded: true } : ag,
            ),
          };
        });
      }
    },
    [accountId, data],
  );

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
          <h2 className="text-2xl font-bold">Ad Groups</h2>
          {campaignIdFilter && (
            <p className="text-sm text-muted-foreground">Filtrato per campagna</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Cerca ad group..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          {accountId && (
            <AIAnalysisPanel
              accountId={accountId}
              moduleId={7}
              moduleName="Gruppi di annunci"
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
            {data?.data.map((adGroup) => (
              <AdGroupCard
                key={adGroup.id}
                adGroup={adGroup}
                accountId={accountId!}
                onLoadAds={handleLoadAds}
              />
            ))}
            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                Nessun ad group trovato
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
