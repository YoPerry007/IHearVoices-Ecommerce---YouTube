import { supabase } from '../config/supabase';
import { MockDataService } from '../services/mockData';

/**
 * Database Seeding Utility
 * Seeds the database with mock products for development and testing
 */
export class DatabaseSeeder {
  
  /**
   * Seed products table with mock data
   */
  static async seedProducts(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...');
      
      // Get mock products
      const mockProducts = await MockDataService.getAllProducts();
      
      // Check if products already exist
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      if (count && count > 0) {
        console.log(`📦 Database already has ${count} products. Skipping seed.`);
        return;
      }
      
      // Prepare products for insertion
      const productsToInsert = mockProducts.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        images: product.images,
        brand: product.brand,
        sizes: product.sizes,
        colors: product.colors,
        in_stock: product.in_stock,
        stock_count: product.stock_count,
        featured: product.featured,
        discount_percentage: product.discount_percentage,
        rating: product.rating,
        review_count: product.review_count
      }));
      
      // Insert products
      const { data, error } = await supabase
        .from('products')
        .insert(productsToInsert);
      
      if (error) {
        console.error('❌ Error seeding products:', error);
        throw error;
      }
      
      console.log(`✅ Successfully seeded ${productsToInsert.length} products!`);
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
  
  /**
   * Check if database tables exist and are accessible
   */
  static async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Test products table
      const { error: productsError } = await supabase
        .from('products')
        .select('id')
        .limit(1);
      
      if (productsError) {
        console.warn('⚠️ Products table not accessible:', productsError.message);
        return false;
      }
      
      // Test cart_items table
      const { error: cartError } = await supabase
        .from('cart_items')
        .select('id')
        .limit(1);
      
      if (cartError) {
        console.warn('⚠️ Cart_items table not accessible:', cartError.message);
        return false;
      }
      
      console.log('✅ Database health check passed');
      return true;
      
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }
  
  /**
   * Initialize database with required data
   */
  static async initializeDatabase(): Promise<void> {
    try {
      console.log('🚀 Initializing database...');
      
      // Check database health
      const isHealthy = await this.checkDatabaseHealth();
      
      if (!isHealthy) {
        console.warn('⚠️ Database not ready. Cart will use mock data fallback.');
        return;
      }
      
      // Seed products
      await this.seedProducts();
      
      console.log('🎉 Database initialization complete!');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      console.warn('⚠️ Continuing with mock data fallback...');
    }
  }
}

// Auto-initialize on import in development
if (__DEV__) {
  DatabaseSeeder.initializeDatabase().catch(console.error);
}
