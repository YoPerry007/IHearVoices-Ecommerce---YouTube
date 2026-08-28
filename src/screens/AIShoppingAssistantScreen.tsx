import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AssistantHistoryMessage,
  AssistantOrder,
  AssistantProduct,
  ShoppingAssistantService,
} from '../services/shoppingAssistantService';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface AIShoppingAssistantScreenProps {
  onNavigateToProduct: (productId: string) => void;
  onNavigateToOrder: (orderId: string) => void;
}

interface ChatMessage extends AssistantHistoryMessage {
  id: string;
  products?: AssistantProduct[];
  orders?: AssistantOrder[];
  isError?: boolean;
}

const QUICK_PROMPTS = [
  'Find sneakers under GH₵500',
  'Track my latest order',
  'What is your return policy?',
  'Recommend something popular',
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi! I’m your shopping assistant. I can find products, compare options, explain store policies, and check your order status. How can I help?',
};

const formatPrice = (price: number) => `GH₵${Number(price || 0).toFixed(2)}`;

const formatStatus = (status: string) =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const AIShoppingAssistantScreen: React.FC<AIShoppingAssistantScreenProps> = ({
  onNavigateToProduct,
  onNavigateToOrder,
}) => {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const conversationHistory = useMemo<AssistantHistoryMessage[]>(
    () =>
      messages
        .filter((item) => item.id !== INITIAL_MESSAGE.id && !item.isError)
        .map(({ role, content }) => ({ role, content }))
        .slice(-12),
    [messages],
  );

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages, isSending]);

  const sendMessage = async (preset?: string) => {
    const messageText = (preset ?? input).trim();
    if (!messageText || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await ShoppingAssistantService.sendMessage(
        messageText,
        conversationHistory,
      );

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.reply,
          products: response.products,
          orders: response.orders,
        },
      ]);
    } catch (error) {
      const content =
        error instanceof Error
          ? error.message
          : 'I’m not sure about that. Please contact customer support.';

      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const renderProduct = (product: AssistantProduct) => (
    <TouchableOpacity
      key={product.id}
      style={styles.productCard}
      onPress={() => onNavigateToProduct(product.id)}
      activeOpacity={0.8}
    >
      {product.images?.[0] ? (
        <Image source={{ uri: product.images[0] }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={22} color={COLORS.textMuted} />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text numberOfLines={1} style={styles.productName}>
          {product.name}
        </Text>
        <Text style={styles.productStore}>{product.organization?.name || 'IHearVoices'}</Text>
        <Text style={styles.productBrand}>{product.brand}</Text>
        <View style={styles.productMeta}>
          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={COLORS.secondary} />
            <Text style={styles.ratingText}>{Number(product.rating || 0).toFixed(1)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const renderOrder = (order: AssistantOrder) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => onNavigateToOrder(order.id)}
      activeOpacity={0.8}
    >
      <View style={styles.orderIcon}>
        <Ionicons name="cube-outline" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.orderInfo}>
        <Text style={styles.orderTitle}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
        <Text numberOfLines={1} style={styles.orderItems}>
          {order.item_names.length ? order.item_names.join(', ') : 'Order details'}
        </Text>
        <Text style={styles.orderDate}>
          {new Date(order.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.orderRight}>
        <Text style={styles.orderPrice}>{formatPrice(order.total_amount)}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{formatStatus(order.status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color={COLORS.white} />
          </View>
        )}
        <View style={styles.messageColumn}>
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.assistantBubble,
              item.isError && styles.errorBubble,
            ]}
          >
            <Text style={[styles.messageText, isUser && styles.userMessageText]}>
              {item.content}
            </Text>
          </View>
          {!!item.products?.length && (
            <View style={styles.resultsContainer}>{item.products.map(renderProduct)}</View>
          )}
          {!!item.orders?.length && (
            <View style={styles.resultsContainer}>{item.orders.map(renderOrder)}</View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={22} color={COLORS.white} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Shopping Assistant</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
          <Text style={styles.headerSubtitle}>Secure AI assistant</Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Start a new conversation"
          style={styles.resetButton}
          onPress={() => setMessages([INITIAL_MESSAGE])}
          disabled={isSending}
        >
          <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          isSending ? (
            <View style={styles.typingRow}>
              <View style={styles.avatar}>
                <Ionicons name="sparkles" size={16} color={COLORS.white} />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.typingText}>Checking the marketplace…</Text>
              </View>
            </View>
          ) : null
        }
      />

      {messages.length === 1 && (
        <View style={styles.quickPrompts}>
          {QUICK_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              style={styles.quickPrompt}
              onPress={() => sendMessage(prompt)}
            >
              <Text style={styles.quickPromptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about products or orders…"
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={1000}
            editable={!isSending}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            accessibilityLabel="Send message"
            style={[
              styles.sendButton,
              (!input.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isSending}
          >
            <Ionicons name="arrow-up" size={21} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>
          AI can make mistakes. Confirm prices and availability on the product page.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700' },
  headerSubtitle: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.fontSize.xs },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  resetButton: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  list: { flex: 1 },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.lg },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.md },
  userMessageRow: { justifyContent: 'flex-end' },
  avatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  messageColumn: { maxWidth: '86%', flexShrink: 1 },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: BORDER_RADIUS.xl },
  assistantBubble: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.sm },
  userBubble: { backgroundColor: COLORS.primaryDark, borderTopRightRadius: BORDER_RADIUS.sm },
  errorBubble: { borderWidth: 1, borderColor: COLORS.error },
  messageText: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.sm, lineHeight: 20 },
  userMessageText: { color: COLORS.white },
  resultsContainer: { marginTop: SPACING.sm, gap: SPACING.sm },
  productCard: {
    width: '100%', minWidth: 270, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  productImage: { width: 58, height: 58, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, marginHorizontal: SPACING.sm },
  productName: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700' },
  productStore: { color: COLORS.primary, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '700', marginTop: 2 },
  productBrand: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 2 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 5 },
  productPrice: { color: COLORS.primaryLight, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs },
  orderCard: {
    minWidth: 280, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  orderIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary + '18',
  },
  orderInfo: { flex: 1, marginHorizontal: SPACING.sm },
  orderTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700' },
  orderItems: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 2 },
  orderDate: { color: COLORS.textMuted, fontSize: 10, marginTop: 3 },
  orderRight: { alignItems: 'flex-end', gap: 5 },
  orderPrice: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '700' },
  statusPill: { backgroundColor: COLORS.info + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  statusText: { color: COLORS.info, fontSize: 10, fontWeight: '600' },
  typingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: BORDER_RADIUS.xl,
  },
  typingText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm },
  quickPrompts: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
  },
  quickPrompt: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface,
  },
  quickPromptText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs },
  inputArea: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.sm, backgroundColor: COLORS.surface },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    paddingLeft: 14, paddingRight: 6, paddingVertical: 6,
  },
  input: {
    flex: 1, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.sm,
    maxHeight: 100, minHeight: 38, paddingTop: 9, paddingBottom: 8,
  },
  sendButton: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.35 },
  disclaimer: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center', marginTop: 6 },
});

export default AIShoppingAssistantScreen;
