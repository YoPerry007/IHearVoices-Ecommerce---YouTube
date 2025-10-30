import * as FileSystem from 'expo-file-system';

export interface PythonMLResult {
  success: boolean;
  transcript?: string;
  originalTranscript?: string;
  confidence?: number;
  engine?: string;
  command?: {
    success: boolean;
    intent: string;
    action?: string;
    query?: string;
    category?: string;
    confidence: number;
    command?: {
      type: string;
      action?: string;
      query?: string;
      category?: string;
    };
  };
  processingTime?: string;
  service?: string;
  error?: string;
}

export interface PythonMLServiceStatus {
  connected: boolean;
  healthy: boolean;
  service?: string;
  version?: string;
  capabilities?: {
    speechRecognition: boolean;
    ghanaAccentSupport: boolean;
    commandParsing: boolean;
    audioPreprocessing: boolean;
  };
  error?: string;
  lastChecked: string;
}

export class PythonMLService {
  private static baseUrl = 'http://172.20.10.8:5000'; // Windows machine IP address
  private static timeout = 10000; // 10 seconds timeout
  private static lastHealthCheck: PythonMLServiceStatus | null = null;
  private static healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Configure the Python ML service URL
   */
  static configure(url: string): void {
    this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
    console.log(`🔧 Python ML Service configured: ${this.baseUrl}`);
  }

  /**
   * Check if Python ML service is available and healthy
   */
  static async checkHealth(): Promise<PythonMLServiceStatus> {
    const startTime = Date.now();
    
    try {
      console.log('🏥 Checking Python ML service health...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      const status: PythonMLServiceStatus = {
        connected: true,
        healthy: true,
        service: data.service,
        version: data.version,
        capabilities: {
          speechRecognition: data.capabilities?.speech_recognition || false,
          ghanaAccentSupport: data.capabilities?.ghana_accent_support || false,
          commandParsing: data.capabilities?.command_parsing || false,
          audioPreprocessing: data.capabilities?.audio_preprocessing || false,
        },
        lastChecked: new Date().toISOString(),
      };

      this.lastHealthCheck = status;
      console.log(`✅ Python ML service healthy (${responseTime}ms):`, data.service);
      return status;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const status: PythonMLServiceStatus = {
        connected: false,
        healthy: false,
        error: errorMessage,
        lastChecked: new Date().toISOString(),
      };

      this.lastHealthCheck = status;
      console.warn(`❌ Python ML service unavailable: ${errorMessage}`);
      return status;
    }
  }

  /**
   * Start periodic health checks
   */
  static startHealthMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, intervalMs);

    console.log(`🔄 Python ML service health monitoring started (${intervalMs}ms interval)`);
  }

  /**
   * Stop health monitoring
   */
  static stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Python ML service health monitoring stopped');
    }
  }

  /**
   * Get last known health status
   */
  static getLastHealthStatus(): PythonMLServiceStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Send audio to Python ML service for recognition
   */
  static async recognizeAudio(audioUri: string): Promise<PythonMLResult> {
    try {
      console.log('🎤 Sending audio to Python ML service...');

      // Check if service is available
      const health = await this.checkHealth();
      if (!health.connected) {
        throw new Error(`Python ML service not available: ${health.error}`);
      }

      // Read audio file
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioInfo.exists) {
        throw new Error('Audio file does not exist');
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

      console.log(`📤 Uploading audio file: ${audioUri}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/recognize`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      console.log('✅ Python ML recognition successful:', {
        transcript: result.transcript?.substring(0, 50) + '...',
        confidence: `${(result.confidence * 100).toFixed(1)}%`,
        engine: result.engine,
        intent: result.command?.intent,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Python ML recognition failed:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        service: 'Python ML Service (Failed)',
      };
    }
  }

  /**
   * Test the Python ML service
   */
  static async testService(): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      console.log('🧪 Testing Python ML service...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const results = await response.json();
      console.log('✅ Python ML service test passed:', results);

      return {
        success: true,
        results,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Python ML service test failed:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get service information
   */
  static getServiceInfo(): {
    name: string;
    description: string;
    features: string[];
    requirements: string[];
  } {
    return {
      name: 'Python ML Voice Service',
      description: 'Advanced speech recognition with Ghana accent optimization',
      features: [
        'Multi-engine speech recognition (Google, Sphinx, Whisper)',
        'Ghana accent and pronunciation support',
        'Advanced audio preprocessing with noise reduction',
        'ML-powered intent classification',
        'Offline capability with Sphinx/Whisper',
        'Real-time command parsing',
      ],
      requirements: [
        'Python 3.8+ with ML libraries installed',
        'Flask service running on 172.20.10.8:5000',
        'Network connectivity to Python service',
        'Microphone permissions for audio recording',
      ],
    };
  }

  /**
   * Get connection status summary
   */
  static getConnectionStatus(): {
    status: 'connected' | 'disconnected' | 'unknown';
    message: string;
    lastChecked?: string;
  } {
    if (!this.lastHealthCheck) {
      return {
        status: 'unknown',
        message: 'Service not yet checked',
      };
    }

    if (this.lastHealthCheck.connected && this.lastHealthCheck.healthy) {
      return {
        status: 'connected',
        message: `Connected to ${this.lastHealthCheck.service || 'Python ML Service'}`,
        lastChecked: this.lastHealthCheck.lastChecked,
      };
    }

    return {
      status: 'disconnected',
      message: this.lastHealthCheck.error || 'Service unavailable',
      lastChecked: this.lastHealthCheck.lastChecked,
    };
  }
}

export default PythonMLService;
