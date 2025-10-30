import { useState, useEffect, useCallback, useRef } from 'react';
import VoiceAssistantServiceML, { 
  VoiceAssistantState, 
  VoiceAssistantResult, 
  VoiceAssistantOptions 
} from '../services/VoiceAssistantServiceML';
import { VoiceCommand } from '../services/VoiceCommandParser';

export interface UseVoiceAssistantReturn {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  isListening: boolean;
  transcript: string;
  command: VoiceCommand | null;
  error: string | null;
  recordingDuration: number;
  isInitialized: boolean;
  
  // Actions
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<VoiceAssistantResult>;
  cancelListening: () => Promise<void>;
  initialize: (options?: Partial<VoiceAssistantOptions>) => Promise<boolean>;
  executeCommand: (command: VoiceCommand, context?: Record<string, any>) => Promise<boolean>;
  
  // Utilities
  getServiceStatus: () => {
    initialized: boolean;
    recordingAvailable: boolean;
    speechToTextAvailable: boolean;
    currentState: string;
  };
  updateOptions: (options: Partial<VoiceAssistantOptions>) => void;
  clearError: () => void;
  
  // Computed
  canStartListening: boolean;
  canStopListening: boolean;
  recordingProgress: number;
}

export const useVoiceAssistantML = (
  initialOptions?: Partial<VoiceAssistantOptions>
): UseVoiceAssistantReturn => {
  const [state, setState] = useState<VoiceAssistantState>({
    isRecording: false,
    isProcessing: false,
    isListening: false,
    transcript: '',
    command: null,
    error: null,
    recordingDuration: 0,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const serviceRef = useRef<VoiceAssistantServiceML | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize service
  const initialize = useCallback(async (options?: Partial<VoiceAssistantOptions>): Promise<boolean> => {
    try {
      console.log('🚀 Initializing useVoiceAssistantML...');

      // Get service instance
      if (!serviceRef.current) {
        serviceRef.current = VoiceAssistantServiceML.getInstance();
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
        console.log('✅ useVoiceAssistantML initialized successfully');
      } else {
        setIsInitialized(false);
        console.error('❌ Failed to initialize useVoiceAssistantML');
      }

      return success;
    } catch (error) {
      console.error('❌ Error initializing useVoiceAssistantML:', error);
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
  const stopListening = useCallback(async (): Promise<VoiceAssistantResult> => {
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

  // Execute command
  const executeCommand = useCallback(async (
    command: VoiceCommand, 
    context?: Record<string, any>
  ): Promise<boolean> => {
    if (!serviceRef.current || !isInitialized) {
      console.warn('⚠️ Service not initialized');
      return false;
    }

    return await serviceRef.current.executeCommand(command, context);
  }, [isInitialized]);

  // Get service status
  const getServiceStatus = useCallback(() => {
    if (!serviceRef.current) {
      return {
        initialized: false,
        recordingAvailable: false,
        speechToTextAvailable: false,
        currentState: 'not_initialized',
      };
    }

    return serviceRef.current.getServiceStatus();
  }, []);

  // Update options
  const updateOptions = useCallback((options: Partial<VoiceAssistantOptions>) => {
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

  // Computed values
  const canStartListening = !state.isRecording && !state.isProcessing && isInitialized;
  const canStopListening = state.isRecording && !state.isProcessing;
  
  // Calculate recording progress (0-1)
  const recordingProgress = Math.min(
    state.recordingDuration / (initialOptions?.maxRecordingDuration || 30000),
    1
  );

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
    console.log('🔄 Voice Assistant State Changed:', {
      isRecording: state.isRecording,
      isProcessing: state.isProcessing,
      transcript: state.transcript.substring(0, 50) + (state.transcript.length > 50 ? '...' : ''),
      error: state.error,
      command: state.command?.command.type,
    });
  }, [state]);

  return {
    // State
    isRecording: state.isRecording,
    isProcessing: state.isProcessing,
    isListening: state.isListening,
    transcript: state.transcript,
    command: state.command?.command || null,
    error: state.error,
    recordingDuration: state.recordingDuration,
    isInitialized,

    // Actions
    startListening,
    stopListening,
    cancelListening,
    initialize,
    executeCommand,

    // Utilities
    getServiceStatus,
    updateOptions,
    clearError,

    // Computed
    canStartListening,
    canStopListening,
    recordingProgress,
  };
};

export default useVoiceAssistantML;
