import { useState, useEffect, useCallback, useRef } from 'react';
import HybridVoiceAssistant, { 
  HybridVoiceState, 
  HybridVoiceResult, 
  HybridVoiceOptions 
} from '../services/HybridVoiceAssistant';
import { VoiceCommand } from '../services/VoiceCommandParser';

export interface UseHybridVoiceAssistantReturn {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  command: VoiceCommand | null;
  error: string | null;
  duration: number;
  isInitialized: boolean;
  
  // Connection status
  pythonMLConnected: boolean;
  webSpeechAvailable: boolean;
  activeService: 'python_ml' | 'web_speech' | 'none';
  
  // Actions
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<HybridVoiceResult>;
  cancelRecording: () => Promise<void>;
  initialize: (options?: Partial<HybridVoiceOptions>) => Promise<boolean>;
  
  // Service management
  checkServiceHealth: () => Promise<void>;
  getServiceStatus: () => {
    overall: 'excellent' | 'good' | 'limited' | 'unavailable';
    pythonML: any;
    webSpeech: boolean;
    activeService: string;
    recommendations: string[];
  };
  
  // Utilities
  updateOptions: (options: Partial<HybridVoiceOptions>) => void;
  clearError: () => void;
  
  // Computed
  canStartRecording: boolean;
  canStopRecording: boolean;
  hasAnyService: boolean;
  serviceQuality: 'excellent' | 'good' | 'limited' | 'unavailable';
  
  // UI helpers
  getConnectionStatusText: () => string;
  getConnectionStatusColor: () => string;
  getServiceRecommendations: () => string[];
}

export const useHybridVoiceAssistant = (
  initialOptions?: Partial<HybridVoiceOptions>
): UseHybridVoiceAssistantReturn => {
  const [state, setState] = useState<HybridVoiceState>({
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
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const serviceRef = useRef<HybridVoiceAssistant | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize service
  const initialize = useCallback(async (options?: Partial<HybridVoiceOptions>): Promise<boolean> => {
    try {
      console.log('🚀 Initializing useHybridVoiceAssistant...');

      // Get service instance
      if (!serviceRef.current) {
        serviceRef.current = HybridVoiceAssistant.getInstance();
      }

      // Initialize with options
      const success = await serviceRef.current.initialize({
        ...initialOptions,
        ...options,
      });

      if (success) {
        // Subscribe to state changes
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }

        unsubscribeRef.current = serviceRef.current.subscribe((newState) => {
          setState(newState);
        });

        // Start periodic health checks
        startHealthChecking();

        setIsInitialized(true);
        console.log('✅ useHybridVoiceAssistant initialized successfully');
      } else {
        setIsInitialized(false);
        console.error('❌ Failed to initialize useHybridVoiceAssistant');
      }

      return success;
    } catch (error) {
      console.error('❌ Error initializing useHybridVoiceAssistant:', error);
      setIsInitialized(false);
      return false;
    }
  }, [initialOptions]);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current || !isInitialized) {
      console.warn('⚠️ Service not initialized');
      return false;
    }

    return await serviceRef.current.startRecording();
  }, [isInitialized]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<HybridVoiceResult> => {
    if (!serviceRef.current || !isInitialized) {
      console.warn('⚠️ Service not initialized');
      return { success: false, error: 'Service not initialized' };
    }

    return await serviceRef.current.stopRecording();
  }, [isInitialized]);

  // Cancel recording
  const cancelRecording = useCallback(async (): Promise<void> => {
    if (!serviceRef.current || !isInitialized) {
      console.warn('⚠️ Service not initialized');
      return;
    }

    await serviceRef.current.cancelRecording();
  }, [isInitialized]);

  // Check service health
  const checkServiceHealth = useCallback(async (): Promise<void> => {
    if (!serviceRef.current || !isInitialized) {
      console.warn('⚠️ Service not initialized');
      return;
    }

    await serviceRef.current.checkServiceHealth();
  }, [isInitialized]);

  // Get service status
  const getServiceStatus = useCallback(() => {
    if (!serviceRef.current) {
      return {
        overall: 'unavailable' as const,
        pythonML: null,
        webSpeech: false,
        activeService: 'none',
        recommendations: ['Service not initialized'],
      };
    }

    return serviceRef.current.getServiceStatus();
  }, []);

  // Update options
  const updateOptions = useCallback((options: Partial<HybridVoiceOptions>) => {
    if (!serviceRef.current) {
      console.warn('⚠️ Service not initialized');
      return;
    }

    serviceRef.current.updateOptions(options);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Start periodic health checking
  const startHealthChecking = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    // Check immediately
    checkServiceHealth();

    // Then check every 30 seconds
    healthCheckIntervalRef.current = setInterval(() => {
      checkServiceHealth();
    }, 30000);

    console.log('🔄 Health checking started');
  }, [checkServiceHealth]);

  // Stop health checking
  const stopHealthChecking = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
      console.log('🛑 Health checking stopped');
    }
  }, []);

  // Computed values
  const canStartRecording = !state.isRecording && !state.isProcessing && isInitialized && state.activeService !== 'none';
  const canStopRecording = state.isRecording && !state.isProcessing;
  const hasAnyService = state.pythonMLConnected || state.webSpeechAvailable;
  const serviceStatus = getServiceStatus();
  const serviceQuality = serviceStatus.overall;

  // UI helper functions
  const getConnectionStatusText = useCallback((): string => {
    if (!isInitialized) return 'Initializing...';
    
    switch (state.activeService) {
      case 'python_ml':
        return '🐍 Python ML Connected';
      case 'web_speech':
        return '🌐 Web Speech Active';
      case 'none':
        return '❌ No Service Available';
      default:
        return 'Unknown Status';
    }
  }, [isInitialized, state.activeService]);

  const getConnectionStatusColor = useCallback((): string => {
    if (!isInitialized) return '#FFA500'; // Orange
    
    switch (serviceQuality) {
      case 'excellent':
        return '#00C851'; // Green
      case 'good':
        return '#2BBBAD'; // Teal
      case 'limited':
        return '#FF8800'; // Orange
      case 'unavailable':
        return '#FF4444'; // Red
      default:
        return '#6C757D'; // Gray
    }
  }, [isInitialized, serviceQuality]);

  const getServiceRecommendations = useCallback((): string[] => {
    return serviceStatus.recommendations;
  }, [serviceStatus]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      stopHealthChecking();
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (serviceRef.current) {
        serviceRef.current.cleanup();
        serviceRef.current = null;
      }
    };
  }, [initialize, stopHealthChecking]);

  // Log state changes for debugging
  useEffect(() => {
    console.log('🔄 Hybrid Voice Assistant State Changed:', {
      isRecording: state.isRecording,
      isProcessing: state.isProcessing,
      transcript: state.transcript.substring(0, 50) + (state.transcript.length > 50 ? '...' : ''),
      error: state.error,
      command: state.command?.command.type,
      duration: `${state.duration}ms`,
      pythonML: state.pythonMLConnected ? '✅' : '❌',
      webSpeech: state.webSpeechAvailable ? '✅' : '❌',
      activeService: state.activeService,
    });
  }, [state]);

  return {
    // State
    isRecording: state.isRecording,
    isProcessing: state.isProcessing,
    transcript: state.transcript,
    command: state.command?.command || null,
    error: state.error,
    duration: state.duration,
    isInitialized,

    // Connection status
    pythonMLConnected: state.pythonMLConnected,
    webSpeechAvailable: state.webSpeechAvailable,
    activeService: state.activeService,

    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    initialize,

    // Service management
    checkServiceHealth,
    getServiceStatus,

    // Utilities
    updateOptions,
    clearError,

    // Computed
    canStartRecording,
    canStopRecording,
    hasAnyService,
    serviceQuality,

    // UI helpers
    getConnectionStatusText,
    getConnectionStatusColor,
    getServiceRecommendations,
  };
};

export default useHybridVoiceAssistant;
