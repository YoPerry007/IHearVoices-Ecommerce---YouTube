import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface TermsOfServiceScreenProps {
  onNavigateBack: () => void;
}

const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({
  onNavigateBack,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const sections = [
    {
      title: 'Acceptance of Terms',
      content: [
        'By accessing and using the IHearVoices mobile application, you accept and agree to be bound by these Terms of Service.',
        'If you do not agree to these terms, please do not use our app or services.',
        'We reserve the right to update these terms at any time, and your continued use constitutes acceptance of any changes.',
      ],
    },
    {
      title: 'Description of Service',
      content: [
        'IHearVoices is an e-commerce platform that allows users to browse, purchase, and manage orders for various products.',
        'We provide voice-activated features, order history, account management, and secure payment processing.',
        'Our services are available to users in Ghana and other supported regions.',
      ],
    },
    {
      title: 'User Accounts',
      content: [
        'You must create an account to use certain features of our app.',
        'You are responsible for maintaining the confidentiality of your account credentials.',
        'You agree to provide accurate, current, and complete information when creating your account.',
        'You must notify us immediately of any unauthorized use of your account.',
      ],
    },
    {
      title: 'Orders and Payments',
      content: [
        'All orders are subject to availability and acceptance by us.',
        'Prices are displayed in Ghana Cedis (GHS) and are subject to change without notice.',
        'Payment must be completed before order processing begins.',
        'We accept various payment methods including cards, mobile money, and bank transfers through Paystack.',
      ],
    },
    {
      title: 'Shipping and Delivery',
      content: [
        'Delivery times are estimates and may vary based on location and product availability.',
        'Risk of loss and title for products pass to you upon delivery.',
        'You are responsible for providing accurate delivery information.',
        'Additional charges may apply for remote or special delivery locations.',
      ],
    },
    {
      title: 'Returns and Refunds',
      content: [
        'Returns are accepted within 30 days of delivery for eligible products.',
        'Items must be in original condition with all packaging and accessories.',
        'Refunds will be processed to the original payment method within 5-10 business days.',
        'Shipping costs are non-refundable unless the return is due to our error.',
      ],
    },
    {
      title: 'User Conduct',
      content: [
        'You agree to use our app in accordance with all applicable laws and regulations.',
        'You will not engage in any activity that could harm, disable, or impair our services.',
        'You will not attempt to gain unauthorized access to our systems or other users\' accounts.',
        'You will not use our app for any fraudulent or illegal purposes.',
      ],
    },
    {
      title: 'Intellectual Property',
      content: [
        'All content, trademarks, and intellectual property on our app are owned by IHearVoices or our licensors.',
        'You may not reproduce, distribute, or create derivative works without our written consent.',
        'User-generated content remains your property, but you grant us a license to use it in connection with our services.',
      ],
    },
    {
      title: 'Privacy and Data Protection',
      content: [
        'Your privacy is important to us. Please review our Privacy Policy for details on data collection and use.',
        'We implement industry-standard security measures to protect your personal information.',
        'You consent to the collection and use of your data as described in our Privacy Policy.',
      ],
    },
    {
      title: 'Limitation of Liability',
      content: [
        'Our liability is limited to the maximum extent permitted by applicable law.',
        'We are not liable for indirect, incidental, special, or consequential damages.',
        'Our total liability will not exceed the amount you paid for the specific product or service.',
        'Some jurisdictions do not allow liability limitations, so these may not apply to you.',
      ],
    },
    {
      title: 'Indemnification',
      content: [
        'You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of our app.',
        'This includes costs related to your violation of these terms or infringement of third-party rights.',
        'We reserve the right to assume exclusive defense of any matter subject to indemnification.',
      ],
    },
    {
      title: 'Termination',
      content: [
        'We may terminate or suspend your account at any time for violation of these terms.',
        'You may terminate your account by contacting us or using the account deletion feature.',
        'Upon termination, your right to use our app ceases immediately.',
        'Provisions that should survive termination will remain in effect.',
      ],
    },
    {
      title: 'Governing Law',
      content: [
        'These terms are governed by the laws of Ghana.',
        'Any disputes will be resolved in the courts of Ghana.',
        'If any provision is found unenforceable, the remaining provisions will remain in effect.',
      ],
    },
    {
      title: 'Contact Information',
      content: [
        'For questions about these Terms of Service, please contact us:',
        'Email: perrycodesy@gmail.com',
        'We will respond to your inquiries within 48 hours.',
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Introduction */}
          <View style={styles.introSection}>
            <Text style={styles.introTitle}>Terms of Service</Text>
            <Text style={styles.introText}>
              Please read these Terms of Service carefully before using the IHearVoices app. 
              These terms constitute a legal agreement between you and IHearVoices.
            </Text>
            <View style={styles.lastUpdated}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.lastUpdatedText}>Last Updated: October 29, 2024</Text>
            </View>
          </View>

          {/* Terms Sections */}
          {sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Text style={styles.sectionNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.sectionContent}>
                {section.content.map((paragraph, paragraphIndex) => (
                  <View key={paragraphIndex} style={styles.paragraphContainer}>
                    <View style={styles.bullet} />
                    <Text style={styles.paragraph}>{paragraph}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Acceptance Section */}
          <View style={styles.acceptanceSection}>
            <View style={styles.acceptanceIcon}>
              <Ionicons name="document-text" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.acceptanceTitle}>Agreement</Text>
            <Text style={styles.acceptanceText}>
              By using IHearVoices, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </Text>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
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
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
  },
  introSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    ...SHADOWS.sm,
  },
  introTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  introText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  lastUpdatedText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumber: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  sectionContent: {
    gap: SPACING.sm,
  },
  paragraphContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
    marginTop: 8,
  },
  paragraph: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  acceptanceSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginVertical: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  acceptanceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  acceptanceTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  acceptanceText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
});

export default TermsOfServiceScreen;
