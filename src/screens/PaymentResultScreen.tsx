/**
 * PaymentResultScreen - Professional payment result handling
 * 
 * Features:
 * - Success and failure states
 * - Order details display
 * - Receipt information
 * - Professional animations
 * - Next action buttons
 * - Error handling with support contact
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

interface PaymentResultScreenProps {
  navigation: any;
  route: {
    params: {
      success: boolean;
      orderId?: string | null;
      transactionId: string;
      amount: number;
      paymentMethod: string;
      reference: string;
      warning?: string;
      error?: string;
    };
  };
}

const PaymentResultScreen: React.FC<PaymentResultScreenProps> = ({
  navigation,
  route,
}) => {
  const {
    success,
    orderId,
    transactionId,
    amount,
    paymentMethod,
    reference,
    warning,
    error,
  } = route.params;

  // Haptic feedback on load
  useEffect(() => {
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [success]);

  const handleContactSupport = async () => {
    const supportEmail = 'support@ihearvoices.com';
    const subject = encodeURIComponent('Payment Issue - Order Support');
    const body = encodeURIComponent(
      `Order Reference: ${reference}\nTransaction ID: ${transactionId}\nAmount: GH₵${amount.toFixed(2)}\nPayment Method: ${paymentMethod}\n\nPlease describe your issue below:`
    );
    
    const emailUrl = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    
    try {
      await Linking.openURL(emailUrl);
    } catch (err) {
      // Fallback - copy to clipboard or show support info
      console.log('Email not available, showing support info');
    }
  };

  const navigateToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
    });
  };

  const navigateToOrders = () => {
    // Navigate to order history using the app's navigation system
    if (navigation.navigate) {
      navigation.navigate('order-history');
    } else if (navigation.setCurrentScreen) {
      // Fallback for custom navigation
      navigation.setCurrentScreen('order-history');
    } else {
      // Final fallback - go to profile where orders can be accessed
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeTabs', params: { screen: 'Profile' } }],
      });
    }
  };

  const navigateToCart = () => {
    navigation.navigate('Cart');
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={COLORS.success} barStyle="light-content" />
        
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Success Header */}
          <LinearGradient
            colors={[COLORS.success, COLORS.success]}
            style={styles.successHeader}
          >
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.white} />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSubtitle}>
              Your order has been {orderId ? 'placed' : 'processed'} successfully
            </Text>
          </LinearGradient>

          {/* Warning Message */}
          {warning && (
            <View style={styles.warningCard}>
              <Ionicons name="warning" size={24} color={COLORS.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Attention Required</Text>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            </View>
          )}

          {/* Payment Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Payment Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Paid</Text>
              <Text style={styles.detailValue}>GH₵{amount.toFixed(2)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{paymentMethod}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={[styles.detailValue, styles.monospace]}>{transactionId}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={[styles.detailValue, styles.monospace]}>{reference}</Text>
            </View>
            
            {orderId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={[styles.detailValue, styles.monospace]}>{orderId}</Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>{new Date().toLocaleString()}</Text>
            </View>
          </View>

          {/* Next Steps */}
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>What's Next?</Text>
            
            <View style={styles.stepItem}>
              <View style={styles.stepIcon}>
                <Ionicons name="mail" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.stepText}>
                You'll receive an email confirmation shortly
              </Text>
            </View>
            
            {orderId && (
              <View style={styles.stepItem}>
                <View style={styles.stepIcon}>
                  <Ionicons name="cube" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.stepText}>
                  Your order is being prepared for shipping
                </Text>
              </View>
            )}
            
            <View style={styles.stepItem}>
              <View style={styles.stepIcon}>
                <Ionicons name="notifications" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.stepText}>
                We'll notify you of any updates
              </Text>
            </View>
          </View>

          {/* Support Section */}
          {warning && (
            <TouchableOpacity style={styles.supportCard} onPress={handleContactSupport}>
              <Ionicons name="headset" size={24} color={COLORS.primary} />
              <View style={styles.supportContent}>
                <Text style={styles.supportTitle}>Need Help?</Text>
                <Text style={styles.supportText}>Contact our support team</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={navigateToOrders}>
            <Ionicons name="receipt" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>View Orders</Text>
          </TouchableOpacity>
          
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.primaryButton}
          >
            <TouchableOpacity style={styles.primaryButtonContent} onPress={navigateToHome}>
              <Ionicons name="home" size={20} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  // Failure State
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.error} barStyle="light-content" />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Error Header */}
        <LinearGradient
          colors={[COLORS.error, COLORS.error]}
          style={styles.errorHeader}
        >
          <View style={styles.errorIcon}>
            <Ionicons name="close-circle" size={80} color={COLORS.white} />
          </View>
          <Text style={styles.errorTitle}>Payment Failed</Text>
          <Text style={styles.errorSubtitle}>
            We couldn't process your payment
          </Text>
        </LinearGradient>

        {/* Error Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Transaction Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Attempted Amount</Text>
            <Text style={styles.detailValue}>GH₵{amount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{paymentMethod}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference</Text>
            <Text style={[styles.detailValue, styles.monospace]}>{reference}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{new Date().toLocaleString()}</Text>
          </View>
          
          {error && (
            <View style={styles.errorMessageContainer}>
              <Text style={styles.errorMessageLabel}>Error Details:</Text>
              <Text style={styles.errorMessageText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Troubleshooting */}
        <View style={styles.troubleshootingCard}>
          <Text style={styles.troubleshootingTitle}>Common Solutions</Text>
          
          <View style={styles.troubleshootingItem}>
            <Ionicons name="card" size={20} color={COLORS.textSecondary} />
            <Text style={styles.troubleshootingText}>
              Check your card balance or try a different payment method
            </Text>
          </View>
          
          <View style={styles.troubleshootingItem}>
            <Ionicons name="wifi" size={20} color={COLORS.textSecondary} />
            <Text style={styles.troubleshootingText}>
              Ensure you have a stable internet connection
            </Text>
          </View>
          
          <View style={styles.troubleshootingItem}>
            <Ionicons name="phone-portrait" size={20} color={COLORS.textSecondary} />
            <Text style={styles.troubleshootingText}>
              For Mobile Money, check if you received USSD prompt
            </Text>
          </View>
        </View>

        {/* Support Section */}
        <TouchableOpacity style={styles.supportCard} onPress={handleContactSupport}>
          <Ionicons name="headset" size={24} color={COLORS.primary} />
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Still Having Issues?</Text>
            <Text style={styles.supportText}>Contact our support team</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={navigateToCart}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Back to Cart</Text>
        </TouchableOpacity>
        
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.primaryButton}
        >
          <TouchableOpacity 
            style={styles.primaryButtonContent} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    marginVertical: SPACING.lg,
  },
  errorHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    marginVertical: SPACING.lg,
  },
  successIcon: {
    marginBottom: SPACING.md,
  },
  errorIcon: {
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  errorSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  warningContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.warning,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  errorMessageContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorMessageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 4,
  },
  errorMessageText: {
    fontSize: 12,
    color: COLORS.error,
  },
  nextStepsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  troubleshootingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  troubleshootingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  troubleshootingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
  },
  troubleshootingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supportContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  supportText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default PaymentResultScreen;
