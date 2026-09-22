import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';

const API=(process.env.EXPO_PUBLIC_ADMIN_API_URL||'').replace(/\/$/,'');
const TOKEN=process.env.EXPO_PUBLIC_ADMIN_TOKEN||'';
const NAVY='#06182B',CARD='#0D243C',CARD2='#122C47',GOLD='#F4C45D',WHITE='#F7F8FB',MUTED='#AFC0D1',RED='#FF5A5F',GREEN='#5CD18A';

function fmt(value){
 if(!value)return '—';
 try{return new Intl.DateTimeFormat('ar-IQ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return String(value)}
}
function kindLabel(kind){
 if(kind==='money_transfer_16')return 'رقم التحويل 16 رقم';
 if(kind==='mobile_purchase_10')return 'رقم الحساب 10 أرقام';
 return kind||'—';
}
function statusLabel(status){
 if(status==='approved')return 'مفعّل';
 if(status==='rejected')return 'مرفوض';
 return 'بانتظار الموافقة';
}

export default function App(){
 const [rows,setRows]=useState([]);
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [activeTab,setActiveTab]=useState('pending');
 const [siteStats,setSiteStats]=useState(null);

 const headers=useMemo(()=>({Accept:'application/json',Authorization:`Bearer ${TOKEN}`}),[]);

 const load=useCallback(async(silent=false)=>{
  if(!silent)setError('');
  try{
   const [reqRes,statsRes]=await Promise.all([
    fetch(`${API}/api/admin/plus/requests?t=${Date.now()}`,{headers}),
    fetch(`${API}/api/admin/site/stats?t=${Date.now()}`,{headers})
   ]);
   const reqData=await reqRes.json().catch(()=>({}));
   if(!reqRes.ok||!reqData?.ok)throw new Error(reqData?.error||`HTTP_${reqRes.status}`);
   setRows(Array.isArray(reqData.requests)?reqData.requests:[]);
   const statsData=await statsRes.json().catch(()=>({}));
   if(statsRes.ok&&statsData?.ok)setSiteStats(statsData);
  }catch(e){
   if(!silent)setError('تعذر الاتصال بخدمة إدارة وسام ديجيتال.');
  }finally{
   setLoading(false);setRefreshing(false);
  }
 },[headers]);

 useEffect(()=>{
  load();
  const timer=setInterval(()=>load(true),12000);
  return()=>clearInterval(timer);
 },[load]);

 const decide=async(row,action)=>{
  const word=action==='approve'?'تفعيل':'رفض';
  Alert.alert(`${word} الطلب`,`${row.deviceCode}\nالمبلغ: ${Number(row.amountIqd||8000).toLocaleString('en-US')} د.ع`,[
   {text:'إلغاء',style:'cancel'},
   {text:word,style:action==='reject'?'destructive':'default',onPress:async()=>{
    setBusy(row.id+action);
    try{
     const res=await fetch(`${API}/api/admin/plus/requests/${encodeURIComponent(row.id)}/${action}`,{method:'POST',headers});
     const data=await res.json().catch(()=>({}));
     if(!res.ok||!data?.ok)throw new Error(data?.error||'failed');
     await load(true);
     Alert.alert(action==='approve'?'تم التفعيل':'تم الرفض',action==='approve'?'هذا الجهاز أصبح مسموحًا له بتنزيل Plus.':'بقي هذا الجهاز غير مفعّل.');
    }catch(e){
     Alert.alert('خطأ','تعذر تنفيذ العملية الآن.');
    }finally{setBusy('')}
   }}
  ]);
 };

 const pending=rows.filter(x=>x.status==='pending').length;
 const approved=rows.filter(x=>x.status==='approved').length;
 const rejected=rows.filter(x=>x.status==='rejected').length;
 const filteredRows=rows.filter(x=>x.status===activeTab);

 return <SafeAreaView style={s.safe}>
  <StatusBar style="light"/>
  <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load(true)}} tintColor={GOLD}/>}>
   <Text style={s.brand}>Wissam Digital Admin</Text>
   <Text style={s.subtitle}>إدارة وسام ديجيتال</Text>

   <View style={s.sectionHeader}>
    <View><Text style={s.sectionTitle}>الأفق Plus · al ufuq</Text><Text style={s.sectionHint}>طلبات التفعيل المرتبطة بكود الموبايل</Text></View>
    <View style={s.badge}><Text style={s.badgeText}>{pending}</Text></View>
   </View>

   <View style={s.tabs}>
    <Pressable onPress={()=>setActiveTab('pending')} style={[s.tab,activeTab==='pending'&&s.tabActive]}><Text style={[s.tabText,activeTab==='pending'&&s.tabTextActive]}>الطلبات ({pending})</Text></Pressable>
    <Pressable onPress={()=>setActiveTab('approved')} style={[s.tab,activeTab==='approved'&&s.tabActive]}><Text style={[s.tabText,activeTab==='approved'&&s.tabTextActive]}>المقبولة ({approved})</Text></Pressable>
    <Pressable onPress={()=>setActiveTab('rejected')} style={[s.tab,activeTab==='rejected'&&s.tabActive]}><Text style={[s.tabText,activeTab==='rejected'&&s.tabTextActive]}>المرفوضة ({rejected})</Text></Pressable>
   </View>

   <View style={s.analyticsCard}>
    <Text style={s.analyticsTitle}>إحصائيات موقع Wissam Digital</Text>
    <View style={s.stats}>
     <View style={s.stat}><Text style={s.statNum}>{Number(siteStats?.today?.visits||0)}</Text><Text style={s.statLabel}>زيارات اليوم</Text></View>
     <View style={s.stat}><Text style={s.statNum}>{Number(siteStats?.totals?.visits||0)}</Text><Text style={s.statLabel}>كل الزيارات</Text></View>
    </View>
    <View style={s.stats}>
     <View style={s.stat}><Text style={s.statNum}>{Number(siteStats?.today?.alofokDownloads||0)}</Text><Text style={s.statLabel}>تحميلات الأفق اليوم</Text></View>
     <View style={s.stat}><Text style={s.statNum}>{Number(siteStats?.totals?.alofokDownloads||0)}</Text><Text style={s.statLabel}>إجمالي تحميلات الأفق</Text></View>
    </View>
   </View>

   {loading?<View style={s.center}><ActivityIndicator size="large" color={GOLD}/><Text style={s.muted}>جاري تحميل الطلبات…</Text></View>:null}
   {!!error?<View style={s.errorBox}><Text style={s.errorText}>{error}</Text><Pressable onPress={()=>load()} style={s.retry}><Text style={s.retryText}>إعادة المحاولة</Text></Pressable></View>:null}

   {!loading&&!error&&filteredRows.length===0?<View style={s.empty}><Text style={s.emptyTitle}>{activeTab==='pending'?'لا توجد طلبات بانتظار الموافقة':activeTab==='approved'?'لا توجد طلبات مقبولة':'لا توجد طلبات مرفوضة'}</Text><Text style={s.muted}>{activeTab==='pending'?'أول ما ينسخ مستخدم رقم التحويل من شاشة تفعيل Plus، يظهر الطلب هنا.':'اختر تبويبًا آخر لعرض بقية الطلبات.'}</Text></View>:null}

   {filteredRows.map(row=><View key={row.id} style={[s.card,row.status==='pending'&&s.pendingCard]}>
    <View style={s.rowTop}>
     <Text style={s.code}>{row.deviceCode}</Text>
     <Text style={[s.status,row.status==='approved'?{color:GREEN}:row.status==='rejected'?{color:RED}:{color:GOLD}]}>{statusLabel(row.status)}</Text>
    </View>
    <Text style={s.meta}>المبلغ: {Number(row.amountIqd||8000).toLocaleString('en-US')} د.ع</Text>
    <Text style={s.meta}>النسخ: {kindLabel(row.destinationKind)}</Text>
    <Text style={s.meta}>الوقت: {fmt(row.lastCopiedAt||row.createdAt)}</Text>
    <Text style={s.meta}>عدد مرات النسخ: {Number(row.copyCount||1)}</Text>
    {row.status==='pending'?<View style={s.actions}>
     <Pressable disabled={!!busy} onPress={()=>decide(row,'approve')} style={[s.btn,s.approve]}><Text style={s.approveText}>{busy===row.id+'approve'?'…':'تفعيل'}</Text></Pressable>
     <Pressable disabled={!!busy} onPress={()=>decide(row,'reject')} style={[s.btn,s.reject]}><Text style={s.rejectText}>{busy===row.id+'reject'?'…':'رفض'}</Text></Pressable>
    </View>:null}
   </View>)}

   <Text style={s.footer}>الأفق Plus · al ufuq · الطلبات منفصلة حسب الحالة · إحصائيات الموقع خاصة بالإدارة</Text>
  </ScrollView>
 </SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:44},
 brand:{color:WHITE,fontSize:28,fontWeight:'900',textAlign:'center',marginTop:8},
 subtitle:{color:GOLD,fontSize:16,fontWeight:'800',textAlign:'center',marginTop:5,marginBottom:24},
 sectionHeader:{backgroundColor:CARD,borderRadius:20,padding:16,borderWidth:1,borderColor:'rgba(244,196,93,.35)',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 sectionTitle:{color:WHITE,fontSize:22,fontWeight:'900'},sectionHint:{color:MUTED,fontSize:12,marginTop:5},
 badge:{minWidth:34,height:34,borderRadius:17,backgroundColor:GOLD,alignItems:'center',justifyContent:'center'},badgeText:{color:NAVY,fontWeight:'900'},
 tabs:{flexDirection:'row',gap:7,marginTop:12},tab:{flex:1,minHeight:46,borderRadius:14,backgroundColor:CARD2,borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center',paddingHorizontal:6},tabActive:{backgroundColor:GOLD,borderColor:GOLD},tabText:{color:MUTED,fontSize:11,fontWeight:'900',textAlign:'center'},tabTextActive:{color:NAVY},analyticsCard:{backgroundColor:CARD,borderRadius:18,padding:14,marginTop:12,borderWidth:1,borderColor:'rgba(92,209,138,.35)'},analyticsTitle:{color:GREEN,fontSize:15,fontWeight:'900',textAlign:'right'},stats:{flexDirection:'row',gap:8,marginTop:10},stat:{flex:1,backgroundColor:CARD2,borderRadius:16,paddingVertical:12,alignItems:'center'},statNum:{color:WHITE,fontSize:22,fontWeight:'900'},statLabel:{color:MUTED,fontSize:11,marginTop:3,textAlign:'center'},
 center:{padding:30,alignItems:'center'},muted:{color:MUTED,fontSize:13,lineHeight:20,textAlign:'center',marginTop:10},
 empty:{backgroundColor:CARD,borderRadius:18,padding:24,marginTop:16,alignItems:'center'},emptyTitle:{color:WHITE,fontSize:17,fontWeight:'900'},
 errorBox:{backgroundColor:'rgba(255,90,95,.10)',borderColor:'rgba(255,90,95,.45)',borderWidth:1,borderRadius:18,padding:16,marginTop:16},errorText:{color:WHITE,textAlign:'center'},retry:{backgroundColor:GOLD,borderRadius:12,paddingVertical:11,marginTop:12,alignItems:'center'},retryText:{color:NAVY,fontWeight:'900'},
 card:{backgroundColor:CARD,borderRadius:18,padding:16,marginTop:12,borderWidth:1,borderColor:'rgba(255,255,255,.10)'},pendingCard:{borderColor:'rgba(244,196,93,.55)'},
 rowTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},code:{color:WHITE,fontSize:16,fontWeight:'900',flex:1},status:{fontSize:12,fontWeight:'900'},
 meta:{color:MUTED,fontSize:12,marginTop:7},actions:{flexDirection:'row',gap:10,marginTop:16},btn:{flex:1,borderRadius:13,paddingVertical:13,alignItems:'center'},approve:{backgroundColor:GOLD},approveText:{color:NAVY,fontWeight:'900'},reject:{backgroundColor:'rgba(255,90,95,.14)',borderColor:'rgba(255,90,95,.55)',borderWidth:1},rejectText:{color:'#FFD7D8',fontWeight:'900'},
 footer:{color:'#7F93A7',fontSize:11,textAlign:'center',marginTop:26}
});
