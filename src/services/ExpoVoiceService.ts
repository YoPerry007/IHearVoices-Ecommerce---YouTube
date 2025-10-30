import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import VoiceCommandParser, { ParsedCommand } from './VoiceCommandParser';

export interface ExpoVoiceResult {
  success: boolean;
  transcript?: string;
  command?: ParsedCommand;
  confidence?: number;
  error?: string;
  audioUri?: string;
  duration?: number;
}

export interface ExpoVoiceOptions {
  language?: string;
  maxDuration?: number;
  enableHaptics?: boolean;
  minConfidence?: number;
}

export class ExpoVoiceService {
  private static recording: Audio.Recording | null = null;
  private static isRecording = false;
  private static startTime = 0;

  /**
   * Check if Expo voice recording is supported
   */
  static isSupported(): boolean {
    try {
      // Expo-av Audio is available in Expo Go and development builds
      return typeof Audio !== 'undefined' && !!Audio.Recording;
    } catch (error) {
      console.warn('⚠️ Expo Audio not available:', error);
      return false;
    }
  }

  /**
   * Initialize audio recording permissions
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('🎤 Initializing Expo Voice Service...');

      // Request audio recording permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('❌ Audio recording permission not granted');
        return false;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('✅ Expo Voice Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Expo Voice Service:', error);
      return false;
    }
  }

  /**
   * Start voice recording
   */
  static async startRecording(options: ExpoVoiceOptions = {}): Promise<boolean> {
    try {
      if (this.isRecording) {
        console.warn('⚠️ Already recording');
        return false;
      }

      console.log('🎤 Starting Expo voice recording...');

      // Haptic feedback
      if (options.enableHaptics !== false) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Create new recording
      this.recording = new Audio.Recording();
      
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: 1, // HIGH
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();

      this.isRecording = true;
      this.startTime = Date.now();

      // Auto-stop after max duration
      const maxDuration = options.maxDuration || 15000;
      setTimeout(() => {
        if (this.isRecording) {
          console.log('⏰ Auto-stopping recording after max duration');
          this.stopRecording(options);
        }
      }, maxDuration);

      console.log('✅ Expo voice recording started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start Expo voice recording:', error);
      this.isRecording = false;
      this.recording = null;
      return false;
    }
  }

  /**
   * Stop recording and process with available services
   */
  static async stopRecording(options: ExpoVoiceOptions = {}): Promise<ExpoVoiceResult> {
    try {
      if (!this.isRecording || !this.recording) {
        console.warn('⚠️ Not currently recording');
        return { success: false, error: 'Not currently recording' };
      }

      console.log('🛑 Stopping Expo voice recording...');

      // Stop recording
      await this.recording.stopAndUnloadAsync();
      const audioUri = this.recording.getURI();
      const duration = Date.now() - this.startTime;

      this.isRecording = false;
      this.recording = null;

      // Haptic feedback
      if (options.enableHaptics !== false) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (!audioUri) {
        throw new Error('No audio URI available');
      }

      console.log(`✅ Recording completed: ${duration}ms, URI: ${audioUri}`);

      // Process with Python ML service (REQUIRED)
      try {
        const pythonResult = await this.processWithPythonML(audioUri, options);
        
        // Clean up audio file
        await this.cleanupAudioFile(audioUri);
        
        if (pythonResult.success) {
          return pythonResult;
        } else {
          throw new Error(pythonResult.error || 'Python ML recognition failed');
        }
      } catch (error) {
        // Clean up audio file
        await this.cleanupAudioFile(audioUri);
        
        console.error('❌ Python ML service error:', error);
        
        return {
          success: false,
          error: `Voice recognition service unavailable. Please start the Python ML service:\n\n1. Open terminal in python_ml_service folder\n2. Run: start_service.bat (Windows) or ./start_service.sh (Mac/Linux)\n3. Wait for "Running on http://0.0.0.0:5000"\n4. Try voice command again\n\nError: ${(error as Error).message}`,
          audioUri,
          duration: Date.now() - this.startTime,
        };
      }

    } catch (error) {
      console.error('❌ Failed to stop Expo voice recording:', error);
      this.isRecording = false;
      this.recording = null;
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Cancel current recording
   */
  static async cancelRecording(): Promise<void> {
    try {
      if (this.isRecording && this.recording) {
        console.log('❌ Cancelling Expo voice recording...');
        
        await this.recording.stopAndUnloadAsync();
        const audioUri = this.recording.getURI();
        
        // Clean up audio file
        if (audioUri) {
          await this.cleanupAudioFile(audioUri);
        }
      }
      
      this.isRecording = false;
      this.recording = null;
      
      console.log('✅ Expo voice recording cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel recording:', error);
      this.isRecording = false;
      this.recording = null;
    }
  }

  /**
   * Process audio with Python ML service
   */
  private static async processWithPythonML(audioUri: string, options: ExpoVoiceOptions): Promise<ExpoVoiceResult> {
    try {
      console.log('🐍 Attempting Python ML processing...');

      // Check if Python ML service is available
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const healthResponse = await fetch('http://172.20.10.8:5000/health', {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!healthResponse.ok) {
        throw new Error('Python ML service not healthy');
      }

      // Create FormData for file upload
      const formData = new FormData();
      
      // Add audio file
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);

      formData.append('format', 'wav');

      // Send to Python ML service
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 15000);
      
      const response = await fetch('http://172.20.10.8:5000/process_audio', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller2.signal,
      });
      
      clearTimeout(timeoutId2);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Recognition failed');
      }

      console.log('✅ Python ML processing successful');

      // Map Python service response to VoiceCommand format
      let mappedCommand: any = null;
      if (result.command && result.command.type !== 'unknown') {
        mappedCommand = this.mapPythonCommandToVoiceCommand(result.command);
      }

      return {
        success: true,
        transcript: result.transcript,
        command: mappedCommand,
        confidence: result.command?.confidence || 0.5,
        audioUri,
        duration: Date.now() - this.startTime,
      };

    } catch (error) {
      console.warn('⚠️ Python ML processing failed:', error);
      throw error;
    }
  }

  /**
   * Map Python service command to VoiceCommand format
   */
  private static mapPythonCommandToVoiceCommand(pythonCommand: any): any {
    const { type, query, screen, confidence } = pythonCommand;

    switch (type) {
      case 'search':
        return {
          type: 'search',
          query: query,
          confidence: confidence || 0.8
        };
      
      case 'navigate':
        return {
          type: 'navigate',
          screen: screen,
          confidence: confidence || 0.9
        };
      
      case 'add_to_cart':
        return {
          type: 'add_to_cart',
          action: 'add',
          confidence: confidence || 0.8,
          parameters: {
            product_query: pythonCommand.product_query,
            query: pythonCommand.product_query
          }
        };
      
      case 'clear_cart':
        return {
          type: 'cart',
          action: 'clear',
          confidence: confidence || 0.8
        };
      
      case 'checkout':
        return {
          type: 'checkout',
          confidence: confidence || 0.8
        };
      
      case 'category':
        return {
          type: 'category',
          category: pythonCommand.category,
          confidence: confidence || 0.85
        };
      
      default:
        return {
          type: 'help',
          confidence: 0.3
        };
    }
  }

  /**
   * Clean up audio file
   */
  private static async cleanupAudioFile(audioUri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(audioUri);
        console.log('🗑️ Audio file cleaned up');
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup audio file:', error);
    }
  }

  /**
   * Get current recording status
   */
  static getStatus(): {
    isRecording: boolean;
    duration: number;
    isSupported: boolean;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Date.now() - this.startTime : 0,
      isSupported: this.isSupported(),
    };
  }

  /**
   * Get service information
   */
  static getServiceInfo(): {
    name: string;
    description: string;
    features: string[];
    limitations: string[];
  } {
    return {
      name: 'Expo Voice Service',
      description: 'Voice recording service optimized for Expo Go and development builds',
      features: [
        'Native audio recording with expo-av',
        'Automatic Python ML service integration',
        'Intelligent mock recognition for testing',
        'Haptic feedback support',
        'Automatic audio cleanup',
        'Ghana accent simulation',
      ],
      limitations: [
        'Requires microphone permissions',
        'Mock recognition in Expo Go (for testing)',
        'Python ML service needed for real recognition',
        'Limited to 15 seconds recording',
      ],
    };
  }
}

export default ExpoVoiceService;
