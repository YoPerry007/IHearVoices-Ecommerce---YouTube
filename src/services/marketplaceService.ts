import { supabase } from '../config/supabase';

export type OrganizationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Organization {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  phone: string | null;
  location: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: OrganizationStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreApplicationInput {
  name: string;
  description?: string;
  contactEmail: string;
  phone?: string;
  location?: string;
  logoUrl?: string;
}

const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

export class MarketplaceService {
  static async getOwnedOrganization(userId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as Organization | null;
  }

  static async applyForStore(userId: string, input: StoreApplicationInput): Promise<Organization> {
    const baseSlug = slugify(input.name) || 'store';
    const slug = `${baseSlug}-${userId.slice(0, 6).toLowerCase()}`;
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        owner_id: userId,
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        contact_email: input.contactEmail.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        location: input.location?.trim() || null,
        logo_url: input.logoUrl?.trim() || null,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as Organization;
  }

  static async updateStore(organizationId: string, updates: Partial<Organization>): Promise<Organization> {
    const editable = {
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
      ...(updates.contact_email !== undefined && { contact_email: updates.contact_email?.trim() || null }),
      ...(updates.phone !== undefined && { phone: updates.phone?.trim() || null }),
      ...(updates.location !== undefined && { location: updates.location?.trim() || null }),
      ...(updates.logo_url !== undefined && { logo_url: updates.logo_url?.trim() || null }),
      ...(updates.banner_url !== undefined && { banner_url: updates.banner_url?.trim() || null }),
    };
    const { data, error } = await supabase
      .from('organizations')
      .update(editable)
      .eq('id', organizationId)
      .select('*')
      .single();
    if (error) throw error;
    return data as Organization;
  }

  static async getApprovedStores(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('status', 'approved')
      .order('name');
    if (error) throw error;
    return (data || []) as Organization[];
  }

  static async getAllStoresForAdmin(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Organization[];
  }

  static async reviewStore(id: string, status: Exclude<OrganizationStatus, 'pending'>, reason?: string) {
    const { data, error } = await supabase.rpc('review_store_application', {
      target_organization_id: id,
      new_status: status,
      reason: reason || null,
    });
    if (error) throw error;
    return data as Organization;
  }

  static async getMarketplaceProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, organization:organizations!products_organization_id_fkey(id,name,slug,logo_url,status)')
      .eq('status', 'published')
      .eq('in_stock', true)
      .gt('stock_count', 0)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getOwnerProducts(organizationId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createOwnerProduct(organizationId: string, product: {
    name: string; description: string; category: string; price: number; brand: string;
    stock_count: number; images?: string[]; sizes?: string[]; colors?: string[];
  }) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        organization_id: organizationId,
        status: 'published',
        name: product.name.trim(),
        description: product.description.trim(),
        category: product.category.trim().toLowerCase(),
        price: product.price,
        brand: product.brand.trim(),
        stock_count: product.stock_count,
        in_stock: product.stock_count > 0,
        images: product.images || [],
        sizes: product.sizes || [],
        colors: product.colors || [],
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async getOwnerOrders(organizationId: string) {
    const { data, error } = await supabase
      .from('seller_orders')
      .select(`*, customer:profiles!seller_orders_customer_id_fkey(full_name,email),
        order_items(id,quantity,price,size,color,products:product_id(name,images))`)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async updateSellerOrderStatus(orderId: string, status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled') {
    const { error } = await supabase
      .from('seller_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) throw error;
  }
}

export default MarketplaceService;
