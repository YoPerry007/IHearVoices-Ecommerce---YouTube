import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ExpoVoiceButton from './src/components/ExpoVoiceButton';
import { VoiceCommand } from './src/services/VoiceCommandParser';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CartProvider, useCart } from './src/contexts/CartContext';
import SimpleToast from './src/components/SimpleToast';
import { ToastService } from './src/services/toastService';
import { ProductSearchService } from './src/services/productSearchService';
import './src/utils/seedDatabase'; // Automatically seeds products in dev mode

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ProductCatalogScreen from './src/screens/ProductCatalogScreen';
import ProductDetailsScreen from './src/screens/ProductDetailsScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import PaymentResultScreen from './src/screens/PaymentResultScreen';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';

// Import auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Import admin screens
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminProductsScreen from './src/screens/admin/AdminProductsScreen';
import AdminOrdersScreen from './src/screens/admin/AdminOrdersScreen';
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen';
import AdminAnalyticsScreen from './src/screens/admin/AdminAnalyticsScreen';
import AdminSettingsScreen from './src/screens/admin/AdminSettingsScreen';

// Debug environment variables immediately on app load
console.log('🔎 App.tsx Environment Debug:');
console.log('PUBLIC KEY FROM ENV:', process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ? 
  `${process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY.substring(0, 12)}...${process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY.substring(process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY.length - 4)}` : 
  'UNDEFINED');
console.log('SECRET KEY FROM ENV:', process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY ? 
  `${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY.substring(0, 12)}...${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY.substring(process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY.length - 4)}` : 
  'UNDEFINED');

import { COLORS } from './src/constants/theme';

type Screen = 'home' | 'catalog' | 'cart' | 'product-details' | 'profile' | 'checkout' | 'payment-result' | 'order-history' | 'order-details' | 'privacy-policy' | 'terms-of-service';
type AdminScreen = 'dashboard' | 'products' | 'orders' | 'users' | 'analytics' | 'settings';
type AuthScreen = 'login' | 'register' | 'forgot-password';

// Admin App Component
interface AdminAppProps {
  currentAdminScreen: AdminScreen;
  setCurrentAdminScreen: (screen: AdminScreen) => void;
}

const AdminApp: React.FC<AdminAppProps> = ({ currentAdminScreen, setCurrentAdminScreen }) => {
  const renderAdminScreen = () => {
    switch (currentAdminScreen) {
      case 'dashboard':
        return (
          <AdminDashboardScreen
            onNavigateToProducts={() => setCurrentAdminScreen('products')}
            onNavigateToOrders={() => setCurrentAdminScreen('orders')}
            onNavigateToUsers={() => setCurrentAdminScreen('users')}
            onNavigateToAnalytics={() => setCurrentAdminScreen('analytics')}
            onNavigateToSettings={() => setCurrentAdminScreen('settings')}
            onNavigateBack={() => setCurrentAdminScreen('dashboard')}
          />
        );
      case 'products':
        return (
          <AdminProductsScreen
            onNavigateBack={() => setCurrentAdminScreen('dashboard')}
          />
        );
      case 'orders':
        return (
          <AdminOrdersScreen
            onNavigateBack={() => setCurrentAdminScreen('dashboard')}
          />
        );
      case 'users':
        return (
          <AdminUsersScreen
            onNavigateBack={() => setCurrentAdminScreen('dashboard')}
          />
        );
      case 'analytics':
        return (
          <AdminAnalyticsScreen
            onNavigateBack={() => setCurrentAdminScreen('dashboard')}
          />
        );
      case 'settings':
        return (
          <AdminSettingsScreen
            onNavigateBack={() => setCurrentAdminScreen('dashboard')}
          />
        );
      default:
        return (
          <AdminDashboardScreen
            onNavigateToProducts={() => setCurrentAdminScreen('products')}
            onNavigateToOrders={() => setCurrentAdminScreen('orders')}
            onNavigateToUsers={() => setCurrentAdminScreen('users')}
            onNavigateToAnalytics={() => setCurrentAdminScreen('analytics')}
            onNavigateToSettings={() => setCurrentAdminScreen('settings')}
            onNavigateBack={() => setCurrentAdminScreen('dashboard')}
          />
        );
    }
  };

  const renderAdminTabBar = () => {
    return (
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, currentAdminScreen === 'dashboard' && styles.tabItemActive]}
          onPress={() => setCurrentAdminScreen('dashboard')}
        >
          <Ionicons 
            name={currentAdminScreen === 'dashboard' ? 'speedometer' : 'speedometer-outline'} 
            size={24} 
            color={currentAdminScreen === 'dashboard' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentAdminScreen === 'dashboard' && styles.tabLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentAdminScreen === 'products' && styles.tabItemActive]}
          onPress={() => setCurrentAdminScreen('products')}
        >
          <Ionicons 
            name={currentAdminScreen === 'products' ? 'cube' : 'cube-outline'} 
            size={24} 
            color={currentAdminScreen === 'products' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentAdminScreen === 'products' && styles.tabLabelActive]}>
            Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentAdminScreen === 'orders' && styles.tabItemActive]}
          onPress={() => setCurrentAdminScreen('orders')}
        >
          <Ionicons 
            name={currentAdminScreen === 'orders' ? 'receipt' : 'receipt-outline'} 
            size={24} 
            color={currentAdminScreen === 'orders' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentAdminScreen === 'orders' && styles.tabLabelActive]}>
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentAdminScreen === 'users' && styles.tabItemActive]}
          onPress={() => setCurrentAdminScreen('users')}
        >
          <Ionicons 
            name={currentAdminScreen === 'users' ? 'people' : 'people-outline'} 
            size={24} 
            color={currentAdminScreen === 'users' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentAdminScreen === 'users' && styles.tabLabelActive]}>
            Users
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentAdminScreen === 'analytics' && styles.tabItemActive]}
          onPress={() => setCurrentAdminScreen('analytics')}
        >
          <Ionicons 
            name={currentAdminScreen === 'analytics' ? 'bar-chart' : 'bar-chart-outline'} 
            size={24} 
            color={currentAdminScreen === 'analytics' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentAdminScreen === 'analytics' && styles.tabLabelActive]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <View style={styles.content}>
        {renderAdminScreen()}
      </View>
      {renderAdminTabBar()}
    </SafeAreaView>
  );
};

// Main App Component with Authentication Guards
const AuthenticatedApp: React.FC = () => {
  const { user, profile, loading, isAuthenticated, isAdmin } = useAuth();
  const { clearCart, addToCart, refreshCart } = useCart();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [currentAdminScreen, setCurrentAdminScreen] = useState<AdminScreen>('dashboard');
  const [currentAuthScreen, setCurrentAuthScreen] = useState<AuthScreen>('login');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>('');
  const [paymentResultData, setPaymentResultData] = useState<{
    success: boolean;
    orderId?: string | null;
    transactionId: string;
    amount: number;
    paymentMethod: string;
    reference: string;
    warning?: string;
    error?: string;
  } | null>(null);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show authentication screens if not authenticated
  if (!isAuthenticated) {
    const handleAuthSuccess = () => {
      console.log('Authentication successful');
    };

    const renderAuthScreen = () => {
      switch (currentAuthScreen) {
        case 'login':
          return (
            <LoginScreen
              onNavigateToRegister={() => setCurrentAuthScreen('register')}
              onNavigateToForgotPassword={() => setCurrentAuthScreen('forgot-password')}
              onLoginSuccess={handleAuthSuccess}
            />
          );
        case 'register':
          return (
            <RegisterScreen
              onNavigateToLogin={() => setCurrentAuthScreen('login')}
              onRegistrationSuccess={handleAuthSuccess}
            />
          );
        case 'forgot-password':
          return (
            <ForgotPasswordScreen
              onNavigateToLogin={() => setCurrentAuthScreen('login')}
            />
          );
        default:
          return (
            <LoginScreen
              onNavigateToRegister={() => setCurrentAuthScreen('register')}
              onNavigateToForgotPassword={() => setCurrentAuthScreen('forgot-password')}
              onLoginSuccess={handleAuthSuccess}
            />
          );
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={COLORS.background} />
        {renderAuthScreen()}
      </SafeAreaView>
    );
  }

  // Render admin interface if user is admin
  if (isAuthenticated && isAdmin) {
    return <AdminApp currentAdminScreen={currentAdminScreen} setCurrentAdminScreen={setCurrentAdminScreen} />;
  }

  // Handle ML-powered voice commands
  const handleVoiceCommand = async (command: VoiceCommand) => {
    console.log(' Executing voice command:', command);
    
    switch (command.type) {
      case 'navigation':
        if (command.action === 'home') {
          setCurrentScreen('home');
          setSelectedCategory('');
        } else if (command.action === 'cart') {
          setCurrentScreen('cart');
        } else if (command.action === 'profile') {
          setCurrentScreen('profile');
        }
        break;
        
      case 'navigate':
        // Handle navigate commands from Python service
        const screen = (command as any).screen;
        if (screen === 'home') {
          setCurrentScreen('home');
          setSelectedCategory('');
        } else if (screen === 'cart') {
          setCurrentScreen('cart');
        } else if (screen === 'profile') {
          setCurrentScreen('profile');
        } else if (screen === 'catalog') {
          setCurrentScreen('catalog');
        }
        break;
        
      case 'search':
        if (command.query) {
          // Navigate to catalog with voice search query
          setSelectedCategory('');
          setVoiceSearchQuery(command.query);
          setCurrentScreen('catalog');
          console.log('🔍 Voice search query:', command.query);
          // Clear voice search query after 5 seconds to allow manual search
          setTimeout(() => {
            setVoiceSearchQuery('');
          }, 5000);
        }
        break;
        
      case 'category':
        if (command.category) {
          console.log('📂 Voice category browse:', command.category);
          setVoiceSearchQuery(''); // Clear search query when browsing category
          setSelectedCategory(command.category);
          setCurrentScreen('catalog');
        }
        break;
        
      case 'cart':
      case 'add_to_cart':
        if ((command.action === 'add' || command.type === 'add_to_cart') && user?.id) {
          const productQuery = command.parameters?.product_query || command.parameters?.query || (command as any).product_query;
          
          console.log('🔍 Voice command parameters:', command.parameters);
          console.log('🔍 Product query extracted:', productQuery);
          
          // Smart product search and add to cart
          if (productQuery) {
            console.log('🛒 Smart voice command: Add product to cart:', productQuery);
            
            try {
              // Search for the product by name
              const foundProduct = await ProductSearchService.findProductByName(productQuery);
              
              if (foundProduct) {
                console.log('✅ Found product:', foundProduct.name);
                
                // Add to cart directly
                const success = await addToCart({
                  productId: foundProduct.id,
                  quantity: 1,
                });
                
                if (success) {
                  // Simple toast notification instead of modal
                  ToastService.success(`✅ ${foundProduct.name} added to cart!`);
                } else {
                  ToastService.error('Failed to add product to cart');
                }
              } else {
                // Product not found - simple toast instead of modal
                ToastService.error(`❌ "${productQuery}" not found. Try being more specific.`);
              }
            } catch (error) {
              console.error('Failed to add product to cart:', error);
              ToastService.error('Failed to add product to cart');
            }
          } else if (currentScreen === 'product-details' && selectedProductId) {
            // Handle add to cart on product details screen
            console.log('🛒 Voice command: Add current product to cart:', selectedProductId);
            
            try {
              const success = await addToCart({
                productId: selectedProductId,
                quantity: 1,
              });
              
              if (success) {
                ToastService.success('✅ Product added to cart!');
              } else {
                ToastService.error('Failed to add product to cart');
              }
            } catch (error) {
              console.error('Failed to add to cart:', error);
              ToastService.error('Failed to add product to cart');
            }
          } else {
            // Generic add to cart without product specified
            ToastService.info('💡 Say "add [product name] to cart" to add specific items');
          }
        } else if (command.action === 'clear') {
          console.log('🗑️ Voice command: Clear cart');
          
          try {
            const success = await clearCart();
            if (success) {
              ToastService.success('🗑️ Cart cleared successfully!');
              setCurrentScreen('cart');
            } else {
              ToastService.error('Failed to clear cart');
            }
          } catch (error) {
            ToastService.error('Failed to clear cart');
          }
        } else {
          // Just navigate to cart
          setCurrentScreen('cart');
        }
        break;
        
      case 'checkout':
        setCurrentScreen('checkout');
        break;
        
      case 'help':
        ToastService.info('🎤 Try: "Add hoodie to cart", "Go to home", "Search for shoes", "Clear cart", "Go to profile", "Go to cart"');
        break;
        
      default:
        console.log('🤷 Unhandled voice command type:', command.type);
        ToastService.info('🤷 Command not recognized. Say "help" for examples.');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToCategory={(category) => {
              setSelectedCategory(category);
              setCurrentScreen('catalog');
            }}
            onNavigateToProduct={(productId) => {
              setSelectedProductId(productId);
              setCurrentScreen('product-details');
            }}
            onNavigateToSearch={() => setCurrentScreen('catalog')}
            onNavigateToCart={() => setCurrentScreen('cart')}
          />
        );
      case 'catalog':
        return (
          <ProductCatalogScreen
            onNavigateToProduct={(productId) => {
              setSelectedProductId(productId);
              setCurrentScreen('product-details');
            }}
            onNavigateBack={() => setCurrentScreen('home')}
            onNavigateToCart={() => setCurrentScreen('cart')}
            category={selectedCategory}
            searchQuery=""
            voiceSearchQuery={voiceSearchQuery}
          />
        );
      case 'product-details':
        return (
          <ProductDetailsScreen
            productId={selectedProductId}
            onNavigateBack={() => setCurrentScreen('catalog')}
            onNavigateToCart={() => setCurrentScreen('cart')}
            onNavigateToCheckout={() => setCurrentScreen('checkout')}
          />
        );
      case 'cart':
        return (
          <CartScreen
            onNavigateBack={() => setCurrentScreen('home')}
            onNavigateToProduct={(productId) => {
              setSelectedProductId(productId);
              setCurrentScreen('product-details');
            }}
            onNavigateToCheckout={() => setCurrentScreen('checkout')}
          />
        );
      case 'profile':
        return (
          <UserProfileScreen
            onNavigateBack={() => setCurrentScreen('home')}
            onNavigateToOrderHistory={() => setCurrentScreen('order-history')}
            onNavigateToOrderDetails={(orderId: string) => {
              setSelectedOrderId(orderId);
              setCurrentScreen('order-details');
            }}
            onNavigateToPrivacyPolicy={() => setCurrentScreen('privacy-policy')}
            onNavigateToTermsOfService={() => setCurrentScreen('terms-of-service')}
          />
        );
      case 'order-history':
        return (
          <OrderHistoryScreen
            onNavigateBack={() => setCurrentScreen('profile')}
            onViewOrderDetails={(orderId: string) => {
              setSelectedOrderId(orderId);
              setCurrentScreen('order-details');
            }}
          />
        );
      case 'order-details':
        return (
          <OrderDetailsScreen
            orderId={selectedOrderId}
            onNavigateBack={() => setCurrentScreen('order-history')}
            onCancelOrder={(orderId: string) => {
              // Refresh order history after cancellation
              setCurrentScreen('order-history');
            }}
            onReorder={(orderId: string) => {
              // Navigate to cart after reorder
              setCurrentScreen('cart');
            }}
          />
        );
      case 'privacy-policy':
        return (
          <PrivacyPolicyScreen
            onNavigateBack={() => setCurrentScreen('profile')}
          />
        );
      case 'terms-of-service':
        return (
          <TermsOfServiceScreen
            onNavigateBack={() => setCurrentScreen('profile')}
          />
        );
      case 'checkout':
        return (
          <CheckoutScreen
            navigation={{
              goBack: () => setCurrentScreen('cart'),
              replace: (screen: string, params: any) => {
                if (screen === 'PaymentResult') {
                  setPaymentResultData(params);
                  setCurrentScreen('payment-result');
                }
              },
            }}
          />
        );
      case 'payment-result':
        return (
          <PaymentResultScreen
            navigation={{
              reset: (options: any) => {
                setCurrentScreen('home');
              },
              navigate: (screen: string) => {
                if (screen === 'Cart') {
                  setCurrentScreen('cart');
                } else {
                  setCurrentScreen('home');
                }
              },
              goBack: () => setCurrentScreen('checkout'),
            }}
            route={{
              params: paymentResultData || {
                success: false,
                transactionId: 'unknown',
                amount: 0,
                paymentMethod: 'Unknown',
                reference: 'unknown',
                error: 'Payment data not available',
              },
            }}
          />
        );
      default:
        return (
          <HomeScreen
            onNavigateToCategory={(category) => {
              setSelectedCategory(category);
              setCurrentScreen('catalog');
            }}
            onNavigateToProduct={(productId) => {
              setSelectedProductId(productId);
              setCurrentScreen('product-details');
            }}
            onNavigateToSearch={() => setCurrentScreen('catalog')}
            onNavigateToCart={() => setCurrentScreen('cart')}
          />
        );
    }
  };

  const renderTabBar = () => {
    // Hide tab bar on product details, profile, checkout, payment result, order history, order details, privacy policy, and terms screens for better UX
    const hiddenScreens: Screen[] = ['product-details', 'profile', 'checkout', 'payment-result', 'order-history', 'order-details', 'privacy-policy', 'terms-of-service'];
    if (hiddenScreens.includes(currentScreen)) {
      return null;
    }

    return (
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'home' && styles.tabItemActive]}
          onPress={() => {
            setSelectedCategory('');
            setCurrentScreen('home');
          }}
        >
          <Ionicons 
            name={currentScreen === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={currentScreen === 'home' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentScreen === 'home' && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'catalog' && styles.tabItemActive]}
          onPress={() => {
            setSelectedCategory('');
            setCurrentScreen('catalog');
          }}
        >
          <Ionicons 
            name={currentScreen === 'catalog' ? 'grid' : 'grid-outline'} 
            size={24} 
            color={currentScreen === 'catalog' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentScreen === 'catalog' && styles.tabLabelActive]}>
            Shop
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'cart' && styles.tabItemActive]}
          onPress={() => setCurrentScreen('cart')}
        >
          <Ionicons 
            name={currentScreen === 'cart' ? 'bag' : 'bag-outline'} 
            size={24} 
            color={currentScreen === 'cart' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentScreen === 'cart' && styles.tabLabelActive]}>
            Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'profile' && styles.tabItemActive]}
          onPress={() => setCurrentScreen('profile')}
        >
          <Ionicons 
            name={currentScreen === 'profile' ? 'person' : 'person-outline'}
            size={24} 
            color={currentScreen === 'profile' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, currentScreen === 'profile' && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFloatingVoiceButton = () => {
    // Hide floating button on profile, product details, checkout, privacy policy, terms of service, order history, and order details screens
    const hiddenScreens = ['profile', 'product-details', 'checkout', 'privacy-policy', 'terms-of-service', 'order-history', 'order-details'];
    if (hiddenScreens.includes(currentScreen)) {
      return null;
    }

    return (
      <ExpoVoiceButton
        onCommandExecuted={handleVoiceCommand}
        onError={(error: string) => {
          console.error('Voice command error:', error);
          ToastService.error('Voice command failed: ' + error);
        }}
        onTranscriptReceived={(transcript: string) => {
          console.log('Voice transcript:', transcript);
        }}
        position="floating"
      />
    );
  };

  const renderSecurityBanner = () => {
    if (currentScreen === 'checkout') {
      return (
        <View style={styles.securityBanner}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
          <Text style={styles.securityBannerText}>
            Voice input disabled for payment security
          </Text>
        </View>
      );
    }
    return null;
  };

  // Render authenticated app
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      {renderSecurityBanner()}
      <View style={styles.content}>
        {renderScreen()}
      </View>
      {renderTabBar()}
      {renderFloatingVoiceButton()}
    </SafeAreaView>
  );
};

// Root App Component
export default function App() {
  const toastRef = useRef(null);

  useEffect(() => {
    ToastService.setToastRef(toastRef);
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <AuthenticatedApp />
        <SimpleToast ref={toastRef} />
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingBottom: 8,
    paddingTop: 8,
    height: 80,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    // Active state styling handled by color changes
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  floatingVoiceButton: {
    position: 'absolute',
    bottom: 100, // Position above the tab bar
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30, // 50% border radius for perfect circle
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Android shadow
    shadowColor: COLORS.primary, // iOS shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  tempMessage: {
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 100,
  },
  tempButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    margin: 20,
    alignItems: 'center',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  securityBannerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 6,
    fontWeight: '500',
  },
});