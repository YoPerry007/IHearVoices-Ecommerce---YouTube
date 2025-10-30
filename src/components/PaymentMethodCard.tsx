import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../constants/theme';

interface PaymentMethodCardProps {
  method: {
    id: string;
    name: string;
    description: string;
    icon: string;
    processing_fee: number;
    ghana_specific: boolean;
  };
  isSelected: boolean;
  onSelect: () => void;
  processingFee: number;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  isSelected,
  onSelect,
  processingFee
}) => {
  const getMethodColor = () => {
    switch (method.id) {
      case 'momo_mtn': return '#FFE135';
      case 'momo_vodafone': return '#E60026';
      case 'momo_airtel': return '#FB3C2C';
      case 'card': return '#4CAF50';
      case 'bank_transfer': return '#2196F3';
      default: return COLORS.primary;
    }
  };

  const getMethodText = () => {
    switch (method.id) {
      case 'momo_mtn': return 'MTN MoMo';
      case 'momo_vodafone': return 'Vodafone Cash';
      case 'momo_airtel': return 'AirtelTigo Money';
      case 'card': return 'Card Payment';
      case 'bank_transfer': return 'Bank Transfer';
      default: return method.name;
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.card, isSelected && styles.selectedCard]} 
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {isSelected && (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.selectedOverlay}
        />
      )}
      
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: `${getMethodColor()}20` }]}>
            <Ionicons 
              name={method.icon as any} 
              size={24} 
              color={getMethodColor()} 
            />
          </View>
          
          <View style={styles.methodInfo}>
            <Text style={[styles.methodName, isSelected && styles.selectedText]}>
              {getMethodText()}
            </Text>
            <Text style={[styles.methodDescription, isSelected && styles.selectedSubText]}>
              {method.description}
            </Text>
            {method.ghana_specific && (
              <Text style={[styles.ghanaLabel, isSelected && styles.selectedGhanaLabel]}>
                🇬🇭 Ghana Preferred
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          {processingFee > 0 && (
            <Text style={[styles.fee, isSelected && styles.selectedText]}>
              +GH₵{processingFee.toFixed(2)}
            </Text>
          )}
          
          <View style={[styles.radioContainer, isSelected && styles.selectedRadio]}>
            {isSelected && (
              <View style={styles.radioInner} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: COLORS.primary,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ghanaLabel: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  fee: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  radioContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  selectedText: {
    color: COLORS.primary,
  },
  selectedSubText: {
    color: COLORS.primaryLight,
  },
  selectedGhanaLabel: {
    color: COLORS.primaryLight,
  },
});

export default PaymentMethodCard;
