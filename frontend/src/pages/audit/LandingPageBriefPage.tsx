import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Lightbulb,
  Search as SearchIcon,
  Globe,
  FileText,
  Star,
  MessageSquare,
  HelpCircle,
  Target,
  Image,
  Megaphone,
  Save,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getBrief,
  generateBrief,
  scrapeSourceUrl,
  updateBrief,
  type LandingPageBrief,
  type BriefSection,
} from '@/api/landing-pages';

const sectionIcons: Record<string, any> = {
  hero: Megaphone,
  benefits: Star,
  services: FileText,
  social_proof: MessageSquare,
  faq: HelpCircle,
  cta_final: Target,
  text: FileText,
  gallery: Image,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export function LandingPageBriefPage() {
  const { accountId, briefId } = useParams<{ accountId: string; briefId: string }>();
  const navigate = useNavigate();

  const [brief, setBrief] = useState<LandingPageBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [showKeywords, setShowKeywords] = useState(false);

  useEffect(() => {
    if (!briefId) return;
    loadBrief();
  }, [briefId]);

  async function loadBrief() {
    if (!briefId) return;
    try {
      setLoading(true);
      const data = await getBrief(briefId);
      setBrief(data);
      setNotes(data.notes || '');
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }

  async function handleScrape() {
    if (!briefId) return;
    try {
      setScraping(true);
      setError('');
      const updated = await scrapeSourceUrl(briefId);
      setBrief(updated);
    } catch (err: any) {
      setError(err.message || 'Errore nello scraping');
    } finally {
      setScraping(false);
    }
  }

  async function handleGenerate() {
    if (!briefId) return;
    try {
      setGenerating(true);
      setError('');
      const updated = await generateBrief(briefId);
      setBrief(updated);
    } catch (err: any) {
      setError(err.message || 'Errore nella generazione del brief');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveNotes() {
    if (!briefId) return;
    try {
      setSaving(true);
      await updateBrief(briefId, { notes });
    } catch (err: any) {
      setError(err.message || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="text-center py-20 text-muted-foreground">Brief non trovato</div>
    );
  }

  const briefData = brief.brief;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/audit/${accountId}/lp-planner`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{brief.name}</h2>
            <p className="text-sm text-muted-foreground">
              KW principale:{' '}
              <span className="text-primary font-medium">{brief.primaryKeyword || '-'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {brief.sourceUrl && !brief.scrapedContent && (
            <Button size="sm" variant="outline" onClick={handleScrape} disabled={scraping}>
              {scraping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4 mr-2" />
              )}
              Analizza LP Attuale
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {briefData ? 'Rigenera Brief' : 'Genera Brief'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Info Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {brief.sourceUrl && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <a
              href={brief.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              {brief.sourceUrl}
              <ExternalLink className="h-3 w-3 inline ml-1" />
            </a>
          </div>
        )}
        {brief.keywordCluster && (
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {showKeywords ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {brief.keywordCluster.length} keyword nel cluster
          </button>
        )}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            brief.status === 'completed'
              ? 'bg-success/15 text-success'
              : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
          }`}
        >
          {brief.status === 'completed' ? 'Completato' : 'Bozza'}
        </span>
      </div>

      {/* Keyword cluster detail */}
      {showKeywords && brief.keywordCluster && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {brief.keywordCluster.map((kw, i) => (
                <div
                  key={i}
                  className="text-xs border border-border rounded px-2.5 py-1.5 flex items-center justify-between"
                >
                  <span className="truncate font-medium">{kw.keywordText}</span>
                  <span className="text-muted-foreground ml-2 whitespace-nowrap">
                    QS:{kw.qualityScore || '-'} | {kw.impressions || 0} imp | {formatCurrency(kw.cost || 0)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brief content */}
      {!briefData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Clicca "Genera Brief" per ottenere i suggerimenti AI per la landing page.
              {brief.sourceUrl && !brief.scrapedContent && (
                <>
                  <br />
                  Consiglio: prima analizza la LP attuale per risultati migliori.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* LP Issues */}
          {briefData.currentLpIssues && briefData.currentLpIssues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Problemi LP Attuale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {briefData.currentLpIssues.map((issue, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Purpose & Audience */}
          {(briefData.pagePurpose || briefData.targetAudience) && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                {briefData.pagePurpose && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">Scopo pagina</span>
                    <p className="text-sm mt-0.5">{briefData.pagePurpose}</p>
                  </div>
                )}
                {briefData.targetAudience && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">Target</span>
                    <p className="text-sm mt-0.5">{briefData.targetAudience}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sections Brief */}
          {briefData.sections && briefData.sections.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Struttura Sezioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {briefData.sections.map((section, i) => {
                    const Icon = sectionIcons[section.type] || FileText;
                    return (
                      <div
                        key={i}
                        className="border border-border rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase">
                            {i + 1}. {section.type.replace('_', ' ')}
                          </span>
                          <span className="font-medium text-sm">{section.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {section.instructions}
                        </p>
                        <ul className="space-y-1">
                          {section.keyPoints.map((point, j) => (
                            <li key={j} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SEO Notes */}
          {briefData.seoNotes && briefData.seoNotes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <SearchIcon className="h-4 w-4" />
                  Consigli SEO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {briefData.seoNotes.map((note, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-yellow-500 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Meta Tags */}
          {(briefData.metaTitle || briefData.metaDescription) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Meta Tags Suggeriti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {briefData.metaTitle && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Meta Title</span>
                    <div className="mt-1 bg-muted/50 rounded px-3 py-2 text-sm font-mono">
                      {briefData.metaTitle}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {briefData.metaTitle.length} caratteri
                    </span>
                  </div>
                )}
                {briefData.metaDescription && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Meta Description</span>
                    <div className="mt-1 bg-muted/50 rounded px-3 py-2 text-sm font-mono">
                      {briefData.metaDescription}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {briefData.metaDescription.length} caratteri
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Note</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aggiungi note personali su questo brief..."
            className="w-full min-h-[100px] bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salva Note
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
