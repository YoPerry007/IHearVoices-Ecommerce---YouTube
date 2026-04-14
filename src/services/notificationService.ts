import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.log('Push notifications not fully supported in Expo Go, skipping handler registration');
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailAlerts: boolean;
  lowStockAlerts: boolean;
  orderNotifications: boolean;
  newUserAlerts: boolean;
  systemAlerts: boolean;
}

export class NotificationService {
  private static readonly SETTINGS_KEY = 'notification_settings';
  private static readonly DEFAULT_SETTINGS: NotificationSettings = {
    pushNotifications: true,
    emailAlerts: true,
    lowStockAlerts: true,
    orderNotifications: true,
    newUserAlerts: true,
    systemAlerts: true,
  };

  // Initialize notification permissions and settings
  static async initialize(): Promise<void> {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.warn('Failed to get push token for push notification!');
          return;
        }
        
        // Get push notification token
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push notification token:', token);
        
        // Store token for backend use
        await AsyncStorage.setItem('push_token', token);
      } else {
        console.warn('Must use physical device for Push Notifications');
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Create admin-specific channels
        await Notifications.setNotificationChannelAsync('admin-orders', {
          name: 'Order Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          description: 'Notifications for new orders and order updates',
          vibrationPattern: [0, 250, 250, 250],
        });

        await Notifications.setNotificationChannelAsync('admin-stock', {
          name: 'Stock Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          description: 'Low stock and inventory alerts',
          vibrationPattern: [0, 500, 250, 500],
        });

        await Notifications.setNotificationChannelAsync('admin-users', {
          name: 'User Alerts',
          importance: Notifications.AndroidImportance.DEFAULT,
          description: 'New user registrations and user activity',
        });
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  // Get current notification settings
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const stored = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (stored) {
        return { ...this.DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
      return this.DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  // Update notification settings
  static async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
      
      // Update system notification permissions if needed
      if (settings.pushNotifications === false) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  // Send local notification
  static async sendLocalNotification(
    title: string,
    body: string,
    data?: any,
    channelId?: string
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.pushNotifications) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          ...(channelId && Platform.OS === 'android' ? { channelId } : {}),
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Admin-specific notification methods
  static async notifyNewOrder(orderData: { id: string; amount: number; customerName: string }): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.orderNotifications) return;

    await this.sendLocalNotification(
      'New Order Received! 🛍️',
      `Order #${orderData.id.slice(-8)} from ${orderData.customerName} - GH₵${orderData.amount.toFixed(2)}`,
      { type: 'order', orderId: orderData.id },
      'admin-orders'
    );
  }

  static async notifyLowStock(productData: { name: string; stock: number }): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.lowStockAlerts) return;

    await this.sendLocalNotification(
      'Low Stock Alert! ⚠️',
      `${productData.name} is running low (${productData.stock} left)`,
      { type: 'stock', productName: productData.name },
      'admin-stock'
    );
  }

  static async notifyNewUser(userData: { name: string; email: string }): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.newUserAlerts) return;

    await this.sendLocalNotification(
      'New User Registered! 👋',
      `${userData.name || userData.email} just joined IHearVoices`,
      { type: 'user', userEmail: userData.email },
      'admin-users'
    );
  }

  static async notifyOrderStatusChange(orderData: { id: string; status: string; customerName: string }): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.orderNotifications) return;

    const statusMessages = {
      processing: 'is now being processed',
      shipped: 'has been shipped',
      delivered: 'has been delivered',
      cancelled: 'has been cancelled',
    };

    const message = statusMessages[orderData.status as keyof typeof statusMessages] || 'status updated';

    await this.sendLocalNotification(
      'Order Status Updated 📦',
      `Order #${orderData.id.slice(-8)} for ${orderData.customerName} ${message}`,
      { type: 'order-status', orderId: orderData.id },
      'admin-orders'
    );
  }

  static async notifySystemAlert(message: string): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.systemAlerts) return;

    await this.sendLocalNotification(
      'System Alert 🔔',
      message,
      { type: 'system' }
    );
  }

  // Email notification simulation (in real app, this would call backend API)
  static async sendEmailAlert(
    to: string,
    subject: string,
    body: string,
    type: 'order' | 'stock' | 'user' | 'system'
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.emailAlerts) return;

      // In a real app, this would make an API call to your backend
      console.log('Email Alert Sent:', {
        to,
        subject,
        body,
        type,
        timestamp: new Date().toISOString(),
      });

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success notification
      await this.sendLocalNotification(
        'Email Sent ✉️',
        `${subject} sent to ${to}`,
        { type: 'email-sent' }
      );
    } catch (error) {
      console.error('Error sending email alert:', error);
      throw error;
    }
  }

  // Batch notification methods
  static async sendDailyDigest(): Promise<void> {
    try {
      // This would typically fetch data from your backend
      const digestData = {
        newOrders: 5,
        lowStockItems: 3,
        newUsers: 2,
        revenue: 1250.50,
      };

      await this.sendLocalNotification(
        'Daily Business Digest 📊',
        `${digestData.newOrders} new orders, ${digestData.lowStockItems} low stock alerts, ${digestData.newUsers} new users`,
        { type: 'daily-digest', data: digestData }
      );
    } catch (error) {
      console.error('Error sending daily digest:', error);
    }
  }

  // Clear all notifications
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  }

  // Test notification (for settings testing)
  static async sendTestNotification(): Promise<void> {
    await this.sendLocalNotification(
      'Test Notification 🧪',
      'This is a test notification from IHearVoices admin panel',
      { type: 'test' }
    );
  }

  // Get notification history (simplified)
  static async getNotificationHistory(): Promise<any[]> {
    try {
      // In a real app, this would fetch from backend or local storage
      return [
        {
          id: '1',
          title: 'New Order Received',
          body: 'Order #12345678 from John Doe - GH₵125.50',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          type: 'order',
          read: false,
        },
        {
          id: '2',
          title: 'Low Stock Alert',
          body: 'Air Max 270 is running low (8 left)',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          type: 'stock',
          read: true,
        },
        {
          id: '3',
          title: 'New User Registered',
          body: 'Jane Smith just joined IHearVoices',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          type: 'user',
          read: true,
        },
      ];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }
}

export default NotificationService;
