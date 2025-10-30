/**
 * CheckoutScreen - Industry-standard checkout implementation
 * 
 * Features:
 * - Complete shipping information collection
 * - Ghana-focused payment methods
 * - Real-time order calculation
 * - Payment processing with Paystack
 * - Professional validation and error handling
 * - Database integration with order creation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import PaymentService, { PaymentMethod } from '../services/PaymentService';
import OrderService, { ShippingAddress } from '../services/OrderService';

interface CheckoutScreenProps {
  navigation: any;
}

interface FormErrors {
  [key: string]: string | null;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { user, profile, updateProfile } = useAuth();
  const { items, summary, clearCart } = useCart();

  // State management
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('momo_mtn');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  
  // Payment state
  const [currentPaymentReference, setCurrentPaymentReference] = useState<string>('');
  const [orderCreated, setOrderCreated] = useState<boolean>(false);
  const [processedPayments, setProcessedPayments] = useState<Set<string>>(new Set());
  
  // Shipping form state
  const [shippingForm, setShippingForm] = useState<ShippingAddress>({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: '',
    region: 'Greater Accra',
    postal_code: '',
    additional_notes: '',
  });

  // Payment methods and calculations
  const paymentMethods = PaymentService.getPaymentMethods();
  const selectedPaymentMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
  const processingFee = PaymentService.calculateProcessingFee(selectedPaymentMethodId, summary?.total || 0);
  const totalAmount = PaymentService.calculateTotalAmount(selectedPaymentMethodId, summary?.total || 0);

  // Initialize form from profile
  useEffect(() => {
    if (profile) {
      setShippingForm(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      }));
    }
  }, [profile]);

  // Form validation  
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    const isTestMode = PaymentService.getTestMode();

    // Required fields
    if (!shippingForm.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    // Phone number validation - completely optional, only validate format if provided
    if (shippingForm.phone.trim() && !/^0[0-9]{9}$/.test(shippingForm.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid Ghana phone number (e.g., 0244567890)';
    }

    if (!shippingForm.address.trim()) {
      errors.address = 'Delivery address is required';
    }

    if (!shippingForm.city.trim()) {
      errors.city = 'City is required';
    }

    if (!shippingForm.region.trim()) {
      errors.region = 'Region is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update form field
  const updateFormField = (field: keyof ShippingAddress, value: string) => {
    setShippingForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle payment processing
  const processPayment = async () => {
    if (!user || !summary || items.length === 0) {
      Alert.alert('Error', 'Cart is empty or user not logged in');
      return;
    }

    // Validate form
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly');
      return;
    }

    setIsProcessing(true);
    setOrderCreated(false); // Reset order creation flag for new payment
    setProcessedPayments(new Set()); // Clear processed payments for new transaction

    try {
      // Update user profile with shipping info
      console.log('Updating user profile with shipping information');
      await updateProfile({
        full_name: shippingForm.full_name,
        phone: shippingForm.phone,
        address: shippingForm.address,
      });

      // Prepare payment data
      const reference = PaymentService.generateReference('IHV');
      const paymentData = {
        amount: totalAmount,
        email: user.email || user?.id || 'test@example.com', // Fallback for test mode
        currency: 'GHS' as const,
        reference,
        metadata: {
          user_id: user.id,
          order_type: 'ecommerce',
          items_count: items.length,
          shipping_info: JSON.stringify(shippingForm),
          cart_summary: JSON.stringify({
            subtotal: summary.subtotal,
            tax: summary.tax,
            processing_fee: processingFee,
            total: totalAmount,
          }),
        },
      };

      console.log(`Processing ${selectedPaymentMethod?.name} payment for GH₵${totalAmount.toFixed(2)}`);

      // Process payment based on selected method
      const paymentResult = await PaymentService.processPayment(
        selectedPaymentMethodId,
        paymentData,
        { phone: shippingForm.phone }
      );

      // Handle different payment statuses
      if (paymentResult.success) {
        // Payment completed successfully - create order immediately
        await createOrderAfterPayment(paymentResult.reference, paymentResult.transaction_id || '');
      } else if (paymentResult.authorization_url) {
        // All payments (Card/Mobile Money) - open in-app browser
        console.log('Opening in-app payment browser');
        console.log('Payment URL:', paymentResult.authorization_url);
        console.log('Reference:', reference);
        
        setCurrentPaymentReference(reference);
        await handleWebBrowserPayment(paymentResult.authorization_url, reference);
        return;
      } else {
        throw new Error(paymentResult.message || 'Payment failed');
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      
      Alert.alert('Payment Failed', errorMessage, [
        {
          text: 'Try Again',
          onPress: () => setIsProcessing(false),
        },
        {
          text: 'Go Back',
          style: 'cancel',
          onPress: () => {
            setIsProcessing(false);
            navigation.goBack();
          },
        },
      ]);
    }
  };

  // Deducted amount for offline payment
  const deductedAmount = totalAmount - processingFee;
  const deductedAmountText = `GH₵${deductedAmount.toFixed(2)}`;
  // Create order after offline payment (Mobile Money)
  const createOfflinePaymentOrder = async (paymentReference: string, transactionId: string, paymentMessage: string) => {
    try {
      console.log('Creating order for offline payment (Mobile Money)');
      
      // Create order in database with pending payment status
      const order = await OrderService.createOrder({
        user_id: user!.id,
        total_amount: totalAmount,
        shipping_address: shippingForm,
        payment_reference: paymentReference,
        status: 'pending', // Order is pending until payment is completed
        payment_status: 'pending', // Payment is pending completion on phone
        notes: `${selectedPaymentMethod?.name} payment initiated. Awaiting USSD completion. (Transaction: ${transactionId})`,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
      });

      console.log('Offline payment order created:', order.id);

      // Clear cart
      await clearCart();

      // Show success message with instructions
      Alert.alert(
        'Payment Initiated',
        `${paymentMessage}\n\nYour order has been created and is waiting for payment completion. Complete the payment on your phone to activate your order.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace('PaymentResult', {
                success: true,
                orderId: order.id,
                transactionId,
                amount: totalAmount,
                paymentMethod: selectedPaymentMethod?.name,
                reference: paymentReference,
                isOfflinePayment: true,
                message: paymentMessage,
              });
            },
          },
        ]
      );

    } catch (error) {
      console.error('Offline order creation error:', error);
      
      Alert.alert(
        'Order Creation Failed',
        'Payment was initiated but we encountered an issue creating your order. Please contact support with payment reference: ' + paymentReference,
        [
          {
            text: 'Contact Support',
            onPress: () => {
              navigation.replace('PaymentResult', {
                success: false,
                orderId: null,
                transactionId,
                amount: totalAmount,
                paymentMethod: selectedPaymentMethod?.name,
                reference: paymentReference,
                warning: 'Order creation issue - contact support',
                isOfflinePayment: true,
              });
            },
          },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Create order after successful payment
  const createOrderAfterPayment = async (paymentReference: string, transactionId: string) => {
    // Prevent duplicate order creation using payment reference
    if (processedPayments.has(paymentReference)) {
      console.log(`⚠️ Order already created for payment reference ${paymentReference}, skipping duplicate creation`);
      return;
    }
    
    try {
      console.log(`Creating order for payment reference: ${paymentReference}`);
      
      // Mark this payment as being processed immediately
      setProcessedPayments(prev => new Set([...prev, paymentReference]));
      setOrderCreated(true);
      
      // Create order in database
      const order = await OrderService.createOrder({
        user_id: user!.id,
        total_amount: totalAmount,
        shipping_address: shippingForm,
        payment_reference: paymentReference,
        status: 'processing',
        payment_status: 'paid',
        notes: `Paid via ${selectedPaymentMethod?.name} (Transaction: ${transactionId})`,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
      });

      console.log('Order created successfully:', order.id);

      // Clear cart
      await clearCart();

      // Navigate to success screen
      navigation.replace('PaymentResult', {
        success: true,
        orderId: order.id,
        transactionId,
        amount: totalAmount,
        paymentMethod: selectedPaymentMethod?.name,
        reference: paymentReference,
      });

    } catch (error) {
      console.error('Order creation error:', error);
      
      // Payment succeeded but order creation failed
      Alert.alert(
        'Order Creation Failed',
        'Payment was successful but we encountered an issue creating your order. Please contact support with payment reference: ' + paymentReference,
        [
          {
            text: 'Contact Support',
            onPress: () => {
              // Navigate to success screen with warning
              navigation.replace('PaymentResult', {
                success: true,
                orderId: null,
                transactionId,
                amount: totalAmount,
                paymentMethod: selectedPaymentMethod?.name,
                reference: paymentReference,
                warning: 'Order creation issue - contact support',
              });
            },
          },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Render payment method option
  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedPaymentMethodId === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.paymentMethod, isSelected && styles.selectedPaymentMethod]}
        onPress={() => setSelectedPaymentMethodId(method.id)}
        activeOpacity={0.7}
      >
        <View style={styles.paymentMethodContent}>
          <View style={styles.paymentMethodLeft}>
            <View style={[styles.paymentMethodIcon, isSelected && styles.selectedIcon]}>
              <Ionicons
                name={method.icon as any}
                size={24}
                color={isSelected ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodName, isSelected && styles.selectedText]}>
                {method.name}
              </Text>
              <Text style={[styles.paymentMethodDescription, isSelected && styles.selectedSubText]}>
                {method.description}
              </Text>
              {method.ghana_preferred && (
                <View style={styles.ghanaTag}>
                  <Text style={styles.ghanaTagText}>🇬🇭 Preferred in Ghana</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.paymentMethodRight}>
            {method.processing_fee_percentage > 0 && (
              <Text style={styles.processingFeeText}>
                +{method.processing_fee_percentage}% fee
              </Text>
            )}
            <View style={[styles.radio, isSelected && styles.selectedRadio]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render form input
  const renderFormInput = (
    field: keyof ShippingAddress,
    label: string,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: 'default' | 'phone-pad' | 'email-address';
      numberOfLines?: number;
    }
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[
          styles.formInput,
          options?.multiline && styles.multilineInput,
          formErrors[field] && styles.inputError,
        ]}
        value={shippingForm[field]}
        onChangeText={(text) => updateFormField(field, text)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        multiline={options?.multiline}
        numberOfLines={options?.numberOfLines}
        keyboardType={options?.keyboardType}
      />
      {formErrors[field] && (
        <Text style={styles.errorText}>{formErrors[field]}</Text>
      )}
    </View>
  );


  // Handle WebBrowser payment with automatic detection
  const handleWebBrowserPayment = async (url: string, paymentReference: string) => {
    try {
      console.log('Opening WebBrowser for payment');
      console.log('Using payment reference:', paymentReference);
      
      // Start payment monitoring with the correct reference
      const paymentMonitor = startPaymentMonitoring(paymentReference);
      
      // Configure WebBrowser
      WebBrowser.maybeCompleteAuthSession();
      
      const result = await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        showTitle: true,
        toolbarColor: COLORS.primary,
        controlsColor: COLORS.white,
        enableBarCollapsing: false,
      });
      
      console.log('WebBrowser result:', result);
      console.log('Browser closed, checking final payment status...');
      
      // Stop monitoring and check final status
      clearInterval(paymentMonitor);
      
      // Payment monitoring already handled order creation and navigation
      console.log('Payment monitoring completed, browser closed');
      
    } catch (error) {
      console.error('WebBrowser payment error:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to open payment browser. Please try again.');
    }
  };

  // Start monitoring payment status while browser is open
  const startPaymentMonitoring = (reference: string) => {
    let checkCount = 0;
    const maxChecks = 60; // Check for 5 minutes (every 5 seconds)
    
    console.log('Starting payment monitoring for:', reference);
    
    const monitor = setInterval(async () => {
      checkCount++;
      console.log(`Payment check ${checkCount}/${maxChecks} for ${reference}`);
      
      try {
        const verification = await PaymentService.verifyPayment(reference);
        
        if (verification.success && verification.status === 'success') {
          console.log('🎉 Payment detected as successful! Auto-completing...');
          clearInterval(monitor);
          
          // Create order and close browser
          await createOrderAfterPayment(reference, verification.transaction_id);
          WebBrowser.dismissBrowser();
          return;
        }
        
        if (checkCount >= maxChecks) {
          console.log('Payment monitoring timeout reached');
          clearInterval(monitor);
        }
        
      } catch (error) {
        console.log('Payment check error (normal during processing):', error instanceof Error ? error.message : String(error));
      }
    }, 5000); // Check every 5 seconds
    
    return monitor;
  };

  // Debug logging
  console.log('CheckoutScreen rendering, currentPaymentReference:', currentPaymentReference);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Test Mode Banner */}
      {PaymentService.getTestMode() && (
        <View style={styles.testModeBanner}>
          <Ionicons name="flask" size={16} color={COLORS.warning} />
          <Text style={styles.testModeText}>
            TEST MODE - No real charges. Payments require confirmation.
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Shipping Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Information</Text>
          
          {renderFormInput('full_name', 'Full Name *', 'Enter your full name')}
          
          {renderFormInput('phone', 'Phone Number (Optional)', '0XX XXX XXXX', {
            keyboardType: 'phone-pad',
          })}
          
          {renderFormInput('address', 'Delivery Address *', 'House number, street, area', {
            multiline: true,
            numberOfLines: 3,
          })}
          
          <View style={styles.formRow}>
            <View style={styles.halfWidth}>
              {renderFormInput('city', 'City *', 'City')}
            </View>
            <View style={styles.halfWidth}>
              {renderFormInput('region', 'Region *', 'Region')}
            </View>
          </View>
          
          {renderFormInput('postal_code', 'Postal Code', 'Optional')}
          
          {renderFormInput('additional_notes', 'Delivery Notes', 'Special instructions (optional)', {
            multiline: true,
            numberOfLines: 2,
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({items.length})</Text>
              <Text style={styles.summaryValue}>GH₵{summary?.subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>GH₵{summary?.tax.toFixed(2)}</Text>
            </View>
            
            {processingFee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Processing Fee</Text>
                <Text style={styles.summaryValue}>GH₵{processingFee.toFixed(2)}</Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>GH₵{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            {paymentMethods.map(renderPaymentMethod)}
          </View>
        </View>

        {/* Bottom spacing for footer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.footer}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.payButton}
        >
          <TouchableOpacity
            onPress={processPayment}
            disabled={isProcessing}
            style={styles.payButtonContent}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator color={COLORS.white} size="small" />
                <Text style={styles.payButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="card-outline" size={20} color={COLORS.white} />
                <Text style={styles.payButtonText}>
                  Pay GH₵{totalAmount.toFixed(2)}
                </Text>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  formInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfWidth: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
    paddingTop: SPACING.md,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentMethods: {
    gap: SPACING.sm,
  },
  paymentMethod: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  selectedPaymentMethod: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  selectedIcon: {
    backgroundColor: COLORS.primary + '20',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ghanaTag: {
    alignSelf: 'flex-start',
  },
  ghanaTagText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  selectedText: {
    color: COLORS.primary,
  },
  selectedSubText: {
    color: COLORS.primaryLight,
  },
  paymentMethodRight: {
    alignItems: 'flex-end',
  },
  processingFeeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  bottomSpacer: {
    height: 120, // Space for footer
  },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  payButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  testModeBanner: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warning + '40',
  },
  testModeText: {
    fontSize: 14,
    color: COLORS.warning,
    fontWeight: '500',
    flex: 1,
  },
});

export default CheckoutScreen;
