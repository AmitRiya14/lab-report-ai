// src/components/HumanizationPanel.tsx
import React, { useState } from 'react';
import { Wand2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface HumanizationPanelProps {
  originalText: string;
  onHumanized: (humanizedText: string) => void;
}

export const HumanizationPanel: React.FC<HumanizationPanelProps> = ({
  originalText,
  onHumanized
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleHumanize = async () => {
    if (!originalText.trim()) {
      setError('Please provide text to humanize');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult('');
    setProgress('Initializing humanization...');

    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: originalText,
          target_style: 'natural',
          preserve_meaning: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const progressData = JSON.parse(dataStr);

            switch (progressData.type) {
              case 'progress':
                setProgress(progressData.message || 'Processing...');
                break;
              
              case 'complete':
              case 'final_complete':
                if (progressData.text) {
                  setResult(progressData.text);
                  onHumanized(progressData.text);
                }
                break;
              
              case 'error':
                throw new Error(progressData.message || 'Humanization failed');
            }
          } catch (parseError) {
            console.warn('Failed to parse progress:', parseError);
          }
        }
      }

      setProgress('Humanization complete!');

    } catch (err) {
      console.error('Humanization error:', err);
      setError(err instanceof Error ? err.message : 'Humanization failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-600" />
          AI Humanization
        </h3>
        
        <button
          onClick={handleHumanize}
          disabled={isProcessing || !originalText.trim()}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            isProcessing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg hover:scale-105'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Humanize Text
            </>
          )}
        </button>
      </div>

      {/* Progress indicator */}
      {isProcessing && progress && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">{progress}</p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result display */}
      {result && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-700">Humanized Text:</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
};