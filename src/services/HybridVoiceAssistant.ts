import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import PythonMLService, { PythonMLResult, PythonMLServiceStatus } from './PythonMLService';
import WebSpeechService, { WebSpeechResult } from './WebSpeechService';
import VoiceCommandParser, { ParsedCommand, VoiceCommand } from './VoiceCommandParser';
import { getMLServiceUrl } from '../config/mlServiceUrl';

export interface HybridVoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  command: ParsedCommand | null;
  error: string | null;
  duration: number;
  
  // Connection status
  pythonMLConnected: boolean;
  webSpeechAvailable: boolean;
  activeService: 'python_ml' | 'web_speech' | 'none';
  
  // Service health
  pythonMLStatus: PythonMLServiceStatus | null;
  lastServiceCheck: string;
}

export interface HybridVoiceResult {
  success: boolean;
  command?: VoiceCommand;
  transcript?: string;
  confidence?: number;
  service?: string;
  engine?: string;
  error?: string;
  processingTime?: number;
  fallbackUsed?: boolean;
}

export interface HybridVoiceOptions {
  preferPythonML?: boolean;
  enableWebSpeechFallback?: boolean;
  pythonMLUrl?: string;
  language?: string;
  minConfidence?: number;
  maxRecordingDuration?: number;
  enableHaptics?: boolean;
  autoHealthCheck?: boolean;
}

export class HybridVoiceAssistant {
  private static instance: HybridVoiceAssistant | null = null;
  
  private state: HybridVoiceState = {
    isRecording: false,
    isProcessing: false,
    transcript: '',
    command: null,
    error: null,
    duration: 0,
    pythonMLConnected: false,
    webSpeechAvailable: false,
    activeService: 'none',
    pythonMLStatus: null,
    lastServiceCheck: new Date().toISOString(),
  };

  private options: HybridVoiceOptions = {
    preferPythonML: true,
    enableWebSpeechFallback: true,
    pythonMLUrl: getMLServiceUrl(),
    language: 'en-US',
    minConfidence: 0.6,
    maxRecordingDuration: 15000,
    enableHaptics: true,
    autoHealthCheck: true,
  };

  private listeners: Array<(state: HybridVoiceState) => void> = [];
  private recording: Audio.Recording | null = null;
  private recordingStartTime = 0;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): HybridVoiceAssistant {
    if (!this.instance) {
      this.instance = new HybridVoiceAssistant();
    }
    return this.instance;
  }

  /**
   * Initialize the hybrid voice assistant
   */
  async initialize(options?: Partial<HybridVoiceOptions>): Promise<boolean> {
    try {
      console.log('🤖 Initializing HybridVoiceAssistant...');

      // Update options
      this.options = { ...this.options, ...options };

      // Configure Python ML service
      if (this.options.pythonMLUrl) {
        PythonMLService.configure(this.options.pythonMLUrl);
      }

      // Check service availability
      await this.checkServiceHealth();

      // Start auto health monitoring if enabled
      if (this.options.autoHealthCheck) {
        PythonMLService.startHealthMonitoring(30000); // Check every 30 seconds
      }

      // Initialize audio recording
      await this.initializeAudio();

      console.log('✅ HybridVoiceAssistant initialized successfully');
      this.updateState({ error: null });
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize HybridVoiceAssistant:', error);
      this.updateState({ error: (error as Error).message });
      return false;
    }
  }

  /**
   * Check health of all voice services
   */
  async checkServiceHealth(): Promise<void> {
    console.log('🏥 Checking voice service health...');

    // Check Python ML service
    const pythonMLStatus = await PythonMLService.checkHealth();
    
    // Check Web Speech API
    const webSpeechAvailable = WebSpeechService.isSupported();

    // Determine active service
    let activeService: 'python_ml' | 'web_speech' | 'none' = 'none';
    
    if (this.options.preferPythonML && pythonMLStatus.connected) {
      activeService = 'python_ml';
    } else if (webSpeechAvailable && this.options.enableWebSpeechFallback) {
      activeService = 'web_speech';
    }

    this.updateState({
      pythonMLConnected: pythonMLStatus.connected,
      webSpeechAvailable,
      activeService,
      pythonMLStatus,
      lastServiceCheck: new Date().toISOString(),
    });

    console.log(`🎯 Active voice service: ${activeService}`);
    console.log(`🐍 Python ML: ${pythonMLStatus.connected ? '✅' : '❌'}`);
    console.log(`🌐 Web Speech: ${webSpeechAvailable ? '✅' : '❌'}`);
  }

  /**
   * Initialize audio recording
   */
  private async initializeAudio(): Promise<void> {
    try {
      console.log('🎤 Initializing audio recording...');
      
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('✅ Audio recording initialized');
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      throw error;
    }
  }

  /**
   * Start voice recording
   */
  async startRecording(): Promise<boolean> {
    try {
      if (this.state.isRecording || this.state.isProcessing) {
        console.warn('⚠️ Already recording or processing');
        return false;
      }

      // Check if any service is available
      if (this.state.activeService === 'none') {
        await this.checkServiceHealth();
        if (this.state.activeService === 'none') {
          throw new Error('No voice recognition service available');
        }
      }

      console.log(`🎤 Starting recording with ${this.state.activeService}...`);

      // Haptic feedback
      if (this.options.enableHaptics) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Start recording for Python ML service
      if (this.state.activeService === 'python_ml') {
        await this.startAudioRecording();
      }

      // Update state
      this.recordingStartTime = Date.now();
      this.updateState({
        isRecording: true,
        isProcessing: false,
        transcript: '',
        command: null,
        error: null,
        duration: 0,
      });

      return true;

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.updateState({
        isRecording: false,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Stop recording and process audio
   */
  async stopRecording(): Promise<HybridVoiceResult> {
    const startTime = Date.now();

    try {
      if (!this.state.isRecording) {
        console.warn('⚠️ Not currently recording');
        return { success: false, error: 'Not currently recording' };
      }

      console.log('🛑 Stopping recording and processing...');

      // Update state
      this.updateState({
        isRecording: false,
        isProcessing: true,
      });

      // Success haptic feedback
      if (this.options.enableHaptics) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      let result: HybridVoiceResult;

      // Process with active service
      if (this.state.activeService === 'python_ml') {
        result = await this.processWithPythonML();
      } else if (this.state.activeService === 'web_speech') {
        result = await this.processWithWebSpeech();
      } else {
        throw new Error('No active voice service');
      }

      // If primary service failed and fallback is enabled, try fallback
      if (!result.success && this.options.enableWebSpeechFallback && this.state.activeService === 'python_ml' && this.state.webSpeechAvailable) {
        console.log('🔄 Primary service failed, trying Web Speech fallback...');
        result = await this.processWithWebSpeech();
        if (result.success) {
          result.fallbackUsed = true;
          result.service = 'Web Speech API (Fallback)';
        }
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      // Update state with results
      if (result.success && result.command) {
        const parsedCommand: ParsedCommand = {
          intent: result.command.type,
          confidence: result.confidence || 0.8,
          command: result.command,
          originalText: result.transcript || '',
          normalizedText: result.transcript || '',
        };

        this.updateState({
          transcript: result.transcript || '',
          command: parsedCommand,
          isProcessing: false,
          error: null,
        });

        // Success haptic feedback
        if (this.options.enableHaptics) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        this.updateState({
          isProcessing: false,
          error: result.error || 'Recognition failed',
        });

        // Error haptic feedback
        if (this.options.enableHaptics) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }

      console.log(`✅ Processing complete (${processingTime}ms):`, {
        success: result.success,
        service: result.service,
        transcript: result.transcript?.substring(0, 50) + '...',
        fallback: result.fallbackUsed,
      });

      return result;

    } catch (error) {
      console.error('❌ Failed to process recording:', error);
      
      this.updateState({
        isRecording: false,
        isProcessing: false,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: (error as Error).message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Process audio with Python ML service
   */
  private async processWithPythonML(): Promise<HybridVoiceResult> {
    try {
      if (!this.recording) {
        throw new Error('No recording available');
      }

      console.log('🐍 Processing with Python ML service...');

      // Stop and get recording URI
      const recordingUri = await this.stopAudioRecording();
      
      // Send to Python ML service
      const result: PythonMLResult = await PythonMLService.recognizeAudio(recordingUri);

      // Clean up recording file
      try {
        await FileSystem.deleteAsync(recordingUri);
      } catch (error) {
        console.warn('⚠️ Could not delete recording file:', error);
      }

      if (!result.success) {
        throw new Error(result.error || 'Python ML recognition failed');
      }

      return {
        success: true,
        transcript: result.transcript,
        confidence: result.confidence,
        service: 'Python ML Service',
        engine: result.engine,
        command: result.command?.command,
      };

    } catch (error) {
      console.error('❌ Python ML processing failed:', error);
      return {
        success: false,
        error: (error as Error).message,
        service: 'Python ML Service (Failed)',
      };
    }
  }

  /**
   * Process with Web Speech API
   */
  private async processWithWebSpeech(): Promise<HybridVoiceResult> {
    try {
      console.log('🌐 Processing with Web Speech API...');

      const result: WebSpeechResult = await WebSpeechService.listenForSpeech({
        language: this.options.language,
        continuous: false,
        interimResults: true,
      });

      if (result.status !== 'success' || !result.text.trim()) {
        throw new Error(result.error || 'Web Speech recognition failed');
      }

      // Parse command
      const parsedCommand = VoiceCommandParser.parseCommand(result.text);
      
      if (!parsedCommand || parsedCommand.confidence < (this.options.minConfidence || 0.6)) {
        throw new Error('Command not recognized or confidence too low');
      }

      return {
        success: true,
        transcript: result.text,
        confidence: result.confidence,
        service: 'Web Speech API',
        command: parsedCommand.command,
      };

    } catch (error) {
      console.error('❌ Web Speech processing failed:', error);
      return {
        success: false,
        error: (error as Error).message,
        service: 'Web Speech API (Failed)',
      };
    }
  }

  /**
   * Start audio recording for Python ML
   */
  private async startAudioRecording(): Promise<void> {
    try {
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();

      console.log('🎤 Audio recording started');
    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
      throw error;
    }
  }

  /**
   * Stop audio recording and return URI
   */
  private async stopAudioRecording(): Promise<string> {
    try {
      if (!this.recording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        throw new Error('No recording URI available');
      }

      console.log('🛑 Audio recording stopped:', uri);
      this.recording = null;
      return uri;

    } catch (error) {
      console.error('❌ Failed to stop audio recording:', error);
      this.recording = null;
      throw error;
    }
  }

  /**
   * Cancel current recording
   */
  async cancelRecording(): Promise<void> {
    try {
      console.log('❌ Cancelling recording...');

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      this.updateState({
        isRecording: false,
        isProcessing: false,
        transcript: '',
        command: null,
        error: null,
        duration: 0,
      });

      console.log('✅ Recording cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel recording:', error);
    }
  }

  /**
   * Get current state
   */
  getState(): HybridVoiceState {
    // Update duration if recording
    if (this.state.isRecording) {
      const currentDuration = Date.now() - this.recordingStartTime;
      return { ...this.state, duration: currentDuration };
    }
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: HybridVoiceState) => void): () => void {
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
  updateOptions(options: Partial<HybridVoiceOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Reconfigure Python ML service if URL changed
    if (options.pythonMLUrl) {
      PythonMLService.configure(options.pythonMLUrl);
    }
    
    console.log('⚙️ Hybrid voice assistant options updated:', this.options);
  }

  /**
   * Get comprehensive service status
   */
  getServiceStatus(): {
    overall: 'excellent' | 'good' | 'limited' | 'unavailable';
    pythonML: PythonMLServiceStatus | null;
    webSpeech: boolean;
    activeService: string;
    recommendations: string[];
  } {
    const pythonML = this.state.pythonMLStatus;
    const webSpeech = this.state.webSpeechAvailable;
    const recommendations: string[] = [];

    let overall: 'excellent' | 'good' | 'limited' | 'unavailable';

    if (pythonML?.connected && webSpeech) {
      overall = 'excellent';
      recommendations.push('🎯 Both services available - optimal performance');
    } else if (pythonML?.connected) {
      overall = 'good';
      recommendations.push('🐍 Python ML service active - advanced features available');
      recommendations.push('💡 Consider using Chrome/Safari for Web Speech fallback');
    } else if (webSpeech) {
      overall = 'limited';
      recommendations.push('🌐 Web Speech API only - basic functionality');
      recommendations.push('🚀 Start Python ML service for advanced features');
    } else {
      overall = 'unavailable';
      recommendations.push('❌ No voice services available');
      recommendations.push('🔧 Start Python ML service or use supported browser');
    }

    return {
      overall,
      pythonML,
      webSpeech,
      activeService: this.state.activeService,
      recommendations,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up HybridVoiceAssistant...');

      // Cancel any active recording
      await this.cancelRecording();

      // Stop health monitoring
      PythonMLService.stopHealthMonitoring();

      // Clear listeners
      this.listeners = [];

      console.log('✅ HybridVoiceAssistant cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup HybridVoiceAssistant:', error);
    }
  }

  /**
   * Update internal state and notify listeners
   */
  private updateState(updates: Partial<HybridVoiceState>): void {
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

export default HybridVoiceAssistant;
