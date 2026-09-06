export const LOCALES=[
 ['system','لغة الجهاز','system','rtl'],['ar','العربية','ar-IQ','rtl'],['en-US','English (United States)','en-US','ltr'],['en-GB','English (United Kingdom)','en-GB','ltr'],['en-AU','English (Australia)','en-AU','ltr'],
 ['tr','Türkçe','tr-TR','ltr'],['ru','Русский','ru-RU','ltr'],['fr','Français','fr-FR','ltr'],['de','Deutsch','de-DE','ltr'],['es','Español','es-ES','ltr'],['it','Italiano','it-IT','ltr'],
 ['pt-BR','Português (Brasil)','pt-BR','ltr'],['pt-PT','Português (Portugal)','pt-PT','ltr'],['fa','فارسی','fa-IR','rtl'],['ku','کوردی','ku-Arab-IQ','rtl'],['ur','اردو','ur-PK','rtl'],
 ['hi','हिन्दी','hi-IN','ltr'],['bn','বাংলা','bn-BD','ltr'],['pa','ਪੰਜਾਬੀ','pa-IN','ltr'],['zh-CN','简体中文','zh-CN','ltr'],['zh-TW','繁體中文','zh-TW','ltr'],
 ['ja','日本語','ja-JP','ltr'],['ko','한국어','ko-KR','ltr'],['id','Bahasa Indonesia','id-ID','ltr'],['ms','Bahasa Melayu','ms-MY','ltr'],['th','ไทย','th-TH','ltr'],
 ['vi','Tiếng Việt','vi-VN','ltr'],['fil','Filipino','fil-PH','ltr'],['sw','Kiswahili','sw-KE','ltr'],['am','አማርኛ','am-ET','ltr'],['ha','Hausa','ha-NG','ltr'],
 ['so','Soomaali','so-SO','ltr'],['nl','Nederlands','nl-NL','ltr'],['pl','Polski','pl-PL','ltr'],['uk','Українська','uk-UA','ltr'],['ro','Română','ro-RO','ltr'],
 ['el','Ελληνικά','el-GR','ltr'],['sv','Svenska','sv-SE','ltr'],['no','Norsk','nb-NO','ltr'],['da','Dansk','da-DK','ltr'],['fi','Suomi','fi-FI','ltr'],
 ['cs','Čeština','cs-CZ','ltr'],['hu','Magyar','hu-HU','ltr'],['he','עברית','he-IL','rtl']
];
export const localeMeta=id=>LOCALES.find(([key])=>key===id)||LOCALES[0];
export const localeTag=id=>localeMeta(id)[2];
export const localeDirection=id=>localeMeta(id)[3];
export const isRtlLocale=id=>localeDirection(id)==='rtl';
