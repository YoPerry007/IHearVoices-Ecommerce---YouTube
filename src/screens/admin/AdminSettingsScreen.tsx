import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Animated,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationService, NotificationSettings } from '../../services/notificationService';
import { DataManagementService } from '../../services/dataManagementService';
import TermsOfServiceScreen from './TermsOfServiceScreen';

interface AdminSettingsScreenProps {
  onNavigateBack: () => void;
}

const AdminSettingsScreen: React.FC<AdminSettingsScreenProps> = ({
  onNavigateBack,
}) => {
  const { profile, signOut } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    emailAlerts: true,
    lowStockAlerts: true,
    orderNotifications: true,
    newUserAlerts: true,
    systemAlerts: true,
  });
  const [showTerms, setShowTerms] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadNotificationSettings();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const settings = await NotificationService.getSettings();
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
    try {
      const newSettings = { ...notificationSettings, [key]: value };
      setNotificationSettings(newSettings);
      await NotificationService.updateSettings({ [key]: value });
      
      // Send test notification if enabling
      if (value && key === 'pushNotifications') {
        await NotificationService.sendTestNotification();
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your admin account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleBackupData = () => {
    Alert.alert(
      'Backup Data',
      'This will create a backup of all store data including products, orders, and users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Backup',
          onPress: async () => {
            try {
              const backupUri = await DataManagementService.createBackup();
              Alert.alert(
                'Backup Complete',
                'Data backup created successfully. Would you like to share it?',
                [
                  { text: 'Not Now', style: 'cancel' },
                  {
                    text: 'Share',
                    onPress: () => DataManagementService.shareBackup(backupUri),
                  },
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to create backup. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and may improve app performance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          onPress: async () => {
            try {
              await DataManagementService.clearCache();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleResetAnalytics = () => {
    Alert.alert(
      'Reset Analytics',
      'This will reset all analytics data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataManagementService.resetAnalytics();
            } catch (error) {
              Alert.alert('Error', 'Failed to reset analytics. Please try again.');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightComponent, 
    danger = false 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[
          styles.settingIcon,
          { backgroundColor: danger ? COLORS.error + '20' : COLORS.primary + '20' }
        ]}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={danger ? COLORS.error : COLORS.primary} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[
            styles.settingTitle,
            { color: danger ? COLORS.error : COLORS.textPrimary }
          ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightComponent || (
        onPress && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={COLORS.textMuted} 
          />
        )
      )}
    </TouchableOpacity>
  );

  if (showTerms) {
    return (
      <TermsOfServiceScreen
        onNavigateBack={() => setShowTerms(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <Animated.ScrollView 
        style={[styles.content, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Admin Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {(profile?.full_name || profile?.email || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.full_name || 'Admin User'}
              </Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>Administrator</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Receive notifications for important events"
            rightComponent={
              <Switch
                value={notificationSettings.pushNotifications}
                onValueChange={(value) => updateNotificationSetting('pushNotifications', value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
                thumbColor={notificationSettings.pushNotifications ? COLORS.primary : COLORS.textMuted}
              />
            }
          />

          <SettingItem
            icon="mail-outline"
            title="Email Alerts"
            subtitle="Get email notifications for critical events"
            rightComponent={
              <Switch
                value={notificationSettings.emailAlerts}
                onValueChange={(value) => updateNotificationSetting('emailAlerts', value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
                thumbColor={notificationSettings.emailAlerts ? COLORS.primary : COLORS.textMuted}
              />
            }
          />

          <SettingItem
            icon="warning-outline"
            title="Low Stock Alerts"
            subtitle="Notify when products are running low"
            rightComponent={
              <Switch
                value={notificationSettings.lowStockAlerts}
                onValueChange={(value) => updateNotificationSetting('lowStockAlerts', value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
                thumbColor={notificationSettings.lowStockAlerts ? COLORS.primary : COLORS.textMuted}
              />
            }
          />

          <SettingItem
            icon="bag-outline"
            title="Order Notifications"
            subtitle="Get notified about new orders"
            rightComponent={
              <Switch
                value={notificationSettings.orderNotifications}
                onValueChange={(value) => updateNotificationSetting('orderNotifications', value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
                thumbColor={notificationSettings.orderNotifications ? COLORS.primary : COLORS.textMuted}
              />
            }
          />

          <SettingItem
            icon="person-add-outline"
            title="New User Alerts"
            subtitle="Get notified when new users register"
            rightComponent={
              <Switch
                value={notificationSettings.newUserAlerts}
                onValueChange={(value) => updateNotificationSetting('newUserAlerts', value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
                thumbColor={notificationSettings.newUserAlerts ? COLORS.primary : COLORS.textMuted}
              />
            }
          />

          <SettingItem
            icon="alert-circle-outline"
            title="System Alerts"
            subtitle="Important system notifications"
            rightComponent={
              <Switch
                value={notificationSettings.systemAlerts}
                onValueChange={(value) => updateNotificationSetting('systemAlerts', value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
                thumbColor={notificationSettings.systemAlerts ? COLORS.primary : COLORS.textMuted}
              />
            }
          />
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <SettingItem
            icon="cloud-download-outline"
            title="Backup Data"
            subtitle="Create a backup of all store data"
            onPress={handleBackupData}
          />

          <SettingItem
            icon="refresh-outline"
            title="Clear Cache"
            subtitle="Clear cached data to improve performance"
            onPress={handleClearCache}
          />

          <SettingItem
            icon="analytics-outline"
            title="Reset Analytics"
            subtitle="Reset all analytics and reporting data"
            onPress={handleResetAnalytics}
            danger
          />
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <SettingItem
            icon="information-circle-outline"
            title="App Version"
            subtitle="1.0.0 (Build 1)"
          />

          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with admin features"
            onPress={() => Alert.alert('Help', 'Contact support at perrycodesy@gmail.com')}
          />

          <SettingItem
            icon="document-text-outline"
            title="Terms of Service"
            subtitle="View admin terms and conditions"
            onPress={() => setShowTerms(true)}
          />
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <SettingItem
            icon="log-out-outline"
            title="Sign Out"
            subtitle="Sign out of your admin account"
            onPress={handleSignOut}
            danger
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            IHearVoices Admin Panel v1.0.0
          </Text>
          <Text style={styles.footerSubtext}>
            © 2025 IHearVoices. All rights reserved.
          </Text>
        </View>
      </Animated.ScrollView>
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
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  profileAvatarText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  profileEmail: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  roleBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.error,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs / 2,
  },
  settingSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  footerSubtext: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
  },
});

export default AdminSettingsScreen;
