// Free Web Speech API service - no API key required!
export interface WebSpeechResult {
  text: string;
  confidence: number;
  language?: string;
  duration: number;
  status: 'success' | 'error' | 'no_speech' | 'not_supported';
  error?: string;
}

export interface WebSpeechOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class WebSpeechService {
  private static recognition: any = null;
  private static isListening = false;
  private static currentResolve: ((result: WebSpeechResult) => void) | null = null;
  private static startTime = 0;

  // Ghana-specific context for better transcription
  private static readonly GHANA_CONTEXT = [
    'sneakers', 'jeans', 'shirts', 'dresses', 'clothes', 'shoes', 
    'add', 'remove', 'buy', 'show', 'view', 'navigate',
    'cut', 'sho', 'gins', 'sneekas', 'chekout' // Common pronunciations
  ];

  /**
   * Check if Web Speech API is supported in current environment
   */
  static isSupported(): boolean {
    try {
      // Check if we're in Expo Go environment
      const isExpoGo = typeof window !== 'undefined' && 
        (window.location?.hostname === 'localhost' || 
         window.navigator?.userAgent?.includes('Expo'));
      
      // Check for Web Speech API availability
      const hasWebSpeech = typeof window !== 'undefined' && 
        (window.SpeechRecognition || window.webkitSpeechRecognition);
      
      console.log('🌐 Web Speech API environment check:', {
        hasWindow: typeof window !== 'undefined',
        isExpoGo,
        hasSpeechRecognition: typeof window !== 'undefined' ? !!window.SpeechRecognition : false,
        hasWebkitSpeechRecognition: typeof window !== 'undefined' ? !!window.webkitSpeechRecognition : false,
        supported: !!hasWebSpeech && !isExpoGo,
        environment: isExpoGo ? 'Expo Go' : 'Browser/Device'
      });
      
      // Web Speech API doesn't work reliably in Expo Go
      if (isExpoGo) {
        console.warn('⚠️ Web Speech API not supported in Expo Go environment');
        return false;
      }
      
      return !!hasWebSpeech;
    } catch (error) {
      console.warn('⚠️ Error checking Web Speech API support:', error);
      return false;
    }
  }

  /**
   * Initialize the speech recognition service
   */
  static initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.isSupported()) {
          console.warn('⚠️ Web Speech API not supported');
          resolve(false);
          return;
        }

        // Create recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configure recognition
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        this.recognition.lang = 'en-US';

        console.log('✅ WebSpeechService initialized successfully');
        resolve(true);
      } catch (error) {
        console.error('❌ Failed to initialize WebSpeechService:', error);
        resolve(false);
      }
    });
  }

  /**
   * Start speech recognition
   */
  static startListening(options?: WebSpeechOptions): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.recognition) {
          console.error('❌ Speech recognition not initialized');
          resolve(false);
          return;
        }

        if (this.isListening) {
          console.warn('⚠️ Already listening');
          resolve(false);
          return;
        }

        // Apply options
        if (options?.language) {
          this.recognition.lang = options.language;
        }
        if (options?.continuous !== undefined) {
          this.recognition.continuous = options.continuous;
        }
        if (options?.interimResults !== undefined) {
          this.recognition.interimResults = options.interimResults;
        }
        if (options?.maxAlternatives) {
          this.recognition.maxAlternatives = options.maxAlternatives;
        }

        console.log('🎤 Starting Web Speech recognition...');
        this.isListening = true;
        this.startTime = Date.now();
        this.recognition.start();
        resolve(true);

      } catch (error) {
        console.error('❌ Failed to start speech recognition:', error);
        this.isListening = false;
        resolve(false);
      }
    });
  }

  /**
   * Stop speech recognition
   */
  static stopListening(): void {
    if (this.recognition && this.isListening) {
      console.log('🛑 Stopping speech recognition...');
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Listen for speech and return result
   */
  static listenForSpeech(options?: WebSpeechOptions): Promise<WebSpeechResult> {
    return new Promise(async (resolve) => {
      try {
        if (!this.isSupported()) {
          resolve({
            text: '',
            confidence: 0,
            duration: 0,
            status: 'not_supported',
            error: 'Web Speech API not supported in this environment'
          });
          return;
        }

        // Initialize if needed
        if (!this.recognition) {
          const initialized = await this.initialize();
          if (!initialized) {
            resolve({
              text: '',
              confidence: 0,
              duration: 0,
              status: 'error',
              error: 'Failed to initialize speech recognition'
            });
            return;
          }
        }

        // Store resolve function
        this.currentResolve = resolve;

        // Set up event listeners
        this.recognition.onstart = () => {
          console.log('🎤 Speech recognition started');
        };

        this.recognition.onresult = (event: any) => {
          const results = event.results;
          let finalTranscript = '';
          let confidence = 0;

          // Process results
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
              confidence = result[0].confidence || 0.8;
            }
          }

          if (finalTranscript.trim()) {
            const duration = Date.now() - this.startTime;
            const normalizedText = this.normalizeGhanaianText(finalTranscript);
            
            console.log('✅ Speech recognized:', normalizedText);
            
            this.cleanup();
            this.currentResolve?.({
              text: normalizedText,
              confidence: confidence,
              language: this.recognition.lang,
              duration,
              status: 'success'
            });
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('❌ Speech recognition error:', event.error);
          const duration = Date.now() - this.startTime;
          
          this.cleanup();
          this.currentResolve?.({
            text: '',
            confidence: 0,
            duration,
            status: 'error',
            error: `Speech recognition error: ${event.error}`
          });
        };

        this.recognition.onend = () => {
          console.log('🛑 Speech recognition ended');
          if (this.currentResolve) {
            const duration = Date.now() - this.startTime;
            this.cleanup();
            this.currentResolve({
              text: '',
              confidence: 0,
              duration,
              status: 'no_speech',
              error: 'No speech detected'
            });
          }
        };

        // Start listening
        const started = await this.startListening(options);
        if (!started) {
          resolve({
            text: '',
            confidence: 0,
            duration: 0,
            status: 'error',
            error: 'Failed to start speech recognition'
          });
        }

      } catch (error) {
        console.error('❌ Speech recognition error:', error);
        this.cleanup();
        resolve({
          text: '',
          confidence: 0,
          duration: 0,
          status: 'error',
          error: (error as Error).message
        });
      }
    });
  }

  /**
   * Normalize Ghanaian pronunciation
   */
  private static normalizeGhanaianText(text: string): string {
    let normalized = text.toLowerCase().trim();

    // Ghana pronunciation mappings
    const pronunciationMap: Record<string, string> = {
      'cut': 'cart',
      'sho': 'show',
      'gins': 'jeans',
      'sneekas': 'sneakers',
      'snickers': 'sneakers',
      'chekout': 'checkout',
      'chekaut': 'checkout',
      'hoom': 'home',
      'hom': 'home',
      'profil': 'profile',
      'profeel': 'profile',
      'sach': 'search',
      'saach': 'search',
      'fain': 'find',
      'bai': 'buy',
      'aad': 'add',
      'ad': 'add',
      'rimuuv': 'remove',
      'remoov': 'remove',
      'kloz': 'clothes',
      'klos': 'clothes',
      'shuz': 'shoes',
      'shuuz': 'shoes'
    };

    // Apply pronunciation mappings
    Object.entries(pronunciationMap).forEach(([ghanaian, standard]) => {
      const regex = new RegExp(`\\b${ghanaian}\\b`, 'gi');
      normalized = normalized.replace(regex, standard);
    });

    // Remove common filler words
    const fillers = ['eh', 'ahn', 'um', 'er', 'like', 'you know'];
    fillers.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      normalized = normalized.replace(regex, '');
    });

    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Clean up resources
   */
  private static cleanup(): void {
    this.isListening = false;
    this.currentResolve = null;
    this.startTime = 0;
  }

  /**
   * Get service information
   */
  static getServiceInfo(): {
    supported: boolean;
    provider: string;
    cost: string;
    languages: string[];
  } {
    return {
      supported: this.isSupported(),
      provider: 'Web Speech API (Browser Native)',
      cost: 'FREE',
      languages: [
        'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-NZ', 'en-ZA',
        'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'ru-RU', 'ja-JP',
        'ko-KR', 'zh-CN', 'zh-TW', 'ar-SA', 'hi-IN', 'tr-TR'
      ]
    };
  }

  /**
   * Test speech recognition
   */
  static async testSpeechRecognition(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        console.log('❌ Web Speech API not supported');
        return false;
      }

      const initialized = await this.initialize();
      if (!initialized) {
        console.log('❌ Failed to initialize speech recognition');
        return false;
      }

      console.log('✅ Web Speech API is working and ready');
      return true;
    } catch (error) {
      console.error('❌ Speech recognition test failed:', error);
      return false;
    }
  }
}

export default WebSpeechService;
