import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AIAnalysisPanel } from '@/components/ai';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ModifyButton } from '@/components/modifications';
import { getAds, getCampaigns, getAdGroups } from '@/api/audit';
import type { Campaign, AdGroup } from '@/types/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  getStatusVariant,
  getAdStrengthVariant,
} from '@/lib/format';
import type { Ad, PaginatedResponse, BaseFilters } from '@/types/audit';
import type { AIRecommendation } from '@/types/ai';

// Table columns for extended view
function getColumns(accountId: string, onRefresh: () => void, navigate: (path: string) => void): ColumnDef<Ad>[] {
  return [
  {
    accessorKey: 'adGroupName',
    header: 'Gruppo annunci',
    cell: ({ row }) => (
      <div className="max-w-[150px]">
        <button
          onClick={() => navigate(`/audit/${accountId}/keywords?campaignId=${row.original.campaignId}&adGroupId=${row.original.adGroupId}`)}
          className="font-medium truncate text-left hover:text-primary hover:underline transition-colors"
        >
          {row.original.adGroupName}
        </button>
        <p className="text-xs text-muted-foreground truncate">{row.original.campaignName}</p>
      </div>
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
      <span className="text-xs">{row.original.adType?.replace(/_/g, ' ') || '-'}</span>
    ),
  },
  {
    accessorKey: 'adStrength',
    header: 'Forza',
    cell: ({ row }) => (
      <Badge variant={getAdStrengthVariant(row.original.adStrength)} className="text-xs">
        {row.original.adStrength || '-'}
      </Badge>
    ),
  },
  {
    id: 'headlines',
    header: 'Titoli',
    cell: ({ row }) => {
      const count = row.original.headlines?.length || 0;
      const first = row.original.headlines?.[0];
      const firstText = first ? (typeof first === 'object' ? first.text : first) : '';
      return (
        <div className="max-w-[120px]">
          <span className="text-sm font-medium">{count}</span>
          {firstText && (
            <p className="text-[10px] text-muted-foreground truncate" title={firstText}>{firstText}</p>
          )}
        </div>
      );
    },
  },
  {
    id: 'descriptions',
    header: 'Descr.',
    cell: ({ row }) => {
      const count = row.original.descriptions?.length || 0;
      const first = row.original.descriptions?.[0];
      const firstText = first ? (typeof first === 'object' ? first.text : first) : '';
      return (
        <div className="max-w-[120px]">
          <span className="text-sm font-medium">{count}</span>
          {firstText && (
            <p className="text-[10px] text-muted-foreground truncate" title={firstText}>{firstText}</p>
          )}
        </div>
      );
    },
  },
  {
    id: 'finalUrl',
    header: 'URL',
    cell: ({ row }) => {
      const urls = row.original.finalUrls;
      if (!urls || urls.length === 0) return <span className="text-muted-foreground">-</span>;
      const url = urls[0];
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
    accessorKey: 'phoneCalls',
    header: 'Tel.',
    cell: ({ row }) => formatNumber(row.original.phoneCalls),
  },
  {
    accessorKey: 'messageChats',
    header: 'Chat',
    cell: ({ row }) => formatNumber(row.original.messageChats),
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
    id: 'valuePerConv',
    header: 'Val/conv',
    cell: ({ row }) => {
      const value = parseFloat(row.original.conversionsValue) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return conv > 0 ? formatCurrency((value / conv) * 1000000) : '-';
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const ad = row.original;
      // Get first headline text for entity name
      const firstHeadline = ad.headlines?.[0];
      const headlineText = firstHeadline
        ? (typeof firstHeadline === 'object' ? firstHeadline.text : firstHeadline)
        : ad.adGroupName;
      return (
        <ModifyButton
          accountId={accountId}
          entityType="ad"
          entityId={ad.adId}
          entityName={headlineText}
          currentValue={{
            status: ad.status,
            headlines: ad.headlines,
            descriptions: ad.descriptions,
            finalUrls: ad.finalUrls,
          }}
          onSuccess={onRefresh}
        />
      );
    },
  },
];
}

// Card espandibile per mobile con tutti i dati e ModifyButton
function AdCardMobile({
  ad,
  isOpen,
  onToggle,
  accountId,
  onRefresh,
}: {
  ad: Ad;
  isOpen: boolean;
  onToggle: () => void;
  accountId: string;
  onRefresh: () => void;
}) {
  const cost = parseFloat(ad.costMicros) || 0;
  const conv = parseFloat(ad.conversions) || 0;
  const clicks = parseFloat(ad.clicks) || 0;
  const value = parseFloat(ad.conversionsValue) || 0;
  const cpa = conv > 0 ? cost / conv : 0;
  const roas = cost > 0 ? (value * 1000000) / cost : 0;
  const convRate = clicks > 0 ? (conv / clicks) * 100 : 0;
  const valuePerConv = conv > 0 ? (value / conv) * 1000000 : 0;

  const headlinesCount = ad.headlines?.length || 0;
  const descriptionsCount = ad.descriptions?.length || 0;

  // Get first headline text for entity name
  const firstHeadline = ad.headlines?.[0];
  const headlineText = firstHeadline
    ? (typeof firstHeadline === 'object' ? firstHeadline.text : firstHeadline)
    : ad.adGroupName;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={getStatusVariant(ad.status)} className="text-xs shrink-0">
                    {ad.status}
                  </Badge>
                  <Badge variant={getAdStrengthVariant(ad.adStrength)} className="text-xs shrink-0">
                    {ad.adStrength || '-'}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate">{ad.adGroupName}</p>
                <p className="text-xs text-muted-foreground truncate">{ad.campaignName}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>T: {headlinesCount}</span>
                  <span>D: {descriptionsCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Costo</p>
                  <p className="text-sm font-semibold">{formatCurrency(ad.costMicros)}</p>
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
                <p className="text-sm font-medium">{formatNumber(ad.impressions)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Click</p>
                <p className="text-sm font-medium">{formatNumber(ad.clicks)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="text-sm font-medium">{formatCtr(ad.ctr)}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">CPC medio</p>
                <p className="text-sm font-medium">{formatCurrency(ad.averageCpcMicros)}</p>
              </div>
            </div>

            {/* Conversioni */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Conversioni</p>
                <p className="text-sm font-medium">{formatNumber(ad.conversions)}</p>
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

            {/* Altre metriche */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Tasso conv.</p>
                <p className="text-sm font-medium">{convRate > 0 ? `${convRate.toFixed(2)}%` : '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Val/conv</p>
                <p className="text-sm font-medium">{valuePerConv > 0 ? formatCurrency(valuePerConv) : '-'}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Tel./Chat</p>
                <p className="text-sm font-medium">{formatNumber(ad.phoneCalls)}/{formatNumber(ad.messageChats)}</p>
              </div>
            </div>

            {/* Titoli */}
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold mb-2">Titoli ({headlinesCount})</h4>
              {ad.headlines && ad.headlines.length > 0 ? (
                <div className="space-y-1">
                  {ad.headlines.map((h, i) => (
                    <div key={i} className="text-xs py-1 px-2 bg-background rounded border">
                      {typeof h === 'object' ? h.text : h}
                      {typeof h === 'object' && h.pinnedField && (
                        <span className="ml-1 text-[10px] text-blue-600">(P: {h.pinnedField})</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nessun titolo</p>
              )}
            </div>

            {/* Descrizioni */}
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold mb-2">Descrizioni ({descriptionsCount})</h4>
              {ad.descriptions && ad.descriptions.length > 0 ? (
                <div className="space-y-1">
                  {ad.descriptions.map((d, i) => (
                    <div key={i} className="text-xs py-1 px-2 bg-background rounded border">
                      {typeof d === 'object' ? d.text : d}
                      {typeof d === 'object' && d.pinnedField && (
                        <span className="ml-1 text-[10px] text-blue-600">(P: {d.pinnedField})</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nessuna descrizione</p>
              )}
            </div>

            {/* URL */}
            {ad.finalUrls && ad.finalUrls.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold mb-1">URL finale</h4>
                {ad.finalUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block break-all"
                  >
                    {url}
                  </a>
                ))}
                {(ad.path1 || ad.path2) && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Path: /{ad.path1 || ''}{ad.path2 ? `/${ad.path2}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Azione */}
            <div className="pt-2 border-t">
              <ModifyButton
                accountId={accountId}
                entityType="ad"
                entityId={ad.adId}
                entityName={headlineText}
                currentValue={{
                  status: ad.status,
                  headlines: ad.headlines,
                  descriptions: ad.descriptions,
                  finalUrls: ad.finalUrls,
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

export function AdsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  // Campaign selector state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);

  // Ad Group selector state
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>('all');
  const [isLoadingAdGroups, setIsLoadingAdGroups] = useState(false);

  // Get filter names from data
  const filterInfo = data?.data?.[0] ? {
    campaignName: data.data[0].campaignName,
    adGroupName: data.data[0].adGroupName,
  } : null;

  const clearFilter = () => {
    setSearchParams({});
    setSelectedCampaignId('all');
    setSelectedAdGroupId('all');
    setAdGroups([]);
  };

  // Load campaigns for the selector
  const loadCampaigns = useCallback(async () => {
    if (!accountId) return;
    setIsLoadingCampaigns(true);
    try {
      const result = await getCampaigns(accountId, { limit: 200, sortBy: 'costMicros', sortOrder: 'DESC' });
      // Filter only ENABLED campaigns for the selector
      const enabledCampaigns = result.data.filter(c => c.status === 'ENABLED');
      setCampaigns(enabledCampaigns);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Sync selectedCampaignId with URL param
  useEffect(() => {
    if (campaignIdFilter) {
      setSelectedCampaignId(campaignIdFilter);
    }
  }, [campaignIdFilter]);

  // Sync selectedAdGroupId with URL param
  useEffect(() => {
    if (adGroupIdFilter) {
      setSelectedAdGroupId(adGroupIdFilter);
    }
  }, [adGroupIdFilter]);

  // Load ad groups when campaign is selected
  const loadAdGroups = useCallback(async (campaignId: string) => {
    if (!accountId || campaignId === 'all') {
      setAdGroups([]);
      return;
    }
    setIsLoadingAdGroups(true);
    try {
      const result = await getAdGroups(accountId, {
        campaignId,
        limit: 200,
        sortBy: 'costMicros',
        sortOrder: 'DESC'
      });
      // Filter only ENABLED ad groups
      const enabledAdGroups = result.data.filter(ag => ag.status === 'ENABLED');
      setAdGroups(enabledAdGroups);
    } catch (err) {
      console.error('Failed to load ad groups:', err);
    } finally {
      setIsLoadingAdGroups(false);
    }
  }, [accountId]);

  // Load ad groups when campaign changes
  useEffect(() => {
    if (selectedCampaignId !== 'all') {
      loadAdGroups(selectedCampaignId);
    } else {
      setAdGroups([]);
      setSelectedAdGroupId('all');
    }
  }, [selectedCampaignId, loadAdGroups]);

  const handleCampaignChange = (value: string) => {
    setSelectedCampaignId(value);
    setSelectedAdGroupId('all'); // Reset ad group when campaign changes
    if (value === 'all') {
      // Remove campaignId from URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('campaignId');
      newParams.delete('adGroupId');
      setSearchParams(newParams);
    } else {
      // Set campaignId in URL params
      setSearchParams({ campaignId: value });
    }
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleAdGroupChange = (value: string) => {
    setSelectedAdGroupId(value);
    if (value === 'all') {
      // Keep only campaignId
      setSearchParams({ campaignId: selectedCampaignId });
    } else {
      // Set both campaignId and adGroupId
      setSearchParams({ campaignId: selectedCampaignId, adGroupId: value });
    }
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const activeCampaignId = selectedCampaignId !== 'all' ? selectedCampaignId : campaignIdFilter;
      const activeAdGroupId = selectedAdGroupId !== 'all' ? selectedAdGroupId : adGroupIdFilter;
      const apiFilters = {
        ...filters,
        ...(activeCampaignId && { campaignId: activeCampaignId }),
        ...(activeAdGroupId && { adGroupId: activeAdGroupId }),
      };
      const result = await getAds(accountId, apiFilters);
      setData(result);
    } catch (err) {
      console.error('Failed to load ads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters, campaignIdFilter, adGroupIdFilter, selectedCampaignId, selectedAdGroupId]);

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

  // Filtra per stato (client-side)
  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === 'all') return data.data;
    return data.data.filter(ad => ad.status === statusFilter);
  }, [data, statusFilter]);

  // Conta per stato
  const statusCounts = useMemo(() => {
    if (!data?.data) return { ENABLED: 0, PAUSED: 0, REMOVED: 0 };
    return data.data.reduce((acc, ad) => {
      acc[ad.status] = (acc[ad.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

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

  const renderAdSubRow = useCallback((row: Row<Ad>) => {
    const ad = row.original;
    return (
      <div className="bg-muted/30 px-6 py-4" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-3 gap-6">
          {/* Titoli */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Titoli ({ad.headlines?.length || 0})
            </h4>
            {ad.headlines && ad.headlines.length > 0 ? (
              <div className="space-y-1">
                {ad.headlines.map((h, i) => {
                  const text = typeof h === 'object' ? h.text : h;
                  const pinned = typeof h === 'object' ? h.pinnedField : undefined;
                  return (
                    <div key={i} className="text-xs py-1.5 px-2 bg-background rounded border flex items-center justify-between gap-2">
                      <span className="truncate" title={text}>{text}</span>
                      {pinned && (
                        <Badge variant="outline" className="text-[10px] shrink-0 h-4 px-1">
                          P{pinned.replace('HEADLINE_', '')}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nessun titolo</p>
            )}
          </div>

          {/* Descrizioni */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Descrizioni ({ad.descriptions?.length || 0})
            </h4>
            {ad.descriptions && ad.descriptions.length > 0 ? (
              <div className="space-y-1">
                {ad.descriptions.map((d, i) => {
                  const text = typeof d === 'object' ? d.text : d;
                  const pinned = typeof d === 'object' ? d.pinnedField : undefined;
                  return (
                    <div key={i} className="text-xs py-1.5 px-2 bg-background rounded border flex items-start justify-between gap-2">
                      <span title={text}>{text}</span>
                      {pinned && (
                        <Badge variant="outline" className="text-[10px] shrink-0 h-4 px-1">
                          P{pinned.replace('DESCRIPTION_', '')}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nessuna descrizione</p>
            )}
          </div>

          {/* URL e Path */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              URL finale
            </h4>
            {ad.finalUrls && ad.finalUrls.length > 0 ? (
              <div className="space-y-1">
                {ad.finalUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block break-all py-1.5 px-2 bg-background rounded border"
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
            ) : (
              <p className="text-xs text-muted-foreground italic">Nessun URL</p>
            )}
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Annunci</h2>
          {(campaignIdFilter || adGroupIdFilter) && filterInfo && (
            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mt-1">
              <button
                onClick={() => navigate(`/audit/${accountId}/campaigns`)}
                className="hover:text-primary hover:underline transition-colors"
              >
                Campagne
              </button>
              <ChevronRight className="h-3 w-3" />
              {adGroupIdFilter ? (
                <>
                  <button
                    onClick={() => navigate(`/audit/${accountId}/ad-groups?campaignId=${campaignIdFilter || ''}`)}
                    className="hover:text-primary hover:underline transition-colors"
                  >
                    {filterInfo.campaignName || 'Ad Groups'}
                  </button>
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-medium text-foreground truncate max-w-[150px]">{filterInfo.adGroupName}</span>
                </>
              ) : (
                <span className="font-medium text-foreground truncate max-w-[200px]">{filterInfo.campaignName}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-2 hover:bg-destructive/10 hover:text-destructive"
                onClick={clearFilter}
                title="Rimuovi filtro"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
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

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
        {/* Campaign selector */}
        <Select
          value={selectedCampaignId}
          onValueChange={handleCampaignChange}
          disabled={isLoadingCampaigns}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Seleziona campagna..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="font-medium">Tutte le campagne</span>
              <span className="text-muted-foreground ml-1">({campaigns.length})</span>
            </SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.campaignId} value={campaign.campaignId}>
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[180px]">{campaign.campaignName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(campaign.costMicros)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Ad Group selector - only show when a campaign is selected */}
        {selectedCampaignId !== 'all' && (
          <Select
            value={selectedAdGroupId}
            onValueChange={handleAdGroupChange}
            disabled={isLoadingAdGroups}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={isLoadingAdGroups ? "Caricamento..." : "Seleziona gruppo annunci..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">Tutti i gruppi</span>
                <span className="text-muted-foreground ml-1">({adGroups.length})</span>
              </SelectItem>
              {adGroups.map((adGroup) => (
                <SelectItem key={adGroup.adGroupId} value={adGroup.adGroupId}>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[180px]">{adGroup.adGroupName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(adGroup.costMicros)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti ({data?.data?.length || 0})</SelectItem>
            <SelectItem value="ENABLED">Attivi ({statusCounts.ENABLED || 0})</SelectItem>
            <SelectItem value="PAUSED">In pausa ({statusCounts.PAUSED || 0})</SelectItem>
            <SelectItem value="REMOVED">Rimossi ({statusCounts.REMOVED || 0})</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Cerca annuncio..."
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
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filteredData.map((ad) => (
                  <AdCardMobile
                    key={ad.id}
                    ad={ad}
                    isOpen={openCards.has(ad.id)}
                    onToggle={() => toggleCard(ad.id)}
                    accountId={accountId!}
                    onRefresh={loadData}
                  />
                ))}
                {filteredData.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nessun annuncio trovato
                  </div>
                )}
              </div>

              {/* Info risultati */}
              {filteredData.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {filteredData.length} annunci
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Desktop: Tabella */
        <DataTable
          columns={getColumns(accountId!, loadData, navigate)}
          data={filteredData}
          isLoading={isLoading}
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          total={total}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page: page + 1 }))}
          onPageSizeChange={(size) => setFilters((prev) => ({ ...prev, limit: size, page: 1 }))}
          renderSubRow={renderAdSubRow}
        />
      )}
    </div>
  );
}
