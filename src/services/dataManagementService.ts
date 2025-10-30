import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AdminService } from './adminService';
import { NotificationService } from './notificationService';

export interface BackupData {
  timestamp: string;
  version: string;
  products: any[];
  orders: any[];
  users: any[];
  settings: any;
}

export interface CacheInfo {
  totalSize: number;
  itemCount: number;
  lastCleared: string;
}

export class DataManagementService {
  private static readonly CACHE_PREFIX = 'cache_';
  private static readonly BACKUP_PREFIX = 'backup_';
  private static readonly ANALYTICS_PREFIX = 'analytics_';

  // Backup Operations
  static async createBackup(): Promise<string> {
    try {
      // Show progress notification
      await NotificationService.sendLocalNotification(
        'Backup Started 💾',
        'Creating backup of all store data...',
        { type: 'backup-start' }
      );

      // Fetch all data
      const [products, orders, users] = await Promise.all([
        AdminService.getAllProducts(),
        AdminService.getAllOrders(),
        AdminService.getAllUsers(),
      ]);

      // Get app settings
      const settings = await NotificationService.getSettings();

      // Create backup object
      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        products,
        orders,
        users: users.map(user => ({
          ...user,
          // Remove sensitive data
          password: undefined,
          auth_tokens: undefined,
        })),
        settings,
      };

      // Create backup file
      const backupJson = JSON.stringify(backupData, null, 2);
      const fileName = `ihearvoices_backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, backupJson);

      // Store backup info locally
      const backupInfo = {
        id: Date.now().toString(),
        fileName,
        fileUri,
        timestamp: backupData.timestamp,
        size: backupJson.length,
        itemCounts: {
          products: products.length,
          orders: orders.length,
          users: users.length,
        },
      };

      await AsyncStorage.setItem(
        `${this.BACKUP_PREFIX}${backupInfo.id}`,
        JSON.stringify(backupInfo)
      );

      // Success notification
      await NotificationService.sendLocalNotification(
        'Backup Complete ✅',
        `Successfully backed up ${products.length} products, ${orders.length} orders, and ${users.length} users`,
        { type: 'backup-complete', backupId: backupInfo.id }
      );

      return fileUri;
    } catch (error) {
      console.error('Error creating backup:', error);
      await NotificationService.sendLocalNotification(
        'Backup Failed ❌',
        'Failed to create backup. Please try again.',
        { type: 'backup-error' }
      );
      throw error;
    }
  }

  static async shareBackup(backupUri: string): Promise<void> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupUri, {
          mimeType: 'application/json',
          dialogTitle: 'Share IHearVoices Backup',
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing backup:', error);
      throw error;
    }
  }

  static async getBackupHistory(): Promise<any[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith(this.BACKUP_PREFIX));
      
      const backups = await Promise.all(
        backupKeys.map(async (key) => {
          const data = await AsyncStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        })
      );

      return backups
        .filter(backup => backup !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error getting backup history:', error);
      return [];
    }
  }

  static async deleteBackup(backupId: string): Promise<void> {
    try {
      const backupKey = `${this.BACKUP_PREFIX}${backupId}`;
      const backupData = await AsyncStorage.getItem(backupKey);
      
      if (backupData) {
        const backup = JSON.parse(backupData);
        
        // Delete file if it exists
        if (backup.fileUri) {
          const fileInfo = await FileSystem.getInfoAsync(backup.fileUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(backup.fileUri);
          }
        }
        
        // Remove from storage
        await AsyncStorage.removeItem(backupKey);
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  // Cache Management
  static async getCacheInfo(): Promise<CacheInfo> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }

      const lastCleared = await AsyncStorage.getItem('cache_last_cleared') || 'Never';

      return {
        totalSize,
        itemCount: cacheKeys.length,
        lastCleared,
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        totalSize: 0,
        itemCount: 0,
        lastCleared: 'Unknown',
      };
    }
  }

  static async clearCache(): Promise<void> {
    try {
      // Show progress notification
      await NotificationService.sendLocalNotification(
        'Clearing Cache 🧹',
        'Removing cached data to improve performance...',
        { type: 'cache-clear-start' }
      );

      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.CACHE_PREFIX) ||
        key.includes('image_cache') ||
        key.includes('api_cache') ||
        key.includes('temp_')
      );

      // Remove cache items
      await AsyncStorage.multiRemove(cacheKeys);

      // Clear any temporary files
      const tempDir = `${FileSystem.cacheDirectory}temp/`;
      const tempDirInfo = await FileSystem.getInfoAsync(tempDir);
      if (tempDirInfo.exists) {
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      }

      // Record cache clear time
      await AsyncStorage.setItem('cache_last_cleared', new Date().toISOString());

      // Success notification
      await NotificationService.sendLocalNotification(
        'Cache Cleared ✅',
        `Removed ${cacheKeys.length} cached items. App performance should be improved.`,
        { type: 'cache-clear-complete' }
      );
    } catch (error) {
      console.error('Error clearing cache:', error);
      await NotificationService.sendLocalNotification(
        'Cache Clear Failed ❌',
        'Failed to clear cache. Please try again.',
        { type: 'cache-clear-error' }
      );
      throw error;
    }
  }

  // Analytics Management
  static async resetAnalytics(): Promise<void> {
    try {
      // Show warning notification
      await NotificationService.sendLocalNotification(
        'Resetting Analytics 📊',
        'Clearing all analytics and reporting data...',
        { type: 'analytics-reset-start' }
      );

      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter(key => 
        key.startsWith(this.ANALYTICS_PREFIX) ||
        key.includes('stats_') ||
        key.includes('metrics_') ||
        key.includes('report_')
      );

      // Remove analytics data
      await AsyncStorage.multiRemove(analyticsKeys);

      // Reset analytics counters
      const resetCounters = {
        page_views: 0,
        user_sessions: 0,
        conversion_rate: 0,
        bounce_rate: 0,
        average_session_duration: 0,
        last_reset: new Date().toISOString(),
      };

      await AsyncStorage.setItem('analytics_counters', JSON.stringify(resetCounters));

      // Success notification
      await NotificationService.sendLocalNotification(
        'Analytics Reset ✅',
        'All analytics data has been cleared. New tracking will start immediately.',
        { type: 'analytics-reset-complete' }
      );
    } catch (error) {
      console.error('Error resetting analytics:', error);
      await NotificationService.sendLocalNotification(
        'Analytics Reset Failed ❌',
        'Failed to reset analytics data. Please try again.',
        { type: 'analytics-reset-error' }
      );
      throw error;
    }
  }

  // Data Export
  static async exportData(dataType: 'products' | 'orders' | 'users' | 'all'): Promise<string> {
    try {
      let exportData: any = {};
      let fileName = '';

      switch (dataType) {
        case 'products':
          exportData = { products: await AdminService.getAllProducts() };
          fileName = `products_export_${Date.now()}.json`;
          break;
        case 'orders':
          exportData = { orders: await AdminService.getAllOrders() };
          fileName = `orders_export_${Date.now()}.json`;
          break;
        case 'users':
          const users = await AdminService.getAllUsers();
          exportData = { 
            users: users.map(user => ({
              ...user,
              // Remove sensitive data
              password: undefined,
              auth_tokens: undefined,
            }))
          };
          fileName = `users_export_${Date.now()}.json`;
          break;
        case 'all':
          const [products, orders, allUsers] = await Promise.all([
            AdminService.getAllProducts(),
            AdminService.getAllOrders(),
            AdminService.getAllUsers(),
          ]);
          exportData = {
            products,
            orders,
            users: allUsers.map(user => ({
              ...user,
              password: undefined,
              auth_tokens: undefined,
            })),
            exportedAt: new Date().toISOString(),
          };
          fileName = `full_export_${Date.now()}.json`;
          break;
      }

      const exportJson = JSON.stringify(exportData, null, 2);
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, exportJson);

      await NotificationService.sendLocalNotification(
        'Export Complete ✅',
        `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} data exported successfully`,
        { type: 'export-complete' }
      );

      return fileUri;
    } catch (error) {
      console.error('Error exporting data:', error);
      await NotificationService.sendLocalNotification(
        'Export Failed ❌',
        'Failed to export data. Please try again.',
        { type: 'export-error' }
      );
      throw error;
    }
  }

  // Storage Usage
  static async getStorageUsage(): Promise<{
    total: number;
    cache: number;
    backups: number;
    analytics: number;
    other: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      let cacheSize = 0;
      let backupSize = 0;
      let analyticsSize = 0;
      let otherSize = 0;

      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const size = data.length;
          totalSize += size;

          if (key.startsWith(this.CACHE_PREFIX) || key.includes('cache')) {
            cacheSize += size;
          } else if (key.startsWith(this.BACKUP_PREFIX)) {
            backupSize += size;
          } else if (key.startsWith(this.ANALYTICS_PREFIX) || key.includes('analytics')) {
            analyticsSize += size;
          } else {
            otherSize += size;
          }
        }
      }

      return {
        total: totalSize,
        cache: cacheSize,
        backups: backupSize,
        analytics: analyticsSize,
        other: otherSize,
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return {
        total: 0,
        cache: 0,
        backups: 0,
        analytics: 0,
        other: 0,
      };
    }
  }

  // Maintenance
  static async performMaintenance(): Promise<void> {
    try {
      await NotificationService.sendLocalNotification(
        'Maintenance Started 🔧',
        'Performing system maintenance...',
        { type: 'maintenance-start' }
      );

      // Clean up old backups (keep only last 5)
      const backups = await this.getBackupHistory();
      if (backups.length > 5) {
        const oldBackups = backups.slice(5);
        for (const backup of oldBackups) {
          await this.deleteBackup(backup.id);
        }
      }

      // Clear old cache items (older than 7 days)
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.timestamp) {
              const age = Date.now() - new Date(parsed.timestamp).getTime();
              const sevenDays = 7 * 24 * 60 * 60 * 1000;
              if (age > sevenDays) {
                await AsyncStorage.removeItem(key);
              }
            }
          } catch {
            // If we can't parse, remove it
            await AsyncStorage.removeItem(key);
          }
        }
      }

      await NotificationService.sendLocalNotification(
        'Maintenance Complete ✅',
        'System maintenance completed successfully',
        { type: 'maintenance-complete' }
      );
    } catch (error) {
      console.error('Error performing maintenance:', error);
      await NotificationService.sendLocalNotification(
        'Maintenance Failed ❌',
        'System maintenance failed. Please try again.',
        { type: 'maintenance-error' }
      );
      throw error;
    }
  }
}

export default DataManagementService;
