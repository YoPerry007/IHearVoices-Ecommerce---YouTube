import { useState, useEffect, useCallback } from 'react';
// import Voice from '@react-native-voice/voice';
// import * as Haptics from 'expo-haptics';

interface VoiceAssistantState {
  isListening: boolean;
  isRecognizing: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
}

interface VoiceCommand {
  command: string;
  action: () => void;
  variations: string[];
}

export const useVoiceAssistant = () => {
  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isRecognizing: false,
    transcript: '',
    error: null,
    isSupported: true,
  });

  const [commands, setCommands] = useState<VoiceCommand[]>([]);

  // Ghana-specific pronunciation mappings
  const pronunciationMap: Record<string, string> = {
    'cut': 'cart',
    'gins': 'jeans',
    'snickers': 'sneakers',
    'shose': 'shoes',
    'cloths': 'clothes',
    'ad': 'add',
    'remov': 'remove',
    'chekout': 'checkout',
    'hom': 'home',
    'serch': 'search',
    'sho': 'show',
    'by': 'buy',
  };

  // Normalize text for Ghanaian pronunciations
  const normalizeText = useCallback((text: string): string => {
    let normalized = text.toLowerCase().trim();
    
    // Apply pronunciation mappings
    Object.entries(pronunciationMap).forEach(([mispronounced, correct]) => {
      const regex = new RegExp(`\\b${mispronounced}\\b`, 'gi');
      normalized = normalized.replace(regex, correct);
    });

    return normalized;
  }, []);

  // Find matching command using fuzzy matching
  const findMatchingCommand = useCallback((transcript: string): VoiceCommand | null => {
    const normalizedTranscript = normalizeText(transcript);
    
    for (const command of commands) {
      // Check exact match first
      if (normalizedTranscript.includes(command.command.toLowerCase())) {
        return command;
      }
      
      // Check variations
      for (const variation of command.variations) {
        if (normalizedTranscript.includes(variation.toLowerCase())) {
          return command;
        }
      }
    }
    
    return null;
  }, [commands, normalizeText]);

  // Mock voice event handlers for demo
  const onSpeechStart = useCallback(() => {
    setState(prev => ({ ...prev, isRecognizing: true, error: null }));
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const onSpeechRecognized = useCallback(() => {
    setState(prev => ({ ...prev, isRecognizing: true }));
  }, []);

  const onSpeechEnd = useCallback(() => {
    setState(prev => ({ ...prev, isRecognizing: false }));
  }, []);

  const onSpeechError = useCallback((error: any) => {
    setState(prev => ({
      ...prev,
      isListening: false,
      isRecognizing: false,
      error: error.error?.message || 'Speech recognition error',
    }));
    // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const onSpeechResults = useCallback((event: any) => {
    const transcript = event.value?.[0] || '';
    setState(prev => ({ ...prev, transcript }));
    
    // Try to execute matching command
    const matchingCommand = findMatchingCommand(transcript);
    if (matchingCommand) {
      // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      matchingCommand.action();
    }
  }, [findMatchingCommand]);

  const onSpeechPartialResults = useCallback((event: any) => {
    const transcript = event.value?.[0] || '';
    setState(prev => ({ ...prev, transcript }));
  }, []);

  // Mock initialization for demo
  useEffect(() => {
    // Mock voice recognition availability
    setState(prev => ({ ...prev, isSupported: true }));
  }, []);

  // Mock start listening
  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isListening: true, transcript: '', error: null }));
      // Mock voice recognition - in real app this would use Voice.start('en-US')
      console.log('Voice recognition started (mock)');
      
      // Simulate voice input after 2 seconds for demo
      setTimeout(() => {
        setState(prev => ({ ...prev, transcript: 'Hello, show me sneakers' }));
        // Try to execute matching command
        const mockCommand = commands.find(cmd => 
          cmd.command.includes('sneakers') || cmd.variations.some(v => v.includes('sneakers'))
        );
        if (mockCommand) {
          mockCommand.action();
        }
      }, 2000);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isListening: false,
        error: 'Failed to start voice recognition',
      }));
    }
  }, [commands]);

  // Mock stop listening
  const stopListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isListening: false }));
      console.log('Voice recognition stopped (mock)');
    } catch (error) {
      setState(prev => ({
        ...prev,
        isListening: false,
        error: 'Failed to stop voice recognition',
      }));
    }
  }, []);

  // Register voice commands
  const registerCommand = useCallback((command: VoiceCommand) => {
    setCommands(prev => [...prev.filter(c => c.command !== command.command), command]);
  }, []);

  // Unregister voice commands
  const unregisterCommand = useCallback((commandName: string) => {
    setCommands(prev => prev.filter(c => c.command !== commandName));
  }, []);

  // Clear all commands
  const clearCommands = useCallback(() => {
    setCommands([]);
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    registerCommand,
    unregisterCommand,
    clearCommands,
    normalizeText,
  };
};
