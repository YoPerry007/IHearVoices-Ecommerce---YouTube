import { useState, useEffect, useCallback, useRef } from 'react';
import FreeVoiceAssistant, { 
  FreeVoiceAssistantState, 
  FreeVoiceAssistantResult, 
  FreeVoiceAssistantOptions 
} from '../services/FreeVoiceAssistant';
import { VoiceCommand } from '../services/VoiceCommandParser';

export interface UseFreeVoiceAssistantReturn {
  // State
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  command: VoiceCommand | null;
  error: string | null;
  duration: number;
  isInitialized: boolean;
  
  // Actions
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<FreeVoiceAssistantResult>;
  cancelListening: () => Promise<void>;
  initialize: (options?: Partial<FreeVoiceAssistantOptions>) => Promise<boolean>;
  
  // Utilities
  getServiceStatus: () => {
    initialized: boolean;
    supported: boolean;
    provider: string;
    cost: string;
    currentState: string;
  };
  updateOptions: (options: Partial<FreeVoiceAssistantOptions>) => void;
  clearError: () => void;
  testService: () => Promise<boolean>;
  
  // Computed
  canStartListening: boolean;
  canStopListening: boolean;
  isSupported: boolean;
}

export const useFreeVoiceAssistant = (
  initialOptions?: Partial<FreeVoiceAssistantOptions>
): UseFreeVoiceAssistantReturn => {
  const [state, setState] = useState<FreeVoiceAssistantState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    command: null,
    error: null,
    duration: 0,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const serviceRef = useRef<FreeVoiceAssistant | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize service
  const initialize = useCallback(async (options?: Partial<FreeVoiceAssistantOptions>): Promise<boolean> => {
    try {
      console.log('🚀 Initializing useFreeVoiceAssistant...');

      // Get service instance
      if (!serviceRef.current) {
        serviceRef.current = FreeVoiceAssistant.getInstance();
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

        setIsInitialized(true);
        console.log('✅ useFreeVoiceAssistant initialized successfully');
      } else {
        setIsInitialized(false);
        console.error('❌ Failed to initialize useFreeVoiceAssistant');
      }

      return success;
    } catch (error) {
      console.error('❌ Error initializing useFreeVoiceAssistant:', error);
      setIsInitialized(false);
      return false;
    }
  }, [initialOptions]);

  // Start listening
  const startListening = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current || !isInitialized) {
      console.warn('⚠️ Service not initialized');
      return false;
    }

    return await serviceRef.current.startListening();
  }, [isInitialized]);

  // Stop listening
  const stopListening = useCallback(async (): Promise<FreeVoiceAssistantResult> => {
    if (!serviceRef.current || !isInitialized) {
      console.warn('⚠️ Service not initialized');
      return { success: false, error: 'Service not initialized' };
    }

    return await serviceRef.current.stopListening();
  }, [isInitialized]);

  // Cancel listening
  const cancelListening = useCallback(async (): Promise<void> => {
    if (!serviceRef.current || !isInitialized) {
      console.warn('⚠️ Service not initialized');
      return;
    }

    await serviceRef.current.cancelListening();
  }, [isInitialized]);

  // Get service status
  const getServiceStatus = useCallback(() => {
    if (!serviceRef.current) {
      return {
        initialized: false,
        supported: false,
        provider: 'Not Available',
        cost: 'N/A',
        currentState: 'not_initialized',
      };
    }

    return serviceRef.current.getServiceStatus();
  }, []);

  // Update options
  const updateOptions = useCallback((options: Partial<FreeVoiceAssistantOptions>) => {
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

  // Test service
  const testService = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) {
      console.warn('⚠️ Service not initialized');
      return false;
    }

    return await serviceRef.current.testService();
  }, []);

  // Computed values
  const canStartListening = !state.isListening && !state.isProcessing && isInitialized;
  const canStopListening = state.isListening && !state.isProcessing;
  const isSupported = getServiceStatus().supported;

  // Auto-initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (serviceRef.current) {
        serviceRef.current.cleanup();
        serviceRef.current = null;
      }
    };
  }, [initialize]);

  // Log state changes for debugging
  useEffect(() => {
    console.log('🔄 Free Voice Assistant State Changed:', {
      isListening: state.isListening,
      isProcessing: state.isProcessing,
      transcript: state.transcript.substring(0, 50) + (state.transcript.length > 50 ? '...' : ''),
      error: state.error,
      command: state.command?.command.type,
      duration: `${state.duration}ms`,
    });
  }, [state]);

  return {
    // State
    isListening: state.isListening,
    isProcessing: state.isProcessing,
    transcript: state.transcript,
    command: state.command?.command || null,
    error: state.error,
    duration: state.duration,
    isInitialized,

    // Actions
    startListening,
    stopListening,
    cancelListening,
    initialize,

    // Utilities
    getServiceStatus,
    updateOptions,
    clearError,
    testService,

    // Computed
    canStartListening,
    canStopListening,
    isSupported,
  };
};

export default useFreeVoiceAssistant;
