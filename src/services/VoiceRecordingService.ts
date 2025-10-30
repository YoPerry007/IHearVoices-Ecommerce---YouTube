import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

export interface VoiceRecordingOptions {
  quality?: Audio.AndroidAudioEncoder | Audio.IOSAudioQuality;
  format?: Audio.AndroidOutputFormat | Audio.IOSOutputFormat;
  channels?: number;
  sampleRate?: number;
  bitRate?: number;
}

export interface VoiceRecordingResult {
  uri: string;
  duration: number;
  size: number;
  status: 'success' | 'error' | 'cancelled';
  error?: string;
}

export class VoiceRecordingService {
  private static recording: Audio.Recording | null = null;
  private static isRecording = false;
  private static isPaused = false;
  private static recordingStartTime = 0;
  
  // Default recording options optimized for speech recognition
  private static readonly DEFAULT_OPTIONS: VoiceRecordingOptions = {
    quality: Audio.IOSAudioQuality.HIGH,
    format: Audio.IOSOutputFormat.MPEG4AAC,
    channels: 1, // Mono for speech
    sampleRate: 16000, // Optimal for speech recognition
    bitRate: 64000, // Good quality for speech
  };

  /**
   * Initialize audio recording permissions and setup
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('🎤 Initializing VoiceRecordingService...');
      
      // Request recording permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('❌ Audio recording permission denied');
        return false;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      console.log('✅ VoiceRecordingService initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize VoiceRecordingService:', error);
      return false;
    }
  }

  /**
   * Start voice recording
   */
  static async startRecording(options?: VoiceRecordingOptions): Promise<boolean> {
    try {
      if (this.isRecording) {
        console.warn('⚠️ Recording already in progress');
        return false;
      }

      console.log('🎤 Starting voice recording...');

      // Create new recording instance
      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          android: {
            extension: '.m4a',
            outputFormat: options?.format as Audio.AndroidOutputFormat || Audio.AndroidOutputFormat.MPEG4,
            audioEncoder: options?.quality as Audio.AndroidAudioEncoder || Audio.AndroidAudioEncoder.AAC,
            sampleRate: options?.sampleRate || this.DEFAULT_OPTIONS.sampleRate!,
            numberOfChannels: options?.channels || this.DEFAULT_OPTIONS.channels!,
            bitRate: options?.bitRate || this.DEFAULT_OPTIONS.bitRate!,
          },
          ios: {
            extension: '.m4a',
            outputFormat: options?.format as Audio.IOSOutputFormat || Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: options?.quality as Audio.IOSAudioQuality || Audio.IOSAudioQuality.HIGH,
            sampleRate: options?.sampleRate || this.DEFAULT_OPTIONS.sampleRate!,
            numberOfChannels: options?.channels || this.DEFAULT_OPTIONS.channels!,
            bitRate: options?.bitRate || this.DEFAULT_OPTIONS.bitRate!,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: options?.bitRate || this.DEFAULT_OPTIONS.bitRate!,
          },
        }
      );

      this.recording = recording;
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log('✅ Voice recording started successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
  }

  /**
   * Stop voice recording and return result
   */
  static async stopRecording(): Promise<VoiceRecordingResult | null> {
    try {
      if (!this.isRecording || !this.recording) {
        console.warn('⚠️ No recording in progress');
        return null;
      }

      console.log('🛑 Stopping voice recording...');

      // Stop the recording
      await this.recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = this.recording.getURI();
      const duration = Date.now() - this.recordingStartTime;

      // Get file info
      let size = 0;
      if (uri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          size = fileInfo.exists ? fileInfo.size || 0 : 0;
        } catch (error) {
          console.warn('⚠️ Could not get file size:', error);
        }
      }

      // Reset state
      this.recording = null;
      this.isRecording = false;
      this.recordingStartTime = 0;

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!uri) {
        console.error('❌ Recording URI is null');
        return {
          uri: '',
          duration,
          size: 0,
          status: 'error',
          error: 'Recording URI is null',
        };
      }

      const result: VoiceRecordingResult = {
        uri,
        duration,
        size,
        status: 'success',
      };

      console.log('✅ Voice recording stopped successfully:', {
        duration: `${duration}ms`,
        size: `${(size / 1024).toFixed(2)}KB`,
        uri: uri.substring(0, 50) + '...',
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Clean up state
      this.recording = null;
      this.isRecording = false;
      this.recordingStartTime = 0;

      return {
        uri: '',
        duration: 0,
        size: 0,
        status: 'error',
        error: (error as Error).message || 'Failed to stop recording',
      };
    }
  }

  /**
   * Cancel current recording
   */
  static async cancelRecording(): Promise<void> {
    try {
      if (!this.isRecording || !this.recording) {
        return;
      }

      console.log('❌ Cancelling voice recording...');

      await this.recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Clean up state
      this.recording = null;
      this.isRecording = false;
      this.recordingStartTime = 0;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('✅ Voice recording cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel recording:', error);
    }
  }

  /**
   * Get recording status
   */
  static getRecordingStatus(): {
    isRecording: boolean;
    duration: number;
    isPaused: boolean;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      isPaused: this.isPaused,
    };
  }

  /**
   * Clean up resources
   */
  static async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }
      
      this.recording = null;
      this.isRecording = false;
      this.isPaused = false;
      this.recordingStartTime = 0;

      console.log('✅ VoiceRecordingService cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup VoiceRecordingService:', error);
    }
  }

  /**
   * Check if recording is currently active
   */
  static isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current recording duration in milliseconds
   */
  static getCurrentDuration(): number {
    return this.isRecording ? Date.now() - this.recordingStartTime : 0;
  }
}

export default VoiceRecordingService;
