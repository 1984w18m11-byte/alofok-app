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
   <Pressable accessibilityLabel={rtl?'رجوع':'Back'} onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
   <Text style={[s.title,dir(rtl)]}>{rtl?'تفعيل Plus':'Activate Plus'}</Text>
   <View style={s.spacer}/>
  </View>

  {alreadyActive&&<View style={s.activeCard}><Text style={[s.activeTitle,dir(rtl)]}>{rtl?'Plus مفعّلة':'Plus active'}</Text><Text style={[s.body,dir(rtl)]}>{rtl?'هذه النسخة مفعّلة على هذا الجهاز.':'This edition is active on this device.'}</Text></View>}

  {!inIraq?<View style={s.card}>
   <Text style={[s.cardTitle,dir(rtl)]}>{rtl?'التفعيل داخل العراق فقط':'Activation is available in Iraq only'}</Text>
   <Text style={[s.body,dir(rtl)]}>{rtl?'حاليًا لا يوجد تفعيل لنسخة Plus خارج العراق.':'Plus activation is not currently offered outside Iraq.'}</Text>
  </View>:<>
   <View style={s.priceCard}>
    <Text style={[s.priceLabel,dir(rtl)]}>{rtl?'قيمة تفعيل Plus':'Plus activation'}</Text>
    <Text style={s.price}>{rtl?'8,000 د.ع':'8,000 IQD'}</Text>
   </View>

   <PaymentTransferPanel rtl={rtl} purpose='plus' edition={alreadyActive?'plus':'trial'} amountIqd={PLUS_PRICE_IQD} eventName={PAYMENT_COPY_EVENT} notificationEndpoint={PAYMENT_COPY_WEBHOOK}/>

   <Text style={[s.discoverNote,dir(rtl)]}>{rtl?'اكتشف مزايا Plus':'Discover Plus features'}</Text>
   <Text style={[s.footerNote,dir(rtl)]}>{rtl?'بعد التحويل انتظر موافقة الإدارة، وبعد التفعيل سيظهر تحديث Plus داخل التطبيق.':'After payment, wait for admin approval. Once activated, the Plus update will appear inside the app.'}</Text>
  </>}
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:NAVY},
 content:{padding:18,paddingBottom:48},
 header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},
 backText:{color:WHITE,fontSize:30},
 spacer:{width:44},
 title:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},
 card:{backgroundColor:CARD,borderRadius:16,borderWidth:1,borderColor:LINE,padding:14,marginTop:12},
 activeCard:{backgroundColor:'rgba(244,196,93,.10)',borderRadius:16,borderWidth:1,borderColor:'rgba(244,196,93,.45)',padding:14,marginTop:12},
 activeTitle:{color:GOLD,fontSize:17,fontWeight:'900',marginBottom:6},
 cardTitle:{color:GOLD,fontSize:17,fontWeight:'900',marginBottom:6},
 priceCard:{alignSelf:'stretch',backgroundColor:CARD,borderRadius:14,borderWidth:1,borderColor:'rgba(244,196,93,.30)',paddingHorizontal:14,paddingVertical:12,marginTop:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 priceLabel:{color:GOLD,fontSize:14,fontWeight:'900',flex:1},
 price:{color:WHITE,fontSize:20,fontWeight:'900',marginLeft:12},
 body:{color:WHITE,fontSize:13,lineHeight:20},
 discoverNote:{color:GOLD,fontSize:14,fontWeight:'900',marginTop:14},
 footerNote:{color:MUTED,fontSize:11,lineHeight:17,marginTop:8}
});
