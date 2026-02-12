import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getKpis, getIssueSummary, getPerformanceTrend, getHealthScore, type IssueSummary, type KpiSnapshot, type HealthScoreResult } from '@/api/audit';
import { getAnalysisHistory, getAcceptanceRate, analyzeAllModules, type AIAnalysisLog, type AcceptanceRate } from '@/api/ai';
import { formatCurrency, formatNumber, formatPercent, formatRoas } from '@/lib/format';
import { Button } from '@/components/ui/button';
import type { KpiData } from '@/types/audit';
import { AlertTriangle, AlertCircle, Info, TrendingDown, Target, Layers, Wallet, BarChart3, Brain, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function DashboardPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [issueSummary, setIssueSummary] = useState<IssueSummary | null>(null);
  const [trend, setTrend] = useState<KpiSnapshot[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScoreResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AIAnalysisLog[]>([]);
  const [acceptanceRate, setAcceptanceRate] = useState<AcceptanceRate | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;

    setIsLoading(true);
    Promise.all([
      getKpis(accountId),
      getIssueSummary(accountId),
      getPerformanceTrend(accountId, 20),
      getHealthScore(accountId).catch(() => null),
      getAnalysisHistory(accountId, 5).catch(() => []),
      getAcceptanceRate(accountId).catch(() => null),
    ])
      .then(([kpisData, issuesData, trendData, hsData, historyData, rateData]) => {
        setKpis(kpisData);
        setIssueSummary(issuesData);
        setTrend(trendData);
        setHealthScore(hsData);
        setAnalysisHistory(historyData);
        setAcceptanceRate(rateData);
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
        <p className="text-muted-foreground">Nessun dato disponibile. Esegui un import per iniziare.</p>
      </div>
    );
  }

  const totalIssues = issueSummary?.total || 0;
  const criticalHigh = (issueSummary?.bySeverity.critical || 0) + (issueSummary?.bySeverity.high || 0);

  // Prepare trend chart data
  const trendChartData = trend.map((s) => ({
    date: new Date(s.snapshotDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    cost: Number((s.cost).toFixed(2)),
    conversions: Number(s.conversions.toFixed(1)),
    cpa: Number(s.cpa.toFixed(2)),
    healthScore: s.healthScore,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Dashboard</h2>

      {/* Health Score + Problems Row */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Health Score Card */}
        {healthScore && (
          <Card className="bg-card border-border">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  healthScore.score >= 75 ? 'bg-green-500' :
                  healthScore.score >= 50 ? 'bg-yellow-500' :
                  healthScore.score >= 25 ? 'bg-orange-500' : 'bg-red-500'
                }`}>
                  <span className="text-xl font-bold text-white">{healthScore.score}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Health Score</p>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {Object.entries(healthScore.breakdown).map(([key, item]) => (
                      <div key={key} className="text-xs">
                        <span className="text-muted-foreground">{formatBreakdownLabel(key)}: </span>
                        <span className={`font-medium ${item.score >= item.max * 0.7 ? 'text-green-600' : item.score >= item.max * 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {item.score}/{item.max}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Problems Summary Card */}
        <Link to={`/audit/${accountId}/issues`} className="block">
          <Card className={`border-l-4 h-full ${criticalHigh > 0 ? 'border-l-red-500 bg-red-500/5' : totalIssues > 0 ? 'border-l-yellow-500 bg-yellow-500/5' : 'border-l-green-500 bg-green-500/5'} hover:shadow-md transition-shadow cursor-pointer`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${criticalHigh > 0 ? 'bg-red-100 dark:bg-red-500/20' : totalIssues > 0 ? 'bg-yellow-100 dark:bg-yellow-500/20' : 'bg-green-100 dark:bg-green-500/20'}`}>
                    <AlertTriangle className={`h-5 w-5 ${criticalHigh > 0 ? 'text-red-600' : totalIssues > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Problemi Rilevati</p>
                    <p className="text-2xl font-bold text-foreground">{totalIssues}</p>
                  </div>
                </div>
                {totalIssues > 0 && (
                  <div className="flex gap-3">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-xs text-muted-foreground">Crit.</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground">{issueSummary?.bySeverity.critical || 0}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                        <span className="text-xs text-muted-foreground">High</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground">{issueSummary?.bySeverity.high || 0}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span className="text-xs text-muted-foreground">Med.</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground">{issueSummary?.bySeverity.medium || 0}</p>
                    </div>
                  </div>
                )}
                {totalIssues === 0 && (
                  <p className="text-sm text-green-600 font-medium">Nessun problema</p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

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
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Performance</h3>
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
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Qualità</h3>
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

      {/* AI Analysis Section */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6 flex items-center gap-2">
        <Brain className="h-4 w-4" />
        Analisi AI
      </h3>
      <div className="grid gap-3 md:grid-cols-3">
        {/* Acceptance Rate */}
        <Card className="bg-card border-border">
          <CardContent className="py-3 px-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Acceptance Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-foreground">
                {acceptanceRate ? `${acceptanceRate.rate}%` : '-'}
              </p>
              {acceptanceRate && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {acceptanceRate.approved}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <XCircle className="h-3 w-3 text-red-500" />
                    {acceptanceRate.rejected}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    {acceptanceRate.pending}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Analysis */}
        <Card className="bg-card border-border">
          <CardContent className="py-3 px-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Ultima Analisi</p>
            {analysisHistory.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-foreground">
                  {new Date(analysisHistory[0].startedAt).toLocaleDateString('it-IT', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    analysisHistory[0].status === 'completed' ? 'bg-green-500/10 text-green-600' :
                    analysisHistory[0].status === 'failed' ? 'bg-red-500/10 text-red-600' :
                    'bg-yellow-500/10 text-yellow-600'
                  }`}>
                    {analysisHistory[0].status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {analysisHistory[0].totalRecommendations} raccomandazioni
                  </span>
                  {analysisHistory[0].durationMs && (
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(analysisHistory[0].durationMs / 1000)}s)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nessuna analisi eseguita</p>
            )}
          </CardContent>
        </Card>

        {/* Analyze All Button */}
        <Card className="bg-card border-border">
          <CardContent className="py-3 px-4 flex flex-col justify-center">
            <Button
              className="w-full"
              disabled={isAnalyzing}
              onClick={async () => {
                if (!accountId) return;
                setIsAnalyzing(true);
                try {
                  const result = await analyzeAllModules(accountId);
                  setAnalysisHistory((prev) => [result, ...prev.slice(0, 4)]);
                } catch (err) {
                  console.error('Analysis failed:', err);
                } finally {
                  setIsAnalyzing(false);
                }
              }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizzando...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analizza Tutti i Moduli
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Esegue tutti i moduli AI e genera raccomandazioni
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Charts */}
      {trendChartData.length >= 2 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Trend Performance
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cost + Conversions Chart */}
            <Card className="bg-card border-border">
              <CardContent className="py-4 px-3">
                <p className="text-sm font-medium text-foreground mb-3">Costo & Conversioni</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => {
                        const v = Number(value) || 0;
                        if (name === 'cost') return [`€${v.toFixed(2)}`, 'Costo'];
                        return [v.toFixed(1), 'Conversioni'];
                      }}
                    />
                    <Legend
                      formatter={(value) => value === 'cost' ? 'Costo' : 'Conversioni'}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* CPA + Health Score Chart */}
            <Card className="bg-card border-border">
              <CardContent className="py-4 px-3">
                <p className="text-sm font-medium text-foreground mb-3">CPA & Health Score</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => {
                        const v = Number(value) || 0;
                        if (name === 'cpa') return [`€${v.toFixed(2)}`, 'CPA'];
                        return [v, 'Health Score'];
                      }}
                    />
                    <Legend
                      formatter={(value) => value === 'cpa' ? 'CPA' : 'Health Score'}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="cpa" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="healthScore" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function formatBreakdownLabel(key: string): string {
  const labels: Record<string, string> = {
    qualityScore: 'QS',
    wastedSpend: 'Spreco',
    negativeCoverage: 'Negative',
    impressionShare: 'Impr. Share',
    accountStructure: 'Struttura',
    issueSeverity: 'Problemi',
  };
  return labels[key] || key;
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
    <Card className={highlight ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}>
      <CardContent className="py-2.5 px-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className={`text-lg font-bold truncate ${valueColor || 'text-foreground'}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground/70 truncate">{subtitle}</p>}
          </div>
          {icon && <div className="text-muted-foreground ml-2">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
