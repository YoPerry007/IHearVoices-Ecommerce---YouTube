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
import { useHybridVoiceAssistant } from '../hooks/useHybridVoiceAssistant';
import { VoiceCommand } from '../services/VoiceCommandParser';
import { getMLServiceUrl } from '../config/mlServiceUrl';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface EnhancedVoiceCommandButtonProps {
  onCommandExecuted?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
  onTranscriptReceived?: (transcript: string) => void;
  size?: 'small' | 'medium' | 'large';
  position?: 'floating' | 'inline';
  disabled?: boolean;
  style?: any;
  showConnectionStatus?: boolean;
  pythonMLUrl?: string;
}

const EnhancedVoiceCommandButton: React.FC<EnhancedVoiceCommandButtonProps> = ({
  onCommandExecuted,
  onError,
  onTranscriptReceived,
  size = 'medium',
  position = 'floating',
  disabled = false,
  style,
  showConnectionStatus = true,
  pythonMLUrl = getMLServiceUrl(),
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const statusIndicatorAnim = useRef(new Animated.Value(1)).current;

  // Hybrid voice assistant hook
  const {
    isRecording,
    isProcessing,
    transcript,
    command,
    error,
    duration,
    pythonMLConnected,
    webSpeechAvailable,
    activeService,
    canStartRecording,
    canStopRecording,
    hasAnyService,
    serviceQuality,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
    isInitialized,
    getConnectionStatusText,
    getConnectionStatusColor,
    getServiceRecommendations,
    checkServiceHealth,
    updateOptions,
  } = useHybridVoiceAssistant({
    preferPythonML: true,
    enableWebSpeechFallback: true,
    pythonMLUrl,
    language: 'en-US',
    minConfidence: 0.6,
    maxRecordingDuration: 15000,
    enableHaptics: true,
    autoHealthCheck: true,
  });

  // Size configurations
  const sizeConfig = {
    small: { size: 48, iconSize: 20 },
    medium: { size: 56, iconSize: 24 },
    large: { size: 64, iconSize: 28 },
  };

  const { size: buttonSize, iconSize } = sizeConfig[size];

  // Handle button press - start/stop recording
  const handlePress = async () => {
    if (!hasAnyService) {
      Alert.alert(
        'Voice Services Unavailable',
        'No voice recognition services are available. Please check your connection or start the Python ML service.',
        [
          { text: 'Check Status', onPress: () => setShowStatusModal(true) },
          { text: 'OK' }
        ]
      );
      return;
    }

    if (!isInitialized) {
      Alert.alert('Voice Assistant', 'Voice assistant is initializing. Please wait a moment.');
      return;
    }

    if (disabled) {
      return;
    }

    if (isRecording) {
      // Stop recording and process
      const result = await stopRecording();
      setShowModal(false);
      
      if (result.success && result.command) {
        setLastCommand(result.command);
        onCommandExecuted?.(result.command);
        
        // Show success feedback for fallback usage
        if (result.fallbackUsed) {
          Alert.alert(
            'Voice Command Executed',
            `Command processed using ${result.service}. Consider starting the Python ML service for better performance.`,
            [{ text: 'OK' }]
          );
        }
      } else if (result.error) {
        onError?.(result.error);
      }
    } else {
      // Start recording
      clearError();
      const success = await startRecording();
      
      if (success) {
        setShowModal(true);
        startModalAnimation();
      } else {
        Alert.alert(
          'Voice Recording Failed',
          'Could not start voice recording. Please check your microphone permissions and service status.',
          [
            { text: 'Check Status', onPress: () => setShowStatusModal(true) },
            { text: 'OK' }
          ]
        );
      }
    }
  };

  // Handle modal close (cancel recording)
  const handleModalClose = async () => {
    if (isRecording) {
      await cancelRecording();
    }
    setShowModal(false);
  };

  // Handle status button press
  const handleStatusPress = () => {
    setShowStatusModal(true);
  };

  // Handle refresh services
  const handleRefreshServices = async () => {
    await checkServiceHealth();
  };

  // Start modal animation
  const startModalAnimation = () => {
    Animated.timing(modalFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

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

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
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
  }, [isRecording]);

  // Status indicator animation
  useEffect(() => {
    const shouldPulse = !pythonMLConnected && webSpeechAvailable;
    
    if (shouldPulse) {
      const statusPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(statusIndicatorAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(statusIndicatorAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      statusPulse.start();
      return () => statusPulse.stop();
    } else {
      statusIndicatorAnim.setValue(1);
    }
  }, [pythonMLConnected, webSpeechAvailable]);

  // Progress animation based on duration
  const progressValue = Math.min(duration / 15000, 1);
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
    }
  }, [error, onError]);

  // Auto-hide modal when not recording/processing
  useEffect(() => {
    if (showModal && !isRecording && !isProcessing) {
      Animated.timing(modalFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showModal, isRecording, isProcessing]);

  // Get button color based on state and service quality
  const getButtonColor = () => {
    if (disabled) return COLORS.textMuted;
    if (!hasAnyService) return COLORS.textMuted;
    if (isRecording) return COLORS.error;
    if (isProcessing) return COLORS.warning;
    
    switch (serviceQuality) {
      case 'excellent':
        return COLORS.success;
      case 'good':
        return COLORS.primary;
      case 'limited':
        return COLORS.warning;
      default:
        return COLORS.textMuted;
    }
  };

  // Get button icon based on state
  const getButtonIcon = () => {
    if (!hasAnyService) return 'mic-off';
    if (isProcessing) return 'hourglass-outline';
    if (isRecording) return 'stop';
    return 'mic';
  };

  // Get status indicator color
  const getStatusColor = () => {
    return getConnectionStatusColor();
  };

  // Render floating button
  if (position === 'floating') {
    return (
      <>
        <View style={[styles.floatingContainer, style]}>
          {/* Connection Status Indicator */}
          {showConnectionStatus && (
            <Animated.View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: getStatusColor(),
                  opacity: statusIndicatorAnim,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.statusButton}
                onPress={handleStatusPress}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={pythonMLConnected ? 'checkmark' : webSpeechAvailable ? 'warning' : 'close'}
                  size={12}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Main Voice Button */}
          <Animated.View
            style={[
              styles.floatingButton,
              {
                width: buttonSize,
                height: buttonSize,
                backgroundColor: getButtonColor(),
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.floatingButtonInner}
              onPress={() => {
                animatePress();
                handlePress();
              }}
              disabled={disabled || (!canStartRecording && !canStopRecording)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={getButtonIcon() as any}
                size={iconSize}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

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
                  {getConnectionStatusText()}
                </Text>
                <View style={[styles.serviceIndicator, { backgroundColor: getStatusColor() }]} />
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
                {isProcessing ? 'Processing with AI...' : 'Listening...'}
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

        {/* Service Status Modal */}
        <Modal
          visible={showStatusModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStatusModal(false)}
        >
          <View style={styles.statusModalOverlay}>
            <View style={styles.statusModalContent}>
              <View style={styles.statusModalHeader}>
                <Text style={styles.statusModalTitle}>Voice Services Status</Text>
                <TouchableOpacity
                  onPress={() => setShowStatusModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Overall Status */}
              <View style={styles.overallStatus}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                  <Text style={styles.statusBadgeText}>
                    {serviceQuality.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.overallStatusText}>
                  {getConnectionStatusText()}
                </Text>
              </View>

              {/* Service Details */}
              <View style={styles.serviceDetails}>
                <View style={styles.serviceItem}>
                  <Ionicons
                    name={pythonMLConnected ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={pythonMLConnected ? COLORS.success : COLORS.error}
                  />
                  <Text style={styles.serviceItemText}>
                    Python ML Service
                  </Text>
                  <Text style={styles.serviceItemStatus}>
                    {pythonMLConnected ? 'Connected' : 'Disconnected'}
                  </Text>
                </View>

                <View style={styles.serviceItem}>
                  <Ionicons
                    name={webSpeechAvailable ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={webSpeechAvailable ? COLORS.success : COLORS.error}
                  />
                  <Text style={styles.serviceItemText}>
                    Web Speech API
                  </Text>
                  <Text style={styles.serviceItemStatus}>
                    {webSpeechAvailable ? 'Available' : 'Not Supported'}
                  </Text>
                </View>
              </View>

              {/* Recommendations */}
              <View style={styles.recommendations}>
                <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                {getServiceRecommendations().map((rec, index) => (
                  <Text key={index} style={styles.recommendationItem}>
                    • {rec}
                  </Text>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.statusActions}>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleRefreshServices}
                >
                  <Ionicons name="refresh" size={20} color={COLORS.white} />
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
      disabled={disabled || (!canStartRecording && !canStopRecording)}
      activeOpacity={0.8}
    >
      <Ionicons
        name={getButtonIcon() as any}
        size={iconSize}
        color={COLORS.white}
      />
      {showConnectionStatus && (
        <View style={[styles.inlineStatusIndicator, { backgroundColor: getStatusColor() }]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 100,
    right: SPACING.md,
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 2,
  },
  statusButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
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
    ...SHADOWS.medium,
  },
  inlineStatusIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
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
  },
  stopButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: SPACING.sm,
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  statusModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  statusModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  statusModalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  overallStatus: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  overallStatusText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  serviceDetails: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serviceItemText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  serviceItemStatus: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  recommendations: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  recommendationsTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  recommendationItem: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.sm,
  },
  statusActions: {
    width: '100%',
    alignItems: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: SPACING.sm,
  },
});

export default EnhancedVoiceCommandButton;
