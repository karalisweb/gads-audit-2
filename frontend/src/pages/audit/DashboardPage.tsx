import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getKpis } from '@/api/audit';
import { formatCurrency, formatNumber, formatPercent, formatRoas } from '@/lib/format';
import type { KpiData } from '@/types/audit';

export function DashboardPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;

    setIsLoading(true);
    getKpis(accountId)
      .then(setKpis)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [accountId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nessun dato disponibile. Esegui un import per iniziare.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Campagne"
          value={kpis.overview.totalCampaigns}
          subtitle={`${kpis.overview.activeCampaigns} attive`}
        />
        <StatCard
          title="Ad Groups"
          value={kpis.overview.totalAdGroups}
          subtitle={`${kpis.overview.activeAdGroups} attivi`}
        />
        <StatCard
          title="Keywords"
          value={kpis.overview.totalKeywords}
          subtitle={`${kpis.overview.activeKeywords} attive`}
        />
        <StatCard
          title="Annunci"
          value={kpis.overview.totalAds}
          subtitle={`${kpis.overview.totalSearchTerms.toLocaleString()} search terms`}
        />
      </div>

      {/* Performance Cards */}
      <h3 className="text-lg font-semibold mt-8">Performance</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Costo Totale"
          value={formatCurrency(kpis.performance.cost * 1000000)}
          large
        />
        <StatCard
          title="Conversioni"
          value={formatNumber(kpis.performance.conversions)}
          subtitle={`Valore: ${formatCurrency(kpis.performance.conversionsValue * 1000000)}`}
        />
        <StatCard
          title="CPA Medio"
          value={formatCurrency(kpis.performance.cpa * 1000000)}
        />
        <StatCard
          title="ROAS"
          value={formatRoas(kpis.performance.roas)}
        />
        <StatCard
          title="Conv. Rate"
          value={formatPercent(kpis.performance.conversionRate)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Impressioni"
          value={formatNumber(kpis.performance.impressions)}
        />
        <StatCard
          title="Click"
          value={formatNumber(kpis.performance.clicks)}
        />
        <StatCard
          title="CTR"
          value={formatPercent(kpis.performance.ctr)}
        />
        <StatCard
          title="CPC Medio"
          value={formatCurrency(kpis.performance.avgCpc * 1000000)}
        />
      </div>

      {/* Quality Cards */}
      <h3 className="text-lg font-semibold mt-8">Qualita</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Quality Score Medio"
          value={kpis.quality.avgQualityScore?.toFixed(1) || '-'}
          subtitle={`${kpis.quality.lowQualityKeywords} keywords < 5`}
          valueColor={
            kpis.quality.avgQualityScore >= 7
              ? 'text-green-600'
              : kpis.quality.avgQualityScore >= 5
                ? 'text-yellow-600'
                : 'text-red-600'
          }
        />
        <StatCard
          title="Annunci Excellent"
          value={kpis.quality.excellentAds}
          valueColor="text-green-600"
        />
        <StatCard
          title="Annunci Good"
          value={kpis.quality.goodAds}
          valueColor="text-blue-600"
        />
        <StatCard
          title="Annunci Deboli"
          value={kpis.quality.weakAds}
          subtitle="Average + Poor"
          valueColor="text-red-600"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Negative Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(kpis.overview.totalNegativeKeywords)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  large?: boolean;
  valueColor?: string;
}

function StatCard({ title, value, subtitle, large, valueColor }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`${large ? 'text-3xl' : 'text-2xl'} font-bold ${valueColor || ''}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
