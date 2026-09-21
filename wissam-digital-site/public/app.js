// رقم واتساب الأعمال لا يظهر في واجهة الموقع. عند إضافته هنا يفتح الزر المحادثة مباشرة.
const WHATSAPP_NUMBER = '';

const body=document.body;
const langBtn=document.getElementById('langBtn');
if(langBtn){
  langBtn.addEventListener('click',()=>{
    const en=body.classList.toggle('en');
    document.documentElement.lang=en?'en':'ar';
    document.documentElement.dir=en?'ltr':'rtl';
    langBtn.textContent=en?'العربية':'English';
  });
}

document.querySelectorAll('.servicePick').forEach(link=>link.addEventListener('click',()=>{
  const subject=document.getElementById('subject');
  if(subject)subject.value=link.dataset.service||'';
}));

const params=new URLSearchParams(location.search);
function detectSource(){
  const explicit=(params.get('src')||params.get('source')||'').trim();
  if(explicit)return explicit;
  const ref=document.referrer.toLowerCase();
  if(ref.includes('facebook.com')||ref.includes('fb.com'))return 'Facebook';
  if(ref.includes('instagram.com'))return 'Instagram';
  if(ref.includes('tiktok.com'))return 'TikTok';
  if(ref.includes('youtube.com')||ref.includes('youtu.be'))return 'YouTube';
  if(ref.includes('google.'))return 'Google';
  return ref?'Referral':'Direct';
}

function getSessionId(){
  const key='wissam_digital_session_v1';
  try{
    let id=sessionStorage.getItem(key);
    if(!id){
      id=(crypto.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(key,id);
    }
    return id;
  }catch(_){
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

const analyticsSessionId=getSessionId();
const analyticsSource=detectSource();
function trackEvent(event,extra={}){
  const payload={
    event,
    path:location.pathname,
    source:analyticsSource,
    sessionId:analyticsSessionId,
    ...extra
  };
  try{
    fetch('/api/track',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      keepalive:true
    }).catch(()=>{});
  }catch(_){}
}

trackEvent('page_view');

// رابط تنزيل ALAUFUQ المباشر هو المرجع الآمن على Cloudflare Pages.
const ALAUFUQ_TRIAL_APK='https://github.com/1984w18m11-byte/alofok-app/releases/download/v1.1.2/alaufuq-trial-1.1.2.apk';
document.querySelectorAll('[data-download-app="alofok"]').forEach(link=>{
  const q=new URLSearchParams({sid:analyticsSessionId,src:analyticsSource});
  link.href=`https://wispy-salad-438b.wissamdigital11.workers.dev/download/alofok-trial?${q.toString()}`;
});

// قاعدة الموقع: أي تطبيق قابل للتحميل يجب أن يكون بجانبه زر "شرح عن البرنامج".
document.querySelectorAll('[data-track="app_explainer_open"]').forEach(link=>{
  link.addEventListener('click',()=>trackEvent('app_explainer_open',{
    app:link.dataset.app||'',
    edition:link.dataset.edition||''
  }));
});

const requestImages=document.getElementById('requestImages');
const imageSelection=document.getElementById('imageSelection');
if(requestImages&&imageSelection){
  requestImages.addEventListener('change',()=>{
    const files=Array.from(requestImages.files||[]);
    if(!files.length){
      imageSelection.innerHTML='<span data-ar>يمكنك اختيار صور أو مستندات PDF أو Word أو ملفات نصية وإرسالها مع طلبك.</span><span data-en>You can select images, PDF, Word or text documents and send them with your request.</span>';
      return;
    }
    const names=files.slice(0,4).map(file=>file.name).join('، ');
    const extra=files.length>4?` +${files.length-4}`:'';
    imageSelection.textContent=`تم اختيار ${files.length} ملف: ${names}${extra}`;
  });
}

const requestForm=document.getElementById('requestForm');
if(requestForm){
  requestForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const subject=document.getElementById('subject').value.trim();
    const details=document.getElementById('details').value.trim();
    const source=detectSource();
    const files=Array.from(requestImages?.files||[]);

    if(files.length>8){
      alert('يمكنك اختيار 8 ملفات كحد أقصى في كل طلب.');
      return;
    }

    const imageLine=files.length?`\nالملفات المرفقة: ${files.length}`:'';
    const msg=`مرحباً وسام ديجيتال 👋\nلدي طلب جديد\nموضوع الطلب: ${subject}\nالشرح: ${details}${imageLine}\nالمصدر: ${source}`;
    const notice=document.getElementById('contactNotice');

    // على الهواتف الداعمة للمشاركة، نمرّر الصور نفسها إلى قائمة المشاركة حتى يختار المستخدم واتساب.
    if(files.length&&navigator.share&&navigator.canShare&&navigator.canShare({files})){
      try{
        if(notice){
          notice.style.display='block';
          notice.textContent='سيظهر خيار المشاركة. اختر واتساب لإرسال النص والملفات معًا.';
        }
        await navigator.share({title:'Wissam Digital',text:msg,files});
        return;
      }catch(err){
        if(err?.name==='AbortError')return;
      }
    }

    // إذا لم يدعم المتصفح مشاركة الملفات، نفتح واتساب بالنص ونطلب إرفاق الصور المختارة يدويًا.
    const fallbackMsg=files.length?`${msg}\nملاحظة: يرجى إرفاق الملفات المختارة داخل واتساب إذا لم تنتقل تلقائيًا.`:msg;
    const target=WHATSAPP_NUMBER
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(fallbackMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(fallbackMsg)}`;
    if(notice){
      notice.style.display='block';
      notice.textContent=files.length?'سيتم فتح واتساب. إذا لم تنتقل الملفات تلقائيًا، أرفقها داخل المحادثة.':'سيتم فتح واتساب لإرسال الطلب.';
    }
    location.href=target;
  });
}
