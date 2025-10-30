import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface TermsOfServiceScreenProps {
  onNavigateBack: () => void;
}

const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({
  onNavigateBack,
}) => {
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.title}>IHearVoices Administrator Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last Updated: January 1, 2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. ACCEPTANCE OF TERMS</Text>
          <Text style={styles.paragraph}>
            By accessing and using the IHearVoices Administrator Panel ("Admin Panel"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). These Terms constitute a legally binding agreement between you and IHearVoices Ghana Limited ("Company", "we", "us", or "our").
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. ADMINISTRATOR RESPONSIBILITIES</Text>
          <Text style={styles.paragraph}>
            As an administrator, you agree to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Maintain the confidentiality of all customer and business data</Text>
            <Text style={styles.bulletPoint}>• Use the Admin Panel solely for legitimate business purposes</Text>
            <Text style={styles.bulletPoint}>• Comply with all applicable laws and regulations in Ghana</Text>
            <Text style={styles.bulletPoint}>• Protect your login credentials and not share them with unauthorized persons</Text>
            <Text style={styles.bulletPoint}>• Report any security breaches or suspicious activities immediately</Text>
            <Text style={styles.bulletPoint}>• Ensure accurate and timely processing of orders and customer inquiries</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. DATA PROTECTION AND PRIVACY</Text>
          <Text style={styles.paragraph}>
            You acknowledge that you will have access to sensitive customer information including personal data, payment information, and purchase history. You agree to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Comply with Ghana's Data Protection Act, 2012 (Act 843)</Text>
            <Text style={styles.bulletPoint}>• Process personal data only as necessary for business operations</Text>
            <Text style={styles.bulletPoint}>• Implement appropriate security measures to protect customer data</Text>
            <Text style={styles.bulletPoint}>• Not use customer data for personal gain or unauthorized purposes</Text>
            <Text style={styles.bulletPoint}>• Report data breaches within 24 hours of discovery</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. PROHIBITED ACTIVITIES</Text>
          <Text style={styles.paragraph}>
            You are strictly prohibited from:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Accessing or attempting to access unauthorized areas of the system</Text>
            <Text style={styles.bulletPoint}>• Modifying, copying, or distributing proprietary software or content</Text>
            <Text style={styles.bulletPoint}>• Using the Admin Panel for fraudulent or illegal activities</Text>
            <Text style={styles.bulletPoint}>• Interfering with the security or integrity of the system</Text>
            <Text style={styles.bulletPoint}>• Sharing login credentials with third parties</Text>
            <Text style={styles.bulletPoint}>• Using automated tools to access or manipulate the system</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. FINANCIAL RESPONSIBILITIES</Text>
          <Text style={styles.paragraph}>
            As an administrator handling financial transactions, you agree to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Process payments accurately and in compliance with Ghana's banking regulations</Text>
            <Text style={styles.bulletPoint}>• Maintain accurate financial records and reporting</Text>
            <Text style={styles.bulletPoint}>• Handle refunds and disputes in accordance with company policies</Text>
            <Text style={styles.bulletPoint}>• Report any financial discrepancies immediately</Text>
            <Text style={styles.bulletPoint}>• Comply with tax obligations and reporting requirements</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. INTELLECTUAL PROPERTY</Text>
          <Text style={styles.paragraph}>
            All content, software, trademarks, and intellectual property within the Admin Panel are owned by IHearVoices Ghana Limited. You are granted a limited, non-transferable license to use the Admin Panel solely for authorized business purposes. You may not reproduce, distribute, or create derivative works without express written permission.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. SYSTEM AVAILABILITY AND MAINTENANCE</Text>
          <Text style={styles.paragraph}>
            While we strive to maintain 99.9% uptime, we reserve the right to perform maintenance, updates, and improvements that may temporarily affect system availability. We will provide reasonable notice for planned maintenance whenever possible.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. LIMITATION OF LIABILITY</Text>
          <Text style={styles.paragraph}>
            IHearVoices Ghana Limited shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Admin Panel. Our total liability shall not exceed the amount of compensation paid to you in the preceding 12 months.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. TERMINATION</Text>
          <Text style={styles.paragraph}>
            We reserve the right to terminate your access to the Admin Panel immediately if you violate these Terms or engage in any prohibited activities. Upon termination, you must immediately cease all use of the system and return any confidential information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. GOVERNING LAW</Text>
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of the Republic of Ghana. Any disputes arising from these Terms shall be resolved in the courts of Ghana, and you consent to the jurisdiction of such courts.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. AMENDMENTS</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms at any time. You will be notified of significant changes, and continued use of the Admin Panel constitutes acceptance of the modified Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. CONTACT INFORMATION</Text>
          <Text style={styles.paragraph}>
            For questions about these Terms or the Admin Panel, contact us at:
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactItem}>Email: perrycodesy@gmail.com</Text>
            <Text style={styles.contactItem}>Phone: +233 XX XXX XXXX</Text>
            <Text style={styles.contactItem}>Address: Accra, Ghana</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. ACKNOWLEDGMENT</Text>
          <Text style={styles.paragraph}>
            By using the IHearVoices Administrator Panel, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. You also acknowledge that you have the authority to enter into this agreement on behalf of your organization, if applicable.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 IHearVoices Ghana Limited. All rights reserved.
          </Text>
          <Text style={styles.footerSubtext}>
            This document is legally binding and enforceable under Ghanaian law.
          </Text>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  lastUpdated: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: 24,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'justify',
  },
  bulletList: {
    marginLeft: SPACING.md,
    marginBottom: SPACING.md,
  },
  bulletPoint: {
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: 22,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'justify',
  },
  contactInfo: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  contactItem: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  footerSubtext: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default TermsOfServiceScreen;
