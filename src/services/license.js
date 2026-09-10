import AsyncStorage from '@react-native-async-storage/async-storage';

const LICENSE_API_URL=(process.env.EXPO_PUBLIC_LICENSE_API_URL||'').replace(/\/$/,'');
const OFFICIAL_PORTAL_URL=process.env.EXPO_PUBLIC_OFFICIAL_PORTAL_URL||'';
const ENFORCEMENT_REQUIRED=process.env.EXPO_PUBLIC_LICENSE_ENFORCEMENT==='required';
const INSTALL_ID_KEY='alofok_install_id_v1';
const LICENSE_TOKEN_KEY='alofok_license_token_v1';
const PACKAGE_ID='com.alofok.trial';

function randomPart(){return Math.floor(Math.random()*0x100000000).toString(16).padStart(8,'0')}
function newInstallId(){return `afk-${Date.now().toString(36)}-${randomPart()}${randomPart()}${randomPart()}`}

export async function getInstallId(){
  let id=await AsyncStorage.getItem(INSTALL_ID_KEY);
  if(!id){id=newInstallId();await AsyncStorage.setItem(INSTALL_ID_KEY,id)}
  return id;
}

export function extractActivationToken(url){
  if(!url)return null;
  try{
    const match=String(url).match(/[?&]token=([^&#]+)/i);
    return match?decodeURIComponent(match[1]):null;
  }catch{return null}
}

async function postJson(path,body){
  const response=await fetch(`${LICENSE_API_URL}${path}`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
    body:JSON.stringify(body)
  });
  if(!response.ok)throw new Error(`LICENSE_HTTP_${response.status}`);
  return response.json();
}

export async function activateOfficialInstall({activationToken,appVersion,appVariant}){
  if(!activationToken)return {valid:false,reason:'missing_activation_token'};
  if(!LICENSE_API_URL)return ENFORCEMENT_REQUIRED?{valid:false,reason:'license_service_not_configured'}:{valid:true,tier:appVariant==='paid'?'plus':'trial',developmentBypass:true};
  const installId=await getInstallId();
  const data=await postJson('/v1/install/activate',{
    activationToken,
    installId,
    packageId:PACKAGE_ID,
    appVersion,
    appVariant
  });
  if(!data?.valid||!data?.licenseToken)return {valid:false,reason:data?.reason||'activation_rejected'};
  await AsyncStorage.setItem(LICENSE_TOKEN_KEY,String(data.licenseToken));
  return {valid:true,tier:data.tier==='plus'?'plus':'trial',expiresAt:data.expiresAt||null};
}

export async function verifyEntitlement({appVersion,appVariant}){
  if(!LICENSE_API_URL){
    if(ENFORCEMENT_REQUIRED)return {valid:false,reason:'license_service_not_configured'};
    return {valid:true,tier:appVariant==='paid'?'plus':'trial',developmentBypass:true};
  }
  const installId=await getInstallId();
  const licenseToken=await AsyncStorage.getItem(LICENSE_TOKEN_KEY);
  if(!licenseToken)return {valid:false,reason:'official_activation_required'};
  try{
    const data=await postJson('/v1/license/verify',{
      licenseToken,
      installId,
      packageId:PACKAGE_ID,
      appVersion,
      appVariant
    });
    if(!data?.valid)return {valid:false,reason:data?.reason||'license_rejected'};
    return {valid:true,tier:data.tier==='plus'?'plus':'trial',expiresAt:data.expiresAt||null};
  }catch(error){
    return {valid:false,reason:'license_service_unavailable',error:String(error?.message||error)};
  }
}

export async function getOfficialActivationUrl(){
  if(!OFFICIAL_PORTAL_URL)return null;
  const installId=await getInstallId();
  const separator=OFFICIAL_PORTAL_URL.includes('?')?'&':'?';
  return `${OFFICIAL_PORTAL_URL}${separator}install_id=${encodeURIComponent(installId)}&package=${encodeURIComponent(PACKAGE_ID)}`;
}

export async function clearLocalLicense(){
  await AsyncStorage.removeItem(LICENSE_TOKEN_KEY);
}

export const licenseConfig={enforcementRequired:ENFORCEMENT_REQUIRED,packageId:PACKAGE_ID};
