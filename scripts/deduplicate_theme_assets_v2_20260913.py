from pathlib import Path
import hashlib, io, json, re, urllib.parse, urllib.request, time
from PIL import Image,ImageEnhance,ImageOps

ROOT=Path('.')
THEME_DIR=ROOT/'assets'/'themes'
SOURCES_PATH=THEME_DIR/'theme-sources.json'
UA='AlofoK-theme-dedup/2026-09-13-v2'
sources=json.loads(SOURCES_PATH.read_text(encoding='utf-8'))

FALLBACK_QUERIES={
 'month-shaban.jpg':[
  'crescent moon mosque',
  'crescent moon minaret',
  'mosque moon night',
  'Islamic mosque night',
  'crescent moon night sky'
 ],
 'season-winter.jpg':[
  'snow mountain winter landscape',
  'snowy mountains landscape',
  'winter forest snow landscape',
  'snow valley mountains'
 ],
 'month-jumada1.jpg':[
  'winter mountain landscape',
  'snow mountains winter',
  'winter valley snow',
  'winter landscape mountains'
 ]
}

def http_json(url):
    last=None
    for attempt in range(5):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':UA})
            with urllib.request.urlopen(req,timeout=45) as r:return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            last=e
            time.sleep(2*(attempt+1))
    raise last

def download(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA})
    with urllib.request.urlopen(req,timeout=60) as r:return r.read()

def candidate_from_query(query,used_pages):
    params={
      'action':'query','format':'json','formatversion':'2','generator':'search',
      'gsrnamespace':'6','gsrlimit':'50','gsrsearch':query,
      'prop':'imageinfo','iiprop':'url|extmetadata|mime|size','iiurlwidth':'1600'
    }
    data=http_json('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params))
    for page in data.get('query',{}).get('pages',[]):
        ii=(page.get('imageinfo') or [{}])[0]
        if (ii.get('mime') or '').lower() not in {'image/jpeg','image/png','image/webp'}:continue
        if ii.get('width',0)<900 or ii.get('height',0)<600:continue
        ext=ii.get('extmetadata') or {}
        lic=((ext.get('LicenseShortName') or {}).get('value') or '').strip()
        low=lic.lower()
        if not lic or 'noncommercial' in low or '-nc' in low or '-nd' in low:continue
        if not any(x in low for x in ['cc0','public domain','cc by','cc-by']):continue
        page_url='https://commons.wikimedia.org/wiki/'+urllib.parse.quote(page.get('title','').replace(' ','_'),safe=':/()_-')
        if page_url in used_pages:continue
        artist=((ext.get('Artist') or {}).get('value') or '').strip()
        credit=((ext.get('Credit') or {}).get('value') or '').strip()
        return {
          'title':page.get('title'),'url':ii.get('thumburl') or ii.get('url'),'original_url':ii.get('url'),
          'page_url':page_url,'license':lic,'artist':re.sub('<[^>]+>','',artist),
          'credit':re.sub('<[^>]+>','',credit),'width':ii.get('width'),'height':ii.get('height')
        }
    return None

def find_unique(filename,original_query,used_pages):
    queries=[]
    for q in [original_query,*FALLBACK_QUERIES.get(filename,[]),filename.replace('.jpg','').replace('-',' ')]:
        q=(q or '').strip()
        if q and q not in queries:queries.append(q)
    for q in queries:
        meta=candidate_from_query(q,used_pages)
        if meta:
            print('replacement',filename,'query=',q,'source=',meta['page_url'])
            return meta
    return None

def render(filename,meta):
    raw=download(meta['url'])
    im=Image.open(io.BytesIO(raw)).convert('RGB')
    im=ImageOps.fit(im,(1080,1920),method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
    im=ImageEnhance.Contrast(im).enhance(1.03)
    im.save(THEME_DIR/filename,'JPEG',quality=88,optimize=True,progressive=True)

# Keep the first occurrence of every licensed source and replace later duplicates.
used=set()
changed=[]
for filename,meta in sources.items():
    page=meta.get('page_url')
    if not page:raise RuntimeError(f'Missing licensed source page for {filename}')
    if page not in used:
        used.add(page)
        continue
    candidate=find_unique(filename,meta.get('query') or '',used)
    if not candidate:raise RuntimeError(f'No unique licensed replacement found for duplicate theme {filename}')
    render(filename,candidate)
    sources[filename]={'query':meta.get('query') or '',**candidate}
    used.add(candidate['page_url'])
    changed.append(filename)

page_urls=[m.get('page_url') for m in sources.values()]
if len(page_urls)!=len(set(page_urls)):
    raise RuntimeError('Duplicate source pages remain after replacement')

hashes={}
for filename in sources:
    digest=hashlib.sha256((THEME_DIR/filename).read_bytes()).hexdigest()
    if digest in hashes:raise RuntimeError(f'Binary duplicate remains: {filename} == {hashes[digest]}')
    hashes[digest]=filename

SOURCES_PATH.write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Changed:',', '.join(changed) if changed else 'none')
print('Verified',len(sources),'theme files with unique licensed source pages and unique binary SHA-256 hashes.')
