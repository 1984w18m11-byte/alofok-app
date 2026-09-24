import React from 'react';
import {ScrollView,StyleSheet,Text,View,Pressable} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PaymentTransferPanel} from './PaymentTransfer';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.88)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}

export function SupportScreen({rtl,onBack,edition='trial'}){
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <View style={s.header}>
   <Pressable accessibilityLabel={rtl?'رجوع':'Back'} onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
   <Text style={[s.title,dir(rtl)]}>{rtl?'الدعم':'Support'}</Text>
   <Pressable accessibilityLabel={rtl?'إغلاق':'Close'} onPress={onBack} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
  </View>

  <View style={s.hero}>
   <Text style={[s.heroTitle,dir(rtl)]}>{rtl?'ساهم في دعم وتطوير برنامج الأفق':'Support Alufuq development'}</Text>
   <Text style={[s.body,dir(rtl)]}>{rtl?'دعمكم يساهم في تطوير تطبيق الأفق واستمرار تحسينه. شكرًا لمساهمتكم ودعمكم.':'Your support helps us develop Alufuq and continue improving it. Thank you for your contribution and support.'}</Text>
  </View>

  <View style={s.notice}><Text style={[s.noticeText,dir(rtl)]}>{rtl?'وسائل التحويل الحالية داخل العراق. اختر الطريقة المناسبة لك ثم انسخ الرقم.':'Current transfer methods are inside Iraq. Choose the method that suits you, then copy the number.'}</Text></View>
  <PaymentTransferPanel rtl={rtl} purpose='support' edition={edition}/>
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:48},header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},backText:{color:WHITE,fontSize:30},close:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},closeText:{color:WHITE,fontSize:28,fontWeight:'700',lineHeight:30},title:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},hero:{backgroundColor:CARD,borderRadius:20,borderWidth:1,borderColor:'rgba(244,196,93,.35)',padding:18,marginTop:10},heroTitle:{color:GOLD,fontSize:20,fontWeight:'900',marginBottom:8},body:{color:WHITE,fontSize:14,lineHeight:23},notice:{marginTop:14,borderRadius:14,borderWidth:1,borderColor:LINE,padding:13,backgroundColor:'rgba(255,255,255,.035)'},noticeText:{color:MUTED,fontSize:12,lineHeight:19}});
