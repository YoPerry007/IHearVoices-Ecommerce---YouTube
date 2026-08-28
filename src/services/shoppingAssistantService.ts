import { supabase } from '../config/supabase';

export type AssistantRole = 'user' | 'assistant';

export interface AssistantHistoryMessage {
  role: AssistantRole;
  content: string;
}
export interface AssistantProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  brand: string;
  in_stock: boolean;
  stock_count: number;
  rating: number;
  review_count: number;
  discount_percentage: number;
  organization_id?: string;
  organization?: { id: string; name: string; slug: string } | null;
}

export interface AssistantOrder {
  id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  total_amount: number;
  created_at: string;
  updated_at: string;
  item_names: string[];
}

export interface ShoppingAssistantResponse {
  reply: string;
  products: AssistantProduct[];
  orders: AssistantOrder[];
}

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1000;

export class ShoppingAssistantService {
  static async sendMessage(
    message: string,
    history: AssistantHistoryMessage[],
  ): Promise<ShoppingAssistantResponse> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      throw new Error('Please enter a message.');
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
    }

    const safeHistory = history
      .filter(
        (item): item is AssistantHistoryMessage =>
          (item.role === 'user' || item.role === 'assistant') &&
          typeof item.content === 'string' &&
          item.content.trim().length > 0,
      )
      .slice(-MAX_HISTORY_MESSAGES)
      .map((item) => ({
        role: item.role,
        content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
      }));

    let {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const expiresSoon =
      typeof session.expires_at === 'number' &&
      session.expires_at <= Math.floor(Date.now() / 1000) + 60;

    if (expiresSoon) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      session = refreshed.session;
    }

    const { data, error } = await supabase.functions.invoke('shopping-assistant', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        message: trimmedMessage,
        history: safeHistory,
      },
    });

    if (error) {
      console.error('Shopping assistant request failed:', error);
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 401) {
        throw new Error('Your session has expired. Please sign out and sign in again.');
      }
      if (status === 403) {
        throw new Error('The shopping assistant is available to customer accounts only.');
      }
      throw new Error(
        'The shopping assistant is unavailable right now. Please try again shortly.',
      );
    }

    if (!data || typeof data.reply !== 'string') {
      throw new Error('The shopping assistant returned an invalid response.');
    }

    return {
      reply: data.reply,
      products: Array.isArray(data.products) ? data.products : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
    };
  }
}
