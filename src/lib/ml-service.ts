// src/lib/ml-service.ts
interface HumanizationRequest {
  text: string;
  user_id: string;
  user_patterns?: any;
  target_style?: string;
  preserve_meaning?: boolean;
}

interface HumanizationProgress {
  type: 'progress' | 'complete' | 'error';
  step?: string;
  message?: string;
  text?: string;
  similarity_score?: number;
  user_patterns?: any;
}

export class MLHumanizationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Analyze user writing patterns
   */
  async analyzePatterns(text: string, userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pattern analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('ML Service - Pattern analysis error:', error);
      throw error;
    }
  }

  /**
   * Humanize text with streaming response
   */
  async humanizeText(
    request: HumanizationRequest,
    onProgress?: (progress: HumanizationProgress) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/humanize-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Humanization failed: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let finalText = '';

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
            const progress: HumanizationProgress = JSON.parse(dataStr);
            
            if (progress.type === 'complete') {
              finalText = progress.text || '';
            }
            
            if (onProgress) {
              onProgress(progress);
            }
          } catch (parseError) {
            console.warn('Failed to parse progress data:', parseError);
          }
        }
      }

      return finalText;
    } catch (error) {
      console.error('ML Service - Humanization error:', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('ML Service - Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const mlService = new MLHumanizationService();