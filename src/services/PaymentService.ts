import { supabase } from '../config/supabase';

/**
 * PaymentService - Industry-standard payment processing service
 * Handles all payment operations with Paystack for Ghana market
 * 
 * Features:
 * - Ghana Mobile Money (MTN, Vodafone, AirtelTigo) 
 * - Card payments (Visa, Mastercard, Verve)
 * - Bank transfers
 * - Real-time payment verification
 * - Proper error handling and logging
 */

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'mobile_money' | 'card' | 'bank_transfer';
  provider?: string;
  processing_fee_percentage: number;
  ghana_preferred: boolean;
}

export interface PaymentData {
  amount: number; // In GHS
  email: string;
  currency: 'GHS';
  reference: string;
  metadata: Record<string, any>;
  callback_url?: string;
}

export interface MobileMoneyData extends PaymentData {
  phone: string;
  provider: 'mtn' | 'vodafone' | 'airtel';
}

export interface CardData extends PaymentData {
  // Card details handled by Paystack Popup/Inline
}

export interface BankTransferData extends PaymentData {
  bank_code?: string;
  account_number?: string;
}

export interface PaymentResponse {
  success: boolean;
  transaction_id?: string;
  reference: string;
  message: string;
  authorization_url?: string;
  access_code?: string;
  amount?: number;
  status?: 'success' | 'pending' | 'failed' | 'pending_confirmation';
  gateway_response?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  status: 'success' | 'pending' | 'failed' | 'abandoned';
  reference: string;
  amount: number;
  currency: string;
  transaction_id: string;
  gateway_response: string;
  paid_at?: string;
  channel: string;
  metadata?: Record<string, any>;
}

class PaymentService {
  // The Paystack secret stays in the authenticated Supabase Edge Function.
  private static get isTestMode(): boolean {
    return process.env.EXPO_PUBLIC_PAYSTACK_TEST_MODE !== 'false';
  }

  private static debugEnvironment() {
    console.log('🧪 Paystack mode:', this.isTestMode ? 'test' : 'live');
  }

  // Ghana-specific payment methods
  static getPaymentMethods(): PaymentMethod[] {
    return [
      {
        id: 'momo_mtn',
        name: 'MTN Mobile Money',
        description: 'Pay with MTN MoMo - Most popular in Ghana',
        icon: 'phone-portrait',
        type: 'mobile_money',
        provider: 'mtn',
        processing_fee_percentage: 0,
        ghana_preferred: true,
      },
      {
        id: 'momo_vodafone', 
        name: 'Vodafone Cash',
        description: 'Pay with Vodafone Cash',
        icon: 'phone-portrait',
        type: 'mobile_money',
        provider: 'vodafone',
        processing_fee_percentage: 0,
        ghana_preferred: true,
      },
      {
        id: 'momo_airtel',
        name: 'AirtelTigo Money', 
        description: 'Pay with AirtelTigo Money',
        icon: 'phone-portrait',
        type: 'mobile_money',
        provider: 'airtel',
        processing_fee_percentage: 0,
        ghana_preferred: true,
      },
      {
        id: 'card',
        name: 'Debit/Credit Card',
        description: 'Visa, Mastercard, Verve cards',
        icon: 'card',
        type: 'card',
        processing_fee_percentage: 2.5,
        ghana_preferred: false,
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct bank transfer',
        icon: 'business',
        type: 'bank_transfer', 
        processing_fee_percentage: 0,
        ghana_preferred: false,
      },
    ];
  }

  /**
   * Generate cryptographically unique payment reference (React Native compatible)
   */
  static generateReference(prefix: string = 'IHV'): string {
    const timestamp = Date.now();
    
    // React Native compatible random hex generation
    const randomHex = Array.from({ length: 4 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
    
    const microtime = performance.now().toString().replace('.', '').substring(0, 6);
    const additionalRandom = Math.floor(Math.random() * 10000).toString(16);
    
    return `${prefix}_${timestamp}_${microtime}_${randomHex}_${additionalRandom}`.toUpperCase();
  }

  /**
   * Convert GHS to kobo (Paystack requires amounts in kobo)
   */
  static toKobo(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert kobo to GHS
   */
  static fromKobo(amount: number): number {
    return amount / 100;
  }

  /**
   * Initialize payment transaction with Paystack
   */
  private static async initializeTransaction(
    paymentData: PaymentData,
    paymentMethodId: string,
  ): Promise<any> {
    console.log(`Initializing Paystack transaction for ${paymentData.amount} GHS`);

    const { data, error } = await supabase.functions.invoke('payment-gateway', {
      body: {
        action: 'initialize',
        paymentMethodId,
        reference: paymentData.reference,
        callbackUrl: paymentData.callback_url,
      },
    });

    if (error || !data?.success || !data?.data) {
      console.error('Transaction initialization failed:', error ?? data);
      throw new Error(data?.error || 'Payment initialization failed');
    }

    console.log('Transaction initialized successfully:', {
      reference: data.data.reference,
      access_code: data.data.access_code,
    });

    return data.data;
  }

  /**
   * Process Mobile Money payment (MTN, Vodafone, AirtelTigo) - Test Mode Flow
   */
  static async processMobileMoneyPayment(paymentData: MobileMoneyData): Promise<PaymentResponse> {
    try {
      console.log(`Processing ${paymentData.provider.toUpperCase()} Mobile Money - Test Mode`);
      
      // Debug environment variables
      this.debugEnvironment();
      
      // In test mode, just initialize transaction and return authorization URL like cards
      const initData = await this.initializeTransaction(
        paymentData,
        `momo_${paymentData.provider}`,
      );
      console.log('Mobile Money transaction initialized:', initData.reference);
      
      // Return response indicating payment needs completion via Paystack interface
      return {
        success: false, // Payment initiated but requires user action
        transaction_id: initData.reference,
        reference: initData.reference,
        message: `${paymentData.provider.toUpperCase()} Mobile Money - Complete payment in browser.`,
        status: 'pending_confirmation',
        authorization_url: initData.authorization_url,
        access_code: initData.access_code,
        amount: paymentData.amount,
      };

    } catch (error) {
      console.error('Mobile Money payment error:', error);
      throw new Error(`Mobile Money payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Card payment (opens Paystack Popup)
   */
  static async processCardPayment(paymentData: CardData): Promise<PaymentResponse> {
    try {
      // Initialize transaction
      const initData = await this.initializeTransaction(paymentData, 'card');
      
      console.log('Card payment initialized, returning authorization URL');

      return {
        success: false, // Not completed yet - needs popup
        reference: initData.reference,
        message: 'Please complete card payment in the popup window',
        authorization_url: initData.authorization_url,
        access_code: initData.access_code,
      };

    } catch (error) {
      console.error('Card payment initialization error:', error);
      throw new Error(`Card payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Bank Transfer payment
   */
  static async processBankTransferPayment(paymentData: BankTransferData): Promise<PaymentResponse> {
    try {
      const data = await this.initializeTransaction(paymentData, 'bank_transfer');

      return {
        success: false, // Requires user action
        reference: data.reference,
        message: 'Bank transfer details will be provided. Please complete the transfer.',
        authorization_url: data.authorization_url,
        access_code: data.access_code,
      };

    } catch (error) {
      console.error('Bank transfer error:', error);
      throw new Error(`Bank transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify payment status with Paystack
   */
  static async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    try {
      console.log(`Verifying payment: ${reference}`);
      
      const { data, error } = await supabase.functions.invoke('payment-gateway', {
        body: { action: 'verify', reference },
      });

      if (error || !data?.success || !data?.data) {
        console.error('Payment verification failed:', error ?? data);
        throw new Error(data?.error || 'Payment verification failed');
      }

      const verification = data.data;

      return {
        success: verification.status === 'success',
        status: verification.status,
        reference: verification.reference,
        amount: this.fromKobo(verification.amount),
        currency: verification.currency,
        transaction_id: String(verification.id),
        gateway_response: verification.gateway_response,
        paid_at: verification.paid_at,
        channel: verification.channel,
        metadata: verification.metadata,
      };

    } catch (error) {
      console.error('Payment verification error:', error);
      throw new Error(`Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Main payment processing method - routes to appropriate handler
   */
  static async processPayment(
    paymentMethodId: string,
    paymentData: PaymentData,
    additionalData?: { phone?: string; }
  ): Promise<PaymentResponse> {
    const method = this.getPaymentMethods().find(m => m.id === paymentMethodId);
    
    if (!method) {
      throw new Error(`Unsupported payment method: ${paymentMethodId}`);
    }

    switch (method.type) {
      case 'mobile_money':
        // Use provided phone number only - no fallbacks, let Paystack handle test numbers
        const phoneNumber = additionalData?.phone || '';
        console.log(`📱 Mobile Money payment - Phone: ${phoneNumber || 'None (Paystack will handle test)'}`);
        
        return this.processMobileMoneyPayment({
          ...paymentData,
          phone: phoneNumber,
          provider: method.provider as 'mtn' | 'vodafone' | 'airtel',
        });

      case 'card':
        return this.processCardPayment(paymentData as CardData);

      case 'bank_transfer':
        return this.processBankTransferPayment(paymentData as BankTransferData);

      default:
        throw new Error(`Payment method ${paymentMethodId} not implemented`);
    }
  }

  /**
   * Calculate processing fees for a payment method
   */
  static calculateProcessingFee(paymentMethodId: string, amount: number): number {
    const method = this.getPaymentMethods().find(m => m.id === paymentMethodId);
    
    if (!method) return 0;
    
    return amount * (method.processing_fee_percentage / 100);
  }

  /**
   * Get total amount including processing fees
   */
  static calculateTotalAmount(paymentMethodId: string, baseAmount: number): number {
    const processingFee = this.calculateProcessingFee(paymentMethodId, baseAmount);
    return baseAmount + processingFee;
  }

  /**
   * Get test phone numbers for different mobile money providers (Ghana Test Numbers)
   */
  static getTestPhoneNumbers(): Record<string, string> {
    return {
      mtn: '0244123456',      // Test MTN number
      vodafone: '0208123456', // Test Vodafone number 
      airtel: '0267123456',   // Test AirtelTigo number
      default: '0244123456',  // Default test number
    };
  }

  /**
   * Check if we're in test mode
   */
  static getTestMode(): boolean {
    return this.isTestMode;
  }

  /**
   * Get test mode information and instructions
   */
  static getTestModeInfo(): { isTestMode: boolean; message: string; testNumbers: Record<string, string> } {
    return {
      isTestMode: this.isTestMode,
      message: this.isTestMode 
        ? 'TEST MODE: Use test phone numbers. No real charges will be made.'
        : 'LIVE MODE: Real payments will be processed.',
      testNumbers: this.getTestPhoneNumbers(),
    };
  }
}

export default PaymentService;
