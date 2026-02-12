import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AIAnalysisResponse, AIRecommendation } from '@/types/ai';

interface AIRecommendationsProps {
  analysis: AIAnalysisResponse;
  onApproveSelected: (recommendations: AIRecommendation[]) => void;
  onClose: () => void;
  isCreating?: boolean;
}

const priorityConfig = {
  high: { badge: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800', label: 'Alta' },
  medium: { badge: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800', label: 'Media' },
  low: { badge: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800', label: 'Bassa' },
};

const actionLabels: Record<string, string> = {
  pause: 'Pausa',
  increase_bid: 'Aumenta bid',
  decrease_bid: 'Riduci bid',
  change_match_type: 'Cambia match type',
  add_negative_campaign: 'Aggiungi negativa (campagna)',
  add_negative_adgroup: 'Aggiungi negativa (ad group)',
  promote_to_keyword: 'Promuovi a keyword',
  improve_landing_page: 'Migliora landing page',
  improve_ad_relevance: 'Migliora rilevanza annuncio',
  add_headlines: 'Aggiungi headlines',
  add_descriptions: 'Aggiungi descrizioni',
  unpin: 'Rimuovi pin',
  rewrite: 'Riscrivi annuncio',
  remove: 'Rimuovi',
  replace: 'Sostituisci',
  add_new: 'Aggiungi nuovo',
  optimize: 'Ottimizza',
  exclude: 'Escludi',
  set_bid_modifier: 'Imposta bid modifier',
  disable: 'Disattiva',
  set_value: 'Imposta valore',
  scale: 'Scala',
  create_variant: 'Crea variante',
  increase_budget: 'Aumenta budget',
  adjust_target_cpa: 'Modifica CPA target',
  adjust_target_roas: 'Modifica ROAS target',
  change_bidding_strategy: 'Cambia strategia offerta',
};

export function AIRecommendations({ analysis, onApproveSelected, onClose, isCreating = false }: AIRecommendationsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === analysis.recommendations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(analysis.recommendations.map((r) => r.id)));
    }
  };

  const handleApprove = () => {
    const selected = analysis.recommendations.filter((r) => selectedIds.has(r.id));
    onApproveSelected(selected);
  };

  const highCount = analysis.recommendations.filter((r) => r.priority === 'high').length;
  const mediumCount = analysis.recommendations.filter((r) => r.priority === 'medium').length;
  const lowCount = analysis.recommendations.filter((r) => r.priority === 'low').length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-background">
        {/* Header */}
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analisi AI: {analysis.moduleName}
              </CardTitle>
              <CardDescription className="mt-1">
                Analizzati {analysis.dataStats.analyzedRecords} record su {analysis.dataStats.totalRecords}
              </CardDescription>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardHeader>

        {/* Riepilogo */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm mb-2">Riepilogo AI</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
          <div className="flex gap-3 mt-3">
            <Badge variant="outline" className={priorityConfig.high.badge}>
              {highCount} priorita alta
            </Badge>
            <Badge variant="outline" className={priorityConfig.medium.badge}>
              {mediumCount} priorita media
            </Badge>
            <Badge variant="outline" className={priorityConfig.low.badge}>
              {lowCount} priorita bassa
            </Badge>
          </div>
        </div>

        {/* Lista raccomandazioni */}
        <CardContent className="flex-1 overflow-y-auto p-0">
          {analysis.recommendations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <svg className="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">Nessuna raccomandazione</p>
              <p className="text-sm">L'account sembra essere ben ottimizzato per questo modulo.</p>
            </div>
          ) : (
            <div>
              {/* Select all */}
              <div className="px-5 py-2.5 border-b border-border flex items-center gap-3 sticky top-0 z-10 bg-background">
                <Checkbox
                  checked={selectedIds.size === analysis.recommendations.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selezionate`
                    : 'Seleziona tutte'}
                </span>
              </div>

              {/* Cards */}
              {analysis.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`px-5 py-4 border-b border-border/50 transition-colors cursor-pointer ${
                    selectedIds.has(rec.id)
                      ? 'bg-purple-500/5'
                      : 'bg-background hover:bg-muted/40'
                  }`}
                  onClick={() => toggleSelection(rec.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(rec.id)}
                      onCheckedChange={() => toggleSelection(rec.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Badge row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={priorityConfig[rec.priority].badge}>
                          {priorityConfig[rec.priority].label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {actionLabels[rec.action] || rec.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{rec.entityType}</span>
                      </div>

                      {/* Entity name */}
                      <h4 className="font-medium text-foreground text-sm">
                        {rec.entityName}
                      </h4>

                      {/* Rationale */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {rec.rationale}
                      </p>

                      {/* Values */}
                      {(rec.currentValue || rec.suggestedValue || rec.expectedImpact) && (
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs pt-1">
                          {rec.currentValue && (
                            <p>
                              <span className="text-muted-foreground">Attuale: </span>
                              <span className="text-red-500 font-medium">{rec.currentValue}</span>
                            </p>
                          )}
                          {rec.suggestedValue && (
                            <p>
                              <span className="text-muted-foreground">Suggerito: </span>
                              <span className="text-green-500 font-medium">{rec.suggestedValue}</span>
                            </p>
                          )}
                          {rec.expectedImpact && (
                            <p>
                              <span className="text-muted-foreground">Impatto: </span>
                              <span className="text-blue-500 font-medium">{rec.expectedImpact}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-background">
          <p className="text-xs text-muted-foreground">
            Analisi del {new Date(analysis.analyzedAt).toLocaleString('it-IT')}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Chiudi
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={selectedIds.size === 0 || isCreating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creazione...
                </span>
              ) : (
                `Crea modifiche (${selectedIds.size})`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
