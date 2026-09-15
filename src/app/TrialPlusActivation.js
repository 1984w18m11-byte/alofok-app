import React,{useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

const GOLD='#F4C45D';
const NAVY='#06182B';
const CARD='rgba(17,34,52,0.88)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const MUTED='#B9C4D1';

const PAYMENT_ACCOUNT=process.env.EXPO_PUBLIC_PAYMENT_ACCOUNT||'';
const PAYMENT_QR_VALUE=process.env.EXPO_PUBLIC_PAYMENT_QR_VALUE||'';
const COPY_WEBHOOK=process.env.EXPO_PUBLIC_PAYMENT_COPY_WEBHOOK||'';

function requestCode(){
 const stamp=Date.now().toString(36).slice(-6).toUpperCase();
 const rand=Math.random().toString(36).slice(2,5).toUpperCase();
 return `AFK-${stamp}-${rand}`;
}
function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}

export function TrialPlusActivation({rtl,country,onBack}){
 const [code]=useState(requestCode);
 const [sending,setSending]=useState(false);
 const inIraq=country==='IQ';
 const qrValue=useMemo(()=>PAYMENT_QR_VALUE||PAYMENT_ACCOUNT,[PAYMENT_QR_VALUE,PAYMENT_ACCOUNT]);

 const notifyCopy=async()=>{
  if(!COPY_WEBHOOK)return false;
  try{
   const res=await fetch(COPY_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'payment_data_copied',requestCode:code,edition:'trial',country:'IQ',createdAt:new Date().toISOString()})});
   return res.ok;
  }catch(e){return false}
 };
 const copyPayment=async()=>{
  if(!inIraq){Alert.alert(rtl?'غير متاح':'Unavailable',rtl?'تفعيل Plus متاح داخل العراق فقط.':'Plus activation is available only inside Iraq.');return}
  if(!PAYMENT_ACCOUNT){Alert.alert(rtl?'بيانات الدفع غير مضافة':'Payment data not configured',rtl?'لم تتم إضافة رقم الاستلام المعتمد بعد.':'The approved receiving account has not been configured yet.');return}
  setSending(true);
  await Clipboard.setStringAsync(PAYMENT_ACCOUNT);
  const notified=await notifyCopy();
  setSending(false);
  Alert.alert(rtl?'تم نسخ بيانات الدفع':'Payment data copied',rtl?`تم نسخ رقم الاستلام.\nرمز الطلب: ${code}\n${notified?'تم تسجيل طلب النسخ لدى إدارة الأفق.':'تم النسخ بنجاح. إشعار الإدارة ينتظر ربط خدمة الإشعارات.'}`:`Receiving account copied.\nRequest code: ${code}\n${notified?'The copy request was logged for AlofoK administration.':'Copied successfully. Admin notification is waiting for the notification service connection.'}`);
 };

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text style={[s.title,dir(rtl)]}>{rtl?'تفعيل Plus':'Activate Plus'}</Text><View style={s.spacer}/></View>
  {!inIraq?<View style={s.card}><Text style={[s.cardTitle,dir(rtl)]}>{rtl?'متاح داخل العراق فقط':'Available in Iraq only'}</Text><Text style={[s.body,dir(rtl)]}>{rtl?'النسخة التجريبية تبقى متاحة، أما طلب وتفعيل Plus فمخصص حاليًا للمستخدمين داخل العراق.':'The Trial edition remains available, while Plus ordering and activation are currently limited to users inside Iraq.'}</Text></View>:<>
   <View style={s.card}><Text style={[s.cardTitle,dir(rtl)]}>{rtl?'بيانات الدفع':'Payment details'}</Text><Text style={[s.body,dir(rtl)]}>{rtl?'انسخ رقم الاستلام أو استخدم رمز QR المعتمد، ثم أكمل التحويل من تطبيق البطاقة/المحفظة. نسخ البيانات لا يعني أن الدفع تم.':'Copy the receiving account or use the approved QR, then complete the transfer in your card/wallet app. Copying the data does not mean payment is complete.'}</Text></View>
   {!!qrValue&&<View style={s.qrCard}><QRCode value={qrValue} size={210} backgroundColor="#FFFFFF" color="#06182B"/><Text style={[s.qrHint,dir(rtl)]}>{rtl?'رمز الاستلام':'Receiving QR'}</Text></View>}
   <View style={s.card}><Text style={[s.label,dir(rtl)]}>{rtl?'رمز الطلب':'Request code'}</Text><Text selectable style={s.code}>{code}</Text><Text style={[s.label,dir(rtl)]}>{rtl?'رقم الاستلام':'Receiving account'}</Text><Text selectable style={s.account}>{PAYMENT_ACCOUNT||'—'}</Text><Pressable disabled={sending} onPress={copyPayment} style={[s.copyButton,sending&&{opacity:.6}]}><Text style={s.copyText}>{sending?(rtl?'جاري التسجيل…':'Logging…'):(rtl?'نسخ بيانات الدفع':'Copy payment data')}</Text></Pressable></View>
   <View style={s.notice}><Text style={[s.noticeText,dir(rtl)]}>{rtl?'عند الضغط على «نسخ بيانات الدفع» يسجل الأفق رمز الطلب ووقت النسخ. بعد وصول إشعار التحويل إلى صاحب المشروع تتم المطابقة يدويًا ثم الموافقة على التفعيل.':'When “Copy payment data” is pressed, AlofoK records the request code and copy time. After the owner receives the transfer notification, the payment is matched manually and activation is approved.'}</Text></View>
  </>}
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:45},header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},backText:{color:WHITE,fontSize:30},title:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},spacer:{width:44},card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:16,marginTop:14},cardTitle:{color:GOLD,fontSize:19,fontWeight:'900',marginBottom:8},body:{color:WHITE,fontSize:14,lineHeight:22},qrCard:{alignItems:'center',backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:18,marginTop:14},qrHint:{color:MUTED,fontSize:12,marginTop:10},label:{color:MUTED,fontSize:12,marginTop:4},code:{color:GOLD,fontSize:20,fontWeight:'900',textAlign:'center',marginVertical:10,letterSpacing:1},account:{color:WHITE,fontSize:18,fontWeight:'800',textAlign:'center',marginVertical:12},copyButton:{backgroundColor:GOLD,borderRadius:14,paddingVertical:14,alignItems:'center',marginTop:8},copyText:{color:NAVY,fontSize:16,fontWeight:'900'},notice:{borderRadius:14,borderWidth:1,borderColor:'rgba(244,196,93,.45)',backgroundColor:'rgba(244,196,93,.10)',padding:14,marginTop:14},noticeText:{color:'#FFE7A6',fontSize:12,lineHeight:19}});
