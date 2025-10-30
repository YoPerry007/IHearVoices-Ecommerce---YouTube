import React, { useState, useRef, useEffect } from 'react';
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

export interface ExpoVoiceButtonProps {
  onCommandExecuted?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
  onTranscriptReceived?: (transcript: string) => void;
  size?: 'small' | 'medium' | 'large';
  position?: 'floating' | 'inline';
  disabled?: boolean;
  style?: any;
}

const ExpoVoiceButton: React.FC<ExpoVoiceButtonProps> = ({
  onCommandExecuted,
  onError,
  onTranscriptReceived,
  size = 'medium',
  position = 'floating',
  disabled = false,
  style,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;

  // Duration timer
  const durationTimer = useRef<NodeJS.Timeout | null>(null);

  // Size configurations
  const sizeConfig = {
    small: { size: 48, iconSize: 20 },
    medium: { size: 56, iconSize: 24 },
    large: { size: 64, iconSize: 28 },
  };

  const { size: buttonSize, iconSize } = sizeConfig[size];

  // Initialize service on mount
  useEffect(() => {
    const initializeService = async () => {
      try {
        const success = await ExpoVoiceService.initialize();
        setIsInitialized(success);
        if (!success) {
          setError('Failed to initialize voice service');
        }
      } catch (error) {
        console.error('❌ Failed to initialize ExpoVoiceService:', error);
        setError('Voice service initialization failed');
        setIsInitialized(false);
      }
    };

    initializeService();
  }, []);

  // Update duration timer
  useEffect(() => {
    if (isRecording) {
      durationTimer.current = setInterval(() => {
        const status = ExpoVoiceService.getStatus();
        setDuration(status.duration);
      }, 100);
    } else {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }
      setDuration(0);
    }

    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
    };
  }, [isRecording]);

  // Handle button press
  const handlePress = async () => {
    if (!isInitialized) {
      Alert.alert(
        'Voice Service Not Ready',
        'Voice service is still initializing. Please wait a moment and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (disabled) {
      return;
    }

    if (isRecording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      setTranscript('');
      
      const success = await ExpoVoiceService.startRecording({
        maxDuration: 15000,
        enableHaptics: true,
      });

      if (success) {
        setIsRecording(true);
        setShowModal(true);
        startModalAnimation();
        startPulseAnimation();
      } else {
        Alert.alert(
          'Recording Failed',
          'Could not start voice recording. Please check your microphone permissions.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setError((error as Error).message);
      onError?.((error as Error).message);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);

      const result: ExpoVoiceResult = await ExpoVoiceService.stopRecording({
        enableHaptics: true,
      });

      setIsProcessing(false);
      setShowModal(false);
      
      if (result.success) {
        setTranscript(result.transcript || '');
        onTranscriptReceived?.(result.transcript || '');

        if (result.command) {
          console.log('🎯 Executing voice command:', result.command);
          onCommandExecuted?.(result.command);
          
          // Command executed successfully - no need for alert, let the action speak for itself
        } else {
          Alert.alert(
            'Command Not Recognized',
            'Could not understand the voice command. Please try speaking more clearly or check if the Python ML service is running.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setError(result.error || 'Voice recognition failed');
        onError?.(result.error || 'Voice recognition failed');
      }
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
      setShowModal(false);
      setError((error as Error).message);
      onError?.((error as Error).message);
    }
  };

  // Cancel recording
  const handleModalClose = async () => {
    if (isRecording) {
      await ExpoVoiceService.cancelRecording();
      setIsRecording(false);
    }
    setIsProcessing(false);
    setShowModal(false);
    setTranscript('');
    setDuration(0);
  };

  // Start modal animation
  const startModalAnimation = () => {
    Animated.timing(modalFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Start pulse animation
  const startPulseAnimation = () => {
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
  };

  // Stop pulse animation
  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Animate button press
  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
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

  // Progress animation
  const progressValue = Math.min(duration / 15000, 1);
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressValue,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [progressValue]);

  // Get button color based on state
  const getButtonColor = () => {
    if (disabled || !isInitialized) return COLORS.textMuted;
    if (isRecording) return COLORS.error;
    if (isProcessing) return COLORS.warning;
    return COLORS.primary;
  };

  // Get button icon based on state
  const getButtonIcon = () => {
    if (!isInitialized) return 'hourglass-outline';
    if (isProcessing) return 'hourglass-outline';
    if (isRecording) return 'stop';
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
              transform: [{ scale: scaleAnim }],
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
            disabled={disabled || !isInitialized}
            activeOpacity={0.8}
          >
            <Ionicons
              name={getButtonIcon() as any}
              size={iconSize}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Recording Modal */}
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
              {/* Service Status */}
              <View style={styles.serviceStatus}>
                <Text style={styles.serviceStatusText}>
                  Expo Voice Service
                </Text>
                <View style={[styles.serviceIndicator, { backgroundColor: COLORS.primary }]} />
              </View>

              {/* Recording Indicator */}
              <View style={styles.recordingIndicator}>
                <Animated.View
                  style={[
                    styles.recordingPulse,
                    {
                      transform: [{ scale: pulseAnim }],
                      backgroundColor: isRecording ? COLORS.error : COLORS.primary,
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

              {/* Transcript Preview */}
              {transcript && (
                <Text style={styles.transcriptText}>
                  "{transcript}"
                </Text>
              )}

              {/* Progress Bar */}
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
          width: buttonSize,
          height: buttonSize,
          backgroundColor: getButtonColor(),
        },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || !isInitialized}
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
    right: SPACING.md,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  floatingButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  inlineButton: {
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
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
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 320,
  },
  serviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  serviceStatusText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  serviceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  },
  transcriptText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
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
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  stopButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: SPACING.sm,
  },
});

export default ExpoVoiceButton;
