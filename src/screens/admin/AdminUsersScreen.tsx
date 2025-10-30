import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { AdminService, User } from '../../services/adminService';

interface AdminUsersScreenProps {
  onNavigateBack: () => void;
}

const AdminUsersScreen: React.FC<AdminUsersScreenProps> = ({
  onNavigateBack,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const roleFilters = [
    { id: 'all', name: 'All Users' },
    { id: 'user', name: 'Customers' },
    { id: 'admin', name: 'Admins' },
  ];

  useEffect(() => {
    loadUsers();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, selectedRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await AdminService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleUpdateUserRole = (user: User) => {
    const roleOptions = [
      { text: 'Customer', value: 'user' },
      { text: 'Administrator', value: 'admin' },
    ];

    Alert.alert(
      'Update User Role',
      `Current role: ${user.role === 'admin' ? 'Administrator' : 'Customer'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...roleOptions.map(role => ({
          text: role.text,
          onPress: async () => {
            try {
              await AdminService.updateUserRole(user.id, role.value as any);
              Alert.alert('Success', 'User role updated');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to update user role');
            }
          },
        })),
      ]
    );
  };

  const handleDeactivateUser = (user: User) => {
    Alert.alert(
      'Deactivate User',
      `Are you sure you want to deactivate ${user.full_name || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.deactivateUser(user.id);
              Alert.alert('Success', 'User deactivated');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate user');
            }
          },
        },
      ]
    );
  };

  const handleViewUserOrders = async (user: User) => {
    try {
      const orders = await AdminService.getUserOrders(user.id);
      Alert.alert(
        'User Orders',
        `${user.full_name || user.email} has ${orders.length} orders.\n\nTotal spent: ${AdminService.formatPrice(
          orders.reduce((sum, order) => sum + order.total_amount, 0)
        )}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to load user orders');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return COLORS.error;
      case 'user': return COLORS.primary;
      default: return COLORS.textMuted;
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {(item.full_name || item.email).charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.full_name || 'No name provided'}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.phone && (
            <Text style={styles.userPhone}>{item.phone}</Text>
          )}
        </View>

        <View style={styles.userMeta}>
          <View style={styles.badgeContainer}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
              <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                {item.role === 'admin' ? 'Admin' : 'Customer'}
              </Text>
            </View>
            {item.is_verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: COLORS.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                <Text style={[styles.verifiedText, { color: COLORS.success }]}>
                  Verified
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.joinDate}>
            Joined {AdminService.formatDate(item.created_at)}
          </Text>
          {item.last_sign_in_at && (
            <Text style={styles.lastSeen}>
              Last seen {AdminService.getTimeAgo(item.last_sign_in_at)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.roleButton]}
          onPress={() => handleUpdateUserRole(item)}
        >
          <Ionicons name="person-outline" size={16} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Role</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.ordersButton]}
          onPress={() => handleViewUserOrders(item)}
        >
          <Ionicons name="receipt-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.actionButtonText}>Orders</Text>
        </TouchableOpacity>

        {item.role !== 'admin' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deactivateButton]}
            onPress={() => handleDeactivateUser(item)}
          >
            <Ionicons name="ban-outline" size={16} color={COLORS.error} />
            <Text style={styles.actionButtonText}>Deactivate</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderRoleFilter = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.roleChip,
        selectedRole === item.id && styles.roleChipActive
      ]}
      onPress={() => setSelectedRole(item.id)}
    >
      <Text style={[
        styles.roleChipText,
        selectedRole === item.id && styles.roleChipTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.headerRight}>
          <Text style={styles.userCount}>{filteredUsers.length} users</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <FlatList
          data={roleFilters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderRoleFilter}
          contentContainerStyle={styles.roleFilters}
        />
      </View>

      {/* Users List */}
      <Animated.View style={[styles.usersContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.usersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search' : 'No users registered yet'}
              </Text>
            </View>
          }
        />
      </Animated.View>
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
    alignItems: 'flex-end',
  },
  userCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  filtersContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
  },
  roleFilters: {
    gap: SPACING.sm,
  },
  roleChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  roleChipActive: {
    backgroundColor: COLORS.primary,
  },
  roleChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  roleChipTextActive: {
    color: COLORS.white,
  },
  usersContainer: {
    flex: 1,
  },
  usersList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  userAvatarText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  userPhone: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  roleText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs / 2,
  },
  verifiedText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  joinDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
  },
  lastSeen: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs / 2,
  },
  userActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  roleButton: {
    backgroundColor: COLORS.primary + '20',
  },
  ordersButton: {
    backgroundColor: COLORS.secondary + '20',
  },
  deactivateButton: {
    backgroundColor: COLORS.error + '20',
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default AdminUsersScreen;
