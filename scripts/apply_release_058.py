from pathlib import Path
import json, re
from PIL import Image, ImageDraw, ImageFont

ROOT=Path('.')
VERSION='0.5.8'
VERSION_CODE=29

def read(p): return Path(p).read_text(encoding='utf-8')
def write(p,s): Path(p).write_text(s,encoding='utf-8')

def replace_once(text, old, new, label):
    c=text.count(old)
    if c!=1: raise SystemExit(f'{label}: expected 1 match, found {c}')
    return text.replace(old,new,1)

def json_write(path,obj):
    write(path,json.dumps(obj,ensure_ascii=False,indent=2)+'\n')

# ---- Exact launcher icons: large AlofoK title + exact subtitle ----
def make_icon(kind, foreground=False):
    S=1024
    BG=(4,20,31,255); GOLD=(244,187,82,255); GOLD2=(210,151,35,255); WHITE=(247,244,231,255)
    if foreground:
        im=Image.new('RGBA',(S,S),(0,0,0,0))
    else:
        im=Image.new('RGBA',(S,S),BG)
        px=im.load()
        for y in range(S):
            t=y/(S-1)
            for x in range(S):
                dx=(x-S*.5)/S; dy=(y-S*.42)/S
                glow=max(0,1-(dx*dx+dy*dy)*2.8)
                px[x,y]=(int(3+8*glow+5*(1-t)),int(18+21*glow+7*(1-t)),int(30+27*glow+8*(1-t)),255)
    d=ImageDraw.Draw(im)
    if not foreground:
        d.rounded_rectangle((44,44,980,980),radius=210,outline=GOLD,width=22)
        d.rounded_rectangle((69,69,955,955),radius=188,outline=(244,187,82,85),width=4)
        cx,cy,r=175,178,82
        d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=GOLD)
        d.ellipse((cx-r+34,cy-r-8,cx+r+34,cy+r-8),fill=(8,28,42,255))
    if kind=='paid':
        x0,y0,x1,y1=300,214,724,535
        d.polygon([(x0,y0+52),(x0+92,y0),(x1,y0+8),(x1,y0+70)],fill=(29,25,19,255))
        d.rectangle((x0,y0+52,x1,y1),fill=(10,10,9,255))
        d.rectangle((x0,y0+120,x1,y0+174),fill=GOLD2)
        d.rectangle((x0,y0+130,x1,y0+147),fill=(245,201,92,255))
        d.rectangle((x0+302,y0+232,x0+354,y1),fill=(175,120,35,255))
        d.rectangle((x0+313,y0+244,x0+343,y1),fill=(227,179,73,255))
        for xx in range(x0+18,x1-10,42): d.line((xx,y0+134,xx+18,y0+146),fill=(132,92,31,255),width=3)
    else:
        d.rectangle((262,470,762,548),fill=(236,227,198,255))
        d.rectangle((330,402,694,518),fill=(239,230,204,255))
        d.pieslice((363,254,661,500),180,360,fill=(40,133,91,255)); d.rectangle((363,375,661,447),fill=(40,133,91,255))
        d.line((512,250,512,207),fill=GOLD,width=8); d.ellipse((486,177,538,229),fill=GOLD); d.ellipse((500,169,548,219),fill=(8,28,42,255))
        for x in (292,700):
            d.rectangle((x,282,x+44,520),fill=(231,221,192,255)); d.polygon([(x-10,282),(x+22,226),(x+54,282)],fill=(228,211,161,255)); d.rectangle((x-8,352,x+52,369),fill=GOLD2); d.ellipse((x+12,210,x+32,230),fill=GOLD)
        for x in (382,470,558): d.rounded_rectangle((x,456,x+52,524),radius=24,fill=(13,42,52,255))
    font_file=next(iter(Path('/usr/share/fonts').rglob('NotoKufiArabic-Regular.ttf')), None) or next(iter(Path('/usr/share/fonts').rglob('NotoSansArabic-Regular.ttf')), None) or next(iter(Path('/usr/share/fonts').rglob('DejaVuSans.ttf')), None); font_title=ImageFont.truetype(str(font_file),118)
    font_sub=ImageFont.truetype(str(font_file),51)
    d.text((S//2,663),'الأفق',font=font_title,fill=GOLD,anchor='mm',direction='rtl',language='ar')
    d.text((S//2,790),'تقويم عربي ثابت',font=font_sub,fill=WHITE,anchor='mm',direction='rtl',language='ar')
    if not foreground: d.line((260,724,764,724),fill=(244,187,82,85),width=3)
    return im

Path('assets').mkdir(exist_ok=True)
for kind in ('trial','paid'):
    make_icon(kind).save(f'assets/icon-{kind}.png',optimize=True)
    make_icon(kind,True).save(f'assets/icon-{kind}-foreground.png',optimize=True)

# ---- Identity/version ----
appj=json.loads(read('app.json'))
appj['expo']['version']=VERSION
appj['expo']['ios']['bundleIdentifier']='com.alofok.trial'
appj['expo']['android']['package']='com.alofok.trial'
appj['expo']['android']['versionCode']=VERSION_CODE
sounds=[
 './assets/adhan/beautiful_adhan.wav',
 './assets/adhan/adhan_andrewler.wav',
 './assets/adhan/adhan_aishatu98.wav',
 './assets/adhan/adhan_nigeria_isaac.wav',
 './assets/adhan/adhan_medina_ejaz215.wav',
 './assets/adhan/adhan_mecca_2013.wav',
 './assets/adhan/adhan_mecca_maghrib_2012.wav',
 './assets/adhan/adhan_konya_2012.wav',
 './assets/adhan/adhan_tripoli_2019.wav',
 './assets/adhan/adhan_isfahan_shah.wav',
]
for p in appj['expo']['plugins']:
    if isinstance(p,list) and p and p[0]=='expo-notifications': p[1]['sounds']=sounds
json_write('app.json',appj)

for path in ('package.json','package-lock.json'):
    obj=json.loads(read(path)); obj['version']=VERSION
    if path=='package-lock.json' and obj.get('packages',{}).get('') is not None: obj['packages']['']['version']=VERSION
    json_write(path,obj)

# app.config: stable package IDs and Android adaptive foreground safe zone
config=read('app.config.js')
config=config.replace("foregroundImage: icon,","foregroundImage: isPaid ? './assets/icon-paid-foreground.png' : './assets/icon-trial-foreground.png',")
write('app.config.js',config)

# ---- Curated Adhan registry: old first + nine new; old last 3 are removed ----
registry=[
 {"id":"commons-beautiful-adhan","country":"*","city":"*","display_ar":"أذان جميل — Adam-synagda","performer":"Adam-synagda","status":"licensed","license_required":False,"license":"CC0 1.0 Universal","source":"Wikimedia Commons — Beautiful adhan.ogg","source_url":"https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg","asset":"assets/adhan/beautiful_adhan.ogg","available_in":["trial","paid"],"modification_note":"Original OGG retained for preview; PCM WAV derivative generated for Android notification playback."},
 {"id":"commons-andrewler-azan","country":"*","city":"*","display_ar":"أذان — Andrewler","performer":"Andrewler","status":"licensed","license_required":False,"license":"CC BY-SA 4.0","source":"Wikimedia Commons — Azan.ogg","source_url":"https://commons.wikimedia.org/wiki/File:Azan.ogg","asset":"assets/adhan/adhan_andrewler.ogg","available_in":["trial","paid"],"modification_note":"Audio converted to OGG/WAV; attribution and ShareAlike terms preserved."},
 {"id":"commons-aishatu98-adhan","country":"*","city":"*","display_ar":"أذان — Aishatu98","performer":"Aishatu98","status":"licensed","license_required":False,"license":"CC0 1.0 Universal","source":"Wikimedia Commons — Adhan.ogg","source_url":"https://commons.wikimedia.org/wiki/File:Adhan.ogg","asset":"assets/adhan/adhan_aishatu98.ogg","available_in":["trial","paid"],"modification_note":"Audio converted to OGG/WAV."},
 {"id":"commons-nigeria-isaac","country":"NG","city":"*","display_ar":"أذان نيجيريا — Isaacayodele32","performer":"Isaacayodele32","status":"licensed","license_required":False,"license":"CC BY-SA 4.0","source":"Wikimedia Commons — Call to prayer.ogg","source_url":"https://commons.wikimedia.org/wiki/File:Call_to_prayer.ogg","asset":"assets/adhan/adhan_nigeria_isaac.ogg","available_in":["trial","paid"],"modification_note":"Audio converted to OGG/WAV; attribution and ShareAlike terms preserved."},
 {"id":"commons-medina-ejaz215","country":"SA","city":"medina","display_ar":"أذان المدينة — المسجد النبوي","performer":"ejaz215","status":"licensed","license_required":False,"license":"CC BY 3.0","source":"Wikimedia Commons — 33937 ejaz215 call-to-prayer-from-the-prophet-s-mo.ogg","source_url":"https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg","asset":"assets/adhan/adhan_medina_ejaz215.ogg","available_in":["trial","paid"],"modification_note":"Audio converted to OGG/WAV; attribution retained."},
 {"id":"commons-mecca-2013","country":"SA","city":"mecca","display_ar":"أذان مكة — المسجد الحرام 2013","performer":"Seyfula Islam","status":"licensed","license_required":False,"license":"CC BY 3.0","source":"Wikimedia Commons — Adhan, Great Mosque of Mecca - Jan 21, 2013.webm","source_url":"https://commons.wikimedia.org/wiki/File:Adhan,_Great_Mosque_of_Mecca_-_Jan_21,_2013.webm","asset":"assets/adhan/adhan_mecca_2013.ogg","available_in":["trial","paid"],"modification_note":"Audio track extracted and converted to OGG/WAV; attribution retained."},
 {"id":"commons-mecca-maghrib-2012","country":"SA","city":"mecca","display_ar":"أذان المغرب — المسجد الحرام 2012","performer":"3omar Faruq","status":"licensed","license_required":False,"license":"CC BY 3.0","source":"Wikimedia Commons — Maghrib Adhan at the Masjid al Haram, Mecca - 25 Feb, 2012.webm","source_url":"https://commons.wikimedia.org/wiki/File:Maghrib_Adhan_at_the_Masjid_al_Haram,_Mecca_-_25_Feb,_2012.webm","asset":"assets/adhan/adhan_mecca_maghrib_2012.ogg","available_in":["trial","paid"],"modification_note":"Audio track extracted and converted to OGG/WAV; attribution retained."},
 {"id":"commons-konya-2012","country":"TR","city":"konya","display_ar":"أذان قونية — تركيا","performer":"Frans van der Vaart","status":"licensed","license_required":False,"license":"CC BY 3.0","source":"Wikimedia Commons — Hminsec150 Konya.webm","source_url":"https://commons.wikimedia.org/wiki/File:Hminsec150_Konya.webm","asset":"assets/adhan/adhan_konya_2012.ogg","available_in":["trial","paid"],"modification_note":"Audio track extracted and converted to OGG/WAV; attribution retained."},
 {"id":"commons-tripoli-2019","country":"LB","city":"tripoli","display_ar":"أذان طرابلس — ساحة النور","performer":"باسم","status":"licensed","license_required":False,"license":"CC BY-SA 4.0","source":"Wikimedia Commons — Adhan During the Lebanese Protests in Tripoli 2019.webm","source_url":"https://commons.wikimedia.org/wiki/File:Adhan_During_the_Lebanese_Protests_in_Tripoli_2019.webm","asset":"assets/adhan/adhan_tripoli_2019.ogg","available_in":["trial","paid"],"modification_note":"Audio track extracted and converted to OGG/WAV; attribution and ShareAlike terms preserved."},
 {"id":"commons-isfahan-shah","country":"IR","city":"isfahan","display_ar":"أذان أصفهان — مسجد الشاه","performer":"10EldarionElessar","status":"licensed","license_required":False,"license":"CC BY 3.0","source":"Wikimedia Commons — Tour guide recite Adhan in the Shah mosque in Isfahan, Iran.webm","source_url":"https://commons.wikimedia.org/wiki/File:Tour_guide_recite_Adhan_in_the_Shah_mosque_in_Isfahan,_Iran.webm","asset":"assets/adhan/adhan_isfahan_shah.ogg","available_in":["trial","paid"],"modification_note":"Audio track extracted and converted to OGG/WAV; attribution retained."}
]
json_write('src/data/adhan-registry.json',registry)

# Delete the three user-rejected current sounds and duplicate variants.
for name in [
 'adhan_morocco_hassan_ii.ogg','adhan_morocco_hassan_ii.wav','adhan-morocco-hassan-ii.ogg',
 'adhan_kazakhstan_shalqar.ogg','adhan_kazakhstan_shalqar.wav','adhan-kazakhstan-shalqar.ogg',
 'adhan_aaqib_azeez.ogg','adhan_aaqib_azeez.wav','adhan-aaqib-azeez.ogg']:
    p=Path('assets/adhan')/name
    if p.exists(): p.unlink()

# App maps: exact ten playable recordings.
app=read('App.js')
app=re.sub(r"const APP_VERSION='[^']+';",f"const APP_VERSION='{VERSION}';",app,count=1)
new_assets="""const ADHAN_ASSETS={
 'commons-beautiful-adhan':require('./assets/adhan/beautiful_adhan.ogg'),
 'commons-andrewler-azan':require('./assets/adhan/adhan_andrewler.ogg'),
 'commons-aishatu98-adhan':require('./assets/adhan/adhan_aishatu98.ogg'),
 'commons-nigeria-isaac':require('./assets/adhan/adhan_nigeria_isaac.ogg'),
 'commons-medina-ejaz215':require('./assets/adhan/adhan_medina_ejaz215.ogg'),
 'commons-mecca-2013':require('./assets/adhan/adhan_mecca_2013.ogg'),
 'commons-mecca-maghrib-2012':require('./assets/adhan/adhan_mecca_maghrib_2012.ogg'),
 'commons-konya-2012':require('./assets/adhan/adhan_konya_2012.ogg'),
 'commons-tripoli-2019':require('./assets/adhan/adhan_tripoli_2019.ogg'),
 'commons-isfahan-shah':require('./assets/adhan/adhan_isfahan_shah.ogg')
};
const ADHAN_NOTIFICATION_SOUNDS={
 'commons-beautiful-adhan':'beautiful_adhan.wav',
 'commons-andrewler-azan':'adhan_andrewler.wav',
 'commons-aishatu98-adhan':'adhan_aishatu98.wav',
 'commons-nigeria-isaac':'adhan_nigeria_isaac.wav',
 'commons-medina-ejaz215':'adhan_medina_ejaz215.wav',
 'commons-mecca-2013':'adhan_mecca_2013.wav',
 'commons-mecca-maghrib-2012':'adhan_mecca_maghrib_2012.wav',
 'commons-konya-2012':'adhan_konya_2012.wav',
 'commons-tripoli-2019':'adhan_tripoli_2019.wav',
 'commons-isfahan-shah':'adhan_isfahan_shah.wav'
};"""
app,n=re.subn(r"const ADHAN_ASSETS=\{[\s\S]*?\};\nconst ADHAN_NOTIFICATION_SOUNDS=\{[\s\S]*?\};",new_assets,app,count=1)
if n!=1: raise SystemExit('Could not replace Adhan asset maps')
write('App.js',app)

# Update manifests point only to the two stable package/release files.
notes_ar='تحديث 0.5.8: أيقونة أوضح بنص «الأفق — تقويم عربي ثابت»، تثبيت هويتي التجريبية وPlus للتحديث في مكانهما، ثيمات Plus المستقلة، وقائمة 10 أصوات أذان مرخصة بعد حذف الأصوات الثلاثة السابقة.'
notes_en='0.5.8: clearer launcher icon, stable trial/Plus package identities for in-place updates, standalone Plus themes, and 10 licensed Adhan recordings after removing the previous three selections.'
for channel,filename in [('trial','alofok-trial-0.5.8.apk'),('plus','alofok-plus-0.5.8.apk')]:
    path=f'update-{channel}.json'; obj=json.loads(read(path)); obj['version']=VERSION; obj['versionCode']=VERSION_CODE; obj['notes_ar']=notes_ar; obj['notes_en']=notes_en; obj['published_at']='2026-09-13'; obj['download_url']=f'https://github.com/1984w18m11-byte/alofok-app/releases/download/v{VERSION}/{filename}'; json_write(path,obj)

# QA expects exactly 10 curated sounds and forbids the three rejected ids.
qa=read('scripts/release-qa.js')
qa=qa.replace("assert(configuredSounds.length===4,'four notification Adhan sounds must be configured');","assert(configuredSounds.length===10,'ten notification Adhan sounds must be configured');")
qa=qa.replace("assert(playable.length>=4,'expected at least four licensed playable Adhan entries');","assert(playable.length===10,'expected exactly ten licensed playable Adhan entries');")
anchor="assert(playable.length===10,'expected exactly ten licensed playable Adhan entries');"
if "rejected Adhan ids must stay removed" not in qa:
    qa=qa.replace(anchor,anchor+"\nassert(!registry.some(x=>['commons-morocco-hassan-ii','commons-kazakhstan-shalqar','commons-aaqib-azeez'].includes(x.id)),'rejected Adhan ids must stay removed');")
write('scripts/release-qa.js',qa)

# Human-readable license inventory.
licenses=['# AlofoK 0.5.8 — Adhan licensing inventory','', 'Only the ten entries below are exposed in the app. The previous Morocco/Kazakhstan/Aaqib selections were removed at the owner’s request.','']
for i,x in enumerate(registry,1):
    licenses += [f"## {i}. {x['display_ar']}",f"- Performer/source credit: {x['performer']}",f"- License: {x['license']}",f"- Source: {x['source_url']}",f"- Packaged asset: {x['asset']}",'']
write('ADHAN_LICENSES_AR.md','\n'.join(licenses)+'\n')

# Build workflow: fetch exact licensed originals, derive OGG previews + 32 kHz mono WAV notification sounds, validate every byte, publish v0.5.8.
workflow=r'''name: Validate and build Android APKs

on:
  workflow_dispatch:
  push:
    paths:
      - .github/build-apks.trigger

permissions:
  contents: write

jobs:
  build-apk:
    name: Build AlofoK ${{ matrix.variant }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        variant: [trial, paid]
    env:
      APP_VARIANT: ${{ matrix.variant }}
      EXPO_PUBLIC_APP_VARIANT: ${{ matrix.variant }}
      EXPO_PUBLIC_DISTRIBUTION_CHANNEL: direct
      EXPO_NO_TELEMETRY: "1"
      RELEASE_VERSION: "0.5.8"

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - name: Install dependencies
        run: npm ci

      - name: Fetch, convert, and validate the ten licensed Adhan recordings
        shell: bash
        run: |
          set -euo pipefail
          sudo apt-get update -qq
          sudo apt-get install -y -qq ffmpeg
          mkdir -p assets/adhan /tmp/alofok-adhan

          convert_source() {
            local file_title="$1"
            local stem="$2"
            local encoded
            encoded=$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$file_title")
            local url="https://commons.wikimedia.org/wiki/Special:Redirect/file/${encoded}"
            local input="/tmp/alofok-adhan/${stem}.source"
            echo "Downloading licensed source: ${file_title}"
            curl -fL --retry 4 --retry-delay 2 -A "AlofoK-build/0.5.8" "$url" -o "$input"
            test -s "$input"
            ffprobe -v error "$input" >/dev/null
            ffmpeg -hide_banner -loglevel error -xerror -y -fflags +genpts -i "$input" -vn -af "aresample=async=1:first_pts=0,asetpts=N/SR/TB" -ac 1 -ar 32000 -c:a libvorbis -q:a 5 "assets/adhan/${stem}.ogg"
            ffmpeg -hide_banner -loglevel error -xerror -y -fflags +genpts -i "$input" -vn -af "aresample=async=1:first_pts=0,asetpts=N/SR/TB" -ac 1 -ar 32000 -c:a pcm_s16le "assets/adhan/${stem}.wav"
          }

          test -s assets/adhan/beautiful_adhan.ogg
          ffprobe -v error assets/adhan/beautiful_adhan.ogg >/dev/null
          ffmpeg -hide_banner -loglevel error -xerror -y -i assets/adhan/beautiful_adhan.ogg -vn -ac 1 -ar 32000 -c:a pcm_s16le assets/adhan/beautiful_adhan.wav

          convert_source "Azan.ogg" "adhan_andrewler"
          convert_source "Adhan.ogg" "adhan_aishatu98"
          convert_source "Call to prayer.ogg" "adhan_nigeria_isaac"
          convert_source "33937 ejaz215 call-to-prayer-from-the-prophet-s-mo.ogg" "adhan_medina_ejaz215"
          convert_source "Adhan, Great Mosque of Mecca - Jan 21, 2013.webm" "adhan_mecca_2013"
          convert_source "Maghrib Adhan at the Masjid al Haram, Mecca - 25 Feb, 2012.webm" "adhan_mecca_maghrib_2012"
          convert_source "Hminsec150 Konya.webm" "adhan_konya_2012"
          convert_source "Adhan During the Lebanese Protests in Tripoli 2019.webm" "adhan_tripoli_2019"
          convert_source "Tour guide recite Adhan in the Shah mosque in Isfahan, Iran.webm" "adhan_isfahan_shah"

          for stem in beautiful_adhan adhan_andrewler adhan_aishatu98 adhan_nigeria_isaac adhan_medina_ejaz215 adhan_mecca_2013 adhan_mecca_maghrib_2012 adhan_konya_2012 adhan_tripoli_2019 adhan_isfahan_shah; do
            for ext in ogg wav; do
              f="assets/adhan/${stem}.${ext}"
              test -s "$f"
              ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -show_entries format=duration -of default=noprint_wrappers=1 "$f"
              ffmpeg -hide_banner -loglevel error -xerror -i "$f" -f null -
            done
          done

      - name: Validate translation completeness
        run: npm run check:translations

      - name: Run final release QA
        run: npm run check:release

      - name: Validate Expo configuration
        run: npx expo config --type public

      - name: Generate Android project
        run: npx expo prebuild --platform android --no-install --clean

      - name: Build standalone release APK
        working-directory: android
        run: ./gradlew assembleRelease --no-daemon

      - name: Keep build for internal verification
        uses: actions/upload-artifact@v4
        with:
          name: alofok-${{ matrix.variant }}-0.5.8
          path: android/app/build/outputs/apk/release/app-release.apk
          if-no-files-found: error
          retention-days: 14

  publish-release:
    name: Publish APK download links
    needs: build-apk
    runs-on: ubuntu-latest
    steps:
      - name: Download both APK artifacts
        uses: actions/download-artifact@v4
        with:
          pattern: alofok-*-0.5.8
          path: artifacts

      - name: Prepare clear APK filenames
        run: |
          cp artifacts/alofok-trial-0.5.8/app-release.apk alofok-trial-0.5.8.apk
          cp artifacts/alofok-paid-0.5.8/app-release.apk alofok-plus-0.5.8.apk

      - name: Publish GitHub release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release view v0.5.8 >/dev/null 2>&1 || gh release create v0.5.8 --title "الأفق 0.5.8" --notes "أيقونة أوضح بنص الأفق — تقويم عربي ثابت، تثبيت هويتي التجريبية وPlus، ثيمات Plus المستقلة، و10 أصوات أذان مرخصة مع حذف الأصوات الثلاثة السابقة."
          gh release upload v0.5.8 alofok-trial-0.5.8.apk alofok-plus-0.5.8.apk --clobber
'''
write('.github/workflows/build-apks.yml',workflow)
write('.github/build-apks.trigger','Build AlofoK 0.5.8 after icon, identity, theme and licensed Adhan refresh.\n')
print('AlofoK 0.5.8 source patch prepared successfully.')
