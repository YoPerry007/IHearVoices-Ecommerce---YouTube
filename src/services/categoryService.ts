/**
 * CategoryService - Manages product categories for admin and user interfaces
 * 
 * Features:
 * - Get all categories from database
 * - Create new categories dynamically
 * - Get category statistics
 * - Update category information
 */

import { supabase } from '../config/supabase';

export interface Category {
  id: string;
  name: string;
  description?: string;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryStats {
  total_categories: number;
  most_popular_category: string;
  category_distribution: { name: string; count: number }[];
}

class CategoryService {
  /**
   * Get all available categories from products
   * Since we're using ENUM, we'll extract unique categories from existing products
   */
  static async getAllCategories(): Promise<string[]> {
    try {
      console.log('Fetching all categories from products...');
      
      // Get distinct categories from products table
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching categories:', error);
        // Return default categories as fallback
        return ['sneakers', 'clothes', 'accessories'];
      }

      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      console.log('Found categories:', uniqueCategories);
      
      return uniqueCategories.length > 0 ? uniqueCategories : ['sneakers', 'clothes', 'accessories'];
      
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return ['sneakers', 'clothes', 'accessories'];
    }
  }

  /**
   * Get categories with product count statistics
   */
  static async getCategoriesWithStats(): Promise<Category[]> {
    try {
      console.log('Fetching categories with statistics...');
      
      // Get category counts
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching category stats:', error);
        throw error;
      }

      // Count products per category
      const categoryCount: { [key: string]: number } = {};
      data.forEach(product => {
        categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
      });

      // Convert to Category objects
      const categories: Category[] = Object.entries(categoryCount).map(([name, count]) => ({
        id: name,
        name: name,
        description: this.getCategoryDescription(name),
        product_count: count,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      console.log('Categories with stats:', categories);
      return categories;
      
    } catch (error) {
      console.error('Error in getCategoriesWithStats:', error);
      throw error;
    }
  }

  /**
   * Get category statistics for admin dashboard
   */
  static async getCategoryStats(): Promise<CategoryStats> {
    try {
      const categories = await this.getCategoriesWithStats();
      
      const totalCategories = categories.length;
      const categoryDistribution = categories
        .map(cat => ({ name: cat.name, count: cat.product_count || 0 }))
        .sort((a, b) => b.count - a.count);
      
      const mostPopularCategory = categoryDistribution.length > 0 
        ? categoryDistribution[0].name 
        : 'sneakers';

      return {
        total_categories: totalCategories,
        most_popular_category: mostPopularCategory,
        category_distribution: categoryDistribution,
      };
      
    } catch (error) {
      console.error('Error in getCategoryStats:', error);
      throw error;
    }
  }

  /**
   * Check if a category exists in the database
   */
  static async categoryExists(categoryName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('category', categoryName)
        .limit(1);

      if (error) {
        console.error('Error checking category existence:', error);
        return false;
      }

      return data.length > 0;
      
    } catch (error) {
      console.error('Error in categoryExists:', error);
      return false;
    }
  }

  /**
   * Create a new category by creating a placeholder product
   * Since we're using ENUM, we can't directly add to ENUM without schema changes
   * This method will be used for validation and future schema updates
   */
  static async validateNewCategory(categoryName: string): Promise<{ valid: boolean; message: string }> {
    try {
      // Validate category name
      if (!categoryName || categoryName.trim().length === 0) {
        return { valid: false, message: 'Category name cannot be empty' };
      }

      if (categoryName.length > 50) {
        return { valid: false, message: 'Category name must be less than 50 characters' };
      }

      // Check if category already exists
      const exists = await this.categoryExists(categoryName);
      if (exists) {
        return { valid: false, message: 'Category already exists' };
      }

      // Validate format (lowercase, no spaces, alphanumeric + underscores)
      const validFormat = /^[a-z0-9_]+$/.test(categoryName);
      if (!validFormat) {
        return { valid: false, message: 'Category name must be lowercase letters, numbers, and underscores only' };
      }

      return { valid: true, message: 'Category name is valid' };
      
    } catch (error) {
      console.error('Error validating category:', error);
      return { valid: false, message: 'Error validating category name' };
    }
  }

  /**
   * Get predefined category descriptions
   */
  private static getCategoryDescription(category: string): string {
    const descriptions: { [key: string]: string } = {
      'sneakers': 'Athletic and casual footwear',
      'clothes': 'Apparel and clothing items',
      'accessories': 'Fashion accessories and add-ons',
    };
    
    return descriptions[category] || `${category.charAt(0).toUpperCase() + category.slice(1)} products`;
  }

  /**
   * Format category name for display
   */
  static formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get category colors for UI theming
   */
  static getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'sneakers': '#FF6B6B',
      'clothes': '#4ECDC4', 
      'accessories': '#45B7D1',
    };
    
    return colors[category] || '#8E8E93';
  }
}

export default CategoryService;
