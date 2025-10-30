import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import OrderService from '../services/OrderService';

interface UserProfileScreenProps {
  onNavigateBack: () => void;
  onNavigateToOrderHistory?: () => void;
  onNavigateToOrderDetails?: (orderId: string) => void;
  onNavigateToPrivacyPolicy?: () => void;
  onNavigateToTermsOfService?: () => void;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  onNavigateBack,
  onNavigateToOrderHistory,
  onNavigateToOrderDetails,
  onNavigateToPrivacyPolicy,
  onNavigateToTermsOfService,
}) => {
  const { user, profile, signOut, updateProfile, resetPassword } = useAuth();
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    lastOrderDate: undefined as string | undefined,
    favoriteCategory: undefined as string | undefined,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadOrderStats();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const loadOrderStats = async () => {
    if (!user) return;

    try {
      const stats = await OrderService.getOrderSummary(user.id);
      setOrderStats({
        totalOrders: stats.total_orders || 0,
        totalSpent: stats.total_spent || 0,
        averageOrderValue: stats.total_orders > 0 ? stats.total_spent / stats.total_orders : 0,
        lastOrderDate: stats.recent_orders[0]?.created_at || undefined,
        favoriteCategory: undefined, // Not implemented in new service
      });
    } catch (error) {
      console.error('Error loading order stats:', error);
      // Set default stats when database isn't available
      setOrderStats({
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: undefined,
        favoriteCategory: undefined,
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    try {
      setLoading(true);
      await updateProfile({
        full_name: formData.fullName,
        phone: formData.phone,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email address found');
      return;
    }

    Alert.alert(
      'Reset Password',
      `A password reset link will be sent to ${user.email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Link',
          onPress: async () => {
            try {
              const { error } = await resetPassword(user.email!);
              
              if (error) {
                console.error('Reset password error:', error);
                Alert.alert('Error', 'Failed to send reset link. Please try again.');
              } else {
                Alert.alert('Success', 'Password reset link sent to your email');
              }
            } catch (error) {
              console.error('Reset password error:', error);
              Alert.alert('Error', 'Failed to send reset link. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => signOut()
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data including orders, profile, and cart will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Final Confirmation',
              'Type "DELETE" to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: async (text) => {
                    if (text?.toUpperCase() === 'DELETE') {
                      try {
                        // In production, this would call a proper account deletion API
                        Alert.alert(
                          'Account Deletion Requested', 
                          'Your account deletion request has been submitted. You will receive a confirmation email within 24 hours.'
                        );
                        // For now, just sign out
                        signOut();
                      } catch (error) {
                        Alert.alert('Error', 'Failed to process account deletion request');
                      }
                    } else {
                      Alert.alert('Error', 'You must type "DELETE" to confirm');
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const profileSections = [
    {
      title: 'Account Information',
      items: [
        { label: 'Email', value: user?.email || 'Not provided', editable: false },
        { label: 'Full Name', value: formData.fullName, editable: true, key: 'fullName' },
        { label: 'Phone', value: formData.phone || 'Not provided', editable: true, key: 'phone' },
        { label: 'Account Type', value: profile?.role === 'admin' ? 'Administrator' : 'Customer', editable: false },
        { label: 'Member Since', value: new Date(user?.created_at || '').toLocaleDateString(), editable: false },
      ],
    },
  ];

  const actionItems = [
    { 
      title: 'View Order History', 
      icon: 'receipt-outline', 
      color: COLORS.success, 
      onPress: () => {
        if (onNavigateToOrderHistory) {
          onNavigateToOrderHistory();
        } else {
          Alert.alert('Order History', 'Order history navigation not configured');
        }
      }
    },
    { 
      title: 'Reset Password', 
      icon: 'key-outline', 
      color: COLORS.primary, 
      onPress: handleResetPassword 
    },
    { 
      title: 'Privacy Policy', 
      icon: 'shield-outline', 
      color: COLORS.info, 
      onPress: () => {
        if (onNavigateToPrivacyPolicy) {
          onNavigateToPrivacyPolicy();
        } else {
          Alert.alert('Privacy Policy', 'Privacy policy navigation not configured');
        }
      }
    },
    { 
      title: 'Terms of Service', 
      icon: 'document-text-outline', 
      color: COLORS.info, 
      onPress: () => {
        if (onNavigateToTermsOfService) {
          onNavigateToTermsOfService();
        } else {
          Alert.alert('Terms of Service', 'Terms of service navigation not configured');
        }
      }
    },
    { 
      title: 'Help & Support', 
      icon: 'help-circle-outline', 
      color: COLORS.secondary, 
      onPress: () => Alert.alert('Help & Support', 'Contact support at perrycodesy@gmail.com') 
    },
    { 
      title: 'Sign Out', 
      icon: 'log-out-outline', 
      color: COLORS.warning, 
      onPress: handleSignOut 
    },
    { 
      title: 'Delete Account', 
      icon: 'trash-outline', 
      color: COLORS.error, 
      onPress: handleDeleteAccount 
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => {
            if (isEditing) {
              handleSaveProfile();
            } else {
              setIsEditing(true);
            }
          }}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity style={styles.avatarEditButton}>
                <Ionicons name="camera-outline" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>
              {profile?.full_name || 'User'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {profile?.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
                <Text style={styles.adminBadgeText}>Administrator</Text>
              </View>
            )}
          </View>

          {/* Order Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Statistics</Text>
            <View style={styles.sectionContent}>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{orderStats.totalOrders}</Text>
                  <Text style={styles.statLabel}>Total Orders</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>GH₵{orderStats.totalSpent.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>GH₵{orderStats.averageOrderValue.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Avg Order</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {orderStats.favoriteCategory || 'None'}
                  </Text>
                  <Text style={styles.statLabel}>Favorite Category</Text>
                </View>
              </View>
              {orderStats.lastOrderDate && (
                <TouchableOpacity 
                  style={styles.infoItem}
                  onPress={() => {
                    if (onNavigateToOrderHistory) {
                      onNavigateToOrderHistory();
                    }
                  }}
                >
                  <Text style={styles.infoLabel}>Last Order</Text>
                  <View style={styles.lastOrderContainer}>
                    <Text style={styles.infoValue}>
                      {new Date(orderStats.lastOrderDate).toLocaleDateString()}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Profile Information */}
          {profileSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionContent}>
                {section.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    {isEditing && item.editable ? (
                      <TextInput
                        style={styles.infoInput}
                        value={item.key ? formData[item.key as keyof typeof formData] : item.value}
                        onChangeText={(text) => {
                          if (item.key) {
                            setFormData({ ...formData, [item.key]: text });
                          }
                        }}
                        placeholder={`Enter ${item.label.toLowerCase()}`}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{item.value}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Actions</Text>
            <View style={styles.sectionContent}>
              {actionItems.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionItem}
                  onPress={action.onPress}
                >
                  <View style={styles.actionLeft}>
                    <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                      <Ionicons name={action.icon as any} size={20} color={action.color} />
                    </View>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>


          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Information</Text>
            <View style={styles.sectionContent}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Build</Text>
                <Text style={styles.infoValue}>2025.10.04</Text>
              </View>
            </View>
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
  editButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  editButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  profileEmail: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
  },
  adminBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.white,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sectionContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 2,
    textAlign: 'right',
  },
  infoInput: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 2,
    textAlign: 'right',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lastOrderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default UserProfileScreen;
