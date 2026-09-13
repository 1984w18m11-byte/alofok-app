from pathlib import Path
p=Path('App.js')
app=p.read_text(encoding='utf-8')
replacements=[
 ("<View style={[s.clockCard,IS_PLUS&&s.plusClockStage]}>","<View style={[s.clockCard,s.plusClockStage]}>",'same main-page stage in both editions'),
 ("ui('PLUS مفعّلة للمعاينة','PLUS active')","ui('PLUS مفعّلة','PLUS active')",'Plus status wording'),
 ("ui('النسخة المجانية','Free edition')","ui('النسخة التجريبية','Trial edition')",'trial status wording')
]
for old,new,label in replacements:
 if old not in app: raise RuntimeError(f'{label}: source fragment not found')
 app=app.replace(old,new,1)
p.write_text(app,encoding='utf-8')

p=Path('scripts/release-qa.js')
qa=p.read_text(encoding='utf-8')
marker="assert(app.includes(\"const availableThemes=IS_PLUS?THEME_CHOICES:[['trial-fixed','ثيم رمضان الثابت']]\"),'trial must expose exactly one fixed theme');\n"
extra="assert(app.includes('<View style={[s.clockCard,s.plusClockStage]}>'),'trial and Plus must use the same main-page stage/layout');\n"
if extra not in qa:
 if marker not in qa: raise RuntimeError('QA layout marker not found')
 qa=qa.replace(marker,marker+extra,1)
p.write_text(qa,encoding='utf-8')
print('Round 3 source-only layout repairs applied. No build performed.')
