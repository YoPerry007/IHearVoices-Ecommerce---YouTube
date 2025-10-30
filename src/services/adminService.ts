import { supabase } from '../config/supabase';
import { Product } from './mockData';

// Types for admin operations
export interface AdminStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  is_verified?: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string | null;
    email: string;
  };
}

export interface ProductFormData {
  name: string;
  description: string;
  category: string; // Allow any string for dynamic categories
  price: number;
  brand: string;
  stock_count: number;
  discount_percentage: number;
  sizes: string[];
  colors: string[];
  images: string[];
  in_stock: boolean;
}

export class AdminService {
  // Dashboard Statistics
  static async getDashboardStats(): Promise<AdminStats> {
    try {
      // Get total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get total users (excluding current admin)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin');

      // Get total orders
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Get total revenue from paid orders
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('payment_status', 'paid');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      return {
        totalProducts: totalProducts || 0,
        totalOrders: totalOrders || 0,
        totalUsers: totalUsers || 0,
        totalRevenue,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Product Management
  static async getAllProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  static async createProduct(productData: ProductFormData): Promise<Product> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: productData.name,
          description: productData.description,
          category: productData.category,
          price: productData.price,
          brand: productData.brand,
          stock_count: productData.stock_count,
          discount_percentage: productData.discount_percentage,
          sizes: productData.sizes,
          colors: productData.colors,
          images: productData.images,
          in_stock: productData.in_stock,
          rating: 0, // Default rating for new products
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  static async updateProduct(productId: string, productData: Partial<ProductFormData>): Promise<Product> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          ...productData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(productId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  static async toggleProductStock(productId: string): Promise<Product> {
    try {
      // First get current stock status
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('in_stock')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      // Toggle the stock status
      const { data, error } = await supabase
        .from('products')
        .update({ 
          in_stock: !product.in_stock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error toggling product stock:', error);
      throw error;
    }
  }

  // User Management
  static async getAllUsers(): Promise<User[]> {
    try {
      // Use basic query since auth.users join is complex in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the data to include verification status (assume verified for now)
      const users = data?.map(profile => ({
        ...profile,
        is_verified: true, // All registered users are considered verified
        email_confirmed_at: profile.created_at,
        last_sign_in_at: profile.updated_at, // Use updated_at as proxy for last activity
      })) || [];

      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  static async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  static async deactivateUser(userId: string): Promise<void> {
    try {
      // In Supabase, we can't directly delete auth.users from client
      // Instead, we'll mark the profile as inactive or use admin API
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: 'inactive' as any, // Custom status
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  static async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  }

  // Order Management
  static async getAllOrders(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(order => ({
        ...order,
        user: {
          full_name: order.profiles.full_name,
          email: order.profiles.email,
        },
      })) || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  static async updateOrderStatus(
    orderId: string, 
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  ): Promise<Order> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .single();

      if (error) throw error;
      return {
        ...data,
        user: {
          full_name: data.profiles.full_name,
          email: data.profiles.email,
        },
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  static async updatePaymentStatus(
    orderId: string, 
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  ): Promise<Order> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .single();

      if (error) throw error;
      return {
        ...data,
        user: {
          full_name: data.profiles.full_name,
          email: data.profiles.email,
        },
      };
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Get admin statistics
  static async getAdminStats(): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalUsers: number;
    totalRevenue: number;
  }> {
    try {
      const [products, orders, users] = await Promise.all([
        this.getAllProducts(),
        this.getAllOrders(),
        this.getAllUsers()
      ]);

      const totalRevenue = orders
        .filter(order => order.payment_status === 'paid')
        .reduce((sum, order) => sum + order.total_amount, 0);

      return {
        totalProducts: products.length,
        totalOrders: orders.length,
        totalUsers: users.filter(user => user.role === 'user').length,
        totalRevenue,
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw error;
    }
  }

  // Get recent activity for dashboard
  static async getRecentActivity(): Promise<any[]> {
    try {
      const activities: any[] = [];
      
      // Get recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      recentOrders?.forEach(order => {
        activities.push({
          id: `order-${order.id}`,
          type: 'order',
          message: `New order #${order.id.slice(-8)} - ${AdminService.formatPrice(order.total_amount)}`,
          time: AdminService.getTimeAgo(order.created_at),
          icon: 'bag-outline',
          color: '#10B981'
        });
      });

      // Get recent user registrations
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      recentUsers?.forEach(user => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          message: `New user registered: ${user.full_name || user.email}`,
          time: AdminService.getTimeAgo(user.created_at),
          icon: 'person-add-outline',
          color: '#3B82F6'
        });
      });

      // Get low stock products
      const { data: lowStockProducts } = await supabase
        .from('products')
        .select('id, name, stock_count')
        .lt('stock_count', 10)
        .gt('stock_count', 0)
        .order('stock_count', { ascending: true })
        .limit(2);

      lowStockProducts?.forEach(product => {
        activities.push({
          id: `stock-${product.id}`,
          type: 'stock',
          message: `Low stock alert: ${product.name} (${product.stock_count} left)`,
          time: 'Now',
          icon: 'warning-outline',
          color: '#F59E0B'
        });
      });

      // Sort by most recent
      return activities.sort((a, b) => {
        if (a.time === 'Now') return -1;
        if (b.time === 'Now') return 1;
        return 0;
      }).slice(0, 5);

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  // Analytics and Reports
  static async getRevenueByMonth(): Promise<{ month: string; revenue: number }[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('payment_status', 'paid')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Group by month
      const monthlyRevenue: { [key: string]: number } = {};
      data?.forEach(order => {
        const month = new Date(order.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.total_amount;
      });

      return Object.entries(monthlyRevenue).map(([month, revenue]) => ({
        month,
        revenue,
      }));
    } catch (error) {
      console.error('Error fetching revenue by month:', error);
      throw error;
    }
  }

  static async getTopSellingProducts(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          price,
          products (
            id,
            name,
            category
          )
        `)
        .not('products', 'is', null);

      if (error) throw error;

      // Group by product and calculate totals
      const productSales: { [key: string]: any } = {};
      
      data?.forEach(item => {
        const productId = item.product_id;
        if (!productSales[productId]) {
          productSales[productId] = {
            id: productId,
            name: (item.products as any)?.name || 'Unknown Product',
            category: (item.products as any)?.category || 'Unknown',
            sales: 0,
            revenue: 0,
            quantity: 0
          };
        }
        
        productSales[productId].sales += 1; // Number of orders
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.price * item.quantity;
      });

      // Sort by revenue and return top products
      return Object.values(productSales)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      return []; // Return empty array as fallback
    }
  }

  static async getOrderMetrics(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    averageProcessingTime: number;
  }> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, created_at, updated_at');

      if (error) throw error;

      const metrics = {
        totalOrders: orders?.length || 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        averageProcessingTime: 0
      };

      let totalProcessingTime = 0;
      let processedOrdersCount = 0;

      orders?.forEach(order => {
        switch (order.status) {
          case 'pending':
            metrics.pendingOrders++;
            break;
          case 'processing':
            metrics.processingOrders++;
            break;
          case 'shipped':
            metrics.shippedOrders++;
            break;
          case 'delivered':
            metrics.deliveredOrders++;
            break;
          case 'cancelled':
            metrics.cancelledOrders++;
            break;
        }

        // Calculate processing time for completed orders
        if (order.status === 'delivered' || order.status === 'shipped') {
          const created = new Date(order.created_at);
          const updated = new Date(order.updated_at);
          const processingDays = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          totalProcessingTime += processingDays;
          processedOrdersCount++;
        }
      });

      if (processedOrdersCount > 0) {
        metrics.averageProcessingTime = totalProcessingTime / processedOrdersCount;
      }

      return metrics;
    } catch (error) {
      console.error('Error fetching order metrics:', error);
      throw error;
    }
  }

  // Utility methods
  static formatPrice(amount: number): string {
    return `GH₵${amount.toFixed(2)}`;
  }

  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  static getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return this.formatDate(dateString);
  }
}

export default AdminService;
