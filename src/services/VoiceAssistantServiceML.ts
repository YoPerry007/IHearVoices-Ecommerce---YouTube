import VoiceRecordingService, { VoiceRecordingResult } from './VoiceRecordingService';
import SpeechToTextService, { SpeechToTextResult } from './SpeechToTextService';
import VoiceCommandParser, { ParsedCommand, VoiceCommand } from './VoiceCommandParser';
import * as Haptics from 'expo-haptics';

export interface VoiceAssistantState {
  isRecording: boolean;
  isProcessing: boolean;
  isListening: boolean;
  transcript: string;
  command: ParsedCommand | null;
  error: string | null;
  recordingDuration: number;
}

export interface VoiceAssistantResult {
  success: boolean;
  command?: VoiceCommand;
  transcript?: string;
  confidence?: number;
  error?: string;
  processingTime?: number;
}

export interface VoiceAssistantOptions {
  language?: string;
  autoExecute?: boolean;
  minConfidence?: number;
  maxRecordingDuration?: number;
  enableHaptics?: boolean;
}

export class VoiceAssistantServiceML {
  private static instance: VoiceAssistantServiceML | null = null;
  private state: VoiceAssistantState = {
    isRecording: false,
    isProcessing: false,
    isListening: false,
    transcript: '',
    command: null,
    error: null,
    recordingDuration: 0,
  };

  private options: VoiceAssistantOptions = {
    language: 'en',
    autoExecute: false,
    minConfidence: 0.6,
    maxRecordingDuration: 30000, // 30 seconds
    enableHaptics: true,
  };

  private listeners: Array<(state: VoiceAssistantState) => void> = [];
  private recordingTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): VoiceAssistantServiceML {
    if (!this.instance) {
      this.instance = new VoiceAssistantServiceML();
    }
    return this.instance;
  }

  /**
   * Initialize the voice assistant
   */
  async initialize(options?: Partial<VoiceAssistantOptions>): Promise<boolean> {
    try {
      console.log('🤖 Initializing VoiceAssistantServiceML...');

      // Update options
      this.options = { ...this.options, ...options };

      // Initialize recording service
      const recordingInitialized = await VoiceRecordingService.initialize();
      if (!recordingInitialized) {
        this.updateState({ error: 'Failed to initialize recording service' });
        return false;
      }

      // Check speech-to-text service configuration
      if (!SpeechToTextService.isConfigured()) {
        console.warn('⚠️ Speech-to-text service not configured (missing API key)');
        this.updateState({ error: 'Speech-to-text service not configured' });
        return false;
      }

      console.log('✅ VoiceAssistantServiceML initialized successfully');
      this.updateState({ error: null });
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize VoiceAssistantServiceML:', error);
      this.updateState({ error: (error as Error).message });
      return false;
    }
  }

  /**
   * Start voice recording and listening
   */
  async startListening(): Promise<boolean> {
    try {
      if (this.state.isRecording || this.state.isProcessing) {
        console.warn('⚠️ Already recording or processing');
        return false;
      }

      console.log('🎤 Starting voice listening...');

      // Update state
      this.updateState({
        isRecording: true,
        isListening: true,
        isProcessing: false,
        transcript: '',
        command: null,
        error: null,
        recordingDuration: 0,
      });

      // Start recording
      const recordingStarted = await VoiceRecordingService.startRecording({
        sampleRate: 16000,
        channels: 1,
        bitRate: 64000,
      });

      if (!recordingStarted) {
        this.updateState({
          isRecording: false,
          isListening: false,
          error: 'Failed to start recording',
        });
        return false;
      }

      // Start recording timer
      this.startRecordingTimer();

      // Haptic feedback
      if (this.options.enableHaptics) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      console.log('✅ Voice listening started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      this.updateState({
        isRecording: false,
        isListening: false,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Stop voice recording and process the audio
   */
  async stopListening(): Promise<VoiceAssistantResult> {
    try {
      if (!this.state.isRecording) {
        console.warn('⚠️ Not currently recording');
        return { success: false, error: 'Not currently recording' };
      }

      console.log('🛑 Stopping voice listening...');

      // Clear recording timer
      this.clearRecordingTimer();

      // Update state
      this.updateState({
        isRecording: false,
        isListening: false,
        isProcessing: true,
      });

      // Stop recording
      const recordingResult = await VoiceRecordingService.stopRecording();
      if (!recordingResult || recordingResult.status !== 'success') {
        const error = recordingResult?.error || 'Failed to stop recording';
        this.updateState({
          isProcessing: false,
          error,
        });
        return { success: false, error };
      }

      console.log('🎙️ Recording completed, processing audio...');

      // Process the recording
      const result = await this.processRecording(recordingResult);

      // Haptic feedback based on result
      if (this.options.enableHaptics) {
        if (result.success) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
      const errorMessage = (error as Error).message;
      this.updateState({
        isRecording: false,
        isListening: false,
        isProcessing: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Cancel current recording
   */
  async cancelListening(): Promise<void> {
    try {
      console.log('❌ Cancelling voice listening...');

      this.clearRecordingTimer();
      await VoiceRecordingService.cancelRecording();

      this.updateState({
        isRecording: false,
        isListening: false,
        isProcessing: false,
        transcript: '',
        command: null,
        error: null,
        recordingDuration: 0,
      });

      if (this.options.enableHaptics) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      console.log('✅ Voice listening cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel listening:', error);
    }
  }

  /**
   * Process recorded audio
   */
  private async processRecording(recordingResult: VoiceRecordingResult): Promise<VoiceAssistantResult> {
    const startTime = Date.now();

    try {
      console.log('🔄 Processing recorded audio...');

      // Validate audio file
      const validation = await SpeechToTextService.validateAudioFile(recordingResult.uri);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid audio file');
      }

      // Transcribe audio to text
      console.log('🎙️ Transcribing audio...');
      const transcriptionResult = await SpeechToTextService.transcribeAudio(
        recordingResult.uri,
        {
          language: this.options.language,
          temperature: 0,
        }
      );

      if (transcriptionResult.status !== 'success' || !transcriptionResult.text) {
        throw new Error(transcriptionResult.error || 'Transcription failed');
      }

      console.log('📝 Transcription completed:', transcriptionResult.text);

      // Update state with transcript
      this.updateState({
        transcript: transcriptionResult.text,
      });

      // Parse command from transcript
      console.log('🧠 Parsing voice command...');
      const parsedCommand = VoiceCommandParser.parseCommand(transcriptionResult.text);

      if (!parsedCommand) {
        throw new Error('Could not understand the command');
      }

      if (parsedCommand.confidence < this.options.minConfidence!) {
        throw new Error(`Command confidence too low: ${(parsedCommand.confidence * 100).toFixed(1)}%`);
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
        transcript: transcriptionResult.text,
        confidence: parsedCommand.confidence,
        processingTime,
      };

    } catch (error) {
      console.error('❌ Failed to process recording:', error);
      const errorMessage = (error as Error).message;
      
      this.updateState({
        isProcessing: false,
        error: errorMessage,
      });

      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: errorMessage,
        processingTime,
      };
    }
  }

  /**
   * Execute a parsed voice command
   */
  async executeCommand(command: VoiceCommand, context?: Record<string, any>): Promise<boolean> {
    try {
      console.log('⚡ Executing voice command:', command);

      // Additional command execution logic can be added here
      // For now, we return the command to be handled by the UI layer

      return true;
    } catch (error) {
      console.error('❌ Failed to execute command:', error);
      return false;
    }
  }

  /**
   * Get current state
   */
  getState(): VoiceAssistantState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: VoiceAssistantState) => void): () => void {
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
  updateOptions(options: Partial<VoiceAssistantOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('⚙️ Voice assistant options updated:', this.options);
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    initialized: boolean;
    recordingAvailable: boolean;
    speechToTextAvailable: boolean;
    currentState: string;
  } {
    return {
      initialized: !this.state.error,
      recordingAvailable: true, // Assuming Expo AV is available
      speechToTextAvailable: SpeechToTextService.isConfigured(),
      currentState: this.state.isRecording 
        ? 'recording' 
        : this.state.isProcessing 
        ? 'processing' 
        : 'idle',
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up VoiceAssistantServiceML...');

      this.clearRecordingTimer();
      await VoiceRecordingService.cleanup();
      
      this.state = {
        isRecording: false,
        isProcessing: false,
        isListening: false,
        transcript: '',
        command: null,
        error: null,
        recordingDuration: 0,
      };

      this.listeners = [];
      console.log('✅ VoiceAssistantServiceML cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup VoiceAssistantServiceML:', error);
    }
  }

  /**
   * Update internal state and notify listeners
   */
  private updateState(updates: Partial<VoiceAssistantState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('❌ Error in state listener:', error);
      }
    });
  }

  /**
   * Start recording duration timer
   */
  private startRecordingTimer(): void {
    this.recordingTimer = setInterval(() => {
      const duration = VoiceRecordingService.getCurrentDuration();
      this.updateState({ recordingDuration: duration });

      // Auto-stop if max duration reached
      if (duration >= this.options.maxRecordingDuration!) {
        console.log('⏰ Max recording duration reached, stopping...');
        this.stopListening();
      }
    }, 100);
  }

  /**
   * Clear recording timer
   */
  private clearRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }
}

export default VoiceAssistantServiceML;
