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

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const priorityLabels = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
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

  const highPriorityCount = analysis.recommendations.filter((r) => r.priority === 'high').length;
  const mediumPriorityCount = analysis.recommendations.filter((r) => r.priority === 'medium').length;
  const lowPriorityCount = analysis.recommendations.filter((r) => r.priority === 'low').length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Analisi AI: {analysis.moduleName}
              </CardTitle>
              <CardDescription className="mt-1">
                Analizzati {analysis.dataStats.analyzedRecords} record su {analysis.dataStats.totalRecords}
              </CardDescription>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardHeader>

        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <h3 className="font-semibold text-gray-900 mb-2">Riepilogo AI</h3>
          <p className="text-gray-700">{analysis.summary}</p>
          <div className="flex gap-4 mt-3">
            <Badge variant="outline" className={priorityColors.high}>
              {highPriorityCount} priorita alta
            </Badge>
            <Badge variant="outline" className={priorityColors.medium}>
              {mediumPriorityCount} priorita media
            </Badge>
            <Badge variant="outline" className={priorityColors.low}>
              {lowPriorityCount} priorita bassa
            </Badge>
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-0">
          {analysis.recommendations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-lg font-medium">Nessuna raccomandazione</p>
              <p className="text-sm">L'account sembra essere ben ottimizzato per questo modulo.</p>
            </div>
          ) : (
            <div className="divide-y">
              <div className="p-3 bg-gray-50 flex items-center gap-3 sticky top-0 z-10">
                <Checkbox
                  checked={selectedIds.size === analysis.recommendations.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium text-gray-600">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selezionate`
                    : 'Seleziona tutte'}
                </span>
              </div>

              {analysis.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(rec.id) ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(rec.id)}
                      onCheckedChange={() => toggleSelection(rec.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={priorityColors[rec.priority]}
                        >
                          {priorityLabels[rec.priority]}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {actionLabels[rec.action] || rec.action}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {rec.entityType}
                        </span>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-1">
                        {rec.entityName}
                      </h4>

                      <p className="text-sm text-gray-600 mb-2">
                        {rec.rationale}
                      </p>

                      <div className="flex flex-wrap gap-4 text-xs">
                        {rec.currentValue && (
                          <div>
                            <span className="text-gray-500">Attuale: </span>
                            <span className="font-medium text-red-600">{rec.currentValue}</span>
                          </div>
                        )}
                        {rec.suggestedValue && (
                          <div>
                            <span className="text-gray-500">Suggerito: </span>
                            <span className="font-medium text-green-600">{rec.suggestedValue}</span>
                          </div>
                        )}
                        {rec.expectedImpact && (
                          <div>
                            <span className="text-gray-500">Impatto: </span>
                            <span className="font-medium text-blue-600">{rec.expectedImpact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="border-t p-4 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Analisi completata il{' '}
            {new Date(analysis.analyzedAt).toLocaleString('it-IT')}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Chiudi
            </Button>
            <Button
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
                  Creazione modifiche...
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
