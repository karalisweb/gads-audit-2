import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  Sparkles,
  FileText,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  listBriefs,
  generateClusters,
  createBrief,
  deleteBrief,
  type LandingPageBrief,
  type KeywordCluster,
} from '@/api/landing-pages';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

/** Storage key for persisting clusters per account */
function clusterStorageKey(accountId: string) {
  return `lp_clusters_${accountId}`;
}

export function LandingPagePlannerPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [briefs, setBriefs] = useState<LandingPageBrief[]>([]);
  const [clusters, setClusters] = useState<KeywordCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [creatingBrief, setCreatingBrief] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [excludedInfo, setExcludedInfo] = useState<{ excluded: number; total: number } | null>(null);

  // Restore clusters from sessionStorage on mount
  useEffect(() => {
    if (!accountId) return;
    loadBriefs();
    try {
      const saved = sessionStorage.getItem(clusterStorageKey(accountId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
          setClusters(parsed.clusters);
          if (parsed.excludedInfo) setExcludedInfo(parsed.excludedInfo);
        }
      }
    } catch { /* ignore parse errors */ }
  }, [accountId]);

  // Persist clusters to sessionStorage whenever they change
  const persistClusters = useCallback((newClusters: KeywordCluster[], info?: { excluded: number; total: number } | null) => {
    setClusters(newClusters);
    if (accountId) {
      if (newClusters.length > 0) {
        sessionStorage.setItem(clusterStorageKey(accountId), JSON.stringify({
          clusters: newClusters,
          excludedInfo: info ?? excludedInfo,
        }));
      } else {
        sessionStorage.removeItem(clusterStorageKey(accountId));
      }
    }
  }, [accountId, excludedInfo]);

  // Se arrivo dalla pagina LP con sourceUrl, avvio clustering automatico
  useEffect(() => {
    const sourceUrl = searchParams.get('sourceUrl');
    if (sourceUrl && accountId && clusters.length === 0 && !clusterLoading) {
      handleGenerateClusters();
    }
  }, [searchParams, accountId]);

  async function loadBriefs() {
    if (!accountId) return;
    try {
      setLoading(true);
      const data = await listBriefs(accountId);
      setBriefs(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateClusters() {
    if (!accountId) return;
    try {
      setClusterLoading(true);
      setError('');
      const result = await generateClusters(accountId);
      const newClusters = result.clusters || [];
      const info = {
        excluded: result.excludedKeywordCount || 0,
        total: result.totalKeywordCount || 0,
      };
      setExcludedInfo(info);
      persistClusters(newClusters, info);
    } catch (err: any) {
      setError(err.message || 'Errore nella generazione dei cluster');
    } finally {
      setClusterLoading(false);
    }
  }

  async function handleCreateBrief(cluster: KeywordCluster) {
    if (!accountId) return;
    try {
      setCreatingBrief(cluster.topic);
      const brief = await createBrief({
        accountId,
        name: `LP ${cluster.topic}`,
        sourceUrl: cluster.currentUrl || undefined,
        primaryKeyword: cluster.primaryKeyword,
        keywordCluster: cluster.keywords.map((kw) => ({
          keywordText: kw.keywordText,
          keywordId: kw.keywordId,
          impressions: kw.impressions,
          clicks: kw.clicks,
          cost: kw.cost,
          conversions: kw.conversions,
          qualityScore: kw.qualityScore,
          matchType: kw.matchType,
        })),
      });

      // Remove the used cluster from the list (don't navigate away — let user create more briefs)
      const remaining = clusters.filter((c) => c.topic !== cluster.topic);
      persistClusters(remaining);

      // Reload briefs to include the new one
      await loadBriefs();

      // If user wants to go to the brief, they can click on it in the list below
      // But also offer immediate navigation
      if (remaining.length === 0) {
        // All clusters used, navigate to brief
        navigate(`/audit/${accountId}/lp-planner/${brief.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Errore nella creazione del brief');
    } finally {
      setCreatingBrief(null);
    }
  }

  async function handleDeleteBrief(id: string) {
    if (!confirm('Eliminare questo brief?')) return;
    try {
      await deleteBrief(id);
      setBriefs((prev) => prev.filter((b) => b.id !== id));
      // Clear cached clusters since deleted brief frees up keywords
      if (accountId) {
        sessionStorage.removeItem(clusterStorageKey(accountId));
        setClusters([]);
        setExcludedInfo(null);
      }
    } catch (err: any) {
      setError(err.message || 'Errore nell\'eliminazione');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Cluster Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Cluster Keyword
          </CardTitle>
          <Button
            onClick={handleGenerateClusters}
            disabled={clusterLoading}
            size="sm"
          >
            {clusterLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Analizza Cluster
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Info banner: excluded keywords */}
          {excludedInfo && excludedInfo.excluded > 0 && (
            <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-400">
                <strong>{excludedInfo.excluded}</strong> keyword su {excludedInfo.total} escluse dal clustering
                perché già assegnate a brief esistenti.
                {' '}Elimina un brief per liberare le sue keyword.
              </p>
            </div>
          )}

          {/* Empty state: no keywords available */}
          {excludedInfo && excludedInfo.excluded > 0 && clusters.length === 0 && !clusterLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tutte le keyword sono già assegnate a brief. Elimina un brief per liberare keyword, oppure controlla i brief esistenti qui sotto.
            </p>
          )}

          {clusters.length === 0 && !clusterLoading && !(excludedInfo && excludedInfo.excluded > 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Clicca "Analizza Cluster" per raggruppare le keyword dell'account in cluster semantici.
              L'AI identificherà le keyword principali e i gruppi per cui creare landing page dedicate.
            </p>
          ) : (
            <div className="space-y-3">
              {clusters.map((cluster, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{cluster.topic}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        KW principale:{' '}
                        <span className="text-primary font-medium">
                          {cluster.primaryKeyword}
                        </span>
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{cluster.keywords.length} keyword</span>
                        <span>QS medio: {cluster.avgQualityScore}</span>
                        <span>Costo: {formatCurrency(cluster.totalCost)}</span>
                        <span>Conv: {cluster.totalConversions}</span>
                      </div>
                      {cluster.currentUrl && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={cluster.currentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary truncate max-w-sm"
                          >
                            {cluster.currentUrl}
                          </a>
                        </div>
                      )}
                      {/* Keyword list (collapsed) */}
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Mostra keyword del cluster
                        </summary>
                        <div className="mt-1.5 space-y-0.5">
                          {cluster.keywords.map((kw, j) => (
                            <div key={j} className="text-xs text-muted-foreground flex items-center gap-2">
                              <span className="truncate">{kw.keywordText}</span>
                              <span className="text-[10px] opacity-60">
                                QS:{kw.qualityScore || '-'} | {kw.impressions || 0} imp | {kw.clicks || 0} click
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateBrief(cluster)}
                      disabled={creatingBrief === cluster.topic}
                    >
                      {creatingBrief === cluster.topic ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Crea Brief
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Briefs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Brief Salvati
          </CardTitle>
        </CardHeader>
        <CardContent>
          {briefs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nessun brief creato. Genera i cluster e crea il primo brief.
            </p>
          ) : (
            <div className="space-y-2">
              {briefs.map((brief) => (
                <div
                  key={brief.id}
                  className="border border-border rounded-lg p-3 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/audit/${accountId}/lp-planner/${brief.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{brief.name}</h3>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          brief.status === 'completed'
                            ? 'bg-success/15 text-success'
                            : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        {brief.status === 'completed' ? 'Completato' : 'Bozza'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {brief.primaryKeyword && (
                        <span>KW: {brief.primaryKeyword}</span>
                      )}
                      {brief.keywordCluster && (
                        <span>{brief.keywordCluster.length} keyword</span>
                      )}
                      <span>
                        {new Date(brief.createdAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBrief(brief.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
