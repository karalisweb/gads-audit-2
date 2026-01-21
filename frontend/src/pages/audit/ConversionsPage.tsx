import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, TrendingUp, Calculator, Megaphone, Layers, FileText, KeyRound } from 'lucide-react';
import { getCampaigns, getAdGroups, getAds, getKeywords } from '@/api/audit';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { Campaign, AdGroup, Ad, Keyword } from '@/types/audit';

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
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
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
      {/* Header con nome */}
      <div className="mb-2">
        <p className="text-sm font-medium truncate">{entity.name}</p>
        {entity.parentName && (
          <p className="text-xs text-muted-foreground truncate">{entity.parentName}</p>
        )}
      </div>

      {/* Metriche - su mobile 2 colonne, su desktop 5 colonne */}
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
        {/* Click e Tasso conv - visibili solo su mobile nella griglia */}
        <div className="bg-muted/50 rounded p-2 sm:hidden">
          <p className="text-xs text-muted-foreground">Click</p>
          <p className="text-sm font-medium">{formatNumber(entity.clicks)}</p>
        </div>
        <div className="bg-muted/50 rounded p-2 sm:hidden">
          <p className="text-xs text-muted-foreground">Tasso conv.</p>
          <p className="text-sm font-medium">{entity.convRate > 0 ? `${entity.convRate.toFixed(2)}%` : '-'}</p>
        </div>
      </div>

      {/* Extra info su desktop */}
      <div className="hidden sm:flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span>Click: {formatNumber(entity.clicks)}</span>
        <span>Tasso conv: {entity.convRate > 0 ? `${entity.convRate.toFixed(2)}%` : '-'}</span>
      </div>
    </div>
  );
}

export function ConversionsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [campaigns, setCampaigns] = useState<EntityWithConversions[]>([]);
  const [adGroups, setAdGroups] = useState<EntityWithConversions[]>([]);
  const [ads, setAds] = useState<EntityWithConversions[]>([]);
  const [keywords, setKeywords] = useState<EntityWithConversions[]>([]);

  const loadData = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const [campaignsData, adGroupsData, adsData, keywordsData] = await Promise.all([
        getCampaigns(accountId, { limit: 500, sortBy: 'conversions', sortOrder: 'DESC' }),
        getAdGroups(accountId, { limit: 500, sortBy: 'conversions', sortOrder: 'DESC' }),
        getAds(accountId, { limit: 500, sortBy: 'conversions', sortOrder: 'DESC' }),
        getKeywords(accountId, { limit: 500, sortBy: 'conversions', sortOrder: 'DESC' }),
      ]);

      // Process campaigns
      const processedCampaigns: EntityWithConversions[] = campaignsData.data.map((c: Campaign) => {
        const conv = parseFloat(c.conversions) || 0;
        const value = parseFloat(c.conversionsValue) || 0;
        const cost = parseFloat(c.costMicros) || 0;
        const clicks = parseFloat(c.clicks) || 0;
        return {
          id: c.campaignId,
          name: c.campaignName,
          conversions: conv,
          conversionsValue: value,
          cost,
          cpa: conv > 0 ? cost / conv : 0,
          roas: cost > 0 ? (value * 1000000) / cost : 0,
          convRate: clicks > 0 ? (conv / clicks) * 100 : 0,
          clicks,
        };
      });

      // Process ad groups
      const processedAdGroups: EntityWithConversions[] = adGroupsData.data.map((ag: AdGroup) => {
        const conv = parseFloat(ag.conversions) || 0;
        const value = parseFloat(ag.conversionsValue) || 0;
        const cost = parseFloat(ag.costMicros) || 0;
        const clicks = parseFloat(ag.clicks) || 0;
        return {
          id: ag.adGroupId,
          name: ag.adGroupName,
          parentName: ag.campaignName,
          conversions: conv,
          conversionsValue: value,
          cost,
          cpa: conv > 0 ? cost / conv : 0,
          roas: cost > 0 ? (value * 1000000) / cost : 0,
          convRate: clicks > 0 ? (conv / clicks) * 100 : 0,
          clicks,
        };
      });

      // Process ads - use first headline or ad group name to identify ads
      const processedAds: EntityWithConversions[] = adsData.data.map((ad: Ad) => {
        const conv = parseFloat(ad.conversions) || 0;
        const value = parseFloat(ad.conversionsValue) || 0;
        const cost = parseFloat(ad.costMicros) || 0;
        const clicks = parseFloat(ad.clicks) || 0;
        // Use first headline if available, otherwise ad group name
        const firstHeadline = ad.headlines?.[0];
        const headlineText = firstHeadline
          ? (typeof firstHeadline === 'object' ? firstHeadline.text : firstHeadline)
          : null;
        const adName = headlineText || ad.adGroupName || `Annuncio ${ad.adId}`;
        return {
          id: ad.adId,
          name: adName,
          parentName: `${ad.campaignName} → ${ad.adGroupName}`,
          conversions: conv,
          conversionsValue: value,
          cost,
          cpa: conv > 0 ? cost / conv : 0,
          roas: cost > 0 ? (value * 1000000) / cost : 0,
          convRate: clicks > 0 ? (conv / clicks) * 100 : 0,
          clicks,
        };
      });

      // Process keywords
      const processedKeywords: EntityWithConversions[] = keywordsData.data.map((kw: Keyword) => {
        const conv = parseFloat(kw.conversions) || 0;
        const value = parseFloat(kw.conversionsValue) || 0;
        const cost = parseFloat(kw.costMicros) || 0;
        const clicks = parseFloat(kw.clicks) || 0;
        return {
          id: kw.keywordId,
          name: kw.keywordText,
          parentName: `${kw.campaignName} → ${kw.adGroupName}`,
          conversions: conv,
          conversionsValue: value,
          cost,
          cpa: conv > 0 ? cost / conv : 0,
          roas: cost > 0 ? (value * 1000000) / cost : 0,
          convRate: clicks > 0 ? (conv / clicks) * 100 : 0,
          clicks,
        };
      });

      // Calculate total stats from campaigns
      const totalConversions = processedCampaigns.reduce((sum, c) => sum + c.conversions, 0);
      const totalConversionsValue = processedCampaigns.reduce((sum, c) => sum + c.conversionsValue, 0);
      const totalCost = processedCampaigns.reduce((sum, c) => sum + c.cost, 0);

      setStats({
        totalConversions,
        totalConversionsValue,
        totalCost,
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const campaignsWithConv = campaigns.filter((c) => c.conversions > 0);
  const adGroupsWithConv = adGroups.filter((ag) => ag.conversions > 0);
  const adsWithConv = ads.filter((a) => a.conversions > 0);
  const keywordsWithConv = keywords.filter((k) => k.conversions > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Conversioni</h2>
        <Badge variant="secondary">
          {stats?.totalConversions || 0} conversioni totali
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Conversioni Totali"
          value={formatNumber(stats?.totalConversions || 0)}
          icon={Target}
        />
        <StatCard
          title="Valore Conversioni"
          value={stats?.totalConversionsValue ? formatCurrency(stats.totalConversionsValue * 1000000) : '-'}
          icon={TrendingUp}
        />
        <StatCard
          title="Costo Totale"
          value={formatCurrency(stats?.totalCost || 0)}
          icon={Calculator}
        />
        <StatCard
          title="CPA Medio"
          value={stats?.avgCpa ? formatCurrency(stats.avgCpa) : '-'}
          subtitle="Costo per conversione"
          icon={Calculator}
        />
        <StatCard
          title="ROAS"
          value={stats?.avgRoas ? stats.avgRoas.toFixed(2) : '-'}
          subtitle="Return on Ad Spend"
          icon={TrendingUp}
        />
      </div>

      {/* Distribution Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Campagne con Conv.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignsWithConv.length}</div>
            <p className="text-xs text-muted-foreground">
              di {campaigns.length} totali
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Ad Groups con Conv.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adGroupsWithConv.length}</div>
            <p className="text-xs text-muted-foreground">
              di {adGroups.length} totali
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Annunci con Conv.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adsWithConv.length}</div>
            <p className="text-xs text-muted-foreground">
              di {ads.length} totali
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Keywords con Conv.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keywordsWithConv.length}</div>
            <p className="text-xs text-muted-foreground">
              di {keywords.length} totali
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
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
    </div>
  );
}
