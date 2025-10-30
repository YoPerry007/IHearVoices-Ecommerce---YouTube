import * as Haptics from 'expo-haptics';
import WebSpeechService from './WebSpeechService';

export interface SimpleVoiceResult {
  text: string;
  confidence: number;
  duration: number;
  status: 'success' | 'error' | 'no_speech' | 'not_supported';
  error?: string;
}

export interface SimpleVoiceOptions {
  language?: string;
  enableHaptics?: boolean;
  maxDuration?: number;
}

export class SimpleVoiceService {
  private static isListening = false;
  private static startTime = 0;
  private static timeoutId: NodeJS.Timeout | null = null;

  /**
   * Check if voice recognition is supported
   */
  static isSupported(): boolean {
    return WebSpeechService.isSupported();
  }

  /**
   * Initialize the voice service
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('🎤 Initializing SimpleVoiceService...');
      
      if (!this.isSupported()) {
        console.warn('⚠️ Voice recognition not supported in this environment');
        return false;
      }

      const initialized = await WebSpeechService.initialize();
      if (initialized) {
        console.log('✅ SimpleVoiceService initialized successfully');
        return true;
      } else {
        console.error('❌ Failed to initialize SimpleVoiceService');
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing SimpleVoiceService:', error);
      return false;
    }
  }

  /**
   * Start listening for voice input
   */
  static async startListening(options?: SimpleVoiceOptions): Promise<SimpleVoiceResult> {
    try {
      if (this.isListening) {
        console.warn('⚠️ Already listening');
        return {
          text: '',
          confidence: 0,
          duration: 0,
          status: 'error',
          error: 'Already listening'
        };
      }

      console.log('🎤 Starting voice listening...');
      this.isListening = true;
      this.startTime = Date.now();

      // Haptic feedback
      if (options?.enableHaptics !== false) {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {
          console.warn('⚠️ Haptics not available:', error);
        }
      }

      // Set up timeout
      const maxDuration = options?.maxDuration || 15000; // 15 seconds default
      this.timeoutId = setTimeout(() => {
        console.log('⏰ Voice listening timeout');
        this.stopListening();
      }, maxDuration);

      // Start Web Speech API
      const result = await WebSpeechService.listenForSpeech({
        language: options?.language || 'en-US',
        continuous: false,
        interimResults: true,
        maxAlternatives: 3
      });

      // Clear timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      this.isListening = false;
      const duration = Date.now() - this.startTime;

      // Success haptic feedback
      if (options?.enableHaptics !== false && result.status === 'success') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.warn('⚠️ Haptics not available:', error);
        }
      }

      console.log('✅ Voice listening completed:', {
        text: result.text.substring(0, 50) + '...',
        confidence: `${(result.confidence * 100).toFixed(1)}%`,
        duration: `${duration}ms`,
        status: result.status
      });

      return {
        text: result.text,
        confidence: result.confidence,
        duration,
        status: result.status,
        error: result.error
      };

    } catch (error) {
      console.error('❌ Voice listening error:', error);
      this.cleanup();

      // Error haptic feedback
      if (options?.enableHaptics !== false) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (hapticError) {
          console.warn('⚠️ Haptics not available:', hapticError);
        }
      }

      return {
        text: '',
        confidence: 0,
        duration: Date.now() - this.startTime,
        status: 'error',
        error: (error as Error).message
      };
    }
  }

  /**
   * Stop listening
   */
  static stopListening(): void {
    if (this.isListening) {
      console.log('🛑 Stopping voice listening...');
      WebSpeechService.stopListening();
      this.cleanup();
    }
  }

  /**
   * Cancel listening
   */
  static cancelListening(): void {
    console.log('❌ Cancelling voice listening...');
    this.stopListening();
  }

  /**
   * Get current listening status
   */
  static getStatus(): {
    isListening: boolean;
    duration: number;
    supported: boolean;
  } {
    return {
      isListening: this.isListening,
      duration: this.isListening ? Date.now() - this.startTime : 0,
      supported: this.isSupported()
    };
  }

  /**
   * Test voice service
   */
  static async test(): Promise<boolean> {
    try {
      console.log('🧪 Testing SimpleVoiceService...');
      
      if (!this.isSupported()) {
        console.log('❌ Voice recognition not supported');
        return false;
      }

      const initialized = await this.initialize();
      if (!initialized) {
        console.log('❌ Failed to initialize voice service');
        return false;
      }

      console.log('✅ SimpleVoiceService test passed');
      return true;
    } catch (error) {
      console.error('❌ SimpleVoiceService test failed:', error);
      return false;
    }
  }

  /**
   * Get service information
   */
  static getServiceInfo(): {
    provider: string;
    cost: string;
    supported: boolean;
    features: string[];
  } {
    return {
      provider: 'Web Speech API (Browser Native)',
      cost: 'FREE - No API key required',
      supported: this.isSupported(),
      features: [
        'Real-time speech recognition',
        'Ghana accent support',
        'No internet required (after initial load)',
        'Privacy-focused (no data sent to servers)',
        'Cross-platform support',
        'Haptic feedback integration'
      ]
    };
  }

  /**
   * Clean up resources
   */
  private static cleanup(): void {
    this.isListening = false;
    this.startTime = 0;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export default SimpleVoiceService;
