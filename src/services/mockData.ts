// Mock data service using seed data until backend is ready
export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'sneakers' | 'clothes' | 'accessories';
  price: number;
  images: string[];
  brand: string;
  sizes: string[];
  colors: string[];
  in_stock: boolean;
  stock_count: number;
  featured: boolean;
  discount_percentage: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
}

export interface VoiceCommand {
  id: string;
  command_text: string;
  recognized_intent: string;
  success: boolean;
  response_time_ms: number;
}

// Mock products based on seed data with proper UUID format
export const mockProducts: Product[] = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Proper UUID format
    name: 'Air Max 270 React',
    description: 'Premium running shoes with React foam technology for ultimate comfort and style',
    category: 'sneakers',
    price: 450.00,
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500'
    ],
    brand: 'Nike',
    sizes: ['7', '8', '9', '10', '11', '12'],
    colors: ['Black', 'White', 'Red', 'Blue'],
    in_stock: true,
    stock_count: 25,
    featured: true,
    discount_percentage: 15,
    rating: 4.5,
    review_count: 128,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Ultraboost 22',
    description: 'Energy-returning running shoes with Boost midsole technology',
    category: 'sneakers',
    price: 380.00,
    images: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500'
    ],
    brand: 'Adidas',
    sizes: ['6', '7', '8', '9', '10', '11', '12'],
    colors: ['Core Black', 'Cloud White', 'Solar Red'],
    in_stock: true,
    stock_count: 18,
    featured: true,
    discount_percentage: 10,
    rating: 4.3,
    review_count: 95,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    name: 'Chuck Taylor All Star',
    description: 'Classic canvas sneakers with timeless design',
    category: 'sneakers',
    price: 120.00,
    images: [
      'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500',
      'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=500'
    ],
    brand: 'Converse',
    sizes: ['6', '7', '8', '9', '10', '11'],
    colors: ['Black', 'White', 'Red', 'Navy'],
    in_stock: true,
    stock_count: 35,
    featured: false,
    discount_percentage: 0,
    rating: 4.2,
    review_count: 203,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    name: 'Jordan 1 Retro High',
    description: 'Iconic basketball shoes with premium leather construction',
    category: 'sneakers',
    price: 650.00,
    images: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500'
    ],
    brand: 'Jordan',
    sizes: ['7', '8', '9', '10', '11', '12'],
    colors: ['Bred', 'Royal', 'Chicago', 'Shadow'],
    in_stock: true,
    stock_count: 12,
    featured: true,
    discount_percentage: 5,
    rating: 4.7,
    review_count: 156,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    name: 'Premium Cotton T-Shirt',
    description: 'Soft, breathable cotton t-shirt perfect for everyday wear',
    category: 'clothes',
    price: 45.00,
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
      'https://images.unsplash.com/photo-1583743814966-8936f37f4036?w=500'
    ],
    brand: 'IHearVoices',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'White', 'Navy', 'Grey', 'Green'],
    in_stock: true,
    stock_count: 50,
    featured: false,
    discount_percentage: 20,
    rating: 4.1,
    review_count: 67,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    name: 'Denim Jacket',
    description: 'Classic denim jacket with modern fit and premium wash',
    category: 'clothes',
    price: 180.00,
    images: [
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500',
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500'
    ],
    brand: 'Levi\'s',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Light Blue', 'Dark Blue', 'Black'],
    in_stock: true,
    stock_count: 22,
    featured: true,
    discount_percentage: 25,
    rating: 4.4,
    review_count: 89,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
    name: 'Hoodie Sweatshirt',
    description: 'Comfortable fleece hoodie with kangaroo pocket',
    category: 'clothes',
    price: 95.00,
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500'
    ],
    brand: 'Champion',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'Grey', 'Navy', 'Burgundy'],
    in_stock: true,
    stock_count: 30,
    featured: false,
    discount_percentage: 15,
    rating: 4.0,
    review_count: 124,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'b7eebc99-9c0b-4ef8-bb6d-6bb9bd380a88',
    name: 'Cargo Pants',
    description: 'Utility-style cargo pants with multiple pockets',
    category: 'clothes',
    price: 85.00,
    images: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500',
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500'
    ],
    brand: 'Dickies',
    sizes: ['28', '30', '32', '34', '36', '38'],
    colors: ['Khaki', 'Black', 'Olive', 'Navy'],
    in_stock: true,
    stock_count: 28,
    featured: false,
    discount_percentage: 0,
    rating: 3.9,
    review_count: 76,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'c8eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
    name: 'Leather Wallet',
    description: 'Genuine leather bifold wallet with RFID protection',
    category: 'accessories',
    price: 65.00,
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500'
    ],
    brand: 'Bellroy',
    sizes: ['One Size'],
    colors: ['Black', 'Brown', 'Tan'],
    in_stock: true,
    stock_count: 40,
    featured: false,
    discount_percentage: 10,
    rating: 4.6,
    review_count: 234,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'd9eebc99-9c0b-4ef8-bb6d-6bb9bd380a00',
    name: 'Baseball Cap',
    description: 'Adjustable baseball cap with embroidered logo',
    category: 'accessories',
    price: 35.00,
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500',
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=500'
    ],
    brand: 'New Era',
    sizes: ['One Size'],
    colors: ['Black', 'Navy', 'White', 'Red'],
    in_stock: true,
    stock_count: 45,
    featured: false,
    discount_percentage: 0,
    rating: 4.2,
    review_count: 156,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Backpack',
    description: 'Durable canvas backpack with laptop compartment',
    category: 'accessories',
    price: 120.00,
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
      'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=500'
    ],
    brand: 'Herschel',
    sizes: ['One Size'],
    colors: ['Black', 'Navy', 'Grey', 'Olive'],
    in_stock: true,
    stock_count: 20,
    featured: true,
    discount_percentage: 15,
    rating: 4.3,
    review_count: 98,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Sunglasses',
    description: 'Polarized sunglasses with UV protection',
    category: 'accessories',
    price: 150.00,
    images: [
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500',
      'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=500'
    ],
    brand: 'Ray-Ban',
    sizes: ['One Size'],
    colors: ['Black', 'Tortoise', 'Gold'],
    in_stock: true,
    stock_count: 15,
    featured: true,
    discount_percentage: 20,
    rating: 4.5,
    review_count: 187,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Mock service functions
export class MockDataService {
  private static cart: CartItem[] = [];

  // Products
  static getAllProducts(): Promise<Product[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockProducts), 500);
    });
  }

  static getFeaturedProducts(): Promise<Product[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const featured = mockProducts.filter(p => p.featured);
        resolve(featured);
      }, 300);
    });
  }

  static getProductsByCategory(category: string): Promise<Product[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const filtered = mockProducts.filter(p => p.category === category);
        resolve(filtered);
      }, 400);
    });
  }

  static getProductById(id: string): Promise<Product | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const product = mockProducts.find(p => p.id === id);
        resolve(product || null);
      }, 200);
    });
  }

  static searchProducts(query: string): Promise<Product[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const lowercaseQuery = query.toLowerCase();
        const results = mockProducts.filter(p => 
          p.name.toLowerCase().includes(lowercaseQuery) ||
          p.description.toLowerCase().includes(lowercaseQuery) ||
          p.brand.toLowerCase().includes(lowercaseQuery) ||
          p.category.toLowerCase().includes(lowercaseQuery)
        );
        resolve(results);
      }, 300);
    });
  }

  // Cart functions
  static getCart(): CartItem[] {
    return this.cart;
  }

  static addToCart(product: Product, quantity: number = 1, size?: string, color?: string): void {
    const existingItemIndex = this.cart.findIndex(
      item => item.product.id === product.id && 
               item.size === size && 
               item.color === color
    );

    if (existingItemIndex >= 0) {
      this.cart[existingItemIndex].quantity += quantity;
    } else {
      this.cart.push({
        id: `cart-${Date.now()}-${Math.random()}`,
        product,
        quantity,
        size,
        color
      });
    }
  }

  static updateCartItem(itemId: string, quantity: number): void {
    const itemIndex = this.cart.findIndex(item => item.id === itemId);
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        this.cart.splice(itemIndex, 1);
      } else {
        this.cart[itemIndex].quantity = quantity;
      }
    }
  }

  static removeFromCart(itemId: string): void {
    this.cart = this.cart.filter(item => item.id !== itemId);
  }

  static clearCart(): void {
    this.cart = [];
  }

  static getCartTotal(): number {
    return this.cart.reduce((total, item) => {
      const discountedPrice = item.product.price * (1 - item.product.discount_percentage / 100);
      return total + (discountedPrice * item.quantity);
    }, 0);
  }

  static getCartItemCount(): number {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  // Utility functions
  static formatPrice(price: number): string {
    return `GH₵${price.toFixed(2)}`;
  }

  static getDiscountedPrice(price: number, discountPercentage: number): number {
    return price * (1 - discountPercentage / 100);
  }

  static getCategoryDisplayName(category: string): string {
    switch (category) {
      case 'sneakers': return 'Sneakers';
      case 'clothes': return 'Clothes';
      case 'accessories': return 'Accessories';
      default: return category;
    }
  }

  // Voice command simulation
  static processVoiceCommand(command: string): Promise<{ success: boolean; action?: string; data?: any }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const lowerCommand = command.toLowerCase();
        
        if (lowerCommand.includes('show') && lowerCommand.includes('sneakers')) {
          resolve({ success: true, action: 'navigate_category', data: 'sneakers' });
        } else if (lowerCommand.includes('show') && lowerCommand.includes('clothes')) {
          resolve({ success: true, action: 'navigate_category', data: 'clothes' });
        } else if (lowerCommand.includes('show') && lowerCommand.includes('accessories')) {
          resolve({ success: true, action: 'navigate_category', data: 'accessories' });
        } else if (lowerCommand.includes('search')) {
          const searchTerm = lowerCommand.replace(/search\s+(for\s+)?/g, '');
          resolve({ success: true, action: 'search', data: searchTerm });
        } else if (lowerCommand.includes('cart') || lowerCommand.includes('cut')) {
          resolve({ success: true, action: 'view_cart' });
        } else if (lowerCommand.includes('home')) {
          resolve({ success: true, action: 'navigate_home' });
        } else {
          resolve({ success: false });
        }
      }, 250);
    });
  }
}
