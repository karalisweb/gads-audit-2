import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  RefreshCw,
  Send,
  Bot,
  User,
  Clock,
  AlertCircle,
  Columns2,
  X,
  Sparkles,
  Plus,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import {
  generateReport,
  getLatestReport,
  sendChatMessage,
  getReportMessages,
  getReportHistory,
  getReportById,
  getReportMessagesById,
} from '@/api/ai-report';
import type { AuditReport, ReportMessage } from '@/api/ai-report';

function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-3 pb-2 border-b border-border">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^(?!<[hlu]|<li)(.+)$/gm, '<p class="mb-2">$1</p>')
    .replace(/<p class="mb-2"><\/p>/g, '')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => `<ul class="mb-3 space-y-1">${match}</ul>`);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'Adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffH < 24) return `${diffH} ore fa`;
  if (diffD < 7) return `${diffD} giorni fa`;
  return date.toLocaleDateString('it-IT');
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProviderBadge({ provider }: { provider: string | null }) {
  if (!provider) return null;
  const config: Record<string, { label: string; color: string }> = {
    openai: { label: 'GPT', color: 'bg-green-500/20 text-green-600' },
    gemini: { label: 'Gemini', color: 'bg-blue-500/20 text-blue-600' },
    claude: { label: 'Claude', color: 'bg-orange-500/20 text-orange-600' },
  };
  const c = config[provider] || { label: provider, color: 'bg-muted text-muted-foreground' };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.color}`}>
      {c.label}
    </span>
  );
}

export function AuditReportPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // History state
  const [historyReports, setHistoryReports] = useState<AuditReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Comparison state
  const [compareReport, setCompareReport] = useState<AuditReport | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // "Just generated" banner
  const [justGenerated, setJustGenerated] = useState(false);
  const [previousReportForCompare, setPreviousReportForCompare] = useState<AuditReport | null>(null);

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const [rpt, msgs, history] = await Promise.all([
        getLatestReport(accountId),
        getReportMessages(accountId),
        getReportHistory(accountId, 1, 50),
      ]);
      setReport(rpt);
      setMessages(msgs || []);
      setHistoryReports(history?.reports || []);
      if (rpt) {
        setSelectedReportId(rpt.id);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleGenerate = async () => {
    if (!accountId) return;
    setIsGenerating(true);
    setJustGenerated(false);
    setShowCompare(false);
    setCompareReport(null);
    try {
      const previousReport = report;
      const newReport = await generateReport(accountId);
      setReport(newReport);
      setMessages([]);
      setSelectedReportId(newReport.id);
      // Refresh history
      const history = await getReportHistory(accountId, 1, 50);
      setHistoryReports(history?.reports || []);
      // Show "just generated" banner with compare option
      setJustGenerated(true);
      if (previousReport && previousReport.id !== newReport.id) {
        setPreviousReportForCompare(previousReport);
      } else {
        setPreviousReportForCompare(null);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectReport = async (reportId: string) => {
    if (!accountId || reportId === selectedReportId) return;
    setJustGenerated(false);
    setPreviousReportForCompare(null);
    setShowCompare(false);
    setCompareReport(null);
    try {
      const [rpt, msgs] = await Promise.all([
        getReportById(accountId, reportId),
        getReportMessagesById(accountId, reportId),
      ]);
      if (rpt) {
        setReport(rpt);
        setSelectedReportId(rpt.id);
        setMessages(msgs || []);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  };

  const handleCompareWith = async (reportId: string) => {
    if (!accountId) return;
    try {
      const rpt = await getReportById(accountId, reportId);
      if (rpt) {
        setCompareReport(rpt);
        setShowCompare(true);
        setJustGenerated(false);
      }
    } catch (err) {
      console.error('Failed to load comparison report:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !chatInput.trim() || isSending) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsSending(true);

    const tempUserMsg: ReportMessage = {
      id: `temp-${Date.now()}`,
      reportId: report?.id || '',
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const assistantMsg = await sendChatMessage(accountId, userMessage, selectedReportId || undefined);
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...withoutTemp,
          { ...tempUserMsg, id: `user-${assistantMsg.id}` },
          assistantMsg,
        ];
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  // Check if viewing the latest report
  const isViewingLatest = historyReports.length > 0 && selectedReportId === historyReports[0]?.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report AI</h2>
          <p className="text-muted-foreground">
            Analisi strategica dell'account con consulente AI
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generazione in corso...
            </>
          ) : report ? (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Genera Nuovo Report
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Genera Report
            </>
          )}
        </Button>
      </div>

      {/* History bar - always visible when there are multiple reports */}
      {historyReports.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {historyReports.map((hr, index) => (
            <button
              key={hr.id}
              onClick={() => handleSelectReport(hr.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors border ${
                hr.id === selectedReportId
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted/80 text-foreground border-border'
              }`}
            >
              {index === 0 && (
                <span className={`w-1.5 h-1.5 rounded-full ${
                  hr.id === selectedReportId ? 'bg-primary-foreground' : 'bg-green-500'
                }`} />
              )}
              <span>{formatDate(hr.generatedAt)}</span>
              <ProviderBadge provider={hr.aiProvider} />
            </button>
          ))}
        </div>
      )}

      {/* "Just generated" banner */}
      {justGenerated && report && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Nuovo report generato!
            </span>
            {report.durationMs && (
              <span className="text-xs text-green-600/70">
                ({(report.durationMs / 1000).toFixed(1)}s)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {previousReportForCompare && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-green-500/30 text-green-700 hover:bg-green-500/10"
                onClick={() => {
                  setCompareReport(previousReportForCompare);
                  setShowCompare(true);
                  setJustGenerated(false);
                }}
              >
                <Columns2 className="h-3 w-3 mr-1" />
                Confronta con il precedente
              </Button>
            )}
            <button
              onClick={() => setJustGenerated(false)}
              className="text-green-600/50 hover:text-green-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Viewing old report indicator */}
      {report && !isViewingLatest && historyReports.length > 1 && !showCompare && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              Stai visualizzando un report del <strong>{formatDate(report.generatedAt)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10"
              onClick={() => handleSelectReport(historyReports[0].id)}
            >
              Vai al più recente
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10"
              onClick={() => handleCompareWith(report.id)}
            >
              <Columns2 className="h-3 w-3 mr-1" />
              Confronta con l'attuale
            </Button>
          </div>
        </div>
      )}

      {/* No report state */}
      {!report && !isGenerating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun report disponibile</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Genera un report AI per ottenere un'analisi completa del tuo account Google Ads,
              con punti di forza, aree di miglioramento e suggerimenti pratici.
            </p>
            <Button onClick={handleGenerate}>
              <Sparkles className="h-4 w-4 mr-2" />
              Genera Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generating state */}
      {isGenerating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generazione nuovo report in corso...</h3>
            <p className="text-muted-foreground">
              L'AI sta analizzando i dati del tuo account. Potrebbe richiedere 20-30 secondi.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comparison View */}
      {showCompare && report && compareReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Columns2 className="h-5 w-5" />
                Confronto Report
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowCompare(false); setCompareReport(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Determine which is older */}
              {(() => {
                const reportDate = new Date(report.generatedAt).getTime();
                const compareDate = new Date(compareReport.generatedAt).getTime();
                const older = reportDate < compareDate ? report : compareReport;
                const newer = reportDate < compareDate ? compareReport : report;
                return (
                  <>
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                        <span className="text-xs font-medium text-muted-foreground">PRECEDENTE</span>
                        <span className="text-xs text-muted-foreground">{formatDate(older.generatedAt)}</span>
                        <ProviderBadge provider={older.aiProvider} />
                      </div>
                      <div
                        className="text-xs leading-relaxed max-h-[500px] overflow-y-auto pr-2"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(older.content || '') }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/30">
                        <span className="text-xs font-medium text-primary">NUOVO</span>
                        <span className="text-xs text-muted-foreground">{formatDate(newer.generatedAt)}</span>
                        <ProviderBadge provider={newer.aiProvider} />
                      </div>
                      <div
                        className="text-xs leading-relaxed max-h-[500px] overflow-y-auto pr-2"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(newer.content || '') }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      {report && report.status === 'completed' && report.content && !showCompare && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Report Audit
                {isViewingLatest && historyReports.length > 1 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-500/20 text-green-600">
                    Ultimo
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ProviderBadge provider={report.aiProvider} />
                {report.aiModel && (
                  <span className="text-muted-foreground">{report.aiModel}</span>
                )}
                <Clock className="h-3 w-3" />
                {timeAgo(report.generatedAt)}
                {report.durationMs && (
                  <span className="text-muted-foreground">
                    ({(report.durationMs / 1000).toFixed(1)}s)
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content) }}
            />
          </CardContent>
        </Card>
      )}

      {/* Failed report */}
      {report && report.status === 'failed' && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Generazione report fallita</p>
              <p className="text-sm text-muted-foreground">
                Si è verificato un errore. Riprova a generare il report.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Section */}
      {report && report.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5" />
              Chiedi all'AI
              {report.aiProvider && (
                <ProviderBadge provider={report.aiProvider} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Messages */}
            {messages.length > 0 && (
              <div
                ref={chatContainerRef}
                className="space-y-3 max-h-[400px] overflow-y-auto mb-4 pr-1"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(msg.content),
                          }}
                        />
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isSending && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}

            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                Fai una domanda sul report per approfondire qualsiasi aspetto dell'analisi. L'AI ragionerà con te come un consulente strategico.
              </p>
            )}

            {/* Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Es: Come posso migliorare il CTR? Quale strategia suggerisci per le conversioni?"
                disabled={isSending}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!chatInput.trim() || isSending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
