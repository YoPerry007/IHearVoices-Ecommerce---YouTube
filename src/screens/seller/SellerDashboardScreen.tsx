import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import MarketplaceService from '../../services/marketplaceService';

type Tab = 'overview' | 'products' | 'orders' | 'store';

const SellerDashboardScreen: React.FC = () => {
  const { organization, profile, signOut, refreshAccount } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [product, setProduct] = useState({ name: '', description: '', category: 'clothes', price: '', brand: '', stock: '', image: '' });

  const refresh = async () => {
    if (!organization || organization.status !== 'approved') return;
    try {
      setLoading(true);
      const [nextProducts, nextOrders] = await Promise.all([
        MarketplaceService.getOwnerProducts(organization.id),
        MarketplaceService.getOwnerOrders(organization.id),
      ]);
      setProducts(nextProducts); setOrders(nextOrders);
    } catch (error: any) { Alert.alert('Refresh failed', error?.message || 'Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [organization?.id, organization?.status]);

  const revenue = useMemo(() => orders.filter(order => order.payment_status === 'paid').reduce((sum, order) => sum + Number(order.subtotal), 0), [orders]);

  const createProduct = async () => {
    if (!organization || !product.name.trim() || !Number(product.price) || !Number.isFinite(Number(product.stock))) {
      Alert.alert('Missing details', 'Name, valid price, and stock are required.'); return;
    }
    try {
      await MarketplaceService.createOwnerProduct(organization.id, {
        name: product.name, description: product.description || product.name, category: product.category,
        price: Number(product.price), brand: product.brand || organization.name, stock_count: Number(product.stock),
        images: product.image.trim() ? [product.image.trim()] : [],
      });
      setShowProductForm(false); setProduct({ name: '', description: '', category: 'clothes', price: '', brand: '', stock: '', image: '' });
      await refresh();
    } catch (error: any) { Alert.alert('Could not add product', error?.message || 'Please try again.'); }
  };

  if (!organization) return null;

  if (organization.status !== 'approved') {
    const copy = organization.status === 'pending' ? 'Your application is waiting for platform approval.'
      : organization.status === 'rejected' ? `Your application was rejected.${organization.rejection_reason ? ` ${organization.rejection_reason}` : ''}`
      : 'Your store is suspended and its products are hidden.';
    return <SafeAreaView style={styles.container}><View style={styles.statusPage}>
      <Ionicons name={organization.status === 'pending' ? 'time-outline' : 'alert-circle-outline'} size={56} color={organization.status === 'pending' ? COLORS.warning : COLORS.error} />
      <Text style={styles.pageTitle}>{organization.name}</Text><Text style={styles.statusLabel}>{organization.status.toUpperCase()}</Text>
      <Text style={styles.mutedCentered}>{copy}</Text>
      <TouchableOpacity style={styles.outlineButton} onPress={refreshAccount}><Text style={styles.outlineText}>Check Status</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => signOut()}><Text style={styles.signOutText}>Sign Out</Text></TouchableOpacity>
    </View></SafeAreaView>;
  }

  const overview = <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.welcome}>Welcome, {profile?.full_name || 'Store Owner'}</Text>
    <Text style={styles.muted}>Everything here belongs only to {organization.name}.</Text>
    <View style={styles.stats}>
      {[['Products', products.length], ['Orders', orders.length], ['Revenue', `GH₵${revenue.toFixed(2)}`]].map(([label, value]) =>
        <View key={String(label)} style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>)}
    </View>
    <View style={styles.notice}><Ionicons name="mic-off-outline" size={22} color={COLORS.textMuted} /><Text style={styles.noticeText}>Voice shopping is customer-only and is disabled in seller accounts.</Text></View>
  </ScrollView>;

  const productList = <View style={styles.flex}><View style={styles.sectionHeader}><Text style={styles.pageTitle}>Products</Text><TouchableOpacity style={styles.smallButton} onPress={() => setShowProductForm(true)}><Ionicons name="add" size={20} color={COLORS.white} /><Text style={styles.smallButtonText}>Add</Text></TouchableOpacity></View>
    <FlatList data={products} refreshing={loading} onRefresh={refresh} keyExtractor={item => item.id} contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No products yet.</Text>}
      renderItem={({ item }) => <View style={styles.card}><View style={styles.flex}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.muted}>{item.category} · Stock {item.stock_count}</Text></View><Text style={styles.price}>GH₵{Number(item.price).toFixed(2)}</Text></View>} />
  </View>;

  const orderList = <View style={styles.flex}><View style={styles.sectionHeader}><Text style={styles.pageTitle}>Store Orders</Text></View>
    <FlatList data={orders} refreshing={loading} onRefresh={refresh} keyExtractor={item => item.id} contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
      renderItem={({ item }) => <View style={styles.orderCard}><Text style={styles.cardTitle}>Order #{item.id.slice(0, 8)}</Text><Text style={styles.muted}>{item.customer?.full_name || item.customer?.email || 'Customer'} · GH₵{Number(item.subtotal).toFixed(2)}</Text><Text style={styles.muted}>{item.order_items?.length || 0} item(s)</Text><View style={styles.statusRow}>{(['processing','shipped','delivered'] as const).map(status => <TouchableOpacity key={status} style={[styles.statusChip, item.status === status && styles.statusChipActive]} onPress={async () => { try { await MarketplaceService.updateSellerOrderStatus(item.id, status); await refresh(); } catch (error: any) { Alert.alert('Update failed', error?.message); } }}><Text style={styles.statusChipText}>{status}</Text></TouchableOpacity>)}</View></View>} />
  </View>;

  const store = <ScrollView contentContainerStyle={styles.content}><Text style={styles.pageTitle}>{organization.name}</Text><Text style={styles.statusLabel}>APPROVED STORE</Text><Text style={styles.muted}>{organization.description || 'No description'}</Text><View style={styles.storeInfo}><Text style={styles.info}>Email: {organization.contact_email || '—'}</Text><Text style={styles.info}>Phone: {organization.phone || '—'}</Text><Text style={styles.info}>Location: {organization.location || '—'}</Text><Text style={styles.info}>Store link: /{organization.slug}</Text></View><TouchableOpacity style={styles.outlineButton} onPress={() => signOut()}><Text style={styles.outlineText}>Sign Out</Text></TouchableOpacity></ScrollView>;

  return <SafeAreaView style={styles.container}>
    <View style={styles.top}><View><Text style={styles.topTitle}>{organization.name}</Text><Text style={styles.muted}>Seller Dashboard</Text></View><Ionicons name="storefront" size={28} color={COLORS.primary} /></View>
    {tab === 'overview' ? overview : tab === 'products' ? productList : tab === 'orders' ? orderList : store}
    <View style={styles.tabs}>{(['overview','products','orders','store'] as Tab[]).map(item => <TouchableOpacity key={item} style={styles.tab} onPress={() => setTab(item)}><Ionicons name={({overview:'speedometer-outline',products:'cube-outline',orders:'receipt-outline',store:'storefront-outline'} as any)[item]} size={22} color={tab === item ? COLORS.primary : COLORS.textMuted} /><Text style={[styles.tabText, tab === item && { color: COLORS.primary }]}>{item}</Text></TouchableOpacity>)}</View>
    <Modal visible={showProductForm} transparent animationType="slide" onRequestClose={() => setShowProductForm(false)}><View style={styles.modalBackdrop}><ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}><Text style={styles.pageTitle}>Add Product</Text>{Object.entries(product).map(([key, value]) => <TextInput key={key} style={[styles.input, key === 'description' && { minHeight: 80 }]} value={value} onChangeText={text => setProduct(current => ({ ...current, [key]: text }))} placeholder={key === 'image' ? 'Image URL (optional)' : key[0].toUpperCase()+key.slice(1)} placeholderTextColor={COLORS.textMuted} keyboardType={key === 'price' || key === 'stock' ? 'numeric' : 'default'} multiline={key === 'description'} />)}<TouchableOpacity style={styles.primaryButton} onPress={createProduct}><Text style={styles.primaryText}>Publish Product</Text></TouchableOpacity><TouchableOpacity style={styles.outlineButton} onPress={() => setShowProductForm(false)}><Text style={styles.outlineText}>Cancel</Text></TouchableOpacity></ScrollView></View></Modal>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background}, flex:{flex:1}, top:{padding:SPACING.md,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:COLORS.border},topTitle:{fontSize:20,fontWeight:'700',color:COLORS.textPrimary},content:{padding:SPACING.lg,paddingBottom:40},welcome:{fontSize:24,fontWeight:'700',color:COLORS.textPrimary},muted:{color:COLORS.textSecondary,marginTop:4},mutedCentered:{color:COLORS.textSecondary,textAlign:'center',lineHeight:21,maxWidth:320},stats:{flexDirection:'row',gap:8,marginVertical:SPACING.lg},stat:{flex:1,backgroundColor:COLORS.surface,padding:SPACING.md,borderRadius:BORDER_RADIUS.md},statValue:{color:COLORS.textPrimary,fontSize:18,fontWeight:'700'},notice:{flexDirection:'row',gap:10,backgroundColor:COLORS.surface,padding:SPACING.md,borderRadius:BORDER_RADIUS.md},noticeText:{color:COLORS.textSecondary,flex:1},tabs:{flexDirection:'row',borderTopWidth:1,borderTopColor:COLORS.border,backgroundColor:COLORS.surface},tab:{flex:1,alignItems:'center',paddingVertical:10},tabText:{fontSize:11,color:COLORS.textMuted,textTransform:'capitalize'},sectionHeader:{padding:SPACING.md,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},pageTitle:{color:COLORS.textPrimary,fontSize:22,fontWeight:'700'},smallButton:{backgroundColor:COLORS.primary,flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:8,borderRadius:BORDER_RADIUS.md},smallButtonText:{color:COLORS.white,fontWeight:'700'},list:{padding:SPACING.md,gap:10},card:{backgroundColor:COLORS.surface,padding:SPACING.md,borderRadius:BORDER_RADIUS.md,flexDirection:'row',alignItems:'center'},cardTitle:{color:COLORS.textPrimary,fontWeight:'700',fontSize:16},price:{color:COLORS.primary,fontWeight:'700'},empty:{color:COLORS.textMuted,textAlign:'center',padding:40},orderCard:{backgroundColor:COLORS.surface,padding:SPACING.md,borderRadius:BORDER_RADIUS.md},statusRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:12},statusChip:{borderWidth:1,borderColor:COLORS.border,paddingHorizontal:9,paddingVertical:6,borderRadius:20},statusChipActive:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},statusChipText:{color:COLORS.textPrimary,fontSize:12,textTransform:'capitalize'},storeInfo:{backgroundColor:COLORS.surface,padding:SPACING.md,borderRadius:BORDER_RADIUS.md,marginTop:SPACING.lg,gap:10},info:{color:COLORS.textPrimary},outlineButton:{borderWidth:1,borderColor:COLORS.primary,padding:14,borderRadius:BORDER_RADIUS.md,alignItems:'center',marginTop:16},outlineText:{color:COLORS.primary,fontWeight:'700'},primaryButton:{backgroundColor:COLORS.primary,padding:14,borderRadius:BORDER_RADIUS.md,alignItems:'center',marginTop:10},primaryText:{color:COLORS.white,fontWeight:'700'},statusPage:{flex:1,alignItems:'center',justifyContent:'center',padding:SPACING.xl,gap:12},statusLabel:{color:COLORS.primary,fontWeight:'700',marginVertical:8},signOutText:{color:COLORS.error,fontWeight:'600',padding:16},modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.65)',justifyContent:'flex-end'},modal:{maxHeight:'88%',backgroundColor:COLORS.background,borderTopLeftRadius:24,borderTopRightRadius:24},modalContent:{padding:SPACING.lg,gap:10},input:{backgroundColor:COLORS.surface,color:COLORS.textPrimary,padding:13,borderRadius:BORDER_RADIUS.md,borderWidth:1,borderColor:COLORS.border},
});

export default SellerDashboardScreen;
