import SimpleVoiceService, { SimpleVoiceResult } from './SimpleVoiceService';
import VoiceCommandParser, { ParsedCommand, VoiceCommand } from './VoiceCommandParser';

export interface FreeVoiceAssistantState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  command: ParsedCommand | null;
  error: string | null;
  duration: number;
}

export interface FreeVoiceAssistantResult {
  success: boolean;
  command?: VoiceCommand;
  transcript?: string;
  confidence?: number;
  error?: string;
  processingTime?: number;
}

export interface FreeVoiceAssistantOptions {
  language?: string;
  minConfidence?: number;
  maxDuration?: number;
  enableHaptics?: boolean;
}

export class FreeVoiceAssistant {
  private static instance: FreeVoiceAssistant | null = null;
  private state: FreeVoiceAssistantState = {
    isListening: false,
    isProcessing: false,
    transcript: '',
    command: null,
    error: null,
    duration: 0,
  };

  private options: FreeVoiceAssistantOptions = {
    language: 'en-US',
    minConfidence: 0.6,
    maxDuration: 15000, // 15 seconds
    enableHaptics: true,
  };

  private listeners: Array<(state: FreeVoiceAssistantState) => void> = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): FreeVoiceAssistant {
    if (!this.instance) {
      this.instance = new FreeVoiceAssistant();
    }
    return this.instance;
  }

  /**
   * Initialize the free voice assistant
   */
  async initialize(options?: Partial<FreeVoiceAssistantOptions>): Promise<boolean> {
    try {
      console.log('🤖 Initializing FreeVoiceAssistant...');

      // Update options
      this.options = { ...this.options, ...options };

      // Check if voice recognition is supported
      if (!SimpleVoiceService.isSupported()) {
        const error = 'Voice recognition not supported in this environment';
        console.error('❌', error);
        this.updateState({ error });
        return false;
      }

      // Initialize voice service
      const initialized = await SimpleVoiceService.initialize();
      if (!initialized) {
        const error = 'Failed to initialize voice service';
        console.error('❌', error);
        this.updateState({ error });
        return false;
      }

      console.log('✅ FreeVoiceAssistant initialized successfully');
      this.updateState({ error: null });
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize FreeVoiceAssistant:', error);
      this.updateState({ error: (error as Error).message });
      return false;
    }
  }

  /**
   * Start voice listening
   */
  async startListening(): Promise<boolean> {
    try {
      if (this.state.isListening || this.state.isProcessing) {
        console.warn('⚠️ Already listening or processing');
        return false;
      }

      console.log('🎤 Starting voice listening...');

      // Update state
      this.updateState({
        isListening: true,
        isProcessing: false,
        transcript: '',
        command: null,
        error: null,
        duration: 0,
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      this.updateState({
        isListening: false,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Stop voice listening and process
   */
  async stopListening(): Promise<FreeVoiceAssistantResult> {
    const startTime = Date.now();

    try {
      if (!this.state.isListening) {
        console.warn('⚠️ Not currently listening');
        return { success: false, error: 'Not currently listening' };
      }

      console.log('🛑 Stopping voice listening and processing...');

      // Update state
      this.updateState({
        isListening: false,
        isProcessing: true,
      });

      // Get voice input using SimpleVoiceService
      const voiceResult: SimpleVoiceResult = await SimpleVoiceService.startListening({
        language: this.options.language,
        enableHaptics: this.options.enableHaptics,
        maxDuration: this.options.maxDuration,
      });

      console.log('🎙️ Voice result:', voiceResult);

      if (voiceResult.status !== 'success' || !voiceResult.text.trim()) {
        const error = voiceResult.error || 'No speech detected';
        this.updateState({
          isProcessing: false,
          error,
        });
        return { 
          success: false, 
          error,
          processingTime: Date.now() - startTime 
        };
      }

      // Update with transcript
      this.updateState({
        transcript: voiceResult.text,
        duration: voiceResult.duration,
      });

      // Parse command from transcript
      console.log('🧠 Parsing voice command...');
      const parsedCommand = VoiceCommandParser.parseCommand(voiceResult.text);

      if (!parsedCommand) {
        const error = 'Could not understand the command';
        this.updateState({
          isProcessing: false,
          error,
        });
        return { 
          success: false, 
          error,
          transcript: voiceResult.text,
          processingTime: Date.now() - startTime 
        };
      }

      if (parsedCommand.confidence < this.options.minConfidence!) {
        const error = `Command confidence too low: ${(parsedCommand.confidence * 100).toFixed(1)}%`;
        this.updateState({
          isProcessing: false,
          error,
        });
        return { 
          success: false, 
          error,
          transcript: voiceResult.text,
          confidence: parsedCommand.confidence,
          processingTime: Date.now() - startTime 
        };
      }

      console.log('✅ Command parsed successfully:', {
        intent: parsedCommand.intent,
        confidence: `${(parsedCommand.confidence * 100).toFixed(1)}%`,
      });

      // Update state with parsed command
      this.updateState({
        command: parsedCommand,
        isProcessing: false,
        error: null,
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        command: parsedCommand.command,
        transcript: voiceResult.text,
        confidence: parsedCommand.confidence,
        processingTime,
      };

    } catch (error) {
      console.error('❌ Failed to process voice input:', error);
      const errorMessage = (error as Error).message;
      
      this.updateState({
        isListening: false,
        isProcessing: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Cancel current listening
   */
  async cancelListening(): Promise<void> {
    try {
      console.log('❌ Cancelling voice listening...');

      SimpleVoiceService.cancelListening();

      this.updateState({
        isListening: false,
        isProcessing: false,
        transcript: '',
        command: null,
        error: null,
        duration: 0,
      });

      console.log('✅ Voice listening cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel listening:', error);
    }
  }

  /**
   * Get current state
   */
  getState(): FreeVoiceAssistantState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: FreeVoiceAssistantState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<FreeVoiceAssistantOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('⚙️ Free voice assistant options updated:', this.options);
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    initialized: boolean;
    supported: boolean;
    provider: string;
    cost: string;
    currentState: string;
  } {
    const serviceInfo = SimpleVoiceService.getServiceInfo();
    
    return {
      initialized: !this.state.error,
      supported: serviceInfo.supported,
      provider: serviceInfo.provider,
      cost: serviceInfo.cost,
      currentState: this.state.isListening 
        ? 'listening' 
        : this.state.isProcessing 
        ? 'processing' 
        : 'idle',
    };
  }

  /**
   * Test the service
   */
  async testService(): Promise<boolean> {
    try {
      console.log('🧪 Testing FreeVoiceAssistant...');
      
      const serviceTest = await SimpleVoiceService.test();
      if (!serviceTest) {
        console.log('❌ Voice service test failed');
        return false;
      }

      console.log('✅ FreeVoiceAssistant test passed');
      return true;
    } catch (error) {
      console.error('❌ FreeVoiceAssistant test failed:', error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up FreeVoiceAssistant...');

      SimpleVoiceService.cancelListening();
      
      this.state = {
        isListening: false,
        isProcessing: false,
        transcript: '',
        command: null,
        error: null,
        duration: 0,
      };

      this.listeners = [];
      console.log('✅ FreeVoiceAssistant cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup FreeVoiceAssistant:', error);
    }
  }

  /**
   * Update internal state and notify listeners
   */
  private updateState(updates: Partial<FreeVoiceAssistantState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('❌ Error in state listener:', error);
      }
    });
  }
}

export default FreeVoiceAssistant;
