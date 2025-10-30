import { useState, useEffect, useCallback } from 'react';
import { AdminService } from '../services/adminService';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string; // Allow any string for dynamic categories
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

// CartItem interface moved to cartService.ts - use CartContext for cart functionality

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminService.getAllProducts();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get products by category
  const getProductsByCategory = useCallback(async (category?: string) => {
    try {
      setLoading(true);
      setError(null);
      const allProducts = await AdminService.getAllProducts();
      
      if (category && category !== 'all') {
        const filtered = allProducts.filter(product => 
          product.category === category && product.in_stock
        );
        return filtered;
      }
      
      return allProducts.filter(product => product.in_stock);
    } catch (err) {
      setError('Failed to load products by category');
      console.error('Error loading products by category:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get featured products (top rated, in stock)
  const getFeaturedProducts = useCallback(async () => {
    try {
      setError(null);
      const allProducts = await AdminService.getAllProducts();
      const featured = allProducts
        .filter(product => product.in_stock && product.rating >= 4)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6);
      
      setFeaturedProducts(featured);
      return featured;
    } catch (err) {
      setError('Failed to load featured products');
      console.error('Error loading featured products:', err);
      return [];
    }
  }, []);

  // Search products
  const searchProducts = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const allProducts = await AdminService.getAllProducts();
      
      const searchResults = allProducts.filter(product =>
        product.in_stock && (
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.brand.toLowerCase().includes(query.toLowerCase()) ||
          product.description.toLowerCase().includes(query.toLowerCase())
        )
      );
      
      return searchResults;
    } catch (err) {
      setError('Failed to search products');
      console.error('Error searching products:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get product by ID
  const getProductById = useCallback(async (productId: string) => {
    try {
      setError(null);
      const allProducts = await AdminService.getAllProducts();
      return allProducts.find(product => product.id === productId) || null;
    } catch (err) {
      setError('Failed to load product');
      console.error('Error loading product:', err);
      return null;
    }
  }, []);

  // Cart functionality removed - use CartContext for cart management

  // Initialize data on mount
  useEffect(() => {
    loadProducts();
    getFeaturedProducts();
  }, [loadProducts, getFeaturedProducts]);

  return {
    // Data
    products,
    featuredProducts,
    loading,
    error,
    
    // Product functions
    loadProducts,
    getProductsByCategory,
    getFeaturedProducts,
    searchProducts,
    getProductById,
  };
};

export default useProducts;
