const path = require('path');

let upstreamTransformer;
try {
  upstreamTransformer = require('@expo/metro-config/babel-transformer');
} catch (error) {
  // Expo 54 may keep @expo/metro-config nested under the expo package.
  // Load that exact bundled transformer by absolute path so Metro works in
  // clean Android release builds without adding a duplicate dependency.
  upstreamTransformer = require(
    path.join(__dirname, 'node_modules', 'expo', 'node_modules', '@expo', 'metro-config', 'babel-transformer')
  );
}

const APP_FILE = /(?:^|[\\/])App\.js$/;

function patchAppSource(source) {
  let src = source;

  const atlasDecl = "const THEME_ATLAS=require('./assets/themes/alofok-plus-theme-atlas-v1.jpg');";
  const standaloneDecl = "const JUMADA2_THEME=require('./assets/themes/jumada2-early-summer.jpg');";
  if (!src.includes(standaloneDecl)) {
    if (!src.includes(atlasDecl)) throw new Error('Al-Ufuq theme patch: atlas declaration not found');
    src = src.replace(atlasDecl, `${atlasDecl}\n${standaloneDecl}`);
  }

  const backgroundNeedle = "function AtlasThemeBackground({index}){\n const safe=Math.max(0,Math.min(27,Number(index)||0));\n";
  const backgroundReplacement = `${backgroundNeedle} if(safe===12)return <Image pointerEvents='none' source={JUMADA2_THEME} resizeMode='cover' style={StyleSheet.absoluteFillObject}/>;\n`;
  if (!src.includes("if(safe===12)return <Image pointerEvents='none' source={JUMADA2_THEME}")) {
    if (!src.includes(backgroundNeedle)) throw new Error('Al-Ufuq theme patch: background hook not found');
    src = src.replace(backgroundNeedle, backgroundReplacement);
  }

  const previewNeedle = "function AtlasThemePreview({index}){\n const [frame,setFrame]=useState({width:160,height:108});\n const safe=Math.max(0,Math.min(27,Number(index)||0));\n";
  const previewReplacement = `${previewNeedle} if(safe===12)return <Image pointerEvents='none' source={JUMADA2_THEME} resizeMode='cover' style={StyleSheet.absoluteFillObject}/>;\n`;
  if (!src.includes("function AtlasThemePreview({index}){\n const [frame,setFrame]=useState({width:160,height:108});\n const safe=Math.max(0,Math.min(27,Number(index)||0));\n if(safe===12)")) {
    if (!src.includes(previewNeedle)) throw new Error('Al-Ufuq theme patch: preview hook not found');
    src = src.replace(previewNeedle, previewReplacement);
  }

  return src;
}

module.exports.transform = async function transform({ src, filename, options }) {
  const nextSource = APP_FILE.test(filename) ? patchAppSource(src) : src;
  return upstreamTransformer.transform({ src: nextSource, filename, options });
};
