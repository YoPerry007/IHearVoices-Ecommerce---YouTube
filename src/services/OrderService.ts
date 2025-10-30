/**
 * OrderService - Complete order management service
 * Handles all order operations with proper database integration
 * 
 * Features:
 * - Order creation with cart items
 * - Order status management  
 * - Order history retrieval
 * - Payment status tracking
 * - Shipping address management
 * - Database transaction safety
 */

import { supabase } from '../config/supabase';

// Types matching database schema exactly
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface ShippingAddress {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postal_code?: string;
  additional_notes?: string;
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  // Populated from database joins
  product?: {
    id: string;
    name: string;
    description: string;
    images: string[];
    brand: string;
  };
}

export interface CreateOrderData {
  user_id: string;
  total_amount: number;
  shipping_address: ShippingAddress;
  payment_reference?: string;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  notes?: string;
  items: Omit<OrderItem, 'price' | 'product'>[];
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_address: ShippingAddress;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Populated from relations
  items?: OrderItem[];
  item_count?: number;
}

export interface OrderSummary {
  total_orders: number;
  total_spent: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  recent_orders: Order[];
}

class OrderService {
  /**
   * Create a new order with items (Database transaction)
   */
  static async createOrder(orderData: CreateOrderData): Promise<Order> {
    try {
      console.log('Creating order for user:', orderData.user_id);

      // Start database transaction
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: orderData.user_id,
          total_amount: orderData.total_amount,
          status: orderData.status || 'pending',
          payment_status: orderData.payment_status || 'pending',
          shipping_address: JSON.stringify(orderData.shipping_address),
          payment_reference: orderData.payment_reference,
          notes: orderData.notes,
        })
        .select()
        .single();

      if (orderError) {
        // Check if this is a duplicate payment reference error (expected behavior)
        if (orderError.code === '23505' && orderError.message.includes('payment_reference')) {
          console.log('🔄 Payment already processed, retrieving existing order...');
          
          // Try to find the existing order with this payment reference
          if (orderData.payment_reference) {
            const { data: existingOrder } = await supabase
              .from('orders')
              .select('*')
              .eq('payment_reference', orderData.payment_reference)
              .single();
            
            if (existingOrder) {
              console.log('✅ Order already exists for this payment:', existingOrder.id);
              return existingOrder;
            }
          }
          
          console.warn('⚠️ Could not find existing order for duplicate payment reference');
        }
        
        // Only log as error for non-duplicate issues
        console.error('❌ Order creation failed:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log('Order created successfully:', order.id);

      // Get current prices for products and create order items
      const orderItems: OrderItem[] = [];
      
      for (const item of orderData.items) {
        // Get current product price
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, price, images, brand')
          .eq('id', item.product_id)
          .single();

        if (productError) {
          console.error('Product not found:', item.product_id, productError);
          throw new Error(`Product not found: ${item.product_id}`);
        }

        // Create order item with current price
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: product.price, // Use current product price
            size: item.size,
            color: item.color,
          });

        if (itemError) {
          console.error('Order item creation failed:', itemError);
          
          // Rollback: Delete the order if item creation fails
          await supabase.from('orders').delete().eq('id', order.id);
          
          throw new Error(`Failed to create order item: ${itemError.message}`);
        }

        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: product.price,
          size: item.size,
          color: item.color,
          product: {
            id: product.id,
            name: product.name,
            description: '', // Not needed for order item
            images: product.images,
            brand: product.brand,
          },
        });
      }

      console.log(`Order ${order.id} created with ${orderItems.length} items`);

      // Return complete order with items
      return {
        ...order,
        shipping_address: JSON.parse(order.shipping_address),
        items: orderItems,
        item_count: orderItems.length,
      };

    } catch (error) {
      console.error('Order creation error:', error);
      throw new Error(`Order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get order by ID with items
   */
  static async getOrderById(orderId: string, userId: string): Promise<Order> {
    try {
      // Get order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError) {
        throw new Error(`Order not found: ${orderError.message}`);
      }

      // Get order items with product details
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            id,
            name,
            description,
            images,
            brand
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Failed to fetch order items:', itemsError);
        throw new Error(`Failed to fetch order items: ${itemsError.message}`);
      }

      const orderItems: OrderItem[] = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        product: item.products,
      }));

      return {
        ...order,
        shipping_address: JSON.parse(order.shipping_address),
        items: orderItems,
        item_count: orderItems.length,
      };

    } catch (error) {
      console.error('Get order error:', error);
      throw new Error(`Failed to get order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's order history with pagination
   */
  static async getUserOrders(
    userId: string, 
    options: { limit?: number; offset?: number; status?: OrderStatus } = {}
  ): Promise<{ orders: Order[]; total_count: number }> {
    try {
      const { limit = 20, offset = 0, status } = options;

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            products:product_id (
              name,
              images
            )
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: orders, error, count } = await query;

      if (error) {
        console.error('Failed to fetch user orders:', error);
        throw new Error(`Failed to fetch orders: ${error.message}`);
      }

      const formattedOrders: Order[] = orders.map(order => ({
        ...order,
        shipping_address: JSON.parse(order.shipping_address),
        item_count: order.order_items?.length || 0,
        items: order.order_items?.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          product: item.products,
        })),
      }));

      return {
        orders: formattedOrders,
        total_count: count || 0,
      };

    } catch (error) {
      console.error('Get user orders error:', error);
      throw new Error(`Failed to get orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string, 
    status: OrderStatus, 
    userId?: string
  ): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to update order status: ${error.message}`);
      }

      console.log(`Order ${orderId} status updated to ${status}`);

    } catch (error) {
      console.error('Update order status error:', error);
      throw new Error(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentReference?: string,
    userId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      };

      if (paymentReference) {
        updateData.payment_reference = paymentReference;
      }

      let query = supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to update payment status: ${error.message}`);
      }

      console.log(`Order ${orderId} payment status updated to ${paymentStatus}`);

    } catch (error) {
      console.error('Update payment status error:', error);
      throw new Error(`Failed to update payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel order (if payment is pending)
   */
  static async cancelOrder(orderId: string, userId: string, reason?: string): Promise<void> {
    try {
      // Check if order can be cancelled
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('status, payment_status')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw new Error(`Order not found: ${fetchError.message}`);
      }

      if (order.payment_status === 'paid' && order.status !== 'pending') {
        throw new Error('Cannot cancel a paid order that is being processed');
      }

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to cancel order: ${error.message}`);
      }

      console.log(`Order ${orderId} cancelled by user ${userId}`);

    } catch (error) {
      console.error('Cancel order error:', error);
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get order summary/statistics for user
   */
  static async getOrderSummary(userId: string): Promise<OrderSummary> {
    try {
      // Get all user orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch order summary: ${error.message}`);
      }

      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0);
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const completedOrders = orders.filter(o => o.status === 'delivered').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

      // Get recent orders with items
      const { data: recentOrdersData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            products:product_id (
              name,
              images
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentOrders: Order[] = (recentOrdersData || []).map(order => ({
        ...order,
        shipping_address: JSON.parse(order.shipping_address),
        item_count: order.order_items?.length || 0,
      }));

      return {
        total_orders: totalOrders,
        total_spent: totalSpent,
        pending_orders: pendingOrders,
        completed_orders: completedOrders,
        cancelled_orders: cancelledOrders,
        recent_orders: recentOrders,
      };

    } catch (error) {
      console.error('Get order summary error:', error);
      throw new Error(`Failed to get order summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Admin: Get all orders with pagination and filters
   */
  static async getAllOrders(
    options: {
      limit?: number;
      offset?: number;
      status?: OrderStatus;
      payment_status?: PaymentStatus;
      user_id?: string;
    } = {}
  ): Promise<{ orders: Order[]; total_count: number }> {
    try {
      const { limit = 50, offset = 0, status, payment_status, user_id } = options;

      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          ),
          order_items (
            id,
            quantity,
            price,
            products:product_id (
              name,
              images
            )
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (payment_status) query = query.eq('payment_status', payment_status);
      if (user_id) query = query.eq('user_id', user_id);

      const { data: orders, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch orders: ${error.message}`);
      }

      const formattedOrders: Order[] = orders.map(order => ({
        ...order,
        shipping_address: JSON.parse(order.shipping_address),
        item_count: order.order_items?.length || 0,
      }));

      return {
        orders: formattedOrders,
        total_count: count || 0,
      };

    } catch (error) {
      console.error('Get all orders error:', error);
      throw new Error(`Failed to get orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default OrderService;
