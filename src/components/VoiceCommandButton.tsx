import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import ExpoVoiceService, { ExpoVoiceResult } from '../services/ExpoVoiceService';
import { VoiceCommand } from '../services/VoiceCommandParser';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface VoiceCommandButtonProps {
  onCommandExecuted?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
  onTranscriptReceived?: (transcript: string) => void;
  size?: 'small' | 'medium' | 'large';
  position?: 'floating' | 'inline';
  disabled?: boolean;
  style?: any;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  onCommandExecuted,
  onError,
  onTranscriptReceived,
  size = 'medium',
  position = 'floating',
  disabled = false,
  style,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;

  // Free voice assistant hook (no API key required!)
  const {
    isListening,
    isProcessing,
    transcript,
    command,
    error,
    duration,
    canStartListening,
    canStopListening,
    startListening,
    stopListening,
    cancelListening,
    clearError,
    isInitialized,
    isSupported,
  } = useFreeVoiceAssistant({
    language: 'en-US',
    minConfidence: 0.6,
    maxDuration: 15000, // 15 seconds
    enableHaptics: true,
  });

  // Size configurations
  const sizeConfig = {
    small: { size: 48, iconSize: 20 },
    medium: { size: 56, iconSize: 24 },
    large: { size: 64, iconSize: 28 },
  };

  const { size: buttonSize, iconSize } = sizeConfig[size];

  // Handle button press - start/stop listening
  const handlePress = async () => {
    if (!isSupported) {
      Alert.alert(
        'Voice Assistant Not Supported', 
        'Voice recognition is not supported in this browser/environment. Please try using Chrome, Safari, or Edge.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isInitialized) {
      Alert.alert('Voice Assistant', 'Voice assistant is not ready. Please try again.');
      return;
    }

    if (disabled) {
      return;
    }

    if (isListening) {
      // Stop listening and process
      const result = await stopListening();
      setShowModal(false);
      
      if (result.success && result.command) {
        setLastCommand(result.command);
        onCommandExecuted?.(result.command);
      } else if (result.error) {
        onError?.(result.error);
      }
    } else {
      // Start listening
      clearError();
      const success = await startListening();
      
      if (success) {
        setShowModal(true);
        startModalAnimation();
      } else {
        Alert.alert('Voice Error', 'Failed to start voice recognition. Please ensure you have microphone permissions.');
      }
    }
  };

  // Handle modal close (cancel listening)
  const handleModalClose = async () => {
    if (isListening) {
      await cancelListening();
    }
    setShowModal(false);
  };

  // Start modal animation
  const startModalAnimation = () => {
    Animated.timing(modalFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Button press animation
  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  // Progress animation based on duration
  const progressValue = Math.min(duration / 15000, 1); // 15 seconds max
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressValue,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [progressValue]);

  // Handle transcript updates
  useEffect(() => {
    if (transcript) {
      onTranscriptReceived?.(transcript);
    }
  }, [transcript, onTranscriptReceived]);

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error);
      setShowModal(false);
    }
  }, [error, onError]);

  // Handle modal fade out
  useEffect(() => {
    if (!showModal) {
      Animated.timing(modalFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showModal]);

  // Get button color based on state
  const getButtonColor = () => {
    if (disabled) return COLORS.textMuted;
    if (!isSupported) return COLORS.textMuted;
    if (isListening) return COLORS.error;
    if (isProcessing) return COLORS.warning;
    return COLORS.primary;
  };

  // Get button icon based on state
  const getButtonIcon = () => {
    if (!isSupported) return 'mic-off';
    if (isProcessing) return 'hourglass-outline';
    if (isListening) return 'stop';
    return 'mic';
  };

  // Render floating button
  if (position === 'floating') {
    return (
      <>
        <Animated.View
          style={[
            styles.floatingButton,
            {
              width: buttonSize,
              height: buttonSize,
              backgroundColor: getButtonColor(),
              transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
            },
            style,
          ]}
        >
          <TouchableOpacity
            style={styles.floatingButtonInner}
            onPress={() => {
              animatePress();
              handlePress();
            }}
            disabled={disabled || !isSupported || (!canStartListening && !canStopListening)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={getButtonIcon() as any}
              size={iconSize}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Voice Recording Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="none"
          onRequestClose={handleModalClose}
        >
          <Animated.View
            style={[styles.modalOverlay, { opacity: modalFadeAnim }]}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={handleModalClose}
              activeOpacity={1}
            />
            
            <View style={styles.modalContent}>
              {/* Listening Indicator */}
              <View style={styles.recordingIndicator}>
                <Animated.View
                  style={[
                    styles.recordingPulse,
                    {
                      transform: [{ scale: pulseAnim }],
                      backgroundColor: isListening ? COLORS.error : COLORS.primary,
                    },
                  ]}
                >
                  <Ionicons name="mic" size={32} color={COLORS.white} />
                </Animated.View>
              </View>

              {/* Status Text */}
              <Text style={styles.statusText}>
                {isProcessing ? 'Processing...' : 'Listening...'}
              </Text>

              {/* Transcript Display */}
              {transcript && (
                <View style={styles.transcriptContainer}>
                  <Text style={styles.transcriptText}>"{transcript}"</Text>
                </View>
              )}

              {/* Recording Progress */}
              <View style={styles.progressContainer}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              {/* Duration */}
              <Text style={styles.durationText}>
                {Math.round(duration / 1000)}s / 15s
              </Text>

              {/* Stop Button */}
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handlePress}
              >
                <Ionicons name="stop" size={24} color={COLORS.white} />
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleModalClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      </>
    );
  }

  // Render inline button
  return (
    <TouchableOpacity
      style={[
        styles.inlineButton,
        {
          backgroundColor: getButtonColor(),
          width: buttonSize,
          height: buttonSize,
        },
        style,
      ]}
      onPress={() => {
        animatePress();
        handlePress();
      }}
      disabled={disabled || (!canStartListening && !canStopListening)}
      activeOpacity={0.8}
    >
      <Ionicons
        name={getButtonIcon() as any}
        size={iconSize}
        color={COLORS.white}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: SPACING.lg,
    borderRadius: 28,
    ...SHADOWS.lg,
    elevation: 8,
    zIndex: 1000,
  },
  floatingButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineButton: {
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    minWidth: 300,
    maxWidth: SCREEN_WIDTH - 40,
    ...SHADOWS.xl,
  },
  recordingIndicator: {
    marginBottom: SPACING.lg,
  },
  recordingPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  transcriptContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    minHeight: 60,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  transcriptText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  durationText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  stopButton: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  stopButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.white,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textMuted,
  },
});

export default VoiceCommandButton;
