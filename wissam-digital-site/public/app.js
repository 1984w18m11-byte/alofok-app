// رقم واتساب الأعمال لا يظهر في واجهة الموقع. عند إضافته هنا يفتح الزر المحادثة مباشرة.
const WHATSAPP_NUMBER = '';

const body=document.body;
const langBtn=document.getElementById('langBtn');
langBtn.addEventListener('click',()=>{
  const en=body.classList.toggle('en');
  document.documentElement.lang=en?'en':'ar';
  document.documentElement.dir=en?'ltr':'rtl';
  langBtn.textContent=en?'العربية':'English';
});

document.querySelectorAll('.servicePick').forEach(link=>link.addEventListener('click',()=>{
  document.getElementById('subject').value=link.dataset.service||'';
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
  return 'Website';
}

document.getElementById('requestForm').addEventListener('submit',e=>{
  e.preventDefault();
  const subject=document.getElementById('subject').value.trim();
  const details=document.getElementById('details').value.trim();
  const source=detectSource();
  const msg=`مرحباً وسام ديجيتال 👋\nلدي طلب جديد\nالموضوع: ${subject}\nالمطلوب: ${details}\nالمصدر: ${source}`;
  const target=WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const notice=document.getElementById('contactNotice');
  notice.style.display='block';
  notice.textContent='سيتم فتح واتساب لإرسال رسالة نصية فقط.';
  location.href=target;
});
