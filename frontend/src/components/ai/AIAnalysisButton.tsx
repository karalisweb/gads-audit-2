import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { analyzeModule } from '@/api/ai';
import type { AIAnalysisResponse } from '@/types/ai';

interface AIAnalysisButtonProps {
  accountId: string;
  moduleId: number;
  moduleName: string;
  onAnalysisComplete: (analysis: AIAnalysisResponse) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export function AIAnalysisButton({
  accountId,
  moduleId,
  moduleName: _moduleName,
  onAnalysisComplete,
  onError,
  disabled = false,
  className = '',
}: AIAnalysisButtonProps) {
  // moduleName reserved for future tooltip/accessibility use
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const analysis = await analyzeModule(accountId, { moduleId });
      onAnalysisComplete(analysis);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Analysis failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAnalyze}
      disabled={disabled || isLoading}
      className={`bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white ${className}`}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Analisi AI in corso...
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 mr-1"
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
          Analizza con AI
        </>
      )}
    </Button>
  );
}
