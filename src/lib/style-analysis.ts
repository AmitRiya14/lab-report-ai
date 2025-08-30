import * as tf from '@tensorflow/tfjs';

interface WritingSample {
  id: string;
  filename: string;
  content: string;
  word_count: number;
}

interface StyleProfile {
  user_id: string;
  sentence_patterns: {
    avg_length: number;
    complexity_score: number;
    structure_variance: number;
  };
  vocabulary_profile: {
    formality_level: number;
    unique_words: number;
    common_phrases: string[];
  };
  style_fingerprint: number[];
  confidence_score: number;
}

export class StyleAnalyzer {
  /**
   * Analyze writing samples to extract style patterns
   */
  static async analyzeWritingSamples(samples: WritingSample[]): Promise<StyleProfile> {
    const combinedText = samples.map(s => s.content).join('\n\n');
    
    // 1. Sentence Structure Analysis
    const sentences = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const sentencePatterns = {
      avg_length: sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length,
      complexity_score: this.calculateComplexity(sentences),
      structure_variance: this.calculateVariance(sentences)
    };

    // 2. Vocabulary Profiling
    const words = combinedText.toLowerCase().match(/\b\w+\b/g) || [];
    const vocabularyProfile = {
      formality_level: this.calculateFormality(words),
      unique_words: new Set(words).size,
      common_phrases: this.extractPhrases(combinedText)
    };

    // 3. Style Fingerprinting using simple embeddings
    const styleFingerprint = await this.createStyleFingerprint(combinedText);

    return {
      user_id: '', // Will be set by caller
      sentence_patterns: sentencePatterns,
      vocabulary_profile: vocabularyProfile,
      style_fingerprint: styleFingerprint,
      confidence_score: samples.length >= 2 ? 0.85 : 0.65
    };
  }

  private static calculateComplexity(sentences: string[]): number {
    const avgWordsPerSentence = sentences.reduce((sum, s) => 
      sum + s.split(' ').length, 0) / sentences.length;
    return Math.min(avgWordsPerSentence / 20, 1); // Normalize to 0-1
  }

  private static calculateVariance(sentences: string[]): number {
    const lengths = sentences.map(s => s.split(' ').length);
    const avg = lengths.reduce((a, b) => a + b) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
    return Math.sqrt(variance) / avg; // Coefficient of variation
  }

  private static calculateFormality(words: string[]): number {
    const formalWords = ['therefore', 'furthermore', 'consequently', 'moreover', 'nonetheless'];
    const informalWords = ['like', 'really', 'pretty', 'kind of', 'sort of'];
    
    const formalCount = words.filter(w => formalWords.includes(w)).length;
    const informalCount = words.filter(w => informalWords.includes(w)).length;
    
    return (formalCount - informalCount + words.length * 0.01) / (words.length * 0.02);
  }

  private static extractPhrases(text: string): string[] {
    // Simple 2-3 word phrase extraction
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const phrases: { [key: string]: number } = {};
    
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      phrases[bigram] = (phrases[bigram] || 0) + 1;
    }
    
    return Object.entries(phrases)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([phrase]) => phrase);
  }

  private static async createStyleFingerprint(text: string): Promise<number[]> {
    // Simple statistical fingerprint (in production, use sentence-transformers)
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const features = [
      words.length, // Total words
      new Set(words).size, // Unique words
      (text.match(/[.!?]/g) || []).length, // Sentences
      (text.match(/,/g) || []).length, // Commas
      (text.match(/;/g) || []).length, // Semicolons
    ];
    
    // Normalize features to create embedding-like vector
    const max = Math.max(...features);
    return features.map(f => f / max);
  }

  /**
   * Apply style transformation to text
   */
  static async humanizeText(
    originalText: string, 
    styleProfile: StyleProfile, 
    claudeApiKey: string
  ): Promise<string> {
    const prompt = this.buildHumanizationPrompt(originalText, styleProfile);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || originalText;
  }

  private static buildHumanizationPrompt(text: string, profile: StyleProfile): string {
    return `Transform the following academic text to match this specific writing style:

WRITING STYLE PROFILE:
- Average sentence length: ${Math.round(profile.sentence_patterns.avg_length)} words
- Sentence complexity: ${profile.sentence_patterns.complexity_score > 0.7 ? 'Complex' : 'Moderate'}
- Vocabulary formality: ${profile.vocabulary_profile.formality_level > 0.6 ? 'Formal' : 'Conversational'}
- Common phrases to incorporate: ${profile.vocabulary_profile.common_phrases.slice(0, 5).join(', ')}

HUMANIZATION REQUIREMENTS:
1. Adjust sentence lengths to match the profile (vary between ${Math.round(profile.sentence_patterns.avg_length * 0.7)}-${Math.round(profile.sentence_patterns.avg_length * 1.3)} words)
2. Incorporate natural writing patterns and occasional imperfections
3. Use vocabulary that matches the formality level
4. Add subtle personal expressions when appropriate
5. Maintain all technical content and data accuracy
6. Keep the academic structure but make it feel more natural

TEXT TO TRANSFORM:
${text}

Rewrite this text to match the specified writing style while preserving all information:`;
  }
}