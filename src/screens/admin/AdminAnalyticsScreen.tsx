import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { AdminService } from '../../services/adminService';

interface AdminAnalyticsScreenProps {
  onNavigateBack: () => void;
}

interface AnalyticsData {
  totalRevenue: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topProducts: { id: string; name: string; sales: number; revenue: number }[];
  customerMetrics: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageOrderValue: number;
  };
  orderMetrics: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageProcessingTime: number;
  };
  inventoryMetrics: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    topCategories: { category: string; count: number }[];
  };
}

const { width } = Dimensions.get('window');

const AdminAnalyticsScreen: React.FC<AdminAnalyticsScreenProps> = ({
  onNavigateBack,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAnalytics();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get all required data
      const [
        adminStats,
        products,
        orders,
        users,
        monthlyRevenue,
        realTopProducts,
        orderMetrics
      ] = await Promise.all([
        AdminService.getAdminStats(),
        AdminService.getAllProducts(),
        AdminService.getAllOrders(),
        AdminService.getAllUsers(),
        AdminService.getRevenueByMonth(),
        AdminService.getTopSellingProducts(5),
        AdminService.getOrderMetrics()
      ]);

      // Calculate customer metrics
      const totalCustomers = users.filter(user => user.role === 'user').length;
      const newCustomers = users.filter(user => {
        const joinDate = new Date(user.created_at);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return joinDate > thirtyDaysAgo && user.role === 'user';
      }).length;

      // Use real order metrics
      const totalOrderValue = orders
        .filter(order => order.payment_status === 'paid')
        .reduce((sum, order) => sum + order.total_amount, 0);
      
      const averageOrderValue = orders.length > 0 ? totalOrderValue / orders.length : 0;

      // Use real top products data
      const topProducts = realTopProducts.length > 0 ? realTopProducts : 
        // Fallback to products sorted by rating if no sales data
        products
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 5)
          .map(product => ({
            id: product.id,
            name: product.name,
            sales: 0,
            revenue: 0,
            quantity: 0
          }));

      // Calculate inventory metrics
      const lowStockProducts = products.filter(product => product.stock_count < 10).length;
      const outOfStockProducts = products.filter(product => product.stock_count === 0).length;
      
      const categoryCount = products.reduce((acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      const analyticsData: AnalyticsData = {
        totalRevenue: adminStats.totalRevenue,
        monthlyRevenue,
        topProducts,
        customerMetrics: {
          totalCustomers,
          newCustomers,
          returningCustomers: totalCustomers - newCustomers,
          averageOrderValue,
        },
        orderMetrics: {
          totalOrders: orderMetrics.totalOrders,
          pendingOrders: orderMetrics.pendingOrders,
          completedOrders: orderMetrics.deliveredOrders,
          cancelledOrders: orderMetrics.cancelledOrders,
          averageProcessingTime: orderMetrics.averageProcessingTime,
        },
        inventoryMetrics: {
          totalProducts: products.length,
          lowStockProducts,
          outOfStockProducts,
          topCategories,
        },
      };

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = COLORS.primary,
    trend 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: string;
    trend?: { value: number; isPositive: boolean };
  }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        {trend && (
          <View style={[
            styles.trendBadge,
            { backgroundColor: trend.isPositive ? COLORS.success + '20' : COLORS.error + '20' }
          ]}>
            <Ionicons 
              name={trend.isPositive ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={trend.isPositive ? COLORS.success : COLORS.error} 
            />
            <Text style={[
              styles.trendText,
              { color: trend.isPositive ? COLORS.success : COLORS.error }
            ]}>
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['7d', '30d', '90d', '1y'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period === '7d' ? '7 Days' : 
             period === '30d' ? '30 Days' : 
             period === '90d' ? '90 Days' : '1 Year'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={[styles.content, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Period Selector */}
        <PeriodSelector />

        {/* Revenue Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Revenue"
              value={AdminService.formatPrice(analytics.totalRevenue)}
              icon="cash-outline"
              color={COLORS.success}
              trend={{ value: 12.5, isPositive: true }}
            />
            <MetricCard
              title="Average Order"
              value={AdminService.formatPrice(analytics.customerMetrics.averageOrderValue)}
              icon="receipt-outline"
              color={COLORS.primary}
              trend={{ value: 8.3, isPositive: true }}
            />
          </View>
        </View>

        {/* Customer Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Insights</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Customers"
              value={analytics.customerMetrics.totalCustomers}
              icon="people-outline"
              color={COLORS.secondary}
            />
            <MetricCard
              title="New Customers"
              value={analytics.customerMetrics.newCustomers}
              subtitle="Last 30 days"
              icon="person-add-outline"
              color={COLORS.success}
              trend={{ value: 15.2, isPositive: true }}
            />
          </View>
        </View>

        {/* Order Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Performance</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Orders"
              value={analytics.orderMetrics.totalOrders}
              icon="bag-outline"
              color={COLORS.primary}
            />
            <MetricCard
              title="Completed Orders"
              value={analytics.orderMetrics.completedOrders}
              icon="checkmark-circle-outline"
              color={COLORS.success}
            />
            <MetricCard
              title="Pending Orders"
              value={analytics.orderMetrics.pendingOrders}
              icon="time-outline"
              color={COLORS.warning}
            />
            <MetricCard
              title="Processing Time"
              value={`${analytics.orderMetrics.averageProcessingTime} days`}
              subtitle="Average"
              icon="speedometer-outline"
              color={COLORS.info}
            />
          </View>
        </View>

        {/* Inventory Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory Status</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Products"
              value={analytics.inventoryMetrics.totalProducts}
              icon="cube-outline"
              color={COLORS.primary}
            />
            <MetricCard
              title="Low Stock"
              value={analytics.inventoryMetrics.lowStockProducts}
              subtitle="< 10 items"
              icon="warning-outline"
              color={COLORS.warning}
            />
            <MetricCard
              title="Out of Stock"
              value={analytics.inventoryMetrics.outOfStockProducts}
              icon="ban-outline"
              color={COLORS.error}
            />
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Products</Text>
          {analytics.topProducts.map((product, index) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productRank}>
                <Text style={styles.productRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSales}>
                  {product.sales} sales • {AdminService.formatPrice(product.revenue)}
                </Text>
              </View>
              <View style={styles.productMetrics}>
                <View style={styles.productBar}>
                  <View 
                    style={[
                      styles.productBarFill,
                      { width: `${(product.sales / Math.max(...analytics.topProducts.map(p => p.sales))) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Category Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Distribution</Text>
          {analytics.inventoryMetrics.topCategories.map((category, index) => (
            <View key={category.category} style={styles.categoryCard}>
              <Text style={styles.categoryName}>
                {category.category.charAt(0).toUpperCase() + category.category.slice(1)}
              </Text>
              <View style={styles.categoryMetrics}>
                <Text style={styles.categoryCount}>{category.count} products</Text>
                <View style={styles.categoryBar}>
                  <View 
                    style={[
                      styles.categoryBarFill,
                      { width: `${(category.count / Math.max(...analytics.inventoryMetrics.topCategories.map(c => c.count))) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Analytics updated {new Date().toLocaleString()}
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  periodButtonTextActive: {
    color: COLORS.white,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  metricCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    width: (width - SPACING.md * 3) / 2,
    ...SHADOWS.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs / 2,
  },
  trendText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  metricTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },
  metricSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs / 2,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  productRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  productRankText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  productSales: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  productMetrics: {
    width: 60,
  },
  productBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  productBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  categoryName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    flex: 1,
  },
  categoryMetrics: {
    alignItems: 'flex-end',
    flex: 1,
  },
  categoryCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  categoryBar: {
    width: 80,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
  },
});

export default AdminAnalyticsScreen;
