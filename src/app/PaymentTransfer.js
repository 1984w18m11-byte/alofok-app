import React,{useEffect,useState} from 'react';
import {Alert,Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.88)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';

const CARD_NUMBER=process.env.EXPO_PUBLIC_PAYMENT_CARD||process.env.EXPO_PUBLIC_PAYMENT_ACCOUNT||'';
const ACCOUNT_NUMBER=process.env.EXPO_PUBLIC_PAYMENT_BANK_ACCOUNT||'5490910105';
const ADMIN_EVENT_ENDPOINT=process.env.EXPO_PUBLIC_PAYMENT_COPY_WEBHOOK||'';
const ADMIN_WHATSAPP=process.env.EXPO_PUBLIC_ADMIN_WHATSAPP||'';
const DEVICE_CODE_KEY='alofok_payment_device_code_v1';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}
function makeDeviceCode(){
 const stamp=Date.now().toString(36).slice(-6).toUpperCase();
 const rand=Math.random().toString(36).slice(2,6).toUpperCase();
 return `AFK-${stamp}-${rand}`;
}
function formatCard(value){return String(value||'').replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim()}
function digits(value){return String(value||'').replace(/\D/g,'')}

export function PaymentTransferPanel({rtl,purpose='support',edition='trial',amountIqd=null,eventName='payment_data_copied',notificationEndpoint=ADMIN_EVENT_ENDPOINT}){
 const [deviceCode,setDeviceCode]=useState('…');
 const [busy,setBusy]=useState('');

 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    let code=await AsyncStorage.getItem(DEVICE_CODE_KEY);
    if(!code){code=makeDeviceCode();await AsyncStorage.setItem(DEVICE_CODE_KEY,code)}
    if(active)setDeviceCode(code);
   }catch(e){if(active)setDeviceCode(makeDeviceCode())}
  })();
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
  Alert.alert(rtl?'تم النسخ':'Copied',rtl?'تم نسخ الرقم بنجاح. أكمل عملية التحويل من تطبيق الدفع.':'Number copied successfully. Complete the transfer in your payment app.');
 };

 return <View style={s.wrap}>
  <View style={s.card}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'التحويلات المالية':'Money transfer'}</Text>
   <Text style={[s.label,dir(rtl)]}>{rtl?'رقم التحويل — 16 رقم':'Transfer number — 16 digits'}</Text>
   <Text selectable style={s.number}>{CARD_NUMBER?formatCard(CARD_NUMBER):'•••• •••• •••• ••••'}</Text>
   <Pressable disabled={!!busy} onPress={()=>copyDestination('money_transfer_16',CARD_NUMBER)} style={[s.copyButton,busy&&s.disabled]}><Text style={s.copyText}>{busy==='money_transfer_16'?(rtl?'جاري النسخ…':'Copying…'):(rtl?'نسخ رقم التحويل':'Copy transfer number')}</Text></Pressable>
  </View>

  <View style={s.card}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'الشراء عن طريق الموبايل':'Purchase by mobile'}</Text>
   <Text style={[s.label,dir(rtl)]}>{rtl?'رقم الحساب — 10 أرقام':'Account number — 10 digits'}</Text>
   <Text selectable style={s.number}>{ACCOUNT_NUMBER}</Text>
   <Pressable disabled={!!busy} onPress={()=>copyDestination('mobile_purchase_10',ACCOUNT_NUMBER)} style={[s.copyButton,busy&&s.disabled]}><Text style={s.copyText}>{busy==='mobile_purchase_10'?(rtl?'جاري النسخ…':'Copying…'):(rtl?'نسخ رقم الشراء':'Copy purchase number')}</Text></Pressable>
  </View>

  <Text style={[s.note,dir(rtl)]}>{rtl?'اختر الطريقة المناسبة لك ثم انسخ الرقم.':'Choose the method that suits you, then copy the number.'}</Text>
 </View>
}

const s=StyleSheet.create({wrap:{marginTop:4},card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:16,marginTop:14},label:{color:MUTED,fontSize:12,marginTop:4},optionTitle:{color:GOLD,fontSize:16,fontWeight:'900'},number:{color:WHITE,fontSize:20,fontWeight:'900',textAlign:'center',letterSpacing:.7,marginVertical:14},copyButton:{backgroundColor:GOLD,borderRadius:14,paddingVertical:14,alignItems:'center'},copyText:{color:NAVY,fontSize:15,fontWeight:'900'},disabled:{opacity:.6},note:{color:MUTED,fontSize:12,lineHeight:19,marginTop:10}});
