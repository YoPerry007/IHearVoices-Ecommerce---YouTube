import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  position: 'top' | 'bottom';
}

interface ToastRef {
  showToast: (data: ToastData) => void;
}

const TOAST_COLORS = {
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
  info: {
    background: '#3B82F6',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  warning: {
    background: '#F59E0B',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
};

const SimpleToast = forwardRef<ToastRef>((props, ref) => {
  const [currentToast, setCurrentToast] = React.useState<ToastData | null>(null);

  useImperativeHandle(ref, () => ({
    showToast: (data: ToastData) => {
      setCurrentToast(data);
      // Auto-dismiss after duration
      setTimeout(() => {
        setCurrentToast(null);
      }, data.duration);
    },
  }));

  if (!currentToast) return null;

  const colors = TOAST_COLORS[currentToast.type];
  const iconName = getIconName(currentToast.type);

  return (
    <SafeAreaView style={styles.container} pointerEvents="none">
      <View style={[styles.toast, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Ionicons name={iconName} size={20} color={colors.icon} />
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
            {currentToast.message}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
});

const getIconName = (type: string): any => {
  switch (type) {
    case 'success':
      return 'checkmark-circle';
    case 'error':
      return 'close-circle';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'information-circle';
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
  },
  toast: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SimpleToast;
