// src/hooks/useHumanization.ts
import { useState, useCallback } from 'react';

interface UseHumanizationOptions {
  onProgress?: (message: string) => void;
  onComplete?: (humanizedText: string) => void;
  onError?: (error: string) => void;
}

export const useHumanization = (options: UseHumanizationOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string>('');

  const humanizeText = useCallback(async (text: string) => {
    if (!text.trim()) {
      const errorMsg = 'Please provide text to humanize';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    }

    setIsProcessing(true);
    setError('');
    setProgress('Initializing humanization...');
    options.onProgress?.('Initializing humanization...');

    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          target_style: 'natural',
          preserve_meaning: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let finalResult = '';

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
                const message = progressData.message || 'Processing...';
                setProgress(message);
                options.onProgress?.(message);
                break;
              
              case 'complete':
              case 'final_complete':
                if (progressData.text) {
                  finalResult = progressData.text;
                  options.onComplete?.(progressData.text);
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
      return finalResult;

    } catch (err) {
      console.error('Humanization error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Humanization failed';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress('');
    setError('');
  }, []);

  return {
    humanizeText,
    isProcessing,
    progress,
    error,
    reset,
  };
};