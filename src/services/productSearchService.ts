import { Product } from '../hooks/useProducts';
import { AdminService } from './adminService';

export class ProductSearchService {
  private static products: Product[] = [];
  private static lastFetch: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Load products from database with caching
   */
  private static async loadProducts(): Promise<Product[]> {
    const now = Date.now();
    
    // Return cached products if still fresh
    if (this.products.length > 0 && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.products;
    }

    try {
      console.log('🔍 Loading products for search...');
      this.products = await AdminService.getAllProducts();
      this.lastFetch = now;
      console.log(`✅ Loaded ${this.products.length} products for search`);
      return this.products;
    } catch (error) {
      console.error('❌ Failed to load products for search:', error);
      return this.products; // Return cached products if available
    }
  }

  /**
   * Find product by name with fuzzy matching
   */
  static async findProductByName(query: string): Promise<Product | null> {
    const products = await this.loadProducts();
    
    if (!query || query.trim().length === 0) {
      return null;
    }

    const searchQuery = query.toLowerCase().trim();
    console.log(`🔍 Searching for product: "${searchQuery}"`);

    // 1. Exact name match
    let match = products.find(p => 
      p.name.toLowerCase() === searchQuery
    );
    if (match) {
      console.log(`✅ Exact match found: ${match.name}`);
      return match;
    }

    // 2. Name contains query
    match = products.find(p => 
      p.name.toLowerCase().includes(searchQuery)
    );
    if (match) {
      console.log(`✅ Name contains match found: ${match.name}`);
      return match;
    }

    // 3. Query contains product name (for shorter product names)
    match = products.find(p => 
      searchQuery.includes(p.name.toLowerCase())
    );
    if (match) {
      console.log(`✅ Query contains product name match found: ${match.name}`);
      return match;
    }

    // 4. Brand match
    match = products.find(p => 
      p.brand.toLowerCase().includes(searchQuery) ||
      searchQuery.includes(p.brand.toLowerCase())
    );
    if (match) {
      console.log(`✅ Brand match found: ${match.name} (${match.brand})`);
      return match;
    }

    // 5. Category match - return first product in category
    match = products.find(p => 
      p.category.toLowerCase().includes(searchQuery) ||
      searchQuery.includes(p.category.toLowerCase())
    );
    if (match) {
      console.log(`✅ Category match found: ${match.name} (${match.category})`);
      return match;
    }

    // 6. Fuzzy word matching
    const queryWords = searchQuery.split(' ').filter(w => w.length > 2);
    if (queryWords.length > 0) {
      match = products.find(p => {
        const productWords = p.name.toLowerCase().split(' ');
        return queryWords.some(qw => 
          productWords.some(pw => pw.includes(qw) || qw.includes(pw))
        );
      });
      
      if (match) {
        console.log(`✅ Fuzzy match found: ${match.name}`);
        return match;
      }
    }

    // 7. Description match (last resort)
    match = products.find(p => 
      p.description.toLowerCase().includes(searchQuery)
    );
    if (match) {
      console.log(`✅ Description match found: ${match.name}`);
      return match;
    }

    console.log(`❌ No product found for: "${searchQuery}"`);
    return null;
  }

  /**
   * Find multiple products by name (for suggestions)
   */
  static async findProductsByName(query: string, limit: number = 3): Promise<Product[]> {
    const products = await this.loadProducts();
    
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchQuery = query.toLowerCase().trim();
    const matches: Product[] = [];

    // Collect matches with different priorities
    const exactMatches = products.filter(p => 
      p.name.toLowerCase().includes(searchQuery)
    );
    
    const brandMatches = products.filter(p => 
      p.brand.toLowerCase().includes(searchQuery) &&
      !exactMatches.includes(p)
    );

    const categoryMatches = products.filter(p => 
      p.category.toLowerCase().includes(searchQuery) &&
      !exactMatches.includes(p) &&
      !brandMatches.includes(p)
    );

    // Combine matches with priority
    matches.push(...exactMatches.slice(0, limit));
    if (matches.length < limit) {
      matches.push(...brandMatches.slice(0, limit - matches.length));
    }
    if (matches.length < limit) {
      matches.push(...categoryMatches.slice(0, limit - matches.length));
    }

    return matches.slice(0, limit);
  }

  /**
   * Clear product cache (useful after product updates)
   */
  static clearCache(): void {
    this.products = [];
    this.lastFetch = 0;
  }
}
