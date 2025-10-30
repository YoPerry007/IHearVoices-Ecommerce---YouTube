import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Supabase configuration
const supabaseUrl = 'https://jodlypsnizdowjogpgxl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGx5cHNuaXpkb3dqb2dwZ3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTE2MTMsImV4cCI6MjA3NTA4NzYxM30.DqdqbmordzJysQdznli9LDn9gKA4Wi0T20ofFF_gvKo';

// Custom storage implementation using Expo SecureStore with error handling
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      // Check if this is a chunked item
      const chunkCount = await SecureStore.getItemAsync(`${key}_count`);
      if (chunkCount) {
        const count = parseInt(chunkCount);
        let value = '';
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
          if (chunk) value += chunk;
        }
        return value || null;
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.warn('SecureStore getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      // Split large values into chunks to avoid the 2048 byte limit
      if (value.length > 2000) {
        const chunks = [];
        for (let i = 0; i < value.length; i += 2000) {
          chunks.push(value.substring(i, i + 2000));
        }
        
        // Store chunk count and chunks separately
        await SecureStore.setItemAsync(`${key}_count`, chunks.length.toString());
        for (let i = 0; i < chunks.length; i++) {
          await SecureStore.setItemAsync(`${key}_${i}`, chunks[i]);
        }
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.warn('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      // Check if this is a chunked item
      const chunkCount = await SecureStore.getItemAsync(`${key}_count`);
      if (chunkCount) {
        const count = parseInt(chunkCount);
        await SecureStore.deleteItemAsync(`${key}_count`);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.warn('SecureStore removeItem error:', error);
    }
  },
};

// Create Supabase client with custom storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: 'user' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          category: 'sneakers' | 'clothes' | 'accessories';
          price: number;
          images: string[];
          brand: string;
          sizes: string[];
          colors: string[];
          in_stock?: boolean;
          stock_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          category?: 'sneakers' | 'clothes' | 'accessories';
          price?: number;
          images?: string[];
          brand?: string;
          sizes?: string[];
          colors?: string[];
          in_stock?: boolean;
          stock_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          total_amount: number;
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          shipping_address: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_amount: number;
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          shipping_address: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_amount?: number;
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          shipping_address?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price: number;
          size: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price: number;
          size?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          price?: number;
          size?: string | null;
          color?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'user' | 'admin';
      product_category: 'sneakers' | 'clothes' | 'accessories';
      order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    };
  };
}
