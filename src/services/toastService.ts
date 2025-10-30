import { Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import React from 'react';

const { width } = Dimensions.get('window');

interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  position?: 'top' | 'bottom';
}

class ToastService {
  private static toastRef: React.RefObject<any> | null = null;
  private static activeToasts: Set<string> = new Set();

  static setToastRef(ref: React.RefObject<any>) {
    this.toastRef = ref;
  }

  static show(config: ToastConfig) {
    console.log(`Toast: ${config.message}`);
    
    if (!this.toastRef?.current) {
      console.warn('Toast ref not set. Make sure ToastProvider is rendered.');
      return;
    }

    const toastId = Date.now().toString();
    this.activeToasts.add(toastId);

    try {
      this.toastRef.current.showToast({
        ...config,
        id: toastId,
        duration: config.duration || 3000,
        position: config.position || 'top',
      });
    } catch (error) {
      console.warn('Toast failed to show:', error);
    }
  }

  static success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration });
  }

  static error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration });
  }

  static info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration });
  }

  static warning(message: string, duration?: number) {
    this.show({ message, type: 'warning', duration });
  }

  static hide(toastId: string) {
    this.activeToasts.delete(toastId);
  }

  static hideAll() {
    this.activeToasts.clear();
  }
}

export default ToastService;

// Toast colors based on type
export const TOAST_COLORS = {
  success: {
    background: '#10B981',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  error: {
    background: '#EF4444',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  warning: {
    background: '#F59E0B',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  info: {
    background: '#3B82F6',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
};

export { ToastService };
