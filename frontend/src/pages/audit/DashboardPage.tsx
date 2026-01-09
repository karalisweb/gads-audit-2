import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getKpis, getIssueSummary, type IssueSummary } from '@/api/audit';
import { formatCurrency, formatNumber, formatPercent, formatRoas } from '@/lib/format';
import type { KpiData } from '@/types/audit';
import { AlertTriangle, AlertCircle, Info, TrendingDown, Target, Layers, Wallet } from 'lucide-react';

export function DashboardPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [issueSummary, setIssueSummary] = useState<IssueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;

    setIsLoading(true);
    Promise.all([
      getKpis(accountId),
      getIssueSummary(accountId),
    ])
      .then(([kpisData, issuesData]) => {
        setKpis(kpisData);
        setIssueSummary(issuesData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [accountId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
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

  const totalIssues = issueSummary?.total || 0;
  const criticalHigh = (issueSummary?.bySeverity.critical || 0) + (issueSummary?.bySeverity.high || 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Dashboard</h2>

      {/* Problems Summary Card - Full Width */}
      <Link to={`/audit/${accountId}/problemi`} className="block">
        <Card className={`border-l-4 ${criticalHigh > 0 ? 'border-l-red-500 bg-red-50/50' : totalIssues > 0 ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-green-500 bg-green-50/50'} hover:shadow-md transition-shadow cursor-pointer`}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${criticalHigh > 0 ? 'bg-red-100' : totalIssues > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                  <AlertTriangle className={`h-5 w-5 ${criticalHigh > 0 ? 'text-red-600' : totalIssues > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Problemi Rilevati</p>
                  <p className="text-2xl font-bold">{totalIssues}</p>
                </div>
              </div>
              {totalIssues > 0 && (
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-xs text-gray-500">Critical</span>
                    </div>
                    <p className="text-lg font-semibold">{issueSummary?.bySeverity.critical || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                      <span className="text-xs text-gray-500">High</span>
                    </div>
                    <p className="text-lg font-semibold">{issueSummary?.bySeverity.high || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
                      <span className="text-xs text-gray-500">Medium</span>
                    </div>
                    <p className="text-lg font-semibold">{issueSummary?.bySeverity.medium || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-xs text-gray-500">Low</span>
                    </div>
                    <p className="text-lg font-semibold">{issueSummary?.bySeverity.low || 0}</p>
                  </div>
                  {(issueSummary?.potentialSavings || 0) > 0 && (
                    <div className="text-center border-l pl-4">
                      <p className="text-xs text-gray-500">Risparmio potenziale</p>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency((issueSummary?.potentialSavings || 0) * 1000000)}</p>
                    </div>
                  )}
                </div>
              )}
              {totalIssues === 0 && (
                <p className="text-sm text-green-600 font-medium">Nessun problema rilevato</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Overview Cards - Compact */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <CompactStatCard
          title="Campagne"
          value={kpis.overview.totalCampaigns}
          subtitle={`${kpis.overview.activeCampaigns} attive`}
          icon={<Layers className="h-4 w-4" />}
        />
        <CompactStatCard
          title="Ad Groups"
          value={kpis.overview.totalAdGroups}
          subtitle={`${kpis.overview.activeAdGroups} attivi`}
          icon={<Target className="h-4 w-4" />}
        />
        <CompactStatCard
          title="Keywords"
          value={kpis.overview.totalKeywords}
          subtitle={`${kpis.overview.activeKeywords} attive`}
          icon={<Info className="h-4 w-4" />}
        />
        <CompactStatCard
          title="Search Terms"
          value={kpis.overview.totalSearchTerms}
          subtitle={`${kpis.overview.totalNegativeKeywords} neg.`}
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      {/* Performance Cards - Compact */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-4">Performance</h3>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <CompactStatCard
          title="Costo"
          value={formatCurrency(kpis.performance.cost * 1000000)}
          icon={<Wallet className="h-4 w-4" />}
          highlight
        />
        <CompactStatCard
          title="Conversioni"
          value={formatNumber(kpis.performance.conversions)}
          subtitle={formatCurrency(kpis.performance.conversionsValue * 1000000)}
        />
        <CompactStatCard
          title="CPA"
          value={formatCurrency(kpis.performance.cpa * 1000000)}
        />
        <CompactStatCard
          title="ROAS"
          value={formatRoas(kpis.performance.roas)}
          valueColor={kpis.performance.roas >= 3 ? 'text-green-600' : kpis.performance.roas >= 1 ? 'text-yellow-600' : 'text-red-600'}
        />
        <CompactStatCard
          title="CTR"
          value={formatPercent(kpis.performance.ctr)}
          valueColor={kpis.performance.ctr >= 3 ? 'text-green-600' : kpis.performance.ctr >= 1 ? 'text-yellow-600' : 'text-red-600'}
        />
        <CompactStatCard
          title="CPC"
          value={formatCurrency(kpis.performance.avgCpc * 1000000)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <CompactStatCard
          title="Impressioni"
          value={formatNumber(kpis.performance.impressions)}
        />
        <CompactStatCard
          title="Click"
          value={formatNumber(kpis.performance.clicks)}
        />
        <CompactStatCard
          title="Conv. Rate"
          value={formatPercent(kpis.performance.conversionRate)}
        />
        <CompactStatCard
          title="Annunci"
          value={kpis.overview.totalAds}
        />
      </div>

      {/* Quality Cards - Compact */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-4">Qualità</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <CompactStatCard
          title="QS Medio"
          value={kpis.quality.avgQualityScore?.toFixed(1) || '-'}
          subtitle={`${kpis.quality.lowQualityKeywords} kw < 5`}
          valueColor={
            kpis.quality.avgQualityScore >= 7
              ? 'text-green-600'
              : kpis.quality.avgQualityScore >= 5
                ? 'text-yellow-600'
                : 'text-red-600'
          }
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <CompactStatCard
          title="Annunci Excellent"
          value={kpis.quality.excellentAds}
          valueColor="text-green-600"
        />
        <CompactStatCard
          title="Annunci Good"
          value={kpis.quality.goodAds}
          valueColor="text-blue-600"
        />
        <CompactStatCard
          title="Annunci Deboli"
          value={kpis.quality.weakAds}
          subtitle="Average + Poor"
          valueColor="text-red-600"
        />
      </div>
    </div>
  );
}

interface CompactStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  highlight?: boolean;
  valueColor?: string;
  icon?: React.ReactNode;
}

function CompactStatCard({ title, value, subtitle, highlight, valueColor, icon }: CompactStatCardProps) {
  return (
    <Card className={highlight ? 'bg-blue-50/50 border-blue-200' : ''}>
      <CardContent className="py-2.5 px-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
            <p className={`text-lg font-bold truncate ${valueColor || ''}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
          </div>
          {icon && <div className="text-gray-400 ml-2">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
