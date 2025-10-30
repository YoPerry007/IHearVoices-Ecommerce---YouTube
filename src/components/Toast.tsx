import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOAST_COLORS } from '../services/toastService';

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

const Toast = forwardRef<ToastRef>((props, ref) => {
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const [currentToast, setCurrentToast] = React.useState<ToastData | null>(null);

  useImperativeHandle(ref, () => ({
    showToast: (data: ToastData) => {
      setCurrentToast(data);
      showToastAnimation(data.duration);
    },
  }));

  const showToastAnimation = (duration: number) => {
    // Reset values
    translateY.setValue(-100);
    opacity.setValue(0);

    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate out after duration
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        hideToast();
      });
    }, duration);
  };

  const hideToast = () => {
    setCurrentToast(null);
  };

  if (!currentToast) return null;

  const colors = TOAST_COLORS[currentToast.type];
  const iconName = getIconName(currentToast.type);

  return (
    <SafeAreaView style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.toast, { backgroundColor: colors.background, transform: [{ translateY }], opacity }]}>
        <View style={styles.content}>
          <Ionicons name={iconName} size={20} color={colors.icon} />
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
            {currentToast.message}
          </Text>
        </View>
      </Animated.View>
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  toast: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
});

export default Toast;
