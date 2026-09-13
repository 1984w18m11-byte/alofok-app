from pathlib import Path

p=Path('scripts/migrate_standalone_themes.py')
text=p.read_text(encoding='utf-8')

text=text.replace('def search_commons(query):','def search_commons(query,used_pages=None):',1)
old="""        pageurl='https://commons.wikimedia.org/wiki/'+urllib.parse.quote(p.get('title','').replace(' ','_'),safe=':/()_-')
        return {
"""
new="""        pageurl='https://commons.wikimedia.org/wiki/'+urllib.parse.quote(p.get('title','').replace(' ','_'),safe=':/()_-')
        if used_pages is not None and pageurl in used_pages:
            continue
        if used_pages is not None:
            used_pages.add(pageurl)
        return {
"""
if old not in text: raise RuntimeError('search return block not found')
text=text.replace(old,new,1)
text=text.replace('def save_theme(filename,query,previous=None):','def save_theme(filename,query,previous=None,used_pages=None):',1)
text=text.replace('meta=search_commons(query)','meta=search_commons(query,used_pages)',1)
old="""sources={}
last=None
for filename,query in THEMES.items():
    print('theme',filename,query)
    meta=save_theme(filename,query,last)
"""
new="""sources={}
used_pages=set()
last=None
for filename,query in THEMES.items():
    print('theme',filename,query)
    meta=save_theme(filename,query,last,used_pages)
"""
if old not in text: raise RuntimeError('theme loop not found')
text=text.replace(old,new,1)

# The migration is now an asset tool only. App.js has already migrated to standalone
# assets and must never be rewritten by this maintenance script again.
cut=text.find("app_path=ROOT/'App.js'")
if cut<0: raise RuntimeError('legacy App.js mutation block not found')
text=text[:cut]+"""page_urls=[meta.get('page_url') for meta in sources.values() if meta.get('page_url')]
if len(page_urls)!=len(set(page_urls)):
    raise RuntimeError('Duplicate licensed image source remained after migration')
print(f'Updated {len(sources)} standalone theme assets with unique licensed sources. App.js was not modified.')
"""
p.write_text(text,encoding='utf-8')
print('Theme migration tool hardened: unique sources, asset-only, no App.js rewrites.')
