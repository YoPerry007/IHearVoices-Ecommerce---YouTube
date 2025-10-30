export interface VoiceCommands {
  type: 'navigation' | 'search' | 'category' | 'cart' | 'checkout' | 'help';
  action?: string;
  query?: string;
  category?: string;
  productId?: string;
  quantity?: number;
}
