export const MORNING_ADHKAR=[
 {id:'morning-surahs',count:'3',ar:'سورة الإخلاص، سورة الفلق، سورة الناس — ثلاث مرات لكل سورة.',en:'Recite Al-Ikhlas, Al-Falaq and An-Nas three times each.'},
 {id:'morning-kingdom',count:'1',ar:'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',en:'We have entered the morning and all sovereignty belongs to Allah. Praise belongs to Allah. There is no god but Allah alone, without partner; His is the dominion and praise, and He has power over all things.'},
 {id:'morning-life',count:'1',ar:'اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.',en:'O Allah, by You we enter the morning and evening, by You we live and die, and to You is the resurrection.'},
 {id:'morning-content',count:'3',ar:'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.',en:'I am pleased with Allah as Lord, Islam as religion, and Muhammad ﷺ as Prophet.'},
 {id:'morning-trust',count:'7',ar:'حسبي الله لا إله إلا هو، عليه توكلت، وهو رب العرش العظيم.',en:'Allah is sufficient for me. There is no god but Him. In Him I trust, and He is Lord of the Mighty Throne.'},
 {id:'morning-tasbih',count:'100',ar:'سبحان الله وبحمده.',en:'Glory and praise be to Allah.'}
];

export const EVENING_ADHKAR=[
 {id:'evening-surahs',count:'3',ar:'سورة الإخلاص، سورة الفلق، سورة الناس — ثلاث مرات لكل سورة.',en:'Recite Al-Ikhlas, Al-Falaq and An-Nas three times each.'},
 {id:'evening-kingdom',count:'1',ar:'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',en:'We have entered the evening and all sovereignty belongs to Allah. Praise belongs to Allah. There is no god but Allah alone, without partner; His is the dominion and praise, and He has power over all things.'},
 {id:'evening-life',count:'1',ar:'اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.',en:'O Allah, by You we enter the evening and morning, by You we live and die, and to You is the return.'},
 {id:'evening-content',count:'3',ar:'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.',en:'I am pleased with Allah as Lord, Islam as religion, and Muhammad ﷺ as Prophet.'},
 {id:'evening-trust',count:'7',ar:'حسبي الله لا إله إلا هو، عليه توكلت، وهو رب العرش العظيم.',en:'Allah is sufficient for me. There is no god but Him. In Him I trust, and He is Lord of the Mighty Throne.'},
 {id:'evening-protection',count:'3',ar:'أعوذ بكلمات الله التامات من شر ما خلق.',en:'I seek refuge in the perfect words of Allah from the evil of what He created.'}
];

export function adhkarFor(kind){
 return kind==='evening'?EVENING_ADHKAR:MORNING_ADHKAR;
}
