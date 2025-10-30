import * as FileSystem from 'expo-file-system';

export interface SpeechToTextOptions {
  language?: string;
  model?: 'whisper-1';
  prompt?: string;
  temperature?: number;
  maxRetries?: number;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  language?: string;
  duration: number;
  status: 'success' | 'error' | 'no_speech';
  error?: string;
}

export class SpeechToTextService {
  private static readonly API_URL = 'https://api.openai.com/v1/audio/transcriptions';
  private static readonly DEFAULT_OPTIONS: SpeechToTextOptions = {
    language: 'en', // English, but Whisper auto-detects
    model: 'whisper-1',
    temperature: 0, // More deterministic
    maxRetries: 3,
  };

  // Ghana-specific context for better transcription accuracy
  private static readonly GHANA_CONTEXT = `
    This is audio from Ghana. Common words include: 
    sneakers, jeans, shirts, dresses, clothes, shoes, cart, checkout, 
    home, profile, search, find, add, remove, buy, show, view, navigate.
    Common Ghanaian pronunciations: cut for cart, sho for show, 
    gins for jeans, sneekas for sneakers.
  `;

  /**
   * Transcribe audio file to text using OpenAI Whisper
   */
  static async transcribeAudio(
    audioUri: string,
    options?: SpeechToTextOptions
  ): Promise<SpeechToTextResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      console.log('🎙️ Starting speech-to-text transcription...');
      console.log('📁 Audio URI:', audioUri.substring(0, 50) + '...');

      // Validate audio file exists
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      console.log('📊 Audio file info:', {
        size: `${((fileInfo.size || 0) / 1024).toFixed(2)}KB`,
        exists: fileInfo.exists,
      });

      // Get API key from environment
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Prepare form data for API request
      const formData = new FormData();
      
      // Add audio file
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any);

      formData.append('model', opts.model!);
      
      if (opts.language) {
        formData.append('language', opts.language);
      }

      if (opts.temperature !== undefined) {
        formData.append('temperature', opts.temperature.toString());
      }

      // Add Ghana-specific context for better accuracy
      formData.append('prompt', opts.prompt || this.GHANA_CONTEXT);

      // Make API request with retries
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= (opts.maxRetries || 3); attempt++) {
        try {
          console.log(`🔄 Transcription attempt ${attempt}/${opts.maxRetries}...`);

          const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          const duration = Date.now() - startTime;

          // Validate response
          if (!result.text) {
            throw new Error('No text returned from API');
          }

          const transcriptionResult: SpeechToTextResult = {
            text: result.text.trim(),
            confidence: this.estimateConfidence(result.text),
            language: result.language || opts.language,
            duration,
            status: result.text.trim().length > 0 ? 'success' : 'no_speech',
          };

          console.log('✅ Speech-to-text completed successfully:', {
            text: transcriptionResult.text.substring(0, 100) + '...',
            confidence: `${(transcriptionResult.confidence * 100).toFixed(1)}%`,
            duration: `${duration}ms`,
            language: transcriptionResult.language,
          });

          return transcriptionResult;

        } catch (error) {
          lastError = error as Error;
          console.warn(`⚠️ Transcription attempt ${attempt} failed:`, error);
          
          if (attempt < (opts.maxRetries || 3)) {
            // Wait with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All attempts failed
      throw lastError || new Error('All transcription attempts failed');

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message || 'Unknown transcription error';
      
      console.error('❌ Speech-to-text failed:', errorMessage);

      return {
        text: '',
        confidence: 0,
        duration,
        status: 'error',
        error: errorMessage,
      };
    }
  }

  /**
   * Estimate confidence based on text characteristics
   * This is a heuristic since Whisper doesn't provide confidence scores
   */
  private static estimateConfidence(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    let confidence = 0.8; // Base confidence for Whisper

    // Longer texts tend to be more reliable
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount >= 3) confidence += 0.1;
    if (wordCount >= 5) confidence += 0.05;

    // Check for common e-commerce terms (higher confidence)
    const ecommerceTerms = [
      'search', 'find', 'show', 'buy', 'add', 'cart', 'checkout',
      'home', 'profile', 'product', 'order', 'sneakers', 'jeans',
      'clothes', 'shoes', 'dress', 'shirt'
    ];

    const hasEcommerceTerms = ecommerceTerms.some(term => 
      text.toLowerCase().includes(term)
    );

    if (hasEcommerceTerms) confidence += 0.1;

    // Penalize very short or very long unclear responses
    if (wordCount === 1) confidence -= 0.2;
    if (wordCount > 20) confidence -= 0.1;

    // Check for repeated words (might indicate poor audio)
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > uniqueWords.size * 2) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Check if service is properly configured
   */
  static isConfigured(): boolean {
    return !!process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  }

  /**
   * Get service status information
   */
  static getServiceInfo(): {
    configured: boolean;
    model: string;
    supportedLanguages: string[];
  } {
    return {
      configured: this.isConfigured(),
      model: 'whisper-1',
      supportedLanguages: [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
        'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
      ],
    };
  }

  /**
   * Validate audio file for transcription
   */
  static async validateAudioFile(uri: string): Promise<{
    valid: boolean;
    error?: string;
    size?: number;
    duration?: number;
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        return { valid: false, error: 'File does not exist' };
      }

      const size = fileInfo.size || 0;
      
      // Check file size (max 25MB for Whisper API)
      if (size > 25 * 1024 * 1024) {
        return { valid: false, error: 'File too large (max 25MB)' };
      }

      // Minimum size check (at least 1KB for meaningful audio)
      if (size < 1024) {
        return { valid: false, error: 'File too small (min 1KB)' };
      }

      return { valid: true, size };
    } catch (error) {
      return { 
        valid: false, 
        error: (error as Error).message || 'File validation failed' 
      };
    }
  }
}

export default SpeechToTextService;
