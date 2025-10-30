import { supabase } from '../config/supabase';
import { Product } from '../hooks/useProducts';

// Enterprise-grade interfaces with comprehensive typing
export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  size?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface CartValidationResult {
  isValid: boolean;
  errors: string[];
  availableStock?: number;
}

/**
 * Enterprise Cart Service
 * Implements industry-standard patterns for e-commerce cart management
 * - Repository pattern for data access
 * - Comprehensive error handling and validation  
 * - Performance optimizations with caching
 * - Type safety throughout
 * - Event-driven architecture ready
 */
export class CartService {
  private static instance: CartService;
  private cache = new Map<string, { data: CartItem[]; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  
  // Singleton pattern for service consistency
  public static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  /**
   * Get user's cart items with intelligent caching
   * @param userId - User identifier
   * @returns Promise<CartItem[]>
   */
  async getCartItems(userId: string): Promise<CartItem[]> {
    try {
      // Check cache first for performance
      const cached = this.cache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('Cart: Returning cached items');
        return cached.data;
      }

      console.log(`Cart: Fetching items for user ${userId}`);
      
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          user_id,
          product_id,
          quantity,
          size,
          color,
          created_at,
          updated_at,
          products (
            id,
            name,
            brand,
            price,
            images,
            category,
            discount_percentage,
            stock_count,
            in_stock,
            description,
            sizes,
            colors,
            featured,
            rating,
            review_count
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Cart: Database error:', error);
        throw new Error(`Failed to fetch cart items: ${error.message}`);
      }

      // Transform the data to match our CartItem interface
      const cartItems = (data || []).map((item: any) => ({
        ...item,
        product: item.products // Map 'products' to 'product' for consistency
      })) as CartItem[];
      
      // Update cache
      this.cache.set(userId, { 
        data: cartItems, 
        timestamp: Date.now() 
      });
      
      console.log(`Cart: Retrieved ${cartItems.length} items`);
      return cartItems;

    } catch (error) {
      console.error('Cart: Error in getCartItems:', error);
      throw error;
    }
  }

  /**
   * Add item to cart with comprehensive validation
   * @param userId - User identifier
   * @param request - Add to cart request details
   * @returns Promise<CartItem>
   */
  async addToCart(userId: string, request: AddToCartRequest): Promise<CartItem> {
    try {
      console.log('Cart: Adding item', { userId, ...request });

      // Validate request
      const validation = await this.validateAddToCart(request);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if item already exists with same attributes
      const existingItem = await this.findExistingCartItem(
        userId, 
        request.productId, 
        request.size, 
        request.color
      );

      let result: CartItem;

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + request.quantity;
        result = await this.updateCartItemQuantity(existingItem.id, newQuantity);
        console.log('Cart: Updated existing item quantity');
      } else {
        // Create new cart item
        result = await this.createNewCartItem(userId, request);
        console.log('Cart: Created new cart item');
      }

      // Invalidate cache
      this.cache.delete(userId);
      
      return result;

    } catch (error) {
      console.error('Cart: Error in addToCart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity with validation
   * @param cartItemId - Cart item identifier
   * @param quantity - New quantity
   * @returns Promise<CartItem>
   */
  async updateCartItemQuantity(cartItemId: string, quantity: number): Promise<CartItem> {
    try {
      if (quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      console.log(`Cart: Updating item ${cartItemId} quantity to ${quantity}`);

      const { data, error } = await supabase
        .from('cart_items')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', cartItemId)
        .select(`
          *,
          products (
            id,
            name,
            brand,
            price,
            images,
            category,
            discount_percentage,
            stock_count,
            in_stock,
            description,
            sizes,
            colors,
            featured,
            rating,
            review_count
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update cart item: ${error.message}`);
      }

      // Transform the response to match CartItem interface
      const cartItem = {
        ...data,
        product: data.products // Map 'products' to 'product'
      } as CartItem;

      // Invalidate cache for this user
      if (data?.user_id) {
        this.cache.delete(data.user_id);
      }

      return cartItem;

    } catch (error) {
      console.error('Cart: Error in updateCartItemQuantity:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param cartItemId - Cart item identifier
   * @param userId - User identifier for cache invalidation
   */
  async removeFromCart(cartItemId: string, userId: string): Promise<void> {
    try {
      console.log(`Cart: Removing item ${cartItemId}`);

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId)
        .eq('user_id', userId); // Security check

      if (error) {
        throw new Error(`Failed to remove cart item: ${error.message}`);
      }

      // Invalidate cache
      this.cache.delete(userId);
      
      console.log('Cart: Item removed successfully');

    } catch (error) {
      console.error('Cart: Error in removeFromCart:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart for user
   * @param userId - User identifier
   */
  async clearCart(userId: string): Promise<void> {
    try {
      console.log(`Cart: Clearing cart for user ${userId}`);

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to clear cart: ${error.message}`);
      }

      // Invalidate cache
      this.cache.delete(userId);
      
      console.log('Cart: Cart cleared successfully');

    } catch (error) {
      console.error('Cart: Error in clearCart:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive cart summary with calculations
   * @param userId - User identifier
   * @returns Promise<CartSummary>
   */
  async getCartSummary(userId: string): Promise<CartSummary> {
    try {
      const items = await this.getCartItems(userId);
      
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = items.reduce((sum, item) => {
        const price = item.product?.price || 0;
        const discountedPrice = price * (1 - (item.product?.discount_percentage || 0) / 100);
        return sum + (discountedPrice * item.quantity);
      }, 0);
      
      // Ghana-specific calculations
      const tax = subtotal * 0.125; // 12.5% VAT in Ghana
      const shipping = subtotal > 100 ? 0 : 15; // Free shipping over GHS 100
      const total = subtotal + tax + shipping;

      return {
        items,
        totalItems,
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        shipping,
        total: Math.round(total * 100) / 100
      };

    } catch (error) {
      console.error('Cart: Error in getCartSummary:', error);
      throw error;
    }
  }

  // Private helper methods

  private async validateAddToCart(request: AddToCartRequest): Promise<CartValidationResult> {
    const errors: string[] = [];

    // Basic validation
    if (!request.productId) {
      errors.push('Product ID is required');
    }

    if (request.quantity < 1) {
      errors.push('Quantity must be at least 1');
    }

    if (request.quantity > 10) {
      errors.push('Maximum quantity per item is 10');
    }

    // Stock validation with fallback to mock data
    try {
      // First try to get product from database
      const { data: product, error } = await supabase
        .from('products')
        .select('stock_count, in_stock, name')
        .eq('id', request.productId)
        .single();

      if (error || !product) {
        // Fallback to mock data if product not found in database
        console.log('Cart: Product not found in database, checking mock data');
        const mockProduct = await this.getMockProduct(request.productId);
        
        if (!mockProduct) {
          errors.push('Product not found');
          return { isValid: false, errors };
        }

        // Validate against mock product
        if (!mockProduct.in_stock || mockProduct.stock_count < request.quantity) {
          errors.push(`Only ${mockProduct.stock_count} units available for ${mockProduct.name}`);
          return { 
            isValid: false, 
            errors, 
            availableStock: mockProduct.stock_count 
          };
        }

        console.log('Cart: Using mock product data for validation');
        return { isValid: true, errors: [] };
      }

      // Validate against database product
      if (!product.in_stock || product.stock_count < request.quantity) {
        errors.push(`Only ${product.stock_count} units available for ${product.name}`);
        return { 
          isValid: false, 
          errors, 
          availableStock: product.stock_count 
        };
      }

    } catch (error) {
      console.error('Cart: Error validating product:', error);
      errors.push('Unable to validate product availability');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Get mock product data as fallback when database is not set up
   */
  private async getMockProduct(productId: string) {
    try {
      // Import mock data dynamically to avoid circular dependencies
      const { MockDataService } = await import('./mockData');
      const products = await MockDataService.getAllProducts();
      return products.find((p: any) => p.id === productId) || null;
    } catch (error) {
      console.error('Cart: Error loading mock product:', error);
      return null;
    }
  }

  private async findExistingCartItem(
    userId: string, 
    productId: string, 
    size?: string, 
    color?: string
  ): Promise<CartItem | null> {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('size', size || '')
        .eq('color', color || '')
        .maybeSingle();

      if (error) {
        console.error('Cart: Error finding existing item:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cart: Error in findExistingCartItem:', error);
      return null;
    }
  }

  private async createNewCartItem(userId: string, request: AddToCartRequest): Promise<CartItem> {
    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        user_id: userId,
        product_id: request.productId,
        quantity: request.quantity,
        size: request.size || null,
        color: request.color || null
      })
      .select(`
        *,
        products (
          id,
          name,
          brand,
          price,
          images,
          category,
          discount_percentage,
          stock_count,
          in_stock,
          description,
          sizes,
          colors,
          featured,
          rating,
          review_count
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create cart item: ${error.message}`);
    }

    // Transform the response to match CartItem interface
    const cartItem = {
      ...data,
      product: data.products // Map 'products' to 'product'
    } as CartItem;

    return cartItem;
  }

  /**
   * Clear cache for testing or manual refresh
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Cart: Cache cleared');
  }
}

// Export singleton instance
export const cartService = CartService.getInstance();
