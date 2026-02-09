import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIAnalysisButton } from './AIAnalysisButton';
import { AIRecommendations } from './AIRecommendations';
import { createModificationsFromAI } from '@/api/ai';
import type { AIAnalysisResponse, AIRecommendation, CreateFromAIResponse } from '@/types/ai';

interface AIAnalysisPanelProps {
  accountId: string;
  moduleId: number;
  moduleName: string;
  onCreateDecisions?: (recommendations: AIRecommendation[]) => void;
  disabled?: boolean;
  className?: string;
}

export function AIAnalysisPanel({
  accountId,
  moduleId,
  moduleName,
  onCreateDecisions,
  disabled = false,
  className = '',
}: AIAnalysisPanelProps) {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<CreateFromAIResponse | null>(null);

  const handleAnalysisComplete = (analysisResult: AIAnalysisResponse) => {
    setAnalysis(analysisResult);
    setError(null);
    setResult(null);
  };

  const handleError = (err: Error) => {
    setError(err.message || 'Si e verificato un errore durante l\'analisi');
    setAnalysis(null);
  };

  const handleApproveSelected = async (recommendations: AIRecommendation[]) => {
    // Legacy callback (if still used by some page)
    if (onCreateDecisions) {
      onCreateDecisions(recommendations);
    }

    setIsCreating(true);
    try {
      const response = await createModificationsFromAI({
        accountId,
        moduleId,
        recommendations,
      });

      setResult(response);
      // Keep analysis open to show the result summary
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore durante la creazione delle modifiche';
      setError(message);
      setAnalysis(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setAnalysis(null);
    setError(null);
    setResult(null);
  };

  const handleGoToModifications = () => {
    setAnalysis(null);
    setResult(null);
    navigate(`/audit/${accountId}/modifications`);
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <AIAnalysisButton
          accountId={accountId}
          moduleId={moduleId}
          moduleName={moduleName}
          onAnalysisComplete={handleAnalysisComplete}
          onError={handleError}
          disabled={disabled}
        />
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>

      {analysis && !result && (
        <AIRecommendations
          analysis={analysis}
          onApproveSelected={handleApproveSelected}
          onClose={handleClose}
          isCreating={isCreating}
        />
      )}

      {/* Result summary after creating modifications */}
      {result && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Modifiche create</h3>
            </div>

            <div className="space-y-3 mb-6">
              {result.totalCreated > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span><strong>{result.totalCreated}</strong> modifiche create (in attesa di approvazione)</span>
                </div>
              )}
              {result.totalSkipped > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span><strong>{result.totalSkipped}</strong> raccomandazioni saltate (non automatizzabili)</span>
                </div>
              )}
              {result.totalErrors > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span><strong>{result.totalErrors}</strong> errori</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Chiudi
              </button>
              {result.totalCreated > 0 && (
                <button
                  onClick={handleGoToModifications}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-colors"
                >
                  Vai alle Modifiche
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
