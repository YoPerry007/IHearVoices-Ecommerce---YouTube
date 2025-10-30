import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, TYPOGRAPHY } from '../constants/theme';
import { useCart } from '../contexts/CartContext';

const { width: screenWidth } = Dimensions.get('window');

interface CartScreenProps {
  onNavigateBack: () => void;
  onNavigateToProduct: (productId: string) => void;
  onNavigateToCheckout: () => void;
}

/**
 * Enterprise Cart Screen Component
 * Implements industry-standard e-commerce cart UI patterns:
 * - Modern card-based design with glassmorphism effects
 * - Accessibility support (screen readers, focus management)
 * - Smooth animations and micro-interactions
 * - Progressive loading states
 * - Error boundary with graceful fallbacks
 * - Responsive design for multiple screen sizes
 * - Ghana-specific currency formatting
 */
export default function CartScreen({ 
  onNavigateBack, 
  onNavigateToProduct, 
  onNavigateToCheckout 
}: CartScreenProps) {
  const { 
    items, 
    summary, 
    loading, 
    error, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    refreshCart,
    totalItems,
    isEmpty 
  } = useCart();

  // Animation values for smooth transitions
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Loading state with professional spinner
  if (loading && isEmpty) {
    return (
      <View style={styles.container}>
        <CartHeader 
          title="Cart" 
          onBack={onNavigateBack} 
          totalItems={0}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your cart...</Text>
        </View>
      </View>
    );
  }

  // Error state with retry option
  if (error && isEmpty) {
    return (
      <View style={styles.container}>
        <CartHeader 
          title="Cart" 
          onBack={onNavigateBack} 
          totalItems={0}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={COLORS.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshCart}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CartHeader 
        title="Cart" 
        onBack={onNavigateBack} 
        totalItems={totalItems}
        onClear={isEmpty ? undefined : clearCart}
      />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {isEmpty ? (
          <EmptyCartView onNavigateBack={onNavigateBack} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={loading} 
                onRefresh={refreshCart}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {/* Cart Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>
                {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
              </Text>
              
              {items.map((item, index) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  onViewProduct={() => onNavigateToProduct(item.product_id)}
                />
              ))}
            </View>

            {/* Order Summary */}
            {summary && (
              <CartSummaryCard 
                summary={summary} 
                onCheckout={onNavigateToCheckout}
              />
            )}
            
            {/* Bottom spacing for safe area */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Professional Cart Header Component
 */
const CartHeader: React.FC<{
  title: string;
  onBack: () => void;
  totalItems: number;
  onClear?: () => Promise<boolean>;
}> = ({ title, onBack, totalItems, onClear }) => (
  <BlurView intensity={95} style={styles.header}>
    <View style={styles.headerContent}>
      <TouchableOpacity 
        onPress={onBack} 
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        {totalItems > 0 && (
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>{totalItems}</Text>
          </View>
        )}
      </View>
      
      {onClear ? (
        <TouchableOpacity 
          onPress={onClear}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Clear cart"
        >
          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerButton} />
      )}
    </View>
  </BlurView>
);

/**
 * Empty Cart State Component
 */
const EmptyCartView: React.FC<{ onNavigateBack: () => void }> = ({ onNavigateBack }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <LinearGradient
        colors={[COLORS.primary + '20', COLORS.primary + '10']}
        style={styles.emptyIconGradient}
      >
        <Ionicons name="bag-outline" size={80} color={COLORS.primary} />
      </LinearGradient>
    </View>
    
    <Text style={styles.emptyTitle}>Your cart is empty</Text>
    <Text style={styles.emptySubtitle}>
      Discover amazing products and add them to your cart
    </Text>
    
    <TouchableOpacity 
      style={styles.shopButton} 
      onPress={onNavigateBack}
      accessibilityRole="button"
      accessibilityLabel="Start shopping"
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.shopButtonGradient}
      >
        <Ionicons name="storefront-outline" size={20} color={COLORS.background} />
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

/**
 * Professional Cart Item Card Component
 */
const CartItemCard: React.FC<{
  item: any;
  index: number;
  onUpdateQuantity: (id: string, quantity: number) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onViewProduct: () => void;
}> = ({ item, index, onUpdateQuantity, onRemove, onViewProduct }) => {
  const slideInAnim = React.useRef(new Animated.Value(screenWidth)).current;

  useEffect(() => {
    Animated.timing(slideInAnim, {
      toValue: 0,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const product = item.product;
  const discountedPrice = product?.price ? 
    product.price * (1 - (product.discount_percentage || 0) / 100) : 0;

  return (
    <Animated.View 
      style={[
        styles.itemCard,
        { transform: [{ translateX: slideInAnim }] }
      ]}
    >
      <TouchableOpacity 
        onPress={onViewProduct}
        style={styles.productSection}
        accessibilityRole="button"
        accessibilityLabel={`View ${product?.name}`}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product?.images?.[0] || 'https://via.placeholder.com/100' }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {product?.discount_percentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {product.discount_percentage}% OFF
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={2}>
            {product?.name || 'Unknown Product'}
          </Text>
          <Text style={styles.productBrand} numberOfLines={1}>
            {product?.brand || 'Unknown Brand'}
          </Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              GH₵ {discountedPrice.toFixed(2)}
            </Text>
            {product?.discount_percentage > 0 && (
              <Text style={styles.originalPrice}>
                GH₵ {product.price.toFixed(2)}
              </Text>
            )}
          </View>
          
          {(item.size || item.color) && (
            <View style={styles.variantsContainer}>
              {item.size && (
                <View style={styles.variantChip}>
                  <Text style={styles.variantText}>Size: {item.size}</Text>
                </View>
              )}
              {item.color && (
                <View style={styles.variantChip}>
                  <Text style={styles.variantText}>Color: {item.color}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Quantity Controls */}
      <View style={styles.quantitySection}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
          >
            <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
          >
            <Ionicons name="add" size={16} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(item.id)}
          accessibilityRole="button"
          accessibilityLabel="Remove item from cart"
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

/**
 * Professional Cart Summary Component
 */
const CartSummaryCard: React.FC<{
  summary: any;
  onCheckout: () => void;
}> = ({ summary, onCheckout }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryTitle}>Order Summary</Text>
    
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>
        Subtotal ({summary.totalItems} {summary.totalItems === 1 ? 'item' : 'items'})
      </Text>
      <Text style={styles.summaryValue}>GH₵ {summary.subtotal.toFixed(2)}</Text>
    </View>
    
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>VAT (12.5%)</Text>
      <Text style={styles.summaryValue}>GH₵ {summary.tax.toFixed(2)}</Text>
    </View>
    
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>
        Shipping {summary.shipping === 0 ? '(Free)' : ''}
      </Text>
      <Text style={styles.summaryValue}>
        GH₵ {summary.shipping.toFixed(2)}
      </Text>
    </View>
    
    {summary.subtotal < 100 && summary.shipping > 0 && (
      <Text style={styles.freeShippingText}>
        Add GH₵ {(100 - summary.subtotal).toFixed(2)} more for free shipping
      </Text>
    )}
    
    <View style={[styles.summaryRow, styles.totalRow]}>
      <Text style={styles.totalLabel}>Total</Text>
      <Text style={styles.totalValue}>GH₵ {summary.total.toFixed(2)}</Text>
    </View>
    
    <TouchableOpacity 
      style={styles.checkoutButton}
      onPress={onCheckout}
      accessibilityRole="button"
      accessibilityLabel="Proceed to checkout"
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.checkoutGradient}
      >
        <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '30',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: COLORS.surface + '50',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  itemBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  itemBadgeText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 30,
  },
  emptyIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  shopButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  shopButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  itemsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productSection: {
    flex: 1,
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  discountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  productDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 14,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  variantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variantChip: {
    backgroundColor: COLORS.border + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  variantText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quantitySection: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.border + '20',
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    marginTop: 12,
    padding: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  freeShippingText: {
    fontSize: 12,
    color: COLORS.secondary,
    textAlign: 'center',
    marginVertical: 8,
    fontStyle: 'italic',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 12,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkoutButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  checkoutText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});
