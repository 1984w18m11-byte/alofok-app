from pathlib import Path
import hashlib, io, json, re, urllib.parse, urllib.request
from PIL import Image,ImageEnhance,ImageOps

ROOT=Path('.')
THEME_DIR=ROOT/'assets'/'themes'
SOURCES_PATH=THEME_DIR/'theme-sources.json'
UA='AlofoK-theme-dedup/2026-09-13'
sources=json.loads(SOURCES_PATH.read_text(encoding='utf-8'))

def http_json(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA})
    with urllib.request.urlopen(req,timeout=45) as r:return json.loads(r.read().decode('utf-8'))

def download(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA})
    with urllib.request.urlopen(req,timeout=60) as r:return r.read()

def unique_candidate(query,used_pages):
    params={'action':'query','format':'json','formatversion':'2','generator':'search','gsrnamespace':'6','gsrlimit':'50','gsrsearch':query,'prop':'imageinfo','iiprop':'url|extmetadata|mime|size','iiurlwidth':'1600'}
    data=http_json('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params))
    for page in data.get('query',{}).get('pages',[]):
        ii=(page.get('imageinfo') or [{}])[0]
        mime=(ii.get('mime') or '').lower()
        if mime not in {'image/jpeg','image/png','image/webp'}:continue
        if ii.get('width',0)<700 or ii.get('height',0)<500:continue
        ext=ii.get('extmetadata') or {}
        lic=((ext.get('LicenseShortName') or {}).get('value') or '').strip()
        low=lic.lower()
        if not lic or 'noncommercial' in low or '-nc' in low or '-nd' in low:continue
        if not any(x in low for x in ['cc0','public domain','cc by','cc-by']):continue
        page_url='https://commons.wikimedia.org/wiki/'+urllib.parse.quote(page.get('title','').replace(' ','_'),safe=':/()_-')
        if page_url in used_pages:continue
        artist=((ext.get('Artist') or {}).get('value') or '').strip()
        credit=((ext.get('Credit') or {}).get('value') or '').strip()
        return {'title':page.get('title'),'url':ii.get('thumburl') or ii.get('url'),'original_url':ii.get('url'),'page_url':page_url,'license':lic,'artist':re.sub('<[^>]+>','',artist),'credit':re.sub('<[^>]+>','',credit),'width':ii.get('width'),'height':ii.get('height')}
    return None

def render(filename,meta):
    raw=download(meta['url'])
    im=Image.open(io.BytesIO(raw)).convert('RGB')
    im=ImageOps.fit(im,(1080,1920),method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
    im=ImageEnhance.Contrast(im).enhance(1.03)
    im.save(THEME_DIR/filename,'JPEG',quality=88,optimize=True,progressive=True)

used=set()
changed=[]
for filename,meta in sources.items():
    page=meta.get('page_url')
    if page and page not in used:
        used.add(page)
        continue
    if not page:
        raise RuntimeError(f'Missing licensed page_url for {filename}')
    query=(meta.get('query') or filename.replace('.jpg','').replace('-',' '))+' architecture landscape photograph'
    candidate=unique_candidate(query,used)
    if not candidate:
        raise RuntimeError(f'No unique licensed replacement found for duplicate theme {filename}')
    render(filename,candidate)
    sources[filename]={'query':meta.get('query') or query,**candidate}
    used.add(candidate['page_url'])
    changed.append(filename)

# Binary dedup check as a second guard.
hashes={}
for filename in sources:
    path=THEME_DIR/filename
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest in hashes:
        raise RuntimeError(f'Binary theme duplicate remains: {filename} == {hashes[digest]}')
    hashes[digest]=filename

SOURCES_PATH.write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Replaced duplicate themes:',', '.join(changed) if changed else 'none')
print('Verified unique source pages and unique binary hashes for',len(sources),'theme files.')
