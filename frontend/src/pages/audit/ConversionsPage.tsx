import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  TrendingUp,
  Calculator,
  Megaphone,
  Layers,
  FileText,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  EyeOff,
  Activity,
} from 'lucide-react';
import { ModifyButton } from '@/components/modifications';
import { getCampaigns, getAdGroups, getAds, getKeywords, getConversionActions } from '@/api/audit';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { Campaign, AdGroup, Ad, Keyword, ConversionAction, PaginatedResponse } from '@/types/audit';

// ─── Helper functions per conversion actions ─────────────────────────────────

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'ENABLED': return 'default';
    case 'REMOVED': return 'destructive';
    case 'HIDDEN': return 'secondary';
    default: return 'outline';
  }
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    PURCHASE: 'Acquisto', LEAD: 'Lead', SIGNUP: 'Registrazione',
    PAGE_VIEW: 'Visualizzazione pagina', CONTACT: 'Contatto',
    SUBMIT_LEAD_FORM: 'Invio form', BOOK_APPOINTMENT: 'Prenotazione',
    REQUEST_QUOTE: 'Richiesta preventivo', GET_DIRECTIONS: 'Indicazioni',
    OUTBOUND_CLICK: 'Click in uscita', DOWNLOAD: 'Download',
    ADD_TO_CART: 'Aggiungi al carrello', BEGIN_CHECKOUT: 'Inizio checkout',
    SUBSCRIBE_PAID: 'Abbonamento', PHONE_CALL_LEAD: 'Lead telefonico',
    IMPORTED_LEAD: 'Lead importato', DEFAULT: 'Predefinito',
  };
  return labels[category] || category.replace(/_/g, ' ');
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    WEBPAGE: 'Pagina web', AD_CALL: 'Chiamata annuncio',
    CLICK_TO_CALL: 'Click per chiamare', GOOGLE_PLAY_DOWNLOAD: 'Download Google Play',
    UPLOAD_CALLS: 'Chiamate caricate', UPLOAD_CLICKS: 'Click caricati',
    ANALYTICS_GOAL: 'Obiettivo Analytics', ANALYTICS_TRANSACTION: 'Transazione Analytics',
    WEBSITE_CALL: 'Chiamata sito web',
  };
  return labels[type] || type.replace(/_/g, ' ');
};

const getOriginLabel = (origin: string) => {
  const labels: Record<string, string> = {
    WEBSITE: 'Sito web', CALL_FROM_ADS: 'Chiamata da annunci',
    GOOGLE_HOSTED: 'Google hosted', APP: 'App',
    CALL_TRACKING_EXTENSION: 'Tracciamento chiamate',
    STORE: 'Negozio', YOUTUBE_HOSTED: 'YouTube hosted',
  };
  return labels[origin] || origin.replace(/_/g, ' ');
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ConversionStats {
  totalConversions: number;
  totalConversionsValue: number;
  totalCost: number;
  avgCpa: number;
  avgRoas: number;
}

interface EntityWithConversions {
  id: string;
  name: string;
  parentName?: string;
  conversions: number;
  conversionsValue: number;
  cost: number;
  cpa: number;
  roas: number;
  convRate: number;
  clicks: number;
}

function StatCard({
  title, value, subtitle, icon: Icon,
}: {
  title: string; value: string; subtitle?: string; icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function EntityCard({ entity }: { entity: EntityWithConversions }) {
  const hasConversions = entity.conversions > 0;
  return (
    <div className={`border rounded-lg bg-card p-3 sm:p-4 ${!hasConversions ? 'opacity-60' : ''}`}>
      <div className="mb-2">
        <p className="text-sm font-medium truncate">{entity.name}</p>
        {entity.parentName && (
          <p className="text-xs text-muted-foreground truncate">{entity.parentName}</p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <div className="bg-muted/50 rounded p-2 sm:bg-transparent sm:p-0 sm:text-right">
          <p className="text-xs text-muted-foreground">Conv.</p>
          <p className={`text-sm font-semibold ${hasConversions ? 'text-green-600' : ''}`}>
            {formatNumber(entity.conversions)}
          </p>
        </div>
        <div className="bg-muted/50 rounded p-2 sm:bg-transparent sm:p-0 sm:text-right">
          <p className="text-xs text-muted-foreground">Valore</p>
          <p className="text-sm font-medium">
            {entity.conversionsValue > 0 ? formatCurrency(entity.conversionsValue * 1000000) : '-'}
          </p>
        </div>
        <div className="bg-muted/50 rounded p-2 sm:bg-transparent sm:p-0 sm:text-right">
          <p className="text-xs text-muted-foreground">Costo</p>
          <p className="text-sm font-medium">{formatCurrency(entity.cost)}</p>
        </div>
        <div className="bg-muted/50 rounded p-2 sm:bg-transparent sm:p-0 sm:text-right">
          <p className="text-xs text-muted-foreground">CPA</p>
          <p className={`text-sm font-medium ${entity.cpa > 0 ? '' : 'text-muted-foreground'}`}>
            {entity.cpa > 0 ? formatCurrency(entity.cpa) : '-'}
          </p>
        </div>
        <div className="bg-muted/50 rounded p-2 sm:bg-transparent sm:p-0 sm:text-right">
          <p className="text-xs text-muted-foreground">ROAS</p>
          <p className={`text-sm font-medium ${entity.roas > 1 ? 'text-green-600' : entity.roas > 0 ? 'text-orange-600' : ''}`}>
            {entity.roas > 0 ? entity.roas.toFixed(2) : '-'}
          </p>
        </div>
        <div className="bg-muted/50 rounded p-2 sm:hidden">
          <p className="text-xs text-muted-foreground">Click</p>
          <p className="text-sm font-medium">{formatNumber(entity.clicks)}</p>
        </div>
        <div className="bg-muted/50 rounded p-2 sm:hidden">
          <p className="text-xs text-muted-foreground">Tasso conv.</p>
          <p className="text-sm font-medium">{entity.convRate > 0 ? `${entity.convRate.toFixed(2)}%` : '-'}</p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span>Click: {formatNumber(entity.clicks)}</span>
        <span>Tasso conv: {entity.convRate > 0 ? `${entity.convRate.toFixed(2)}%` : '-'}</span>
      </div>
    </div>
  );
}

function ConversionActionCard({
  action, accountId, onRefresh,
}: {
  action: ConversionAction; accountId: string; onRefresh: () => void;
}) {
  const hasIssues = !action.primaryForGoal && action.status === 'ENABLED';
  const notUsed = action.campaignsUsingCount === 0 && action.status === 'ENABLED';
  const lowValue = (action.defaultValue === 0 || action.defaultValue === 1) && action.status === 'ENABLED';

  return (
    <div className={`border rounded-lg bg-card p-4 ${hasIssues || notUsed || lowValue ? 'border-orange-300' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={getStatusVariant(action.status)} className="text-xs">
              {action.status}
            </Badge>
            {action.primaryForGoal ? (
              <Badge variant="default" className="text-xs bg-green-600">
                Primaria
              </Badge>
            ) : action.status === 'ENABLED' && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Secondaria
              </Badge>
            )}
            {notUsed && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Non usata
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium">{action.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{getTypeLabel(action.type)}</span>
            <span>·</span>
            <span>{getCategoryLabel(action.category)}</span>
            <span>·</span>
            <span>{getOriginLabel(action.origin)}</span>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="grid grid-cols-3 gap-4 text-right shrink-0">
            <div>
              <p className="text-xs text-muted-foreground">Conteggio</p>
              <p className="text-sm font-medium">
                {action.countingType === 'ONE_PER_CLICK' ? '1 per click' : 'Tutte'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valore</p>
              <p className={`text-sm font-medium ${lowValue ? 'text-orange-600' : ''}`}>
                {action.defaultValue ? formatCurrency(action.defaultValue * 1000000) : '-'}
                {action.alwaysUseDefaultValue && action.defaultValue ? ' (fisso)' : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Campagne</p>
              <p className={`text-sm font-medium ${notUsed ? 'text-orange-600' : ''}`}>
                {action.campaignsUsingCount}
              </p>
            </div>
          </div>
          <ModifyButton
            accountId={accountId}
            entityType="conversion_action"
            entityId={action.conversionActionId}
            entityName={action.name}
            currentValue={{
              primaryForGoal: action.primaryForGoal,
              defaultValue: action.defaultValue,
            }}
            onSuccess={onRefresh}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ConversionsPage() {
  const { accountId } = useParams<{ accountId: string }>();

  // Performance data
  const [isLoading, setIsLoading] = useState(true);
  const [perfStats, setPerfStats] = useState<ConversionStats | null>(null);
  const [campaigns, setCampaigns] = useState<EntityWithConversions[]>([]);
  const [adGroups, setAdGroups] = useState<EntityWithConversions[]>([]);
  const [ads, setAds] = useState<EntityWithConversions[]>([]);
  const [keywords, setKeywords] = useState<EntityWithConversions[]>([]);

  // Conversion actions data
  const [actionsData, setActionsData] = useState<PaginatedResponse<ConversionAction> | null>(null);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [actionsSearch, setActionsSearch] = useState('');
  const [actionsStatusFilter, setActionsStatusFilter] = useState<string>('all');

  // Load performance data
  const loadPerformanceData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const [campaignsData, adGroupsData, adsData, keywordsData] = await Promise.all([
        getCampaigns(accountId, { limit: 500, sortBy: 'conversions', sortOrder: 'DESC' }),
        getAdGroups(accountId, { limit: 500, sortBy: 'conversions', sortOrder: 'DESC' }),
        getAds(accountId, { limit: 500, sortBy: 'conversions', sortOrder: 'DESC' }),
        getKeywords(accountId, { limit: 500, sortBy: 'conversions', sortOrder: 'DESC' }),
      ]);

      const processedCampaigns: EntityWithConversions[] = campaignsData.data.map((c: Campaign) => {
        const conv = parseFloat(c.conversions) || 0;
        const value = parseFloat(c.conversionsValue) || 0;
        const cost = parseFloat(c.costMicros) || 0;
        const clicks = parseFloat(c.clicks) || 0;
        return {
          id: c.campaignId, name: c.campaignName,
          conversions: conv, conversionsValue: value, cost,
          cpa: conv > 0 ? cost / conv : 0,
          roas: cost > 0 ? (value * 1000000) / cost : 0,
          convRate: clicks > 0 ? (conv / clicks) * 100 : 0, clicks,
        };
      });

      const processedAdGroups: EntityWithConversions[] = adGroupsData.data.map((ag: AdGroup) => {
        const conv = parseFloat(ag.conversions) || 0;
        const value = parseFloat(ag.conversionsValue) || 0;
        const cost = parseFloat(ag.costMicros) || 0;
        const clicks = parseFloat(ag.clicks) || 0;
        return {
          id: ag.adGroupId, name: ag.adGroupName, parentName: ag.campaignName,
          conversions: conv, conversionsValue: value, cost,
          cpa: conv > 0 ? cost / conv : 0,
          roas: cost > 0 ? (value * 1000000) / cost : 0,
          convRate: clicks > 0 ? (conv / clicks) * 100 : 0, clicks,
        };
      });

      const processedAds: EntityWithConversions[] = adsData.data.map((ad: Ad) => {
        const conv = parseFloat(ad.conversions) || 0;
        const value = parseFloat(ad.conversionsValue) || 0;
        const cost = parseFloat(ad.costMicros) || 0;
        const clicks = parseFloat(ad.clicks) || 0;
        const firstHeadline = ad.headlines?.[0];
        const headlineText = firstHeadline
          ? (typeof firstHeadline === 'object' ? firstHeadline.text : firstHeadline)
          : null;
        const adName = headlineText || ad.adGroupName || `Annuncio ${ad.adId}`;
        return {
          id: ad.adId, name: adName, parentName: `${ad.campaignName} → ${ad.adGroupName}`,
          conversions: conv, conversionsValue: value, cost,
          cpa: conv > 0 ? cost / conv : 0,
          roas: cost > 0 ? (value * 1000000) / cost : 0,
          convRate: clicks > 0 ? (conv / clicks) * 100 : 0, clicks,
        };
      });

      const processedKeywords: EntityWithConversions[] = keywordsData.data.map((kw: Keyword) => {
        const conv = parseFloat(kw.conversions) || 0;
        const value = parseFloat(kw.conversionsValue) || 0;
        const cost = parseFloat(kw.costMicros) || 0;
        const clicks = parseFloat(kw.clicks) || 0;
        return {
          id: kw.keywordId, name: kw.keywordText,
          parentName: `${kw.campaignName} → ${kw.adGroupName}`,
          conversions: conv, conversionsValue: value, cost,
          cpa: conv > 0 ? cost / conv : 0,
          roas: cost > 0 ? (value * 1000000) / cost : 0,
          convRate: clicks > 0 ? (conv / clicks) * 100 : 0, clicks,
        };
      });

      const totalConversions = processedCampaigns.reduce((sum, c) => sum + c.conversions, 0);
      const totalConversionsValue = processedCampaigns.reduce((sum, c) => sum + c.conversionsValue, 0);
      const totalCost = processedCampaigns.reduce((sum, c) => sum + c.cost, 0);

      setPerfStats({
        totalConversions, totalConversionsValue, totalCost,
        avgCpa: totalConversions > 0 ? totalCost / totalConversions : 0,
        avgRoas: totalCost > 0 ? (totalConversionsValue * 1000000) / totalCost : 0,
      });

      setCampaigns(processedCampaigns);
      setAdGroups(processedAdGroups);
      setAds(processedAds);
      setKeywords(processedKeywords);
    } catch (err) {
      console.error('Failed to load conversions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  // Load conversion actions
  const loadActions = useCallback(async () => {
    if (!accountId) return;
    setActionsLoading(true);
    try {
      const result = await getConversionActions(accountId, { limit: 100, sortBy: 'name', sortOrder: 'ASC' });
      setActionsData(result);
    } catch (err) {
      console.error('Failed to load conversion actions:', err);
    } finally {
      setActionsLoading(false);
    }
  }, [accountId]);

  useEffect(() => { loadPerformanceData(); }, [loadPerformanceData]);
  useEffect(() => { loadActions(); }, [loadActions]);

  // Conversion actions stats
  const actionStats = useMemo(() => {
    if (!actionsData?.data) return { total: 0, enabled: 0, primary: 0, hidden: 0, notUsed: 0, lowValue: 0 };
    const all = actionsData.data;
    return {
      total: actionsData.meta.total,
      enabled: all.filter(a => a.status === 'ENABLED').length,
      primary: all.filter(a => a.primaryForGoal).length,
      hidden: all.filter(a => a.status === 'HIDDEN').length,
      notUsed: all.filter(a => a.campaignsUsingCount === 0 && a.status === 'ENABLED').length,
      lowValue: all.filter(a => (a.defaultValue === 0 || a.defaultValue === 1) && a.status === 'ENABLED').length,
    };
  }, [actionsData]);

  // Filtered conversion actions
  const filteredActions = useMemo(() => {
    if (!actionsData?.data) return [];
    let result = actionsData.data;
    if (actionsStatusFilter !== 'all') {
      result = result.filter(a => a.status === actionsStatusFilter);
    }
    if (actionsSearch.trim()) {
      const q = actionsSearch.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q));
    }
    return result;
  }, [actionsData, actionsStatusFilter, actionsSearch]);

  // Performance entity counts
  const campaignsWithConv = campaigns.filter((c) => c.conversions > 0);
  const adGroupsWithConv = adGroups.filter((ag) => ag.conversions > 0);
  const adsWithConv = ads.filter((a) => a.conversions > 0);
  const keywordsWithConv = keywords.filter((k) => k.conversions > 0);

  const hasHiddenActions = actionStats.hidden > 0;

  if (isLoading && actionsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Conversioni</h2>
        <Badge variant="secondary">
          {perfStats?.totalConversions || 0} conversioni totali
        </Badge>
      </div>

      {/* ─── Sezione 1: Salute Conversioni ───────────────────────────── */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Salute Azioni di Conversione
        </h3>

        {hasHiddenActions && (
          <div className="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-400">
                Attenzione: {actionStats.hidden} {actionStats.hidden === 1 ? 'conversione nascosta' : 'conversioni nascoste'} (HIDDEN)
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                Google Ads ha disattivato queste conversioni. Potrebbero non ricevere hit da tempo. Verifica la configurazione.
              </p>
            </div>
          </div>
        )}

        {actionsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Totali
                </CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{actionStats.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  Attive
                </CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{actionStats.enabled}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-blue-600" />
                  Primarie
                </CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{actionStats.primary}</div></CardContent>
            </Card>
            <Card className={hasHiddenActions ? 'border-red-300' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <EyeOff className="h-3.5 w-3.5 text-red-600" />
                  Nascoste
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${hasHiddenActions ? 'text-red-600' : ''}`}>
                  {actionStats.hidden}
                </div>
              </CardContent>
            </Card>
            <Card className={actionStats.notUsed > 0 ? 'border-orange-300' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                  Non usate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${actionStats.notUsed > 0 ? 'text-orange-600' : ''}`}>
                  {actionStats.notUsed}
                </div>
              </CardContent>
            </Card>
            <Card className={actionStats.lowValue > 0 ? 'border-orange-300' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                  Valore basso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${actionStats.lowValue > 0 ? 'text-orange-600' : ''}`}>
                  {actionStats.lowValue}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ─── Sezione 2: Performance Summary ──────────────────────────── */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Conversioni
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard
            title="Conversioni Totali"
            value={formatNumber(perfStats?.totalConversions || 0)}
            icon={Target}
          />
          <StatCard
            title="Valore Conversioni"
            value={perfStats?.totalConversionsValue ? formatCurrency(perfStats.totalConversionsValue * 1000000) : '-'}
            icon={TrendingUp}
          />
          <StatCard
            title="Costo Totale"
            value={formatCurrency(perfStats?.totalCost || 0)}
            icon={Calculator}
          />
          <StatCard
            title="CPA Medio"
            value={perfStats?.avgCpa ? formatCurrency(perfStats.avgCpa) : '-'}
            subtitle="Costo per conversione"
            icon={Calculator}
          />
          <StatCard
            title="ROAS"
            value={perfStats?.avgRoas ? perfStats.avgRoas.toFixed(2) : '-'}
            subtitle="Return on Ad Spend"
            icon={TrendingUp}
          />
        </div>

        {/* Distribution */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Megaphone className="h-4 w-4" /> Campagne con Conv.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignsWithConv.length}</div>
              <p className="text-xs text-muted-foreground">di {campaigns.length} totali</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" /> Ad Groups con Conv.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adGroupsWithConv.length}</div>
              <p className="text-xs text-muted-foreground">di {adGroups.length} totali</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Annunci con Conv.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adsWithConv.length}</div>
              <p className="text-xs text-muted-foreground">di {ads.length} totali</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Keywords con Conv.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{keywordsWithConv.length}</div>
              <p className="text-xs text-muted-foreground">di {keywords.length} totali</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Sezione 3: Azioni di Conversione ────────────────────────── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Azioni di Conversione
          </h3>
          <div className="flex items-center gap-3">
            <Select value={actionsStatusFilter} onValueChange={setActionsStatusFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="ENABLED">Abilitati</SelectItem>
                <SelectItem value="REMOVED">Rimossi</SelectItem>
                <SelectItem value="HIDDEN">Nascosti</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Cerca conversione..."
              value={actionsSearch}
              onChange={(e) => setActionsSearch(e.target.value)}
              className="w-48 sm:w-64 h-9"
            />
          </div>
        </div>

        {actionsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredActions.map((action) => (
              <ConversionActionCard
                key={action.id}
                action={action}
                accountId={accountId!}
                onRefresh={loadActions}
              />
            ))}
            {filteredActions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna azione di conversione trovata
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── Sezione 4: Breakdown per Entità ─────────────────────────── */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Breakdown per Entità</h3>
        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">
              Campagne ({campaignsWithConv.length})
            </TabsTrigger>
            <TabsTrigger value="adgroups">
              Ad Groups ({adGroupsWithConv.length})
            </TabsTrigger>
            <TabsTrigger value="ads">
              Annunci ({adsWithConv.length})
            </TabsTrigger>
            <TabsTrigger value="keywords">
              Keywords ({keywordsWithConv.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-2 mt-4">
            {campaignsWithConv.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna campagna con conversioni
              </div>
            ) : (
              campaignsWithConv.map((c) => <EntityCard key={c.id} entity={c} />)
            )}
          </TabsContent>

          <TabsContent value="adgroups" className="space-y-2 mt-4">
            {adGroupsWithConv.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessun ad group con conversioni
              </div>
            ) : (
              adGroupsWithConv.map((ag) => <EntityCard key={ag.id} entity={ag} />)
            )}
          </TabsContent>

          <TabsContent value="ads" className="space-y-2 mt-4">
            {adsWithConv.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessun annuncio con conversioni
              </div>
            ) : (
              adsWithConv.map((a) => <EntityCard key={a.id} entity={a} />)
            )}
          </TabsContent>

          <TabsContent value="keywords" className="space-y-2 mt-4">
            {keywordsWithConv.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna keyword con conversioni
              </div>
            ) : (
              keywordsWithConv.map((k) => <EntityCard key={k.id} entity={k} />)
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
