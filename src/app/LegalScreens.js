import React,{useCallback,useEffect,useState} from 'react';
import {Linking,Pressable,ScrollView,Text,View,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import {requestAuthenticityChallenge} from './authenticityClient';

const GOLD='#F4C45D';
const NAVY='#06182B';
const CARD='rgba(17,34,52,0.82)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const MUTED='#B9C4D1';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}
function row(rtl){return {flexDirection:rtl?'row-reverse':'row'}}
function LegalHeader({title,onBack,rtl}){
 return <View style={[s.header,row(rtl)]}>
  <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
  <Text style={[s.title,dir(rtl)]}>{title}</Text><View style={s.spacer}/>
 </View>
}
function Card({title,children,rtl}){
 return <View style={s.card}><Text style={[s.cardTitle,dir(rtl)]}>{title}</Text>{children}</View>
}
function Paragraph({children,rtl}){return <Text style={[s.body,dir(rtl)]}>{children}</Text>}
function NavButton({label,onPress}){return <Pressable onPress={onPress} style={s.navButton}><Text style={s.navButtonText}>{label}</Text></Pressable>}

export function PrivacyScreen({rtl,onBack,onNavigate}){
 const ar=rtl;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <LegalHeader title={ar?'سياسة الخصوصية':'Privacy Policy'} onBack={onBack} rtl={rtl}/>
  <Text style={[s.updated,dir(rtl)]}>{ar?'آخر تحديث: 16 أيلول 2026':'Last updated: September 16, 2026'}</Text>
  <Card title={ar?'طبيعة التطبيق':'About the app'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'هذا البرنامج ليس دينيًا، بحث علمي. الأفق / al ufuq مشروع تقويمي وتقني وبحثي. صاحب المشروع وحقوقه الأصلية: وسام محمد — Wissam Digital. تعرض النسختان التجريبية وPlus التقويمات والمواقيت والمناسبات والخدمات المرتبطة بها بحسب الميزات المتاحة في كل نسخة.':'This program is not religious; it is scientific research. al ufuq is a calendar, technology and research project. Project owner and original-rights notice: Wissam Digital. Trial and Plus provide calendars, prayer times, events and related services according to the features available in each edition.'}</Paragraph></Card>
  <Card title={ar?'البيانات التي يستخدمها التطبيق':'Data used by the app'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'قد يستخدم التطبيق موقع الجهاز لحساب مواقيت الصلاة وتحديد الدولة أو المنطقة، ويحفظ محليًا تفضيلات مثل اللغة، المدينة، الثيم، صوت الأذان وإعدادات التنبيهات. عند استخدام التحقق من الأصالة قد يُرسل معرّف تثبيت عشوائي، نوع النسخة ورقم الإصدار إلى خادم التحقق، من دون إرسال الاسم أو رقم الهاتف أو رقم البطاقة لهذا الغرض.':'The app may use device location to calculate prayer times and determine the country or area. Preferences such as language, city, theme, Adhan sound and notification settings may be stored locally. When authenticity verification is used, a random installation identifier, edition and app version may be sent to the verification server; name, phone number and payment card number are not required for that verification.'}</Paragraph></Card>
  <Card title={ar?'الإنترنت والخدمات الخارجية':'Internet and external services'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'يُستخدم الإنترنت عند الحاجة لفحص التحديثات، جلب بعض بيانات المناسبات، تحميل خدمات تعتمد على الشبكة، أو طلب رمز تحقق من الأصالة. المواد الخارجية مثل تسجيلات الأذان تخضع لتراخيص مصادرها المذكورة في التطبيق أو ملفات الترخيص.':'Internet access is used when needed for update checks, some event data, network-based services, or requesting an authenticity challenge. Third-party materials such as Adhan recordings remain subject to their stated source licenses.'}</Paragraph></Card>
  <Card title={ar?'مشاركة البيانات وحمايتها':'Data sharing and protection'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'لا يبيع الأفق بيانات المستخدمين للمعلنين. نهدف إلى جمع أقل قدر ممكن من البيانات، مع الاعتماد على التخزين المحلي قدر الإمكان. لا يمكن ضمان حماية مطلقة لأي نظام رقمي، لذلك تُصمم الخدمات لتقليل البيانات الحساسة المخزنة أو المرسلة.':'al ufuq does not sell user data to advertisers. The app is designed to minimize data collection and rely on local storage where practical. No digital system can guarantee absolute security, so the services are designed to reduce sensitive data stored or transmitted.'}</Paragraph></Card>
  <Card title={ar?'تحكم المستخدم':'User controls'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'يمكن للمستخدم إيقاف إذن الموقع أو التنبيهات من إعدادات الجهاز، وتغيير تفضيلاته، وحذف بيانات التطبيق المحلية بحذف التطبيق أو مسح بياناته من إعدادات النظام.':'Users can disable location or notification permissions in device settings, change preferences, and remove locally stored app data by clearing app data or uninstalling the app.'}</Paragraph></Card>
  <Card title={ar?'التحديثات على السياسة':'Policy updates'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'قد تُحدَّث هذه السياسة عند إضافة خدمات جديدة أو تعديل طريقة عمل التطبيق. سيُعرض تاريخ آخر تحديث داخل هذه الصفحة.':'This policy may be updated when services are added or the app changes. The latest update date is shown on this page.'}</Paragraph></Card>
  <View style={s.actions}><NavButton label={ar?'حقوق الطبع والنشر والملكية الفكرية':'Copyright & intellectual property'} onPress={()=>onNavigate('copyright')}/><NavButton label={ar?'التحقق من أصالة النسخة بالباركود':'Verify app authenticity by QR'} onPress={()=>onNavigate('authenticity')}/></View>
 </ScrollView></SafeAreaView>
}

export function CopyrightScreen({rtl,onBack}){
 const ar=rtl;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <LegalHeader title={ar?'حقوق الطبع والنشر':'Copyright & IP'} onBack={onBack} rtl={rtl}/>
  <Card title={ar?'حقوق الأفق':'al ufuq rights'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'© 2026 وسام محمد – جميع حقوق الطبع والنشر محفوظة. حقوق الملكية الفكرية الخاصة بالشفرة البرمجية الأصلية، تصميم الواجهات، الشعارات والأيقونات الأصلية، ترتيب المحتوى، النصوص والمواد التي أُنشئت خصيصًا لمشروع الأفق / al ufuq محفوظة لصاحب المشروع، وذلك إلى الحد الذي يسمح به القانون.':'© 2026 Wissam Digital. All copyright and intellectual-property rights in the original source code, interface design, original logos and icons, content arrangement, text and project-specific materials of al ufuq are reserved to the project owner, to the extent permitted by law.'}</Paragraph></Card>
  <Card title={ar?'المواد المرخصة من جهات أخرى':'Third-party licensed material'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'لا يدّعي الأفق ملكية المواد التي تعود لجهات أخرى. تسجيلات الأذان والصور أو البيانات المرخصة من مصادر خارجية تبقى خاضعة لحقوق أصحابها وشروط تراخيصها. كما لا يدّعي التطبيق ملكية النص القرآني أو الحقائق العامة أو المفاهيم التقويمية العامة بحد ذاتها.':'al ufuq does not claim ownership of third-party material. Licensed Adhan recordings, images or data remain subject to their owners and license terms. The app also does not claim ownership of Quranic text, public facts, or general calendar concepts themselves.'}</Paragraph></Card>
  <Card title={ar?'الاستخدام غير المصرح به':'Unauthorized use'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'يُحظر نسخ الشفرة أو إعادة توزيع التطبيق أو استنساخ تصميمه أو مواده الأصلية أو بيع نسخة معدلة منه دون إذن، إلا بالقدر الذي يسمح به القانون أو الترخيص المرفق بمادة خارجية محددة. يحتفظ صاحب المشروع بحق طلب إزالة النسخ المنتهكة واتخاذ الإجراءات المتاحة نظاميًا.':'Copying source code, redistributing the app, reproducing its original design or materials, or selling a modified copy without permission is prohibited except where permitted by law or by a specific third-party license. The project owner reserves the right to request removal of infringing copies and use available legal remedies.'}</Paragraph></Card>
  <Card title={ar?'علامات التحقق':'Verification markers'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'تتضمن النسخة الرسمية باركود تعريف خاصًا بالنسخة يعرض اسم الأفق، صاحب المشروع، نوع النسخة، رقم الإصدار ومعرّف التثبيت. وعند ربط خادم التحقق الرسمي يمكن للباركود أن يحمل رابط تحقق ورمزًا قصير العمر للتحقق عبر الويب. هذه العلامات تساعد في التحقق من مصدر النسخة ولا تُعد وحدها ضمانًا قانونيًا للملكية.':'The official app includes a copy-identification QR containing the al ufuq name, project owner, edition, version and installation ID. When the official verification server is connected, the QR can carry a short-lived web verification link and code. These markers help verify the source of a copy but are not by themselves a legal guarantee of ownership.'}</Paragraph></Card>
 </ScrollView></SafeAreaView>
}

export function AuthenticityScreen({rtl,onBack,edition,version}){
 const ar=rtl;
 const [loading,setLoading]=useState(false);
 const [challenge,setChallenge]=useState(null);
 const [error,setError]=useState('');
 const issue=useCallback(async()=>{
  setLoading(true);setError('');
  try{setChallenge(await requestAuthenticityChallenge({edition,version}))}
  catch(e){setChallenge(null);setError(ar?'تعذر الحصول على رمز تحقق من الخادم الآن، لكن يبقى باركود تعريف النسخة متاحًا محليًا عند توفر معرّف التثبيت.':'Could not obtain a server verification code, but the local copy-identification QR remains available when the installation ID is available.')}
  finally{setLoading(false)}
 },[edition,version,ar]);
 useEffect(()=>{issue();const timer=setInterval(issue,60000);return()=>clearInterval(timer)},[issue]);
 const copyCode=async()=>{if(challenge?.token)await Clipboard.setStringAsync(challenge.token)};
 const openVerify=async()=>{if(challenge?.verifyUrl)await Linking.openURL(challenge.verifyUrl)};
 const configured=Boolean(challenge?.configured);
 const localQrValue=challenge?.token?`al ufuq|owner=Wissam Digital|edition=${edition}|version=${version}|installation=${challenge.installationId||''}|token=${challenge.token}|expires=${challenge.expiresAt||''}|type=rotating-authenticity-challenge`:'';
 const qrValue=challenge?.verifyUrl||localQrValue;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <LegalHeader title={ar?'التحقق من أصالة النسخة':'Verify authenticity'} onBack={onBack} rtl={rtl}/>
  <Card title={ar?'بيانات النسخة':'Edition details'} rtl={rtl}><Paragraph rtl={rtl}>{ar?`البرنامج: الأفق / al ufuq\nصاحب المشروع: وسام محمد — Wissam Digital\nالنسخة: ${edition==='plus'?'Plus':'تجريبية'}\nالإصدار: ${version}`:`App: al ufuq\nProject owner: Wissam Mohammed — Wissam Digital\nEdition: ${edition==='plus'?'Plus':'Trial'}\nVersion: ${version}`}</Paragraph></Card>
  {!configured&&!loading&&!error&&<View style={s.notice}><Text style={[s.noticeText,dir(rtl)]}>{ar?'باركود التحقق يتغير عند كل فتح لهذه الصفحة ويتجدد تلقائيًا كل دقيقة. يحمل رمزًا قصير العمر مرتبطًا بنوع النسخة والإصدار ومعرّف التثبيت، لذلك لا يبقى نفس QR ثابتًا.':'The authenticity QR changes every time this page opens and refreshes automatically every minute. It carries a short-lived token bound to the edition, version and installation instead of keeping the same QR.'}</Text></View>}
  {loading&&<Text style={[s.status,dir(rtl)]}>{ar?'جاري تجهيز بيانات التحقق…':'Preparing verification data…'}</Text>}
  {!!error&&<Text style={[s.error,dir(rtl)]}>{error}</Text>}
  {!!qrValue&&<>
   <Text style={[s.codeLabel,dir(rtl)]}>{configured?(ar?'باركود التحقق من أصالة النسخة':'Authenticity verification QR'):(ar?'باركود تعريف النسخة الرسمية':'Official-copy identity QR')}</Text>
   <View style={s.qrWrap}><QRCode value={qrValue} size={210} backgroundColor="#FFFFFF" color="#06182B"/></View>
   <Text style={[s.expiry,dir(rtl)]}>{ar?'باركود متغير قصير العمر: الأفق / al ufuq — Wissam Digital — نوع النسخة — رقم الإصدار — معرّف التثبيت — رمز تحقق متغير.':'Rotating short-lived QR: al ufuq — Wissam Digital — edition — version — installation ID — changing verification token.'}</Text>
  </>}
  {configured&&challenge?.token&&<>
   <Text style={[s.codeLabel,dir(rtl)]}>{ar?'رمز التحقق':'Verification code'}</Text>
   <Text selectable style={s.code}>{challenge.token}</Text>
   {!!challenge.expiresAt&&<Text style={[s.expiry,dir(rtl)]}>{ar?'ينتهي: ':'Expires: '}{String(challenge.expiresAt)}</Text>}
   <View style={s.actions}><NavButton label={ar?'نسخ الرمز':'Copy code'} onPress={copyCode}/>{!!challenge.verifyUrl&&<NavButton label={ar?'فتح صفحة التحقق':'Open verification page'} onPress={openVerify}/>}</View>
  </>}
  <NavButton label={loading?(ar?'جاري التجهيز…':'Preparing…'):(ar?'تحديث باركود التحقق':'Refresh verification QR')} onPress={loading?()=>{}:issue}/>
  <Text style={[s.note,dir(rtl)]}>{ar?'شرح النظام: يتولد رمز جديد عند فتح الصفحة ويتجدد تلقائيًا، لذلك لا يبقى نفس QR ثابتًا. عند تفعيل خادم التحقق الرسمي يمكن اعتماد الرمز لمرة واحدة أو حتى انتهاء مدته بحسب سياسة الخادم. لا يتضمن QR رقم البطاقة أو رقم الهاتف.':'How it works: a new QR token is created when the page opens and rotates automatically, so the same QR is not kept permanently. When server verification is enabled, the token can be single-use or expire according to server policy. The QR does not contain card or phone numbers.'}</Text>
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:50},header:{height:60,alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:CARD,borderWidth:1,borderColor:LINE},backText:{color:WHITE,fontSize:30},title:{color:WHITE,fontSize:23,fontWeight:'900',flex:1,marginHorizontal:12},spacer:{width:44},updated:{color:MUTED,fontSize:11,marginVertical:4},card:{backgroundColor:CARD,borderWidth:1,borderColor:LINE,borderRadius:18,padding:15,marginTop:12},cardTitle:{color:GOLD,fontSize:17,fontWeight:'900',marginBottom:8},body:{color:'#E2E8EF',fontSize:13.5,lineHeight:22},actions:{gap:9,marginTop:12},navButton:{minHeight:48,borderRadius:16,borderWidth:1,borderColor:GOLD,alignItems:'center',justifyContent:'center',paddingHorizontal:14,marginTop:8,backgroundColor:'rgba(244,196,93,.08)'},navButtonText:{color:GOLD,fontSize:14,fontWeight:'900',textAlign:'center'},notice:{marginTop:14,padding:14,borderRadius:16,borderWidth:1,borderColor:GOLD,backgroundColor:'rgba(244,196,93,.10)'},noticeText:{color:'#FFE8B2',fontSize:13,lineHeight:21,fontWeight:'700'},status:{color:MUTED,fontSize:13,marginTop:16},error:{color:'#FFB4B4',fontSize:13,lineHeight:21,marginTop:14},qrWrap:{alignSelf:'center',backgroundColor:'#FFFFFF',padding:14,borderRadius:18,marginTop:18},codeLabel:{color:MUTED,fontSize:12,marginTop:15},code:{color:WHITE,fontSize:18,fontWeight:'900',letterSpacing:1.5,textAlign:'center',marginTop:8},expiry:{color:MUTED,fontSize:11,marginTop:8,lineHeight:18},note:{color:MUTED,fontSize:12,lineHeight:20,marginTop:16}
});
