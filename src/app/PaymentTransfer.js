import React,{useEffect,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {getDeviceCode} from '../services/deviceSecurity';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.88)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';

const CARD_NUMBER=process.env.EXPO_PUBLIC_PAYMENT_CARD||process.env.EXPO_PUBLIC_PAYMENT_ACCOUNT||'';
const ACCOUNT_NUMBER=process.env.EXPO_PUBLIC_PAYMENT_BANK_ACCOUNT||'5490910105';
const ADMIN_EVENT_ENDPOINT=process.env.EXPO_PUBLIC_PAYMENT_COPY_WEBHOOK||'https://wispy-salad-438b.wissamdigital11.workers.dev/api/payment-copy';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}
function digits(value){return String(value||'').replace(/\D/g,'')}
function maskedCard(value){
 const clean=digits(value);
 if(!clean)return '•••• •••• •••• ••••';
 return `•••• •••• •••• ${clean.slice(-4)}`;
}

export function PaymentTransferPanel({rtl,purpose='support',edition='trial',amountIqd=null,eventName='payment_data_copied',notificationEndpoint=ADMIN_EVENT_ENDPOINT}){
 const [deviceCode,setDeviceCode]=useState('…');
 const [busy,setBusy]=useState('');

 useEffect(()=>{
  let active=true;
  getDeviceCode().then(code=>{if(active)setDeviceCode(code)}).catch(()=>{if(active)setDeviceCode('غير متاح')});
  return()=>{active=false};
 },[]);

 const postCopyEvent=async(destinationKind,copiedAt)=>{
  if(!notificationEndpoint)return false;
  try{
   const response=await fetch(notificationEndpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({event:eventName,purpose,edition,deviceCode,destinationKind,amountIqd:purpose==='plus'?amountIqd:null,copiedAt,timezoneOffsetMinutes:-new Date().getTimezoneOffset()})
   });
   return response.ok;
  }catch(e){return false}
 };

 const copyDeviceCode=async()=>{
  if(!deviceCode||deviceCode==='…'||deviceCode==='غير متاح')return;
  await Clipboard.setStringAsync(deviceCode);
  Alert.alert(rtl?'تم نسخ كود الجهاز':'Device code copied',rtl?'أرسل هذا الكود مع إشعار التحويل حتى يتم تفعيل Plus لهذا الموبايل فقط.':'Send this code with the payment notice so Plus can be approved for this phone only.');
 };

 const copyDestination=async(kind,value)=>{
  const clean=digits(value);
  if(!clean){
   Alert.alert(rtl?'بيانات التحويل غير مكتملة':'Transfer data incomplete',rtl?'رقم التحويل غير متوفر في هذا الإصدار.':'The transfer number is unavailable in this build.');
   return;
  }
  setBusy(kind);
  const copiedAt=new Date().toISOString();
  await Clipboard.setStringAsync(clean);
  await postCopyEvent(kind,copiedAt);
  setBusy('');
  Alert.alert(rtl?'تم النسخ':'Copied',rtl?`تم نسخ الرقم. كود جهازك هو ${deviceCode}. بعد التحويل أرسل الكود لتأكيد Plus.`:`Number copied. Your device code is ${deviceCode}. After payment, send this code to approve Plus.`);
 };

 return <View style={s.wrap}>
  {purpose==='plus'&&<View style={[s.card,s.deviceCard]}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'كود هذا الموبايل':'This phone code'}</Text>
   <Text style={[s.deviceHint,dir(rtl)]}>{rtl?'هذا الكود مرتبط بمفتاح آمن داخل الجهاز. تفعيل Plus سيكون لهذا الموبايل فقط.':'This code is tied to a secure key inside this phone. Plus approval will be for this phone only.'}</Text>
   <Text selectable style={s.deviceCode}>{deviceCode}</Text>
   <Pressable onPress={copyDeviceCode} style={s.copyButton}><Text style={s.copyText}>{rtl?'نسخ كود الجهاز':'Copy device code'}</Text></Pressable>
  </View>}

  <View style={s.card}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'التحويلات المالية':'Money transfer'}</Text>
   <Text style={[s.label,dir(rtl)]}>{rtl?'رقم التحويل — يظهر آخر 4 أرقام فقط':'Transfer number — last 4 digits only'}</Text>
   <Text selectable={false} style={s.number}>{maskedCard(CARD_NUMBER)}</Text>
   <Pressable disabled={!!busy} onPress={()=>copyDestination('money_transfer_16',CARD_NUMBER)} style={[s.copyButton,busy&&s.disabled]}><Text style={s.copyText}>{busy==='money_transfer_16'?(rtl?'جاري النسخ…':'Copying…'):(rtl?'نسخ رقم التحويل':'Copy transfer number')}</Text></Pressable>
  </View>

  <View style={s.card}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'الشراء عن طريق الموبايل':'Purchase by mobile'}</Text>
   <Text style={[s.label,dir(rtl)]}>{rtl?'رقم الحساب — 10 أرقام':'Account number — 10 digits'}</Text>
   <Text selectable style={s.number}>{ACCOUNT_NUMBER}</Text>
   <Pressable disabled={!!busy} onPress={()=>copyDestination('mobile_purchase_10',ACCOUNT_NUMBER)} style={[s.copyButton,busy&&s.disabled]}><Text style={s.copyText}>{busy==='mobile_purchase_10'?(rtl?'جاري النسخ…':'Copying…'):(rtl?'نسخ رقم الشراء':'Copy purchase number')}</Text></Pressable>
  </View>

  <Text style={[s.note,dir(rtl)]}>{rtl?'بعد تأكيد الدفع لهذا الكود ستظهر نقطة حمراء على التحديثات، ومن داخل التطبيق يتم تنزيل Plus مباشرة.':'After payment is approved for this code, a red dot appears on Updates and Plus downloads directly inside the app.'}</Text>
 </View>
}

const s=StyleSheet.create({wrap:{marginTop:4},card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:16,marginTop:14},deviceCard:{borderColor:'rgba(244,196,93,.55)'},label:{color:MUTED,fontSize:12,marginTop:4},optionTitle:{color:GOLD,fontSize:16,fontWeight:'900'},deviceHint:{color:MUTED,fontSize:12,lineHeight:19,marginTop:6},deviceCode:{color:WHITE,fontSize:18,fontWeight:'900',textAlign:'center',letterSpacing:.8,marginVertical:14},number:{color:WHITE,fontSize:20,fontWeight:'900',textAlign:'center',letterSpacing:.7,marginVertical:14},copyButton:{backgroundColor:GOLD,borderRadius:14,paddingVertical:14,alignItems:'center'},copyText:{color:NAVY,fontSize:15,fontWeight:'900'},disabled:{opacity:.6},note:{color:MUTED,fontSize:12,lineHeight:19,marginTop:10}});
