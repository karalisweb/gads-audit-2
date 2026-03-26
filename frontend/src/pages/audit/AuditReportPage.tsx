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
  History,
  Columns2,
  X,
  ChevronRight,
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
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-3 pb-2 border-b border-border">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Paragraphs (lines that are not already HTML)
    .replace(/^(?!<[hlu]|<li)(.+)$/gm, '<p class="mb-2">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p class="mb-2"><\/p>/g, '')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => `<ul class="mb-3 space-y-1">${match}</ul>`);

  // Sanitize to prevent XSS injection
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
  const [showHistory, setShowHistory] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Comparison state
  const [compareReport, setCompareReport] = useState<AuditReport | null>(null);
  const [showCompare, setShowCompare] = useState(false);

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
    try {
      const newReport = await generateReport(accountId);
      // If there was a previous report, offer comparison
      const previousReport = report;
      setReport(newReport);
      setMessages([]);
      setSelectedReportId(newReport.id);
      // Refresh history
      const history = await getReportHistory(accountId, 1, 50);
      setHistoryReports(history?.reports || []);
      // Auto-offer comparison with previous
      if (previousReport && previousReport.id !== newReport.id) {
        setCompareReport(previousReport);
        setShowCompare(true);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectReport = async (reportId: string) => {
    if (!accountId || reportId === selectedReportId) return;
    try {
      const [rpt, msgs] = await Promise.all([
        getReportById(accountId, reportId),
        getReportMessagesById(accountId, reportId),
      ]);
      if (rpt) {
        setReport(rpt);
        setSelectedReportId(rpt.id);
        setMessages(msgs || []);
        setShowCompare(false);
        setCompareReport(null);
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

    // Optimistically add user message
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
        // Replace temp message with real one and add assistant response
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
            Analisi completa dell'account con possibilità di fare domande
          </p>
        </div>
        <div className="flex items-center gap-2">
          {historyReports.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-1" />
              Storico ({historyReports.length})
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating
              ? 'Generazione in corso...'
              : report
                ? 'Aggiorna Report'
                : 'Genera Report'}
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && historyReports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Storico Report
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {historyReports.map((hr) => (
                <div
                  key={hr.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    hr.id === selectedReportId
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectReport(hr.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {formatDate(hr.generatedAt)}
                        </span>
                        <ProviderBadge provider={hr.aiProvider} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {hr.durationMs ? `${(hr.durationMs / 1000).toFixed(1)}s` : ''}
                        {hr.aiModel ? ` · ${hr.aiModel}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {hr.id !== selectedReportId && report && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompareWith(hr.id);
                        }}
                      >
                        <Columns2 className="h-3 w-3 mr-1" />
                        Confronta
                      </Button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
              <BookOpen className="h-4 w-4 mr-2" />
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
            <h3 className="text-lg font-semibold mb-2">Generazione report in corso...</h3>
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
              {/* Older report */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">PRECEDENTE</span>
                  <span className="text-xs text-muted-foreground">{formatDate(compareReport.generatedAt)}</span>
                  <ProviderBadge provider={compareReport.aiProvider} />
                </div>
                <div
                  className="text-xs leading-relaxed max-h-[500px] overflow-y-auto pr-2"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(compareReport.content || '') }}
                />
              </div>
              {/* Current report */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                  <span className="text-xs font-medium text-primary">ATTUALE</span>
                  <span className="text-xs text-muted-foreground">{formatDate(report.generatedAt)}</span>
                  <ProviderBadge provider={report.aiProvider} />
                </div>
                <div
                  className="text-xs leading-relaxed max-h-[500px] overflow-y-auto pr-2"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content || '') }}
                />
              </div>
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
