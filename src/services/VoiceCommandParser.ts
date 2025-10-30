export interface VoiceCommand {
  type: 'navigation' | 'navigate' | 'search' | 'category' | 'cart' | 'checkout' | 'help' | 'product' | 'add_to_cart';
  action?: string;
  query?: string;
  category?: string;
  productId?: string;
  quantity?: number;
  product_query?: string;
  screen?: string;
  parameters?: Record<string, any>;
}

export interface ParsedCommand {
  command: VoiceCommand;
  confidence: number;
  originalText: string;
  normalizedText: string;
  intent: string;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}

interface CommandPattern {
  patterns: RegExp[];
  intent: string;
  type: VoiceCommand['type'];
  action?: string;
  category?: string;
  confidence: number;
  extractParams?: (text: string) => Record<string, any>;
}

export class VoiceCommandParser {
  // Enhanced patterns for natural language understanding
  private static readonly COMMAND_PATTERNS: CommandPattern[] = [
    // Navigation Commands
    {
      patterns: [
        /^(go to|navigate to|open|show me|take me to)\s+(home|main page|start)$/i,
        /^(home|main|start|beginning)$/i,
      ],
      intent: 'navigate_home',
      type: 'navigation' as const,
      action: 'home',
      confidence: 0.95,
    },
    {
      patterns: [
        /^(go to|navigate to|open|show me)\s+(profile|account|my account|settings)$/i,
        /^(profile|account|my profile)$/i,
      ],
      intent: 'navigate_profile',
      type: 'navigation' as const,
      action: 'profile',
      confidence: 0.95,
    },
    {
      patterns: [
        /^(go to|navigate to|open|show me|check)\s+(cart|shopping cart|basket)$/i,
        /^(cart|shopping cart|my cart)$/i,
        /^(what's in my cart|show cart contents)$/i,
      ],
      intent: 'navigate_cart',
      type: 'navigation' as const,
      action: 'cart',
      confidence: 0.95,
    },

    // Search Commands - Most Important for E-commerce
    {
      patterns: [
        /^(search for|find|look for|show me|i want|i need)\s+(.+)$/i,
        /^(find me|get me|show me)\s+(.+)$/i,
        /^(where can i find|do you have)\s+(.+)$/i,
      ],
      intent: 'search_products',
      type: 'search' as const,
      confidence: 0.90,
      extractParams: (text: string) => {
        const match = text.match(/^(?:search for|find|look for|show me|i want|i need|find me|get me|where can i find|do you have)\s+(.+)$/i);
        return match ? { query: match[1].trim() } : {};
      },
    },

    // Category Browsing
    {
      patterns: [
        /^(show|view|browse|see)\s+(sneakers|shoes|footwear)$/i,
        /^(i want to see|show me some)\s+(sneakers|shoes|footwear)$/i,
      ],
      intent: 'browse_sneakers',
      type: 'category' as const,
      category: 'sneakers',
      confidence: 0.90,
    },
    {
      patterns: [
        /^(show|view|browse|see)\s+(clothes|clothing|apparel|fashion)$/i,
        /^(i want to see|show me some)\s+(clothes|clothing|apparel)$/i,
      ],
      intent: 'browse_clothes',
      type: 'category' as const,
      category: 'clothes',
      confidence: 0.90,
    },
    {
      patterns: [
        /^(show|view|browse|see)\s+(jeans|denim|pants)$/i,
        /^(i want to see|show me some)\s+(jeans|denim)$/i,
      ],
      intent: 'browse_jeans',
      type: 'category' as const,
      category: 'jeans',
      confidence: 0.90,
    },
    {
      patterns: [
        /^(show|view|browse|see)\s+(shirts|tops|t-shirts|tees)$/i,
        /^(i want to see|show me some)\s+(shirts|tops)$/i,
      ],
      intent: 'browse_shirts',
      type: 'category' as const,
      category: 'shirts',
      confidence: 0.90,
    },
    {
      patterns: [
        /^(show|view|browse|see)\s+(dresses|dress|gowns)$/i,
        /^(i want to see|show me some)\s+(dresses|dress)$/i,
      ],
      intent: 'browse_dresses',
      type: 'category' as const,
      category: 'dresses',
      confidence: 0.90,
    },

    // Cart Operations
    {
      patterns: [
        /^(add to cart|add this|put in cart|buy this)$/i,
        /^(add it|add this item|i want this)$/i,
      ],
      intent: 'add_to_cart',
      type: 'cart' as const,
      action: 'add',
      confidence: 0.85,
    },

    // Add specific product to cart
    {
      patterns: [
        /^(add|put)\s+(.+?)\s+(to cart|in cart|to my cart)$/i,
        /^(i want|get me|buy)\s+(.+?)$/i,
        /^(add|put)\s+(.+)$/i,
      ],
      intent: 'add_product_to_cart',
      type: 'add_to_cart' as const,
      action: 'add',
      confidence: 0.90,
      extractParams: (text: string) => {
        // Extract product name from "add [product] to cart" patterns
        const patterns = [
          /^(?:add|put)\s+(.+?)\s+(?:to cart|in cart|to my cart)$/i,
          /^(?:i want|get me|buy)\s+(.+?)$/i,
          /^(?:add|put)\s+(.+)$/i,
        ];
        
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const productName = match[1].trim();
            // Filter out common words that aren't product names
            if (!['to', 'the', 'a', 'an', 'this', 'that'].includes(productName.toLowerCase())) {
              return { 
                product_query: productName,
                query: productName 
              };
            }
          }
        }
        return {};
      },
    },
    {
      patterns: [
        /^(remove from cart|delete from cart|take out)$/i,
        /^(remove it|remove this|delete this)$/i,
      ],
      intent: 'remove_from_cart',
      type: 'cart' as const,
      action: 'remove',
      confidence: 0.85,
    },
    {
      patterns: [
        /^(clear cart|empty cart|remove everything|delete all)$/i,
        /^(clear my cart|empty my cart)$/i,
      ],
      intent: 'clear_cart',
      type: 'cart' as const,
      action: 'clear',
      confidence: 0.90,
    },

    // Checkout Commands
    {
      patterns: [
        /^(checkout|proceed to checkout|pay now|buy now)$/i,
        /^(i want to checkout|let's checkout|ready to pay)$/i,
        /^(complete purchase|finish order|place order)$/i,
      ],
      intent: 'checkout',
      type: 'checkout' as const,
      confidence: 0.95,
    },

    // Help Commands
    {
      patterns: [
        /^(help|i need help|what can you do|commands)$/i,
        /^(how do i|how can i|what are the commands)$/i,
        /^(voice commands|available commands)$/i,
      ],
      intent: 'show_help',
      type: 'help' as const,
      confidence: 0.90,
    },

    // Product-specific commands (when on product page)
    {
      patterns: [
        /^(buy this|purchase this|i want this|add to cart)$/i,
        /^(get this|take this|i'll take it)$/i,
      ],
      intent: 'product_action',
      type: 'product' as const,
      action: 'add_to_cart',
      confidence: 0.85,
    },
  ];

  // Ghana-specific pronunciations and variations
  private static readonly GHANA_PRONUNCIATIONS: Record<string, string[]> = {
    // Navigation
    'cart': ['cut', 'cat', 'kart', 'kat'],
    'home': ['hoom', 'hom', 'uum'],
    'profile': ['profil', 'profeel', 'profel'],
    
    // Actions
    'search': ['sach', 'saach', 'sarch', 'serch'],
    'find': ['fain', 'faind', 'fin'],
    'show': ['sho', 'shoo', 'shaw'],
    'buy': ['bai', 'bai', 'by'],
    'add': ['aad', 'ad', 'aad'],
    'remove': ['rimuuv', 'remoov', 'rimuuf'],
    'checkout': ['chekout', 'chekaut', 'chekout'],
    
    // Products
    'sneakers': ['snikas', 'sneekas', 'sneakas', 'snickers'],
    'shoes': ['shuz', 'shuuz', 'shose'],
    'clothes': ['kloz', 'klos', 'klothes', 'cloths'],
    'jeans': ['jins', 'gins', 'jeens', 'jeans'],
    'shirt': ['shot', 'shaat', 'shat'],
    'dress': ['dres', 'drees', 'dras'],
    
    // Common words
    'want': ['wan', 'waan', 'want'],
    'need': ['niid', 'nid', 'need'],
    'see': ['si', 'see', 'sii'],
    'view': ['viu', 'vyu', 'view'],
  };

  // Common filler words in Ghanaian English
  private static readonly FILLER_WORDS = [
    'eh', 'ahn', 'um', 'er', 'you know', 'like', 'so', 'well',
    'actually', 'basically', 'really', 'very', 'just', 'please'
  ];

  /**
   * Normalize text for better parsing (handle Ghanaian pronunciations)
   */
  private static normalizeText(text: string): string {
    let normalized = text.toLowerCase().trim();

    // Remove filler words
    this.FILLER_WORDS.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      normalized = normalized.replace(regex, '');
    });

    // Apply Ghana pronunciation mappings
    Object.entries(this.GHANA_PRONUNCIATIONS).forEach(([standard, variations]) => {
      variations.forEach(variation => {
        const regex = new RegExp(`\\b${variation}\\b`, 'gi');
        normalized = normalized.replace(regex, standard);
      });
    });

    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Extract entities from text (products, quantities, colors, etc.)
   */
  private static extractEntities(text: string): Array<{
    type: string;
    value: string;
    confidence: number;
  }> {
    const entities = [];
    const normalizedText = text.toLowerCase();

    // Extract colors
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'gray', 'pink', 'purple'];
    colors.forEach(color => {
      if (normalizedText.includes(color)) {
        entities.push({
          type: 'color',
          value: color,
          confidence: 0.9,
        });
      }
    });

    // Extract sizes
    const sizes = ['small', 'medium', 'large', 'xl', 'xxl', 's', 'm', 'l', 'xs'];
    sizes.forEach(size => {
      const sizePattern = new RegExp(`\\b(size\\s+)?${size}\\b`, 'i');
      if (sizePattern.test(normalizedText)) {
        entities.push({
          type: 'size',
          value: size.toUpperCase(),
          confidence: 0.8,
        });
      }
    });

    // Extract quantities
    const quantityMatch = normalizedText.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
    if (quantityMatch) {
      const quantityMap: Record<string, number> = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
      };
      
      const quantityText = quantityMatch[1];
      const quantity = quantityMap[quantityText] || parseInt(quantityText);
      
      if (!isNaN(quantity) && quantity > 0) {
        entities.push({
          type: 'quantity',
          value: quantity.toString(),
          confidence: 0.95,
        });
      }
    }

    // Extract brands (common fashion brands)
    const brands = ['nike', 'adidas', 'puma', 'reebok', 'jordan', 'vans', 'converse'];
    brands.forEach(brand => {
      if (normalizedText.includes(brand)) {
        entities.push({
          type: 'brand',
          value: brand,
          confidence: 0.85,
        });
      }
    });

    return entities;
  }

  /**
   * Calculate semantic similarity between two texts
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = text1.toLowerCase().split(/\s+/);
    const tokens2 = text2.toLowerCase().split(/\s+/);
    
    const commonTokens = tokens1.filter(token => tokens2.includes(token));
    const totalTokens = new Set([...tokens1, ...tokens2]).size;
    
    return totalTokens > 0 ? commonTokens.length / totalTokens : 0;
  }

  /**
   * Main parsing method - convert natural language to structured command
   */
  static parseCommand(text: string): ParsedCommand | null {
    try {
      console.log('🧠 Parsing voice command:', text);

      const normalizedText = this.normalizeText(text);
      console.log('🔄 Normalized text:', normalizedText);

      const entities = this.extractEntities(text);
      console.log('📊 Extracted entities:', entities);

      // Try exact pattern matching first
      for (const commandDef of this.COMMAND_PATTERNS) {
        for (const pattern of commandDef.patterns) {
          const match = normalizedText.match(pattern);
          if (match) {
            const parameters: Record<string, any> = commandDef.extractParams 
              ? commandDef.extractParams(normalizedText)
              : {};

            // Add entity information to parameters
            entities.forEach(entity => {
              parameters[entity.type] = entity.value;
            });

            const command: VoiceCommand = {
              type: commandDef.type,
              action: commandDef.action,
              query: parameters.query,
              category: commandDef.category,
              parameters: parameters,
            };

            const result: ParsedCommand = {
              command,
              confidence: commandDef.confidence,
              originalText: text,
              normalizedText,
              intent: commandDef.intent,
              entities,
            };

            console.log('✅ Command parsed successfully:', {
              intent: result.intent,
              confidence: `${(result.confidence * 100).toFixed(1)}%`,
              type: result.command.type,
            });

            return result;
          }
        }
      }

      // Try fuzzy matching for partial matches
      let bestMatch: ParsedCommand | null = null;
      let highestSimilarity = 0;

      for (const commandDef of this.COMMAND_PATTERNS) {
        for (const pattern of commandDef.patterns) {
          // Convert regex pattern to text for similarity comparison
          const patternText = pattern.source
            .replace(/[\[\]()\\^$.*+?|{}]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          const similarity = this.calculateSimilarity(normalizedText, patternText);

          if (similarity > 0.6 && similarity > highestSimilarity) {
            highestSimilarity = similarity;

            const parameters: Record<string, any> = commandDef.extractParams 
              ? commandDef.extractParams(normalizedText)
              : {};

            entities.forEach(entity => {
              parameters[entity.type] = entity.value;
            });

            const command: VoiceCommand = {
              type: commandDef.type,
              action: commandDef.action,
              query: parameters.query,
              category: commandDef.category,
              parameters: parameters,
            };

            bestMatch = {
              command,
              confidence: Math.min(commandDef.confidence * similarity, 0.8),
              originalText: text,
              normalizedText,
              intent: commandDef.intent,
              entities,
            };
          }
        }
      }

      if (bestMatch && bestMatch.confidence >= 0.5) {
        console.log('✅ Fuzzy match found:', {
          intent: bestMatch.intent,
          confidence: `${(bestMatch.confidence * 100).toFixed(1)}%`,
          similarity: `${(highestSimilarity * 100).toFixed(1)}%`,
        });
        return bestMatch;
      }

      console.log('❌ No matching command found for:', text);
      return null;

    } catch (error) {
      console.error('❌ Error parsing command:', error);
      return null;
    }
  }

  /**
   * Get help information about available commands
   */
  static getAvailableCommands(): Array<{
    category: string;
    commands: Array<{
      intent: string;
      examples: string[];
      description: string;
    }>;
  }> {
    return [
      {
        category: 'Navigation',
        commands: [
          {
            intent: 'navigate_home',
            examples: ['go to home', 'take me home', 'home'],
            description: 'Navigate to the home screen',
          },
          {
            intent: 'navigate_profile',
            examples: ['go to profile', 'open my account', 'profile'],
            description: 'Open your profile and account settings',
          },
          {
            intent: 'navigate_cart',
            examples: ['go to cart', 'show my cart', 'cart'],
            description: 'View your shopping cart',
          },
        ],
      },
      {
        category: 'Product Search',
        commands: [
          {
            intent: 'search_products',
            examples: ['search for sneakers', 'find black jeans', 'show me shirts'],
            description: 'Search for products in the store',
          },
          {
            intent: 'browse_category',
            examples: ['show sneakers', 'browse clothes', 'view jeans'],
            description: 'Browse products by category',
          },
        ],
      },
      {
        category: 'Shopping',
        commands: [
          {
            intent: 'add_to_cart',
            examples: ['add to cart', 'buy this', 'I want this'],
            description: 'Add current product to cart',
          },
          {
            intent: 'checkout',
            examples: ['checkout', 'pay now', 'complete purchase'],
            description: 'Proceed to checkout',
          },
        ],
      },
    ];
  }

  /**
   * Validate if a command can be executed in the current context
   */
  static validateCommand(
    command: ParsedCommand,
    currentScreen: string,
    context?: Record<string, any>
  ): { valid: boolean; reason?: string } {
    // Context-specific validation
    switch (command.command.type) {
      case 'product':
        if (currentScreen !== 'product-details') {
          return {
            valid: false,
            reason: 'Product commands only work on product detail pages',
          };
        }
        break;

      case 'cart':
        if (command.command.action === 'add' && !context?.productId) {
          return {
            valid: false,
            reason: 'No product selected to add to cart',
          };
        }
        break;

      case 'checkout':
        // Could check if cart is empty
        break;
    }

    return { valid: true };
  }
}

export default VoiceCommandParser;
