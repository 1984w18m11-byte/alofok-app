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

export function PaymentTransferPanel({rtl,purpose='support',edition='trial',amountIqd=null}){
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
  if(!ADMIN_EVENT_ENDPOINT)return false;
  try{
   const response=await fetch(ADMIN_EVENT_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     event:'payment_destination_copied',
     channel:'whatsapp_admin',
     purpose,
     edition,
     deviceCode,
     destinationKind,
     amountIqd:purpose==='plus'?amountIqd:null,
     copiedAt,
     timezoneOffsetMinutes:-new Date().getTimezoneOffset()
    })
   });
   return response.ok;
  }catch(e){return false}
 };

 const copyDestination=async(kind,value)=>{
  const clean=digits(value);
  if(!clean){
   Alert.alert(rtl?'بيانات التحويل غير مكتملة':'Transfer data incomplete',rtl?'رقم البطاقة القديم سيُضاف من إعداد الإصدار قبل البناء.':'The existing card number will be supplied from release configuration before build.');
   return;
  }
  setBusy(kind);
  const copiedAt=new Date().toISOString();
  await Clipboard.setStringAsync(clean);
  const notified=await postCopyEvent(kind,copiedAt);
  setBusy('');
  Alert.alert(rtl?'تم النسخ':'Copied',rtl?`تم نسخ الرقم بنجاح.\nرمزك: ${deviceCode}${notified?'\nتم تسجيل إشعار الإدارة.':'\nتم حفظ رمز المطابقة، وإشعار واتساب يعمل عند ربط خدمة الإدارة.'}`:`Number copied successfully.\nYour code: ${deviceCode}${notified?'\nAdmin event recorded.':'\nThe matching code is ready; WhatsApp notification starts when the admin service is connected.'}`);
 };

 const openWhatsApp=async()=>{
  const wa=digits(ADMIN_WHATSAPP);
  if(!wa)return;
  const message=rtl
   ?`الأفق — تم إرسال حوالة\nالرمز: ${deviceCode}\nالعملية: ${purpose==='plus'?'تفعيل Plus':'دعم'}${purpose==='plus'&&amountIqd?`\nالمبلغ: ${amountIqd.toLocaleString('en-US')} د.ع`:''}`
   :`AlofoK — transfer sent\nCode: ${deviceCode}\nPurpose: ${purpose==='plus'?'Plus activation':'Support'}${purpose==='plus'&&amountIqd?`\nAmount: ${amountIqd.toLocaleString('en-US')} IQD`:''}`;
  try{await Linking.openURL(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`)}catch(e){}
 };

 return <View style={s.wrap}>
  <View style={s.codeCard}>
   <Text style={[s.label,dir(rtl)]}>{rtl?'رمز المطابقة الخاص بهذا الجهاز':'This device matching code'}</Text>
   <Text selectable style={s.code}>{deviceCode}</Text>
   <Text style={[s.note,dir(rtl)]}>{rtl?'احتفظ بهذا الرمز. نستخدمه لمطابقة الحوالة مع طلب التفعيل حتى لو كان اسم صاحب البطاقة أو الحساب مختلفًا.':'Keep this code. It is used to match the transfer to the activation request even when the payer name is different.'}</Text>
  </View>

  <View style={s.card}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'رقم البطاقة — 16 رقم':'Card number — 16 digits'}</Text>
   <Text selectable style={s.number}>{CARD_NUMBER?formatCard(CARD_NUMBER):'•••• •••• •••• ••••'}</Text>
   <Pressable disabled={!!busy} onPress={()=>copyDestination('card_16',CARD_NUMBER)} style={[s.copyButton,busy&&s.disabled]}><Text style={s.copyText}>{busy==='card_16'?(rtl?'جاري النسخ…':'Copying…'):(rtl?'نسخ رقم البطاقة':'Copy card number')}</Text></Pressable>
  </View>

  <View style={s.card}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'رقم الحساب — 10 أرقام':'Account number — 10 digits'}</Text>
   <Text selectable style={s.number}>{ACCOUNT_NUMBER}</Text>
   <Pressable disabled={!!busy} onPress={()=>copyDestination('account_10',ACCOUNT_NUMBER)} style={[s.copyButton,busy&&s.disabled]}><Text style={s.copyText}>{busy==='account_10'?(rtl?'جاري النسخ…':'Copying…'):(rtl?'نسخ رقم الحساب':'Copy account number')}</Text></Pressable>
  </View>

  <Text style={[s.note,dir(rtl)]}>{rtl?'اختر أي رقم يناسب طريقة تحويلك. يظهر الرقمان معًا دائمًا، ولكل واحد زر نسخ مستقل.':'Choose whichever number matches your transfer method. Both numbers are always shown together and each has its own copy button.'}</Text>
  {!!ADMIN_WHATSAPP&&<Pressable onPress={openWhatsApp} style={s.sentButton}><Text style={s.sentText}>{rtl?'أرسلت الحوالة — إرسال الرمز عبر واتساب':'Transfer sent — send code on WhatsApp'}</Text></Pressable>}
 </View>
}

const s=StyleSheet.create({wrap:{marginTop:4},card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:16,marginTop:14},codeCard:{backgroundColor:'rgba(244,196,93,.09)',borderRadius:18,borderWidth:1,borderColor:'rgba(244,196,93,.35)',padding:16,marginTop:14},label:{color:MUTED,fontSize:12},optionTitle:{color:GOLD,fontSize:16,fontWeight:'900'},number:{color:WHITE,fontSize:20,fontWeight:'900',textAlign:'center',letterSpacing:.7,marginVertical:14},code:{color:GOLD,fontSize:19,fontWeight:'900',textAlign:'center',letterSpacing:1,marginVertical:10},copyButton:{backgroundColor:GOLD,borderRadius:14,paddingVertical:14,alignItems:'center'},copyText:{color:NAVY,fontSize:15,fontWeight:'900'},disabled:{opacity:.6},note:{color:MUTED,fontSize:12,lineHeight:19,marginTop:10},sentButton:{marginTop:14,borderRadius:14,borderWidth:1,borderColor:GOLD,paddingVertical:13,alignItems:'center'},sentText:{color:GOLD,fontSize:14,fontWeight:'900'}});
