from pathlib import Path

index = Path('wissam-digital-site/public/index.html')
s = index.read_text(encoding='utf-8')

old_hero = '''        <div style="position:relative;z-index:3;text-align:center;margin-top:16px">
          <a class="btn primary" data-download-app="alofok" href="/download/alofok-trial" rel="noopener"><span data-ar>⬇ تحميل الأفق</span><span data-en>⬇ Download al ufuq</span></a>
          <div class="hint" style="margin-top:8px"><span data-ar>النسخة التجريبية للأندرويد — APK</span><span data-en>Android Trial — APK</span></div>
        </div>'''
new_hero = '''        <div style="position:relative;z-index:3;text-align:center;margin-top:16px;width:100%">
          <a class="btn primary" data-download-app="alofok" href="/download/alofok-trial" rel="noopener" style="display:flex;justify-content:center;align-items:center;width:min(100%,360px);margin:0 auto;font-size:17px;padding:15px 20px"><span data-ar>⬇ تحميل الأفق</span><span data-en>⬇ Download al ufuq</span></a>
          <div class="hint" style="margin-top:8px"><span data-ar>النسخة التجريبية للأندرويد — APK</span><span data-en>Android Trial — APK</span></div>
        </div>'''
if old_hero not in s:
    raise SystemExit('hero download block not found')
s = s.replace(old_hero, new_hero, 1)

old_upload = '''            <div class="field">
              <label data-ar>تحميل الصور المطلوبة (اختياري)</label><label data-en>Add required images (optional)</label>
              <input id="requestImages" type="file" accept="image/*" multiple />
              <div id="imageSelection" class="hint"><span data-ar>يمكنك اختيار عدة صور. تبقى الصور على جهازك إلى أن تختار إرسالها.</span><span data-en>You can select multiple images. They stay on your device until you choose to send them.</span></div>
            </div>'''
new_upload = '''            <div class="field">
              <label data-ar>إرفاق ملفات أو صور (اختياري)</label><label data-en>Attach files or images (optional)</label>
              <input id="requestImages" type="file" accept="image/*,.pdf,.doc,.docx,.txt" multiple />
              <div id="imageSelection" class="hint"><span data-ar>يمكنك اختيار صور أو PDF أو Word أو ملف نصي. تبقى الملفات على جهازك إلى أن تختار إرسالها.</span><span data-en>You can select images, PDF, Word, or text files. Files stay on your device until you choose to send them.</span></div>
            </div>'''
if old_upload not in s:
    raise SystemExit('upload block not found')
s = s.replace(old_upload, new_upload, 1)
index.write_text(s, encoding='utf-8')

app = Path('wissam-digital-site/public/app.js')
a = app.read_text(encoding='utf-8')
a = a.replace("const files=Array.from(requestImages.files||[]).filter(file=>file.type.startsWith('image/'));", "const files=Array.from(requestImages.files||[]);")
a = a.replace("imageSelection.innerHTML='<span data-ar>يمكنك اختيار عدة صور. تبقى الصور على جهازك إلى أن تختار إرسالها.</span><span data-en>You can select multiple images. They stay on your device until you choose to send them.</span>';", "imageSelection.innerHTML='<span data-ar>يمكنك اختيار صور أو PDF أو Word أو ملف نصي. تبقى الملفات على جهازك إلى أن تختار إرسالها.</span><span data-en>You can select images, PDF, Word, or text files. Files stay on your device until you choose to send them.</span>';")
a = a.replace("imageSelection.textContent=`تم اختيار ${files.length} صورة: ${names}${extra}`;", "imageSelection.textContent=`تم اختيار ${files.length} ملف: ${names}${extra}`;")
a = a.replace("const files=Array.from(requestImages?.files||[]).filter(file=>file.type.startsWith('image/'));", "const files=Array.from(requestImages?.files||[]);")
a = a.replace("alert('يمكنك اختيار 8 صور كحد أقصى في كل طلب.');", "alert('يمكنك اختيار 8 ملفات كحد أقصى في كل طلب.');")
a = a.replace("const imageLine=files.length?`\\nالصور المرفقة: ${files.length}`:'';", "const imageLine=files.length?`\\nالملفات المرفقة: ${files.length}`:'';")
a = a.replace("notice.textContent='سيظهر خيار المشاركة. اختر واتساب لإرسال النص والصور معًا.';", "notice.textContent='سيظهر خيار المشاركة. اختر واتساب لإرسال النص والملفات معًا.';")
a = a.replace("const fallbackMsg=files.length?`${msg}\\nملاحظة: يرجى إرفاق الصور المختارة داخل واتساب.`:msg;", "const fallbackMsg=files.length?`${msg}\\nملاحظة: يرجى إرفاق الملفات المختارة داخل واتساب إذا لم تنتقل تلقائيًا.`:msg;")
a = a.replace("notice.textContent=files.length?'سيتم فتح واتساب. إذا لم تنتقل الصور تلقائيًا، أرفق الصور المختارة داخل المحادثة.':'سيتم فتح واتساب لإرسال الطلب.';", "notice.textContent=files.length?'سيتم فتح واتساب. إذا لم تنتقل الملفات تلقائيًا، أرفقها داخل المحادثة.':'سيتم فتح واتساب لإرسال الطلب.';")
app.write_text(a, encoding='utf-8')

Path('wissam-digital-site/.cloudflare-refresh-20260916-2.txt').write_text('Refresh Wissam Digital homepage: permanent al ufuq download button and contact file attachments.\n', encoding='utf-8')
print('Wissam Digital homepage updated.')
