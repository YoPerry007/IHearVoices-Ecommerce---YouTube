import { VoiceCommands } from '../types/voiceCommands';

export interface VoiceCommandResult {
  command: string;
  confidence: number;
  action: string;
  parameters: Record<string, any>;
  originalText: string;
}

export class VoiceAssistantService {
  // Ghanaian pronunciation mappings
  private static readonly GHANAIAN_MAPPINGS: Record<string, string[]> = {
    // Cart variations
    'cart': ['cut', 'cat', 'kaat', 'kat'],
    'add': ['aad', 'ad', 'aad'],
    'remove': ['rimuuv', 'remoov', 'rimuuf'],
    'checkout': ['chekout', 'chekaut', 'chekout'],

    // Navigation
    'home': ['hoom', 'hom', 'uum'],
    'products': ['produkts', 'produks', 'produk'],
    'profile': ['profil', 'profeel', 'profil'],

    // Product categories
    'sneakers': ['snikas', 'sneekas', 'sneakas'],
    'shoes': ['shuz', 'shuuz', 'shoes'],
    'clothes': ['kloz', 'klos', 'klothes'],
    'jeans': ['jins', 'gins', 'jeens'],
    'shirt': ['shot', 'shaat', 'shot'],
    'dress': ['dres', 'drees'],

    // Actions
    'search': ['sach', 'saach', 'sarch'],
    'buy': ['bai', 'buy', 'bai'],
    'show': ['sho', 'shoo', 'show'],
    'view': ['viu', 'vyu', 'view'],

    // Numbers
    'one': ['wan', 'wun', 'one'],
    'two': ['tu', 'too', 'two'],
    'three': ['tri', 'tree', 'three'],
    'four': ['fo', 'fuo', 'four'],
    'five': ['faiv', 'five'],
  };

  // Command patterns with fuzzy matching
  private static readonly COMMAND_PATTERNS = [
    // Cart operations
    {
      pattern: /^(add|aad|ad)\s+(to)?\s*(cart|cut|cat|kaat|kat)$/i,
      action: 'add_to_cart',
      confidence: 0.9,
    },
    {
      pattern: /^(remove|rimuuv|remoov)\s+from\s+(cart|cut|cat)$/i,
      action: 'remove_from_cart',
      confidence: 0.9,
    },
    {
      pattern: /^(clear|empty)\s+(cart|cut|cat)$/i,
      action: 'clear_cart',
      confidence: 0.9,
    },
    {
      pattern: /^(view|show|check)\s+(cart|cut|cat)$/i,
      action: 'view_cart',
      confidence: 0.9,
    },
    {
      pattern: /^(go\s+to|navigate\s+to|open)\s+(cart|cut|cat)$/i,
      action: 'navigate_to_cart',
      confidence: 0.9,
    },

    // Navigation commands
    {
      pattern: /^(go\s+to|navigate\s+to|open)\s+(home|hoom|hom|uum)$/i,
      action: 'navigate_home',
      confidence: 0.9,
    },
    {
      pattern: /^(show|view|see)\s+(products|produkts|produks|produk)$/i,
      action: 'view_products',
      confidence: 0.8,
    },
    {
      pattern: /^(go\s+to|navigate\s+to|open)\s+(profile|profil|profeel)$/i,
      action: 'navigate_profile',
      confidence: 0.9,
    },

    // Product search
    {
      pattern: /^(search|find|look\s+for)\s+(for\s+)?(.+)$/i,
      action: 'search_products',
      confidence: 0.7,
      extractParams: (text: string) => {
        const match = text.match(/^(search|find|look\s+for)\s+(for\s+)?(.+)$/i);
        return match ? { query: match[3].trim() } : {};
      },
    },

    // Category browsing
    {
      pattern: /^(show|view|see)\s+(sneakers|snikas|sneekas|sneakas)$/i,
      action: 'browse_sneakers',
      confidence: 0.9,
    },
    {
      pattern: /^(show|view|see)\s+(clothes|kloz|klos|klothes)$/i,
      action: 'browse_clothes',
      confidence: 0.9,
    },

    // Checkout
    {
      pattern: /^(checkout|chekout|chekaut|pay)$/i,
      action: 'checkout',
      confidence: 0.9,
    },
    {
      pattern: /^(proceed\s+to\s+)?checkout$/i,
      action: 'checkout',
      confidence: 0.8,
    },

    // Help
    {
      pattern: /^(help|halp|elp)$/i,
      action: 'show_help',
      confidence: 0.9,
    },
  ];

  // Levenshtein distance for fuzzy matching
  private static levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // Normalize Ghanaian pronunciation
  private static normalizeGhanaianText(text: string): string {
    let normalized = text.toLowerCase().trim();

    // Apply pronunciation mappings
    for (const [standard, variations] of Object.entries(this.GHANAIAN_MAPPINGS)) {
      for (const variation of variations) {
        if (normalized.includes(variation)) {
          normalized = normalized.replace(new RegExp(variation, 'g'), standard);
        }
      }
    }

    // Remove filler words common in Ghanaian speech
    const fillerWords = ['eh', 'ahn', 'um', 'er', 'you know', 'like'];
    fillerWords.forEach(filler => {
      normalized = normalized.replace(new RegExp(`\\b${filler}\\b`, 'g'), '');
    });

    return normalized.trim();
  }

  // Process voice command with Ghanaian accent handling
  static async processVoiceCommand(text: string): Promise<VoiceCommandResult | null> {
    const normalizedText = this.normalizeGhanaianText(text);
    const originalText = text;

    console.log('Original:', originalText);
    console.log('Normalized:', normalizedText);

    // Try exact matches first
    for (const command of this.COMMAND_PATTERNS) {
      const match = normalizedText.match(command.pattern);
      if (match) {
        const result: VoiceCommandResult = {
          command: normalizedText,
          confidence: command.confidence,
          action: command.action,
          parameters: command.extractParams ? command.extractParams(normalizedText) : {},
          originalText,
        };
        return result;
      }
    }

    // Try fuzzy matching for close matches
    for (const command of this.COMMAND_PATTERNS) {
      const patternText = command.pattern.source.replace(/[()\\]/g, '');
      const distance = this.levenshteinDistance(normalizedText, patternText);

      // If distance is small enough (less than 30% of length), consider it a match
      const threshold = Math.max(2, Math.floor(normalizedText.length * 0.3));

      if (distance <= threshold) {
        const confidence = Math.max(0.4, command.confidence - (distance * 0.1));

        const result: VoiceCommandResult = {
          command: normalizedText,
          confidence,
          action: command.action,
          parameters: command.extractParams ? command.extractParams(normalizedText) : {},
          originalText,
        };

        // Only return if confidence is above minimum threshold
        if (confidence >= 0.5) {
          return result;
        }
      }
    }

    return null;
  }

  // Get available voice commands for help
  static getVoiceCommands(): Array<{ command: string; description: string; examples: string[] }> {
    return [
      {
        command: 'Navigation',
        description: 'Navigate between app sections',
        examples: [
          'Go to home',
          'Show products',
          'Open profile',
          'View cart'
        ]
      },
      {
        command: 'Shopping',
        description: 'Browse and search products',
        examples: [
          'Search for sneakers',
          'Show me jeans',
          'Find black shirts',
          'Browse clothes'
        ]
      },
      {
        command: 'Cart Management',
        description: 'Manage your shopping cart',
        examples: [
          'Add to cart',
          'Remove from cart',
          'Clear cart',
          'View cart'
        ]
      },
      {
        command: 'Checkout',
        description: 'Complete your purchase',
        examples: [
          'Checkout',
          'Proceed to checkout',
          'Pay now'
        ]
      }
    ];
  }

  // Execute voice command (returns action to be performed by UI)
  static executeVoiceCommand(result: VoiceCommandResult): VoiceCommands | null {
    switch (result.action) {
      case 'navigate_home':
        return { type: 'navigation', action: 'home' };

      case 'view_products':
        return { type: 'navigation', action: 'products' };

      case 'navigate_profile':
        return { type: 'navigation', action: 'profile' };

      case 'navigate_to_cart':
      case 'view_cart':
        return { type: 'navigation', action: 'cart' };

      case 'browse_sneakers':
        return { type: 'category', category: 'sneakers' };

      case 'browse_clothes':
        return { type: 'category', category: 'clothes' };

      case 'search_products':
        return {
          type: 'search',
          query: result.parameters.query || ''
        };

      case 'add_to_cart':
        return { type: 'cart', action: 'add' };

      case 'remove_from_cart':
        return { type: 'cart', action: 'remove' };

      case 'clear_cart':
        return { type: 'cart', action: 'clear' };

      case 'checkout':
        return { type: 'checkout' };

      case 'show_help':
        return { type: 'help' };

      default:
        return null;
    }
  }
}

export default VoiceAssistantService;
