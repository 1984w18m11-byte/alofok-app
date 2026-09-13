from pathlib import Path
import json, re, time, urllib.parse, urllib.request, io

ROOT=Path(__file__).resolve().parents[1]
THEME_DIR=ROOT/'assets'/'themes'
THEME_DIR.mkdir(parents=True,exist_ok=True)
UA='AlofoK-theme-migration/1.0 (project asset migration)'

THEMES={
 'trial-fixed.jpg':'mosque night crescent moon photograph',
 'time-dawn.jpg':'sunrise landscape photograph',
 'time-morning.jpg':'morning green landscape sunlight photograph',
 'time-midday.jpg':'bright daytime blue sky green valley photograph',
 'time-evening.jpg':'mosque sunset evening photograph',
 'time-night.jpg':'night sky stars landscape photograph',
 'week-sunday.jpg':'Alhambra palace architecture photograph',
 'week-monday.jpg':'Sultan Ahmed Mosque Istanbul photograph',
 'week-tuesday.jpg':'Islamic architecture courtyard photograph',
 'week-wednesday.jpg':'Registan Samarkand photograph',
 'week-thursday.jpg':'Great Mosque Kairouan photograph',
 'week-friday.jpg':'Kaaba Mecca photograph',
 'week-saturday.jpg':'Cordoba mosque architecture photograph',
 'month-muharram.jpg':'mosque architecture night photograph',
 'month-safar.jpg':'desert road sunset landscape photograph',
 'month-rabi1.jpg':'spring green valley flowers photograph',
 'month-rabi2.jpg':'spring meadow flowers mountains photograph',
 'month-jumada1.jpg':'winter mountain landscape photograph',
 'month-jumada2.jpg':'early summer landscape sunlight photograph',
 'month-rajab.jpg':'mosque courtyard night photograph',
 'month-shaban.jpg':'crescent moon mosque night photograph',
 'month-ramadan.jpg':'Ramadan lantern mosque photograph',
 'month-shawwal.jpg':'Eid mosque lights photograph',
 'month-dhulqida.jpg':'desert pilgrimage road landscape photograph',
 'month-dhulhijja.jpg':'Kaaba Mecca Masjid al Haram photograph',
 'season-spring.jpg':'spring green valley flowers landscape photograph',
 'season-summer.jpg':'summer sunny landscape blue sky photograph',
 'season-autumn.jpg':'autumn forest orange leaves landscape photograph',
 'season-winter.jpg':'snow mountains winter landscape photograph',
 'special-new-year.jpg':'fireworks city night celebration photograph',
 'special-summer-solstice.jpg':'summer solstice sunrise landscape photograph',
 'special-winter-solstice.jpg':'winter snowy sunset landscape photograph',
 'special-equinox.jpg':'earth equinox seasons photograph',
 'special-solar-eclipse.jpg':'total solar eclipse photograph',
 'special-lunar-eclipse.jpg':'lunar eclipse moon photograph',
}

PLUS_IDS=[
 'dawn','morning','midday','evening','night',
 'week-sunday','week-monday','week-tuesday','week-wednesday','week-thursday','week-friday','week-saturday',
 'muharram','safar','rabi1','rabi2','jumada1','jumada2','rajab','shaban','ramadan','shawwal','dhulqida','dhulhijja',
 'spring','summer','autumn','winter',
 'new-year','summer-solstice','winter-solstice','equinox','solar-eclipse','lunar-eclipse'
]
assert len(PLUS_IDS)==34

ID_TO_FILE={
 'trial-fixed':'trial-fixed.jpg',
 'dawn':'time-dawn.jpg','morning':'time-morning.jpg','midday':'time-midday.jpg','evening':'time-evening.jpg','night':'time-night.jpg',
 'week-sunday':'week-sunday.jpg','week-monday':'week-monday.jpg','week-tuesday':'week-tuesday.jpg','week-wednesday':'week-wednesday.jpg','week-thursday':'week-thursday.jpg','week-friday':'week-friday.jpg','week-saturday':'week-saturday.jpg',
 'muharram':'month-muharram.jpg','safar':'month-safar.jpg','rabi1':'month-rabi1.jpg','rabi2':'month-rabi2.jpg','jumada1':'month-jumada1.jpg','jumada2':'month-jumada2.jpg','rajab':'month-rajab.jpg','shaban':'month-shaban.jpg','ramadan':'month-ramadan.jpg','shawwal':'month-shawwal.jpg','dhulqida':'month-dhulqida.jpg','dhulhijja':'month-dhulhijja.jpg',
 'spring':'season-spring.jpg','summer':'season-summer.jpg','autumn':'season-autumn.jpg','winter':'season-winter.jpg',
 'new-year':'special-new-year.jpg','summer-solstice':'special-summer-solstice.jpg','winter-solstice':'special-winter-solstice.jpg','equinox':'special-equinox.jpg','solar-eclipse':'special-solar-eclipse.jpg','lunar-eclipse':'special-lunar-eclipse.jpg'
}

LABELS_AR={
 'dawn':'الفجر','morning':'الصباح','midday':'النهار','evening':'المساء','night':'الليل',
 'week-sunday':'الأحد','week-monday':'الإثنين','week-tuesday':'الثلاثاء','week-wednesday':'الأربعاء','week-thursday':'الخميس','week-friday':'الجمعة','week-saturday':'السبت',
 'muharram':'محرم','safar':'صفر','rabi1':'ربيع الأول','rabi2':'ربيع الآخر','jumada1':'جمادى الأولى','jumada2':'جمادى الآخرة','rajab':'رجب','shaban':'شعبان','ramadan':'رمضان','shawwal':'شوال','dhulqida':'ذو القعدة','dhulhijja':'ذو الحجة',
 'spring':'الربيع','summer':'الصيف','autumn':'الخريف','winter':'الشتاء',
 'new-year':'رأس السنة','summer-solstice':'الانقلاب الصيفي','winter-solstice':'الانقلاب الشتوي','equinox':'الاعتدال','solar-eclipse':'الكسوف الشمسي','lunar-eclipse':'الخسوف القمري'
}
LABELS_EN={
 'trial-fixed':'Fixed theme','auto-time':'Automatic: time + weekday + season',
 'dawn':'Dawn','morning':'Morning','midday':'Daytime','evening':'Evening','night':'Night',
 'week-sunday':'Sunday','week-monday':'Monday','week-tuesday':'Tuesday','week-wednesday':'Wednesday','week-thursday':'Thursday','week-friday':'Friday','week-saturday':'Saturday',
 'muharram':'Muharram','safar':'Safar','rabi1':'Rabi I','rabi2':'Rabi II','jumada1':'Jumada I','jumada2':'Jumada II','rajab':'Rajab','shaban':"Sha'ban",'ramadan':'Ramadan','shawwal':'Shawwal','dhulqida':'Dhu al-Qidah','dhulhijja':'Dhu al-Hijjah',
 'spring':'Spring','summer':'Summer','autumn':'Autumn','winter':'Winter','new-year':'New Year','summer-solstice':'Summer solstice','winter-solstice':'Winter solstice','equinox':'Equinox','solar-eclipse':'Solar eclipse','lunar-eclipse':'Lunar eclipse'
}

def http_json(url):
    last=None
    for attempt in range(6):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':UA})
            with urllib.request.urlopen(req,timeout=35) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            last=e
            if getattr(e,'code',None)==429 and attempt<5:
                time.sleep(8*(attempt+1))
                continue
            raise
    raise last

def download(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA})
    with urllib.request.urlopen(req,timeout=60) as r:
        return r.read()

def search_commons(query):
    params={
      'action':'query','format':'json','formatversion':'2','generator':'search','gsrnamespace':'6','gsrlimit':'20','gsrsearch':query,
      'prop':'imageinfo','iiprop':'url|extmetadata|mime|size','iiurlwidth':'1400'
    }
    url='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)
    data=http_json(url)
    pages=data.get('query',{}).get('pages',[])
    for p in pages:
        ii=(p.get('imageinfo') or [{}])[0]
        mime=(ii.get('mime') or '').lower()
        if mime not in {'image/jpeg','image/png','image/webp'}: continue
        if ii.get('width',0)<700 or ii.get('height',0)<500: continue
        ext=ii.get('extmetadata') or {}
        lic=((ext.get('LicenseShortName') or {}).get('value') or '').strip()
        low=lic.lower()
        if not lic or 'noncommercial' in low or ' nc' in low or '-nc' in low or '-nd' in low: continue
        if not any(x in low for x in ['cc0','public domain','cc by','cc-by']): continue
        artist=((ext.get('Artist') or {}).get('value') or '').strip()
        credit=((ext.get('Credit') or {}).get('value') or '').strip()
        pageurl='https://commons.wikimedia.org/wiki/'+urllib.parse.quote(p.get('title','').replace(' ','_'),safe=':/()_-')
        return {
          'title':p.get('title'),'url':ii.get('thumburl') or ii.get('url'),'original_url':ii.get('url'),
          'page_url':pageurl,'license':lic,'artist':re.sub('<[^>]+>','',artist),'credit':re.sub('<[^>]+>','',credit),
          'width':ii.get('width'),'height':ii.get('height')
        }
    return None

def save_theme(filename,query,previous=None):
    from PIL import Image,ImageOps,ImageEnhance
    meta=None
    try:
        meta=search_commons(query)
    except Exception as e:
        print('search failed',filename,e)
    if meta:
        try:
            raw=download(meta['url'])
            im=Image.open(io.BytesIO(raw)).convert('RGB')
            im=ImageOps.fit(im,(1080,1920),method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
            im=ImageEnhance.Contrast(im).enhance(1.03)
            im.save(THEME_DIR/filename,'JPEG',quality=88,optimize=True,progressive=True)
            return meta
        except Exception as e:
            print('download/render failed',filename,e)
    if previous and Path(previous).exists():
        Image.open(previous).convert('RGB').resize((1080,1920)).save(THEME_DIR/filename,'JPEG',quality=88,optimize=True,progressive=True)
        return {'title':'fallback copy','url':'','original_url':'','page_url':'','license':'project fallback','artist':'','credit':'','width':1080,'height':1920}
    # deterministic clean fallback; used only when Commons is unavailable
    im=Image.new('RGB',(1080,1920),(8,22,36))
    for y in range(1920):
        t=y/1919
        c=(int(8+40*t),int(22+70*t),int(36+85*t))
        for x in range(1080): im.putpixel((x,y),c)
    im.save(THEME_DIR/filename,'JPEG',quality=90)
    return {'title':'generated fallback','url':'','original_url':'','page_url':'','license':'project generated','artist':'AlofoK','credit':'','width':1080,'height':1920}

sources={}
last=None
for filename,query in THEMES.items():
    print('theme',filename,query)
    meta=save_theme(filename,query,last)
    sources[filename]={'query':query,**meta}
    last=THEME_DIR/filename
    time.sleep(1.8)
missing_sources=[name for name,meta in sources.items() if not meta.get('page_url')]
if missing_sources:
    raise RuntimeError('Licensed image source unavailable for: '+', '.join(missing_sources))
(THEME_DIR/'theme-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')

# Remove legacy atlas and obsolete single-file experiment.
for old in ['alofok-plus-theme-atlas-v1.jpg','jumada2-early-summer.jpg']:
    p=THEME_DIR/old
    if p.exists(): p.unlink()

app_path=ROOT/'App.js'
app=app_path.read_text(encoding='utf-8')
labels='const THEME_LABELS_EN='+json.dumps(LABELS_EN,ensure_ascii=False,separators=(',',':'))+';'
app,n=re.subn(r"const THEME_LABELS_EN=\{[\s\S]*?\};",labels,app,count=1)
assert n==1,'THEME_LABELS_EN replacement failed'

choices="const THEME_CHOICES=[\n ['auto-time','تلقائي حسب الوقت ويوم الأسبوع والفصل'],\n"+"\n".join([f" ['{i}','{LABELS_AR[i]}']," for i in PLUS_IDS])+"\n];"
asset_lines=["const THEME_ASSETS={"]
for i,f in ID_TO_FILE.items(): asset_lines.append(f" '{i}':require('./assets/themes/{f}'),")
asset_lines.append('};')
block=choices+'\n'+"\n".join(asset_lines)+"\nfunction ThemeBackground({themeId}){const source=THEME_ASSETS[themeId]||THEME_ASSETS['trial-fixed'];return <Image source={source} resizeMode='cover' style={StyleSheet.absoluteFillObject}/>;}\nfunction ThemePreview({themeId}){const source=THEME_ASSETS[themeId]||THEME_ASSETS['trial-fixed'];return <Image source={source} resizeMode='cover' style={StyleSheet.absoluteFillObject}/>;}\n\nfunction AlofoKApp"
app,n=re.subn(r"const THEME_CHOICES=\[[\s\S]*?\];\nconst SCREEN=Dimensions\.get\('window'\);[\s\S]*?function AlofoKApp",block,app,count=1)
assert n==1,'atlas theme block replacement failed'

app=app.replace("const [selectedTheme,setSelectedTheme]=useState(IS_PLUS?'auto-time':'night');","const [selectedTheme,setSelectedTheme]=useState(IS_PLUS?'auto-time':'trial-fixed');")
app=app.replace("else setSelectedTheme(IS_PLUS?'auto-time':'night');","else setSelectedTheme(IS_PLUS?'auto-time':'trial-fixed');")

auto_block=""" const availableThemes=IS_PLUS?THEME_CHOICES:[['trial-fixed','الثيم الثابت']];
 const autoHour=now.getHours();
 const timeThemeId=autoHour>=5&&autoHour<8?'dawn':autoHour<11?'morning':autoHour<17?'midday':autoHour<20?'evening':'night';
 const weekdayThemeId=['week-sunday','week-monday','week-tuesday','week-wednesday','week-thursday','week-friday','week-saturday'][now.getDay()]||'week-sunday';
 const gregorianMonth=now.getMonth();
 const seasonThemeId=(gregorianMonth===2||gregorianMonth===3||gregorianMonth===4)?'spring':(gregorianMonth===5||gregorianMonth===6||gregorianMonth===7)?'summer':(gregorianMonth===8||gregorianMonth===9||gregorianMonth===10)?'autumn':'winter';
 const autoModeSlot=Math.floor(autoHour/3)%3;
 const autoThemeId=(autoHour<6||autoHour>=20)?timeThemeId:(autoModeSlot===0?timeThemeId:autoModeSlot===1?weekdayThemeId:seasonThemeId);
 const activeThemeId=selectedTheme==='auto-time'?autoThemeId:selectedTheme;
"""
app,n=re.subn(r" const availableThemes=IS_PLUS\?THEME_CHOICES:[\s\S]*? const atlasIndex=.*?;\n",auto_block,app,count=1)
assert n==1,'automatic theme logic replacement failed'

app=app.replace("  {IS_PLUS&&<AtlasThemeBackground index={atlasIndex}/>} ","  <ThemeBackground themeId={IS_PLUS?activeThemeId:'trial-fixed'}/>")
app=app.replace("opacity:IS_PLUS?.12:.76","opacity:IS_PLUS?.18:.42")
app=re.sub(r"\n  \{!IS_PLUS&&<View pointerEvents='none' style=\{\[s\.themeSky[\s\S]*?</View>\}\n",'\n',app,count=1)
app=app.replace("availableThemes.map(([id,label,index])=>{return","availableThemes.map(([id,label])=>{return")
app=app.replace("{index===null?<Text style={s.themeChoiceSymbol}>◉</Text>:<AtlasThemePreview index={index}/>} ","{id==='auto-time'?<Text style={s.themeChoiceSymbol}>◉</Text>:<ThemePreview themeId={id}/>} ")
app=app.replace("{index===null?<Text style={s.themeChoiceSymbol}>◉</Text>:<AtlasThemePreview index={index}/>}<View","{id==='auto-time'?<Text style={s.themeChoiceSymbol}>◉</Text>:<ThemePreview themeId={id}/>}<View")
assert 'THEME_ATLAS' not in app and 'AtlasTheme' not in app,'legacy atlas code remains'
app_path.write_text(app,encoding='utf-8')

qa_path=ROOT/'scripts'/'release-qa.js'
qa=qa_path.read_text(encoding='utf-8')
replacement="""assert(app.includes('weekdayThemeId')&&app.includes('seasonThemeId')&&app.includes('timeThemeId'),'standalone automatic theme rotation incomplete');
assert(app.includes('<ThemePreview themeId={id}/>'),'theme previews must use standalone image files');
assert(app.includes("<ThemeBackground themeId={IS_PLUS?activeThemeId:'trial-fixed'}/>"),'fixed trial / automatic Plus background binding missing');
assert(!app.includes('THEME_ATLAS')&&!app.includes('AtlasTheme'),'legacy atlas code must be removed');
assert(!fs.existsSync('assets/themes/alofok-plus-theme-atlas-v1.jpg'),'legacy atlas file must be deleted');
const themeMatch=app.match(/const THEME_CHOICES=\\[([\\s\\S]*?)\\];/);
assert(themeMatch,'THEME_CHOICES missing');
if(themeMatch){
  const ids=[...themeMatch[1].matchAll(/\\['([^']+)'/g)].map(m=>m[1]);
  assert(ids.length===35,'expected auto + 34 Plus theme choices');
  assert(new Set(ids).size===35,'theme ids must be unique');
}
"""
qa,n=re.subn(r"assert\(app\.includes\('weekInLunarMonth'\)[\s\S]*?\n\}\nconst configuredSounds=",lambda _m: replacement+'const configuredSounds=',qa,count=1)
assert n==1,'release QA atlas block replacement failed'
qa_path.write_text(qa,encoding='utf-8')

print('Standalone theme migration complete:',len(PLUS_IDS),'Plus themes + fixed Trial theme')
