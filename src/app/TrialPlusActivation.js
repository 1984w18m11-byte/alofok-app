import React from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PaymentCopyPanel} from './PaymentCopyPanel';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.88)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}

export function TrialPlusActivation({rtl,country,onBack}){
 const inIraq=country==='IQ';
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text style={[s.title,dir(rtl)]}>{rtl?'تفعيل Plus':'Activate Plus'}</Text><View style={s.spacer}/></View>
  {!inIraq?<View style={s.card}><Text style={[s.cardTitle,dir(rtl)]}>{rtl?'متاح داخل العراق فقط':'Available in Iraq only'}</Text><Text style={[s.body,dir(rtl)]}>{rtl?'النسخة التجريبية تبقى متاحة، أما طلب وتفعيل Plus فمخصص حاليًا للمستخدمين داخل العراق.':'The Trial edition remains available, while Plus ordering and activation are currently limited to users inside Iraq.'}</Text></View>:<>
   <View style={s.card}><Text style={[s.cardTitle,dir(rtl)]}>{rtl?'الدفع لتفعيل Plus':'Pay to activate Plus'}</Text><Text style={[s.body,dir(rtl)]}>{rtl?'انسخ رقم البطاقة ثم الصقه في تطبيق SuperQi وأكمل التحويل. لا يوجد QR في هذه الصفحة.':'Copy the card number, paste it into SuperQi, and complete the transfer. This page does not use a QR code.'}</Text></View>
   <PaymentCopyPanel rtl={rtl} purpose="plus"/>
  </>}
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:45},header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},backText:{color:WHITE,fontSize:30},title:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},spacer:{width:44},card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:16,marginTop:14},cardTitle:{color:GOLD,fontSize:19,fontWeight:'900',marginBottom:8},body:{color:WHITE,fontSize:14,lineHeight:22}});
