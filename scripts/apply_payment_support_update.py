from pathlib import Path
import re

path=Path('src/app/AppV3.js')
text=path.read_text(encoding='utf-8')
original=text

trial_import="import {TrialPlusActivation} from './TrialPlusActivation';\n"
support_import="import {SupportScreen} from './SupportScreen';\n"
if support_import not in text:
    if trial_import not in text:
        raise SystemExit('TrialPlusActivation import anchor not found')
    text=text.replace(trial_import,trial_import+support_import,1)

text=text.replace("const SUPPORT_ACCOUNT=process.env.EXPO_PUBLIC_SUPPORT_ACCOUNT||'';\n",'',1)

plus_pattern=r"function PlusScreen\(\{t,rtl,isPlus,country,onBack\}\)\{.*?\n\}\n\nfunction LanguageScreen"
plus_replacement="""function PlusScreen({t,rtl,isPlus,country,onBack}){
 return <TrialPlusActivation t={t} rtl={rtl} country={country} onBack={onBack} alreadyActive={isPlus}/>;
}

function LanguageScreen"""
text,count=re.subn(plus_pattern,plus_replacement,text,count=1,flags=re.S)
if count!=1:
    raise SystemExit(f'PlusScreen replacement count={count}')

support_nav_pattern=r"\n  if\(target==='support'\)\{\n   Alert\.alert\(t\('support'\),SUPPORT_ACCOUNT\?.*?\);return;\n  \}\n"
text,count=re.subn(support_nav_pattern,'\n',text,count=1,flags=re.S)
if count!=1 and "if(target==='support')" in text:
    raise SystemExit('Support alert block was not replaced safely')

plus_route=" if(screen==='plus')return <PlusScreen t={t} rtl={rtl} isPlus={IS_PLUS} country={location.country} onBack={goBack}/>;\n"
support_route=" if(screen==='support')return <SupportScreen rtl={rtl} edition={IS_PLUS?'plus':'trial'} onBack={goBack}/>;\n"
if support_route not in text:
    if plus_route not in text:
        raise SystemExit('Plus route anchor not found')
    text=text.replace(plus_route,plus_route+support_route,1)

if text==original:
    raise SystemExit('No changes made')
path.write_text(text,encoding='utf-8')
print('Prepared AppV3 support and Plus transfer routing.')
