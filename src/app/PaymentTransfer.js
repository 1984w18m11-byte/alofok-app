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
function maskedLast4(value){
 const clean=digits(value);
 if(!clean)return '••••';
 return `•••• ${clean.slice(-4)}`;
}

export function PaymentTransferPanel({rtl,purpose='support',edition='trial',amountIqd=null,eventName='payment_data_copied',notificationEndpoint=ADMIN_EVENT_ENDPOINT}){
 const [deviceCode,setDeviceCode]=useState('…');
 const [busy,setBusy]=useState('');
 const [open,setOpen]=useState(false);

 useEffect(()=>{
  let active=true;
  getDeviceCode().then(code=>{if(active)setDeviceCode(code)}).catch(()=>{if(active)setDeviceCode('غير متاح')});
  return()=>{active=false};
 },[]);

 const postCopyEvent=async(destinationKind,copiedAt)=>{
  if(purpose!=='plus'||!notificationEndpoint)return false;
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
  if(!clean)return;
  setBusy(kind);
  const copiedAt=new Date().toISOString();
  await Clipboard.setStringAsync(clean);
  await postCopyEvent(kind,copiedAt);
  setBusy('');

 };

 return <View style={s.wrap}>
  <Pressable onPress={()=>setOpen(v=>!v)} style={s.compactToggle}>
   <Text style={[s.toggleTitle,dir(rtl)]}>{rtl?'التحويلات المالية':'Payment methods'}</Text>
   <Text style={s.toggleArrow}>{open?'⌃':'⌄'}</Text>
  </Pressable>

  {open&&<View style={s.listCard}>
   <View style={s.methodRow}>
    <View style={s.methodText}>
     <Text style={[s.methodTitle,dir(rtl)]}>{rtl?'حوالة — 16 رقم':'Transfer — 16 digits'}</Text>
     <Text selectable={false} style={s.masked}>{maskedLast4(CARD_NUMBER)}</Text>
    </View>
    <Pressable disabled={!!busy} onPress={()=>copyDestination('money_transfer_16',CARD_NUMBER)} style={[s.copySmall,busy&&s.disabled]}>
     <Text style={s.copySmallText}>{busy==='money_transfer_16'?(rtl?'…':'…'):(rtl?'نسخ':'Copy')}</Text>
    </Pressable>
   </View>

   <View style={s.divider}/>

   <View style={s.methodRow}>
    <View style={s.methodText}>
     <Text style={[s.methodTitle,dir(rtl)]}>{rtl?'تحويل موبايل — 10 أرقام':'Mobile transfer — 10 digits'}</Text>
     <Text selectable={false} style={s.masked}>{maskedLast4(ACCOUNT_NUMBER)}</Text>
    </View>
    <Pressable disabled={!!busy} onPress={()=>copyDestination('mobile_purchase_10',ACCOUNT_NUMBER)} style={[s.copySmall,busy&&s.disabled]}>
     <Text style={s.copySmallText}>{busy==='mobile_purchase_10'?(rtl?'…':'…'):(rtl?'نسخ':'Copy')}</Text>
    </Pressable>
   </View>
  </View>}

  {purpose==='plus'&&<Text style={[s.note,dir(rtl)]}>{rtl?'عند نسخ أي رقم تحويل يُرسل طلب التفعيل تلقائيًا للإدارة. بعد الموافقة يظهر تحديث Plus داخل التطبيق.':'Copying a payment number sends the activation request automatically to admin. After approval, the Plus update appears inside the app.'}</Text>}
 </View>
}

const s=StyleSheet.create({
 wrap:{marginTop:10},
 compactToggle:{minHeight:52,backgroundColor:CARD,borderRadius:14,borderWidth:1,borderColor:LINE,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 toggleTitle:{color:GOLD,fontSize:16,fontWeight:'900',flex:1},
 toggleArrow:{color:WHITE,fontSize:22,fontWeight:'900',marginLeft:10},
 listCard:{backgroundColor:'rgba(13,31,49,.94)',borderRadius:14,borderWidth:1,borderColor:LINE,marginTop:8,paddingHorizontal:12},
 methodRow:{minHeight:68,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 methodText:{flex:1},
 methodTitle:{color:WHITE,fontSize:13,fontWeight:'800'},
 masked:{color:MUTED,fontSize:16,fontWeight:'900',letterSpacing:.8,marginTop:4},
 copySmall:{backgroundColor:GOLD,borderRadius:10,paddingHorizontal:18,paddingVertical:10,minWidth:72,alignItems:'center'},
 copySmallText:{color:NAVY,fontSize:13,fontWeight:'900'},
 divider:{height:1,backgroundColor:LINE},
 disabled:{opacity:.6},
 note:{color:MUTED,fontSize:11,lineHeight:17,marginTop:9}
});
