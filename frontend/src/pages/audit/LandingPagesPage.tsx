import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Globe,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  MinusCircle,
  HelpCircle,
  Bot,
  Loader2,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getLandingPageAnalysis, type LandingPageData, type LandingPageAnalysis } from '@/api/audit';
import { analyzeModule, createModificationsFromAI } from '@/api/ai';

function ExperienceBadge({ experience }: { experience: string }) {
  switch (experience) {
    case 'ABOVE_AVERAGE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
          <CheckCircle className="h-3 w-3" />
          Sopra la media
        </span>
      );
    case 'AVERAGE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
          <MinusCircle className="h-3 w-3" />
          Nella media
        </span>
      );
    case 'BELOW_AVERAGE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Sotto la media
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <HelpCircle className="h-3 w-3" />
          Sconosciuto
        </span>
      );
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('it-IT').format(value);
}

type SortField = 'cost' | 'conversions' | 'keywordCount' | 'ctr' | 'cpa' | 'avgQualityScore' | 'impressions';

export function LandingPagesPage() {
  const { accountId } = useParams<{ accountId: string }>();

  const [data, setData] = useState<LandingPageAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('cost');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // AI Analysis state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState('');
  const [savingAi, setSavingAi] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    getLandingPageAnalysis(accountId)
      .then(setData)
      .catch((err) => setError(err.message || 'Errore nel caricamento'))
      .finally(() => setLoading(false));
  }, [accountId]);

  const toggleExpand = (url: string) => {
    setExpandedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    if (!data?.landingPages) return [];
    let filtered = data.landingPages;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lp) =>
          lp.url.toLowerCase().includes(q) ||
          lp.keywords.some((kw) => kw.keywordText.toLowerCase().includes(q))
      );
    }
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [data, searchQuery, sortField, sortDir]);

  const handleAIAnalysis = async () => {
    if (!accountId) return;
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    setAiSaved(false);
    try {
      const result = await analyzeModule(accountId, {
        moduleId: 24,
      });
      setAiResult(result);
    } catch (err: any) {
      setAiError(err.message || 'Errore durante l\'analisi AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveRecommendations = async () => {
    if (!accountId || !aiResult?.recommendations?.length) return;
    setSavingAi(true);
    try {
      await createModificationsFromAI({
        accountId,
        moduleId: 24,
        recommendations: aiResult.recommendations,
      });
      setAiSaved(true);
    } catch (err: any) {
      setAiError(err.message || 'Errore nel salvataggio');
    } finally {
      setSavingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/30">
        <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
      </Card>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Landing Pages</h2>
            <p className="text-sm text-muted-foreground">
              Analisi delle landing page associate alle keyword attive
            </p>
          </div>
        </div>
        <Button
          onClick={handleAIAnalysis}
          disabled={aiLoading}
          className="bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground"
        >
          {aiLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analisi in corso...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4 mr-2" />
              Analizza con AI
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{summary.totalPages}</p>
              <p className="text-xs text-muted-foreground">Landing Page</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{summary.totalKeywords}</p>
              <p className="text-xs text-muted-foreground">Keywords</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.totalCost)}</p>
              <p className="text-xs text-muted-foreground">Spesa Totale</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{summary.totalConversions.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Conversioni</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center gap-3 text-xs">
                <span className="text-success">{summary.experienceDistribution.aboveAverage} sopra</span>
                <span className="text-yellow-500">{summary.experienceDistribution.average} media</span>
                <span className="text-destructive">{summary.experienceDistribution.belowAverage} sotto</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Experience</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Analysis Result */}
      {aiError && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">{aiError}</CardContent>
        </Card>
      )}

      {aiResult && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Analisi AI - Landing Pages</h3>
              </div>
              {aiResult.recommendations?.length > 0 && !aiSaved && (
                <Button
                  size="sm"
                  onClick={handleSaveRecommendations}
                  disabled={savingAi}
                  className="bg-gradient-to-r from-primary to-yellow-500 text-primary-foreground"
                >
                  {savingAi ? 'Salvataggio...' : `Salva ${aiResult.recommendations.length} modifiche`}
                </Button>
              )}
              {aiSaved && (
                <span className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Salvate
                </span>
              )}
            </div>
            {aiResult.summary && (
              <p className="text-sm text-muted-foreground">{aiResult.summary}</p>
            )}
            {aiResult.recommendations?.length > 0 && (
              <div className="space-y-2">
                {aiResult.recommendations.map((rec: any, idx: number) => (
                  <div
                    key={rec.id || idx}
                    className="p-3 rounded-lg border border-border bg-card/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              rec.priority === 'high'
                                ? 'bg-destructive/15 text-destructive'
                                : rec.priority === 'medium'
                                ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                                : 'bg-blue-500/15 text-blue-500'
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            {rec.action}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{rec.entityName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>
                        {rec.expectedImpact && (
                          <p className="text-xs text-primary mt-1">{rec.expectedImpact}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per URL o keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-border text-foreground"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { field: 'cost' as SortField, label: 'Costo' },
              { field: 'conversions' as SortField, label: 'Conv.' },
              { field: 'keywordCount' as SortField, label: 'Keywords' },
              { field: 'avgQualityScore' as SortField, label: 'QS' },
              { field: 'cpa' as SortField, label: 'CPA' },
            ] as const
          ).map((item) => (
            <button
              key={item.field}
              onClick={() => handleSort(item.field)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                sortField === item.field
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {item.label}
              <ArrowUpDown className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>

      {/* Landing Pages Table */}
      <div className="space-y-2">
        {filteredAndSorted.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Nessuna landing page trovata per la ricerca'
                  : 'Nessuna landing page con URL finale trovata nelle keyword attive'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSorted.map((lp) => (
            <LandingPageRow
              key={lp.url}
              landingPage={lp}
              isExpanded={expandedUrls.has(lp.url)}
              onToggle={() => toggleExpand(lp.url)}
            />
          ))
        )}
      </div>

      {/* Results count */}
      {filteredAndSorted.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {filteredAndSorted.length} landing page
          {searchQuery ? ` trovate per "${searchQuery}"` : ' totali'}
        </p>
      )}
    </div>
  );
}

function LandingPageRow({
  landingPage,
  isExpanded,
  onToggle,
}: {
  landingPage: LandingPageData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const lp = landingPage;

  // Truncate URL for display
  const displayUrl = (() => {
    try {
      const url = new URL(lp.url);
      const path = url.pathname === '/' ? '' : url.pathname;
      return `${url.hostname}${path}`;
    } catch {
      return lp.url;
    }
  })();

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {/* Main row */}
        <div className="flex items-start gap-3">
          <button className="mt-0.5 text-muted-foreground flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground truncate" title={lp.url}>
                {displayUrl}
              </span>
              <a
                href={lp.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary flex-shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{lp.keywordCount} keyword</span>
              <span>{lp.campaignCount} campagn{lp.campaignCount === 1 ? 'a' : 'e'}</span>
              <span>{lp.adGroupCount} ad group</span>
              <ExperienceBadge experience={lp.landingPageExperience} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-right flex-shrink-0">
            <div>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(lp.cost)}</p>
              <p className="text-xs text-muted-foreground">Costo</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{lp.conversions.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Conv.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {lp.conversions > 0 ? formatCurrency(lp.cpa) : '-'}
              </p>
              <p className="text-xs text-muted-foreground">CPA</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{lp.ctr.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">CTR</p>
            </div>
            {lp.avgQualityScore !== null && (
              <div>
                <p
                  className={`text-sm font-semibold ${
                    lp.avgQualityScore >= 7
                      ? 'text-success'
                      : lp.avgQualityScore >= 5
                      ? 'text-yellow-500'
                      : 'text-destructive'
                  }`}
                >
                  {lp.avgQualityScore.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">QS medio</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded keywords */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/20">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2 font-medium">Keyword</th>
                  <th className="text-left px-3 py-2 font-medium">Match</th>
                  <th className="text-right px-3 py-2 font-medium">QS</th>
                  <th className="text-left px-3 py-2 font-medium">LP Exp.</th>
                  <th className="text-right px-3 py-2 font-medium">Impr.</th>
                  <th className="text-right px-3 py-2 font-medium">Click</th>
                  <th className="text-right px-3 py-2 font-medium">Costo</th>
                  <th className="text-right px-3 py-2 font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {lp.keywords.map((kw) => (
                  <tr key={kw.keywordId} className="border-b border-border/50 hover:bg-muted/40">
                    <td className="px-4 py-2 text-foreground font-medium max-w-[200px] truncate">
                      {kw.keywordText}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{kw.matchType}</td>
                    <td className="px-3 py-2 text-right">
                      {kw.qualityScore ? (
                        <span
                          className={`font-medium ${
                            kw.qualityScore >= 7
                              ? 'text-success'
                              : kw.qualityScore >= 5
                              ? 'text-yellow-500'
                              : 'text-destructive'
                          }`}
                        >
                          {kw.qualityScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <ExperienceBadge experience={kw.landingPageExperience || 'UNKNOWN'} />
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {formatNumber(kw.impressions)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {formatNumber(kw.clicks)}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatCurrency(kw.costMicros / 1_000_000)}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {kw.conversions > 0 ? kw.conversions.toFixed(1) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
