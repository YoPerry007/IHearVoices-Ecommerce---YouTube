import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import MarketplaceService from '../services/marketplaceService';

interface Props { onNavigateBack: () => void; }

const SellerOnboardingScreen: React.FC<Props> = ({ onNavigateBack }) => {
  const { user, refreshAccount } = useAuth();
  const [form, setForm] = useState({ name: '', description: '', contactEmail: user?.email || '', phone: '', location: '', logoUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || form.name.trim().length < 2 || !form.contactEmail.includes('@')) {
      Alert.alert('Missing details', 'Enter a store name and valid contact email.');
      return;
    }
    try {
      setSubmitting(true);
      await MarketplaceService.applyForStore(user.id, form);
      await refreshAccount();
      Alert.alert('Application submitted', 'Your seller dashboard is ready. Products can be added after platform approval.');
    } catch (error: any) {
      Alert.alert('Could not submit', error?.message || 'Please try again.');
    } finally { setSubmitting(false); }
  };

  const field = (key: keyof typeof form, label: string, placeholder: string, multiline = false) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={form[key]}
        onChangeText={(value) => setForm(current => ({ ...current, [key]: value }))}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        autoCapitalize={key === 'contactEmail' || key === 'logoUrl' ? 'none' : 'sentences'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Become a Seller</Text><View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Ionicons name="storefront-outline" size={38} color={COLORS.primary} />
          <Text style={styles.heroTitle}>Open your marketplace store</Text>
          <Text style={styles.subtitle}>You will manage the store yourself. Applications must be approved before products become available.</Text>
        </View>
        {field('name', 'Store name *', 'Example: Perry Fashion')}
        {field('description', 'Description', 'What do you sell?', true)}
        {field('contactEmail', 'Contact email *', 'store@example.com')}
        {field('phone', 'Phone', '+233...')}
        {field('location', 'Location', 'Accra, Ghana')}
        {field('logoUrl', 'Logo URL', 'https://...')}
        <TouchableOpacity style={styles.submit} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>Submit Seller Application</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700' },
  content: { padding: SPACING.lg, paddingBottom: 48 },
  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  heroTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '700', marginTop: SPACING.sm },
  subtitle: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: SPACING.sm },
  field: { marginBottom: SPACING.md },
  label: { color: COLORS.textPrimary, fontWeight: '600', marginBottom: 7 },
  input: { backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  submit: { backgroundColor: COLORS.primary, minHeight: 52, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md },
  submitText: { color: COLORS.white, fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.base },
});

export default SellerOnboardingScreen;
