import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Alert,Image,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADS_API_BASE=(process.env.EXPO_PUBLIC_ADS_API_URL||'').replace(/\/$/,'');
const AD_PAYMENT_URL=process.env.EXPO_PUBLIC_AD_PAYMENT_URL||'';
export const MAX_WEEKLY_ADS=1;
const MIN_GAP_MS=48*60*60*1000;
const LEDGER_KEY='alofok_trial_ads_ledger_v1';

function weekKey(date=new Date()){
 const d=new Date(date);
 d.setHours(0,0,0,0);
 const mondayOffset=(d.getDay()+6)%7;
 d.setDate(d.getDate()-mondayOffset);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function readLedger(){
 try{
  const raw=await AsyncStorage.getItem(LEDGER_KEY);
  const parsed=raw?JSON.parse(raw):null;
  return parsed&&typeof parsed==='object'?parsed:{};
 }catch(e){return {}}
}

async function reserveWeeklySlot(){
 const now=Date.now(),week=weekKey();
 const ledger=await readLedger();
 const current=ledger.week===week?ledger:{week,count:0,lastShownAt:0};
 if((current.count||0)>=MAX_WEEKLY_ADS)return false;
 if(current.lastShownAt&&now-current.lastShownAt<MIN_GAP_MS)return false;
 const next={week,count:(current.count||0)+1,lastShownAt:now};
 try{await AsyncStorage.setItem(LEDGER_KEY,JSON.stringify(next))}catch(e){}
 return true;
}

function normalizeAd(data){
 const item=data?.ad||data?.item||data;
 if(!item||item.status!=='approved'||item.active===false)return null;
 if(!item.id||!item.title)return null;
 return {
  id:String(item.id),
  title:String(item.title),
  body:String(item.body||item.description||''),
  imageUrl:item.imageUrl||item.image_url||'',
  actionUrl:item.actionUrl||item.action_url||item.url||'',
  actionLabel:item.actionLabel||item.action_label||'',
  sponsor:item.sponsor||item.brand||''
 };
}

export function useTrialAd({enabled,country='IQ',language='ar'}){
 const [ad,setAd]=useState(null);
 const [loading,setLoading]=useState(false);

 useEffect(()=>{
  let cancelled=false;
  async function load(){
   if(!enabled||!ADS_API_BASE)return;
   setLoading(true);
   try{
    const query=new URLSearchParams({country:String(country||'IQ'),language:String(language||'ar')}).toString();
    const res=await fetch(`${ADS_API_BASE}/v1/ads/approved/next?${query}`,{headers:{'Cache-Control':'no-cache'}});
    if(!res.ok||res.status===204)return;
    const item=normalizeAd(await res.json());
    if(!item||cancelled)return;
    const allowed=await reserveWeeklySlot();
    if(!allowed||cancelled)return;
    setAd(item);
    fetch(`${ADS_API_BASE}/v1/ads/${encodeURIComponent(item.id)}/impression`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({country,language})}).catch(()=>{});
   }catch(e){}finally{if(!cancelled)setLoading(false)}
  }
  load();
  return()=>{cancelled=true};
 },[enabled,country,language]);

 const dismiss=useCallback(()=>setAd(null),[]);
 const open=useCallback(async()=>{
  const url=ad?.actionUrl;
  if(url){try{await Linking.openURL(url)}catch(e){}}
  setAd(null);
 },[ad]);
 return {ad,loading,dismiss,open};
}

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}

export function TrialAdOverlay({ad,rtl,onClose,onOpen}){
 if(!ad)return null;
 const action=ad.actionLabel||(rtl?'فتح الإعلان':'Open ad');
 return <View style={s.overlay}>
  <View style={s.overlayCard}>
   <View style={s.sponsoredRow}><Text style={s.sponsored}>{rtl?'إعلان ممول':'Sponsored'}</Text><Pressable onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
   {!!ad.imageUrl&&<Image source={{uri:ad.imageUrl}} style={s.adImage}/>} 
   {!!ad.sponsor&&<Text style={[s.sponsor,dir(rtl)]}>{ad.sponsor}</Text>}
   <Text style={[s.adTitle,dir(rtl)]}>{ad.title}</Text>
   {!!ad.body&&<Text style={[s.adBody,dir(rtl)]}>{ad.body}</Text>}
   {!!ad.actionUrl&&<Pressable onPress={onOpen} style={s.primary}><Text style={s.primaryText}>{action}</Text></Pressable>}
   <Pressable onPress={onClose} style={s.secondary}><Text style={s.secondaryText}>{rtl?'إغلاق':'Close'}</Text></Pressable>
  </View>
 </View>
}

export function AdvertiseScreen({rtl,language,country,onBack}){
 const copy=useMemo(()=>rtl?{
  title:'أعلن معنا',hint:'أرسل إعلانك للمراجعة. لن يظهر لأي مستخدم قبل موافقة إدارة الأفق.',brand:'اسم النشاط أو المعلن',contact:'رقم الهاتف أو وسيلة التواصل',adTitle:'عنوان الإعلان',body:'نص الإعلان',image:'رابط صورة الإعلان (اختياري)',link:'رابط الإعلان (اختياري)',submit:'إرسال للمراجعة',pending:'تم استلام الطلب وهو بانتظار المراجعة والموافقة.',notConnected:'خدمة استقبال الإعلانات لم تُربط بالخادم الرسمي بعد.',pay:'الانتقال إلى الدفع',paymentNote:'الدفع يتم عبر مزود الدفع المعتمد، وتسوية الإيرادات إلى حساب مالك الأفق تتم خارج التطبيق. لا تُحفظ بيانات البطاقة داخل التطبيق.',request:'رقم الطلب',back:'رجوع'
 }:{
  title:'Advertise with us',hint:'Submit your ad for review. It will never be shown to users before AlofoK administration approves it.',brand:'Business or advertiser name',contact:'Phone or contact method',adTitle:'Ad title',body:'Ad text',image:'Ad image URL (optional)',link:'Ad destination URL (optional)',submit:'Submit for review',pending:'Your request was received and is pending manual review and approval.',notConnected:'The official advertising server is not connected yet.',pay:'Continue to payment',paymentNote:'Payment is handled by the approved payment provider and settled to the AlofoK owner account outside the app. Card details are not stored in the app.',request:'Request ID',back:'Back'
 },[rtl]);
 const [brand,setBrand]=useState(''),[contact,setContact]=useState(''),[title,setTitle]=useState(''),[body,setBody]=useState(''),[imageUrl,setImageUrl]=useState(''),[actionUrl,setActionUrl]=useState('');
 const [busy,setBusy]=useState(false),[result,setResult]=useState(null);

 const submit=useCallback(async()=>{
  if(!brand.trim()||!contact.trim()||!title.trim()||!body.trim()){
   Alert.alert(copy.title,rtl?'أكمل اسم المعلن ووسيلة التواصل والعنوان ونص الإعلان.':'Complete the advertiser name, contact, title and ad text.');return;
  }
  if(!ADS_API_BASE){Alert.alert(copy.title,copy.notConnected);return}
  setBusy(true);
  try{
   const res=await fetch(`${ADS_API_BASE}/v1/ads/submissions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brand:brand.trim(),contact:contact.trim(),title:title.trim(),body:body.trim(),imageUrl:imageUrl.trim(),actionUrl:actionUrl.trim(),country,language})});
   if(!res.ok)throw new Error('submit_failed');
   const data=await res.json();
   setResult({requestId:String(data.requestId||data.id||''),status:'pending_review',paymentUrl:data.paymentUrl||AD_PAYMENT_URL||''});
  }catch(e){Alert.alert(copy.title,rtl?'تعذر إرسال الطلب الآن. حاول مرة أخرى.':'Could not submit the request now. Please try again.')}finally{setBusy(false)}
 },[brand,contact,title,body,imageUrl,actionUrl,country,language,copy,rtl]);

 if(result)return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.formWrap}>
  <View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text style={[s.screenTitle,dir(rtl)]}>{copy.title}</Text><View style={s.back}/></View>
  <View style={s.statusCard}><Text style={[s.statusTitle,dir(rtl)]}>✓ {copy.pending}</Text>{!!result.requestId&&<Text style={[s.statusMeta,dir(rtl)]}>{copy.request}: {result.requestId}</Text>}</View>
  <Text style={[s.note,dir(rtl)]}>{copy.paymentNote}</Text>
  {!!result.paymentUrl&&<Pressable onPress={()=>Linking.openURL(result.paymentUrl).catch(()=>{})} style={s.primary}><Text style={s.primaryText}>{copy.pay}</Text></Pressable>}
  <Pressable onPress={onBack} style={s.secondary}><Text style={s.secondaryText}>{copy.back}</Text></Pressable>
 </ScrollView></SafeAreaView>;

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.formWrap} keyboardShouldPersistTaps='handled'>
  <View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text style={[s.screenTitle,dir(rtl)]}>{copy.title}</Text><View style={s.back}/></View>
  <Text style={[s.hint,dir(rtl)]}>{copy.hint}</Text>
  {!ADS_API_BASE&&<View style={s.warning}><Text style={[s.warningText,dir(rtl)]}>{copy.notConnected}</Text></View>}
  {[[copy.brand,brand,setBrand],[copy.contact,contact,setContact],[copy.adTitle,title,setTitle],[copy.body,body,setBody],[copy.image,imageUrl,setImageUrl],[copy.link,actionUrl,setActionUrl]].map(([label,value,setter],i)=><View key={label} style={s.field}><Text style={[s.label,dir(rtl)]}>{label}</Text><TextInput value={value} onChangeText={setter} multiline={i===3} autoCapitalize='sentences' style={[s.input,i===3&&s.inputTall,dir(rtl)]} placeholderTextColor='#74869A'/></View>)}
  <Text style={[s.note,dir(rtl)]}>{copy.paymentNote}</Text>
  <Pressable disabled={busy} onPress={submit} style={[s.primary,busy&&{opacity:.6}]}>{busy?<ActivityIndicator color='#06182B'/>:<Text style={s.primaryText}>{copy.submit}</Text>}</Pressable>
  <Pressable onPress={onBack} style={s.secondary}><Text style={s.secondaryText}>{copy.back}</Text></Pressable>
 </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#06182B'},formWrap:{padding:18,paddingBottom:42},header:{height:62,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,alignItems:'center',justifyContent:'center'},backText:{color:'#F7F8FB',fontSize:32},screenTitle:{flex:1,color:'#F7F8FB',fontSize:23,fontWeight:'900',marginHorizontal:8},hint:{color:'#B9C4D1',fontSize:14,lineHeight:22,marginBottom:10},warning:{borderWidth:1,borderColor:'#DCA94B',backgroundColor:'rgba(244,196,93,.10)',padding:12,borderRadius:14,marginBottom:10},warningText:{color:'#FFE4A0',fontSize:12,lineHeight:19},field:{marginTop:10},label:{color:'#F7F8FB',fontSize:13,fontWeight:'700',marginBottom:6},input:{minHeight:48,borderWidth:1,borderColor:'rgba(255,255,255,.16)',borderRadius:14,backgroundColor:'rgba(17,34,52,.88)',color:'#F7F8FB',paddingHorizontal:12,paddingVertical:10,fontSize:14},inputTall:{minHeight:96,textAlignVertical:'top'},note:{color:'#B9C4D1',fontSize:12,lineHeight:19,marginVertical:14},primary:{minHeight:50,borderRadius:16,backgroundColor:'#F4C45D',alignItems:'center',justifyContent:'center',paddingHorizontal:14,marginTop:8},primaryText:{color:'#06182B',fontSize:15,fontWeight:'900'},secondary:{minHeight:46,alignItems:'center',justifyContent:'center',marginTop:7},secondaryText:{color:'#DCE3EC',fontSize:14,fontWeight:'700'},statusCard:{borderWidth:1,borderColor:'#F4C45D',borderRadius:17,backgroundColor:'rgba(244,196,93,.10)',padding:16,marginTop:20},statusTitle:{color:'#FFE4A0',fontSize:15,fontWeight:'800',lineHeight:23},statusMeta:{color:'#DCE3EC',fontSize:12,marginTop:9},overlay:{...StyleSheet.absoluteFillObject,zIndex:90,backgroundColor:'rgba(0,0,0,.72)',alignItems:'center',justifyContent:'center',padding:20},overlayCard:{width:'100%',maxWidth:410,borderRadius:22,borderWidth:1,borderColor:'#F4C45D',backgroundColor:'#0B223A',padding:16},sponsoredRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sponsored:{color:'#F4C45D',fontSize:11,fontWeight:'800'},close:{width:36,height:36,alignItems:'center',justifyContent:'center'},closeText:{color:'#F7F8FB',fontSize:28},adImage:{width:'100%',height:185,borderRadius:15,marginTop:8,resizeMode:'cover'},sponsor:{color:'#B9C4D1',fontSize:12,marginTop:11},adTitle:{color:'#F7F8FB',fontSize:21,fontWeight:'900',marginTop:6},adBody:{color:'#DCE3EC',fontSize:14,lineHeight:21,marginTop:8}
});
