import React,{useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.88)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';

const RECEIVING_NUMBER=process.env.EXPO_PUBLIC_PAYMENT_ACCOUNT||'';
const ADMIN_EVENT_ENDPOINT=process.env.EXPO_PUBLIC_PAYMENT_COPY_WEBHOOK||'';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}
function makeRequestCode(){
 const stamp=Date.now().toString(36).slice(-7).toUpperCase();
 const rand=Math.random().toString(36).slice(2,6).toUpperCase();
 return `AFK-PLS-${stamp}-${rand}`;
}
function displayNumber(value){return String(value||'').replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim()}

export function TrialPlusActivation({rtl,country,onBack}){
 const [requestCode]=useState(makeRequestCode);
 const [busy,setBusy]=useState(false);
 const inIraq=country==='IQ';

 const recordCopy=async copiedAt=>{
  if(!ADMIN_EVENT_ENDPOINT)return false;
  try{
   const response=await fetch(ADMIN_EVENT_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({event:'payment_data_copied',channel:'whatsapp_admin',requestCode,purpose:'plus',copiedAt,timezoneOffsetMinutes:-new Date().getTimezoneOffset()})
   });
   return response.ok;
  }catch(e){return false}
 };

 const copyReceivingNumber=async()=>{
  if(!RECEIVING_NUMBER){
   Alert.alert(rtl?'بيانات التحويل غير مضافة':'Transfer data not configured',rtl?'يُضاف رقم الاستلام من إعداد البناء الآمن قبل الإصدار.':'The receiving number will be supplied through secure build configuration before release.');
   return;
  }
  setBusy(true);
  const copiedAt=new Date().toISOString();
  await Clipboard.setStringAsync(RECEIVING_NUMBER);
  const notified=await recordCopy(copiedAt);
  setBusy(false);
  Alert.alert(rtl?'تم النسخ':'Copied',rtl?`تم نسخ رقم التحويل.\nوقت الطلب: ${new Date(copiedAt).toLocaleString()}${notified?'\nتم تسجيل إشعار الإدارة.':'\nإشعار الإدارة ينتظر ربط خدمة الإشعارات.'}`:`Transfer number copied.\nRequest time: ${new Date(copiedAt).toLocaleString()}${notified?'\nAdmin event recorded.':'\nAdmin notification service still needs to be connected.'}`);
 };

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text style={[s.title,dir(rtl)]}>{rtl?'تفعيل Plus':'Activate Plus'}</Text><View style={s.spacer}/></View>
  {!inIraq?<View style={s.card}><Text style={[s.cardTitle,dir(rtl)]}>{rtl?'متاح داخل العراق فقط':'Available in Iraq only'}</Text><Text style={[s.body,dir(rtl)]}>{rtl?'النسخة التجريبية تبقى متاحة، أما طلب وتفعيل Plus فمخصص حاليًا للمستخدمين داخل العراق.':'The Trial edition remains available, while Plus ordering and activation are currently limited to users inside Iraq.'}</Text></View>:<>
   <View style={s.card}><Text style={[s.cardTitle,dir(rtl)]}>{rtl?'الدفع لتفعيل Plus':'Pay to activate Plus'}</Text><Text style={[s.body,dir(rtl)]}>{rtl?'انسخ رقم التحويل ثم الصقه في SuperQi وأكمل العملية. لا يوجد QR في هذه الصفحة.':'Copy the transfer number, paste it into SuperQi, and complete the transfer. This page does not use a QR code.'}</Text></View>
   <View style={s.card}>
    <Text style={[s.label,dir(rtl)]}>{rtl?'رقم التحويل':'Transfer number'}</Text>
    <Text selectable style={s.number}>{displayNumber(RECEIVING_NUMBER)||'•••• •••• •••• ••••'}</Text>
    <Pressable disabled={busy} onPress={copyReceivingNumber} style={[s.copyButton,busy&&{opacity:.6}]}><Text style={s.copyText}>{busy?(rtl?'جاري التسجيل…':'Logging…'):(rtl?'نسخ الرقم':'Copy number')}</Text></Pressable>
    <Text style={[s.note,dir(rtl)]}>{rtl?'رمز الطلب يبقى داخليًا ولا يحتاج المستخدم إلى نسخه. عند نسخ الرقم يسجل الأفق رمزًا داخليًا مع التاريخ والوقت، ويُرسل الحدث إلى قناة إشعار الإدارة عند ربطها. بعدها تتم مطابقة الوقت مع إشعار SuperQi يدويًا.':'The request code remains internal and is not copied by the user. When the number is copied, AlofoK logs an internal code with date and time and sends the event to the configured admin notification channel. The time can then be matched manually with the SuperQi notification.'}</Text>
   </View>
  </>}
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:45},header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},backText:{color:WHITE,fontSize:30},title:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},spacer:{width:44},card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:16,marginTop:14},cardTitle:{color:GOLD,fontSize:19,fontWeight:'900',marginBottom:8},body:{color:WHITE,fontSize:14,lineHeight:22},label:{color:MUTED,fontSize:12},number:{color:WHITE,fontSize:19,fontWeight:'900',textAlign:'center',letterSpacing:.5,marginVertical:14},copyButton:{backgroundColor:GOLD,borderRadius:14,paddingVertical:14,alignItems:'center'},copyText:{color:NAVY,fontSize:16,fontWeight:'900'},note:{color:MUTED,fontSize:12,lineHeight:19,marginTop:12}});
