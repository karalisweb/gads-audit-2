import { useState } from 'react';
import { AIAnalysisButton } from './AIAnalysisButton';
import { AIRecommendations } from './AIRecommendations';
import type { AIAnalysisResponse, AIRecommendation } from '@/types/ai';

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
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisComplete = (result: AIAnalysisResponse) => {
    setAnalysis(result);
    setError(null);
  };

  const handleError = (err: Error) => {
    setError(err.message || 'Si e verificato un errore durante l\'analisi');
    setAnalysis(null);
  };

  const handleApproveSelected = (recommendations: AIRecommendation[]) => {
    if (onCreateDecisions) {
      onCreateDecisions(recommendations);
    }
    // Per ora chiudiamo il modal dopo l'approvazione
    // In futuro qui si potrebbero creare le decisioni via API
    setAnalysis(null);
  };

  const handleClose = () => {
    setAnalysis(null);
    setError(null);
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

      {analysis && (
        <AIRecommendations
          analysis={analysis}
          onApproveSelected={handleApproveSelected}
          onClose={handleClose}
        />
      )}
    </>
  );
}
