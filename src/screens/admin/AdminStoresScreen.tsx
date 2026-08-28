import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SPACING } from '../../constants/theme';
import MarketplaceService, { Organization, OrganizationStatus } from '../../services/marketplaceService';

interface Props { onNavigateBack: () => void; }

const AdminStoresScreen: React.FC<Props> = ({ onNavigateBack }) => {
  const [stores, setStores] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => { try { setLoading(true); setStores(await MarketplaceService.getAllStoresForAdmin()); } catch (error: any) { Alert.alert('Could not load stores', error?.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const review = async (store: Organization, status: Exclude<OrganizationStatus, 'pending'>) => {
    try { await MarketplaceService.reviewStore(store.id, status); await load(); }
    catch (error: any) { Alert.alert('Review failed', error?.message); }
  };
  return <View style={styles.container}><View style={styles.header}><TouchableOpacity onPress={onNavigateBack}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary}/></TouchableOpacity><Text style={styles.title}>Marketplace Stores</Text><View style={{width:24}}/></View>
    <FlatList data={stores} refreshing={loading} onRefresh={load} keyExtractor={item=>item.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No store applications.</Text>} renderItem={({item})=><View style={styles.card}><View style={styles.row}><View style={styles.flex}><Text style={styles.storeName}>{item.name}</Text><Text style={styles.muted}>{item.contact_email || 'No email'} · {item.location || 'No location'}</Text></View><Text style={[styles.badge,{color:item.status==='approved'?COLORS.success:item.status==='pending'?COLORS.warning:COLORS.error}]}>{item.status}</Text></View><Text style={styles.description}>{item.description || 'No description provided.'}</Text><View style={styles.actions}>{item.status!=='approved'&&<TouchableOpacity style={[styles.action,{backgroundColor:COLORS.success}]} onPress={()=>review(item,'approved')}><Text style={styles.actionText}>Approve</Text></TouchableOpacity>}{item.status!=='rejected'&&<TouchableOpacity style={[styles.action,{backgroundColor:COLORS.error}]} onPress={()=>review(item,'rejected')}><Text style={styles.actionText}>Reject</Text></TouchableOpacity>}{item.status==='approved'&&<TouchableOpacity style={[styles.action,{backgroundColor:COLORS.warning}]} onPress={()=>review(item,'suspended')}><Text style={styles.actionText}>Suspend</Text></TouchableOpacity>}</View></View>}/>
  </View>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:COLORS.background},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:SPACING.md,borderBottomWidth:1,borderBottomColor:COLORS.border},title:{color:COLORS.textPrimary,fontSize:20,fontWeight:'700'},list:{padding:SPACING.md,gap:12},card:{backgroundColor:COLORS.surface,padding:SPACING.md,borderRadius:BORDER_RADIUS.md},row:{flexDirection:'row',alignItems:'center'},flex:{flex:1},storeName:{color:COLORS.textPrimary,fontSize:17,fontWeight:'700'},muted:{color:COLORS.textMuted,marginTop:4},badge:{fontWeight:'700',textTransform:'uppercase'},description:{color:COLORS.textSecondary,marginVertical:12},actions:{flexDirection:'row',gap:8,flexWrap:'wrap'},action:{paddingHorizontal:14,paddingVertical:9,borderRadius:BORDER_RADIUS.md},actionText:{color:COLORS.white,fontWeight:'700'},empty:{textAlign:'center',color:COLORS.textMuted,padding:40}});
export default AdminStoresScreen;
