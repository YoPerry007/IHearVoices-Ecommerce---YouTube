import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const ResetPasswordScreen: React.FC = () => {
  const { updatePassword, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      Alert.alert('Use a stronger password', 'Use at least 8 characters with uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirmation) {
      Alert.alert('Passwords do not match', 'Enter the same password twice.');
      return;
    }

    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);
    if (error) Alert.alert('Could not update password', error.message);
    else Alert.alert('Password updated', 'Your new password is active.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.icon}><Ionicons name="key-outline" size={42} color={COLORS.primary} /></View>
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.copy}>This recovery session is temporary. Set your password to continue.</Text>
        <TextInput style={styles.input} placeholder="New password" placeholderTextColor={COLORS.textMuted} secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Confirm new password" placeholderTextColor={COLORS.textMuted} secureTextEntry value={confirmation} onChangeText={setConfirmation} autoCapitalize="none" />
        <TouchableOpacity style={styles.primary} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Update Password</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={cancelPasswordRecovery} disabled={saving}><Text style={styles.cancelText}>Cancel and sign out</Text></TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background}, center:{flex:1,justifyContent:'center',padding:SPACING.xl}, icon:{alignSelf:'center',backgroundColor:COLORS.surface,padding:18,borderRadius:40,marginBottom:SPACING.lg}, title:{fontSize:TYPOGRAPHY.fontSize['2xl'],fontWeight:TYPOGRAPHY.fontWeight.bold,color:COLORS.textPrimary,textAlign:'center'}, copy:{color:COLORS.textSecondary,textAlign:'center',lineHeight:21,marginVertical:SPACING.md}, input:{backgroundColor:COLORS.surface,color:COLORS.textPrimary,borderWidth:1,borderColor:COLORS.surfaceLight,borderRadius:BORDER_RADIUS.lg,padding:14,marginTop:SPACING.md}, primary:{backgroundColor:COLORS.primary,borderRadius:BORDER_RADIUS.lg,padding:15,alignItems:'center',marginTop:SPACING.lg}, primaryText:{color:COLORS.white,fontWeight:TYPOGRAPHY.fontWeight.bold}, cancel:{alignItems:'center',padding:15}, cancelText:{color:COLORS.textMuted},
});

export default ResetPasswordScreen;
