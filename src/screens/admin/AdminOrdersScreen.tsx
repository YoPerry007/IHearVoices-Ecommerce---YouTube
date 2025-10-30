import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { AdminService, Order } from '../../services/adminService';

interface AdminOrdersScreenProps {
  onNavigateBack: () => void;
}

const AdminOrdersScreen: React.FC<AdminOrdersScreenProps> = ({
  onNavigateBack,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const statusFilters = [
    { id: 'all', name: 'All Orders' },
    { id: 'pending', name: 'Pending' },
    { id: 'processing', name: 'Processing' },
    { id: 'shipped', name: 'Shipped' },
    { id: 'delivered', name: 'Delivered' },
    { id: 'cancelled', name: 'Cancelled' },
  ];

  useEffect(() => {
    loadOrders();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await AdminService.getAllOrders();
      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    setFilteredOrders(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleUpdateOrderStatus = (order: Order) => {
    const statusOptions = [
      { text: 'Pending', value: 'pending', description: 'Order received, awaiting processing' },
      { text: 'Processing', value: 'processing', description: 'Order is being prepared' },
      { text: 'Shipped', value: 'shipped', description: 'Order has been dispatched' },
      { text: 'Delivered', value: 'delivered', description: 'Order delivered to customer' },
      { text: 'Cancelled', value: 'cancelled', description: 'Order has been cancelled' },
    ];

    // Filter out current status
    const availableOptions = statusOptions.filter(status => status.value !== order.status);

    Alert.alert(
      'Update Order Status',
      `Current status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}\n\nSelect new status:`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...availableOptions.map(status => ({
          text: `${status.text} - ${status.description}`,
          onPress: async () => {
            try {
              await AdminService.updateOrderStatus(order.id, status.value as any);
              Alert.alert('Success', `Order status updated to ${status.text}`);
              loadOrders();
            } catch (error) {
              console.error('Error updating order status:', error);
              Alert.alert('Error', 'Failed to update order status');
            }
          },
        })),
      ]
    );
  };

  const handleUpdatePaymentStatus = (order: Order) => {
    const paymentOptions = [
      { text: 'Pending', value: 'pending', description: 'Payment awaiting confirmation' },
      { text: 'Paid', value: 'paid', description: 'Payment successfully received' },
      { text: 'Failed', value: 'failed', description: 'Payment attempt failed' },
      { text: 'Refunded', value: 'refunded', description: 'Payment has been refunded' },
    ];

    // Filter out current payment status
    const availableOptions = paymentOptions.filter(payment => payment.value !== order.payment_status);

    Alert.alert(
      'Update Payment Status',
      `Current payment status: ${order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}\n\nSelect new status:`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...availableOptions.map(payment => ({
          text: `${payment.text} - ${payment.description}`,
          onPress: async () => {
            try {
              await AdminService.updatePaymentStatus(order.id, payment.value as any);
              Alert.alert('Success', `Payment status updated to ${payment.text}`);
              loadOrders();
            } catch (error) {
              console.error('Error updating payment status:', error);
              Alert.alert('Error', 'Failed to update payment status');
            }
          },
        })),
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'processing': return COLORS.info;
      case 'shipped': return COLORS.secondary;
      case 'delivered': return COLORS.success;
      case 'cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'paid': return COLORS.success;
      case 'failed': return COLORS.error;
      case 'refunded': return COLORS.info;
      default: return COLORS.textMuted;
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.id.slice(-8)}</Text>
          <Text style={styles.customerName}>
            {item.user?.full_name || item.user?.email || 'Unknown Customer'}
          </Text>
        </View>
        <Text style={styles.orderAmount}>
          {AdminService.formatPrice(item.total_amount)}
        </Text>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Payment</Text>
            <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(item.payment_status) + '20' }]}>
              <Text style={[styles.statusText, { color: getPaymentStatusColor(item.payment_status) }]}>
                {item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.orderDate}>
          {AdminService.formatDate(item.created_at)}
        </Text>
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.statusButton]}
          onPress={() => handleUpdateOrderStatus(item)}
        >
          <Ionicons name="swap-horizontal-outline" size={16} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.paymentButton]}
          onPress={() => handleUpdatePaymentStatus(item)}
        >
          <Ionicons name="card-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.actionButtonText}>Payment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatusFilter = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.statusChip,
        selectedStatus === item.id && styles.statusChipActive
      ]}
      onPress={() => setSelectedStatus(item.id)}
    >
      <Text style={[
        styles.statusChipText,
        selectedStatus === item.id && styles.statusChipTextActive
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
        <Text style={styles.headerTitle}>Order Management</Text>
        <View style={styles.headerRight}>
          <Text style={styles.orderCount}>{filteredOrders.length} orders</Text>
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={statusFilters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderStatusFilter}
          contentContainerStyle={styles.statusFilters}
        />
      </View>

      {/* Orders List */}
      <Animated.View style={[styles.ordersContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.ordersList}
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
              <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedStatus === 'all' 
                  ? 'No orders have been placed yet' 
                  : `No ${selectedStatus} orders found`
                }
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
  orderCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  filtersContainer: {
    paddingVertical: SPACING.sm,
  },
  statusFilters: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  statusChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  statusChipTextActive: {
    color: COLORS.white,
  },
  ordersContainer: {
    flex: 1,
  },
  ordersList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  orderId: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  customerName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  orderAmount: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  orderDetails: {
    marginBottom: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  orderDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  orderActions: {
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
  statusButton: {
    backgroundColor: COLORS.primary + '20',
  },
  paymentButton: {
    backgroundColor: COLORS.secondary + '20',
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

export default AdminOrdersScreen;
