import React from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PaymentTransferPanel} from './PaymentTransfer';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.88)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';
const PLUS_PRICE_IQD=8000;
const PAYMENT_COPY_EVENT='payment_data_copied';
const PAYMENT_COPY_WEBHOOK=process.env.EXPO_PUBLIC_PAYMENT_COPY_WEBHOOK||'';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}

export function TrialPlusActivation({rtl,country,onBack,alreadyActive=false}){
 const inIraq=country==='IQ';
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <View style={s.header}>
   <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
   <Text style={[s.title,dir(rtl)]}>{rtl?'تفعيل Plus':'Activate Plus'}</Text>
   <View style={s.spacer}/>
  </View>

  {alreadyActive&&<View style={s.activeCard}><Text style={[s.activeTitle,dir(rtl)]}>{rtl?'Plus مفعّلة':'Plus active'}</Text><Text style={[s.body,dir(rtl)]}>{rtl?'هذه النسخة مفعّلة حاليًا. تبقى بيانات التحويل ظاهرة هنا حسب إعداد التطبيق.':'This edition is currently active. Transfer details remain available here as configured.'}</Text></View>}

  {!inIraq?<View style={s.card}>
   <Text style={[s.cardTitle,dir(rtl)]}>{rtl?'التفعيل داخل العراق فقط':'Activation is available in Iraq only'}</Text>
   <Text style={[s.body,dir(rtl)]}>{rtl?'حاليًا لا يوجد تفعيل لنسخة Plus خارج العراق. النسخة التجريبية تبقى متاحة للاستخدام خارج العراق.':'Plus activation is not currently offered outside Iraq. The Trial edition remains available outside Iraq.'}</Text>
  </View>:<>
   <View style={s.card}>
    <Text style={[s.cardTitle,dir(rtl)]}>{rtl?'قيمة تفعيل Plus':'Plus activation price'}</Text>
    <Text style={s.price}>{rtl?'8,000 دينار عراقي':'8,000 IQD'}</Text>
    <Text style={[s.body,dir(rtl)]}>{rtl?'اختر إحدى وسيلتي التحويل أدناه. يظهر رقم البطاقة المكوّن من 16 رقمًا ورقم الحساب المكوّن من 10 أرقام معًا، ولكل واحد زر نسخ مستقل.':'Choose either transfer method below. The 16-digit card number and the 10-digit account number are shown together, each with its own copy button.'}</Text>
   </View>
   <PaymentTransferPanel rtl={rtl} purpose='plus' edition={alreadyActive?'plus':'trial'} amountIqd={PLUS_PRICE_IQD} eventName={PAYMENT_COPY_EVENT} notificationEndpoint={PAYMENT_COPY_WEBHOOK}/>
   <Text style={[s.footerNote,dir(rtl)]}>{rtl?'بعد التحويل تتم مطابقة الحوالة مع رمز الجهاز لتأكيد التفعيل، حتى لو تم الدفع من بطاقة أو حساب باسم شخص آخر.':'After transfer, the payment is matched to the device code for activation, even if payment was made from a card or account under another name.'}</Text>
  </>}
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:48},header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},backText:{color:WHITE,fontSize:30},title:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},spacer:{width:44},card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:16,marginTop:14},activeCard:{backgroundColor:'rgba(244,196,93,.10)',borderRadius:18,borderWidth:1,borderColor:'rgba(244,196,93,.45)',padding:16,marginTop:14},activeTitle:{color:GOLD,fontSize:19,fontWeight:'900',marginBottom:8},cardTitle:{color:GOLD,fontSize:19,fontWeight:'900',marginBottom:8},price:{color:WHITE,fontSize:26,fontWeight:'900',textAlign:'center',marginVertical:12},body:{color:WHITE,fontSize:14,lineHeight:22},footerNote:{color:MUTED,fontSize:12,lineHeight:19,marginTop:14}});
