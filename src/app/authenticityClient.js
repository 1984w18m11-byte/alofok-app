import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALLATION_KEY='alofok_auth_installation_v1';
const AUTH_API_BASE=(process.env.EXPO_PUBLIC_AUTH_API_URL||'').replace(/\/$/,'');
const AUTH_VERIFY_WEB=(process.env.EXPO_PUBLIC_AUTH_VERIFY_URL||'').replace(/\/$/,'');

function randomSegment(){
 return Math.random().toString(36).slice(2,10).toUpperCase();
}

export async function getAuthenticityInstallationId(){
 let current=await AsyncStorage.getItem(INSTALLATION_KEY);
 if(current)return current;
 current=`AFK-${Date.now().toString(36).toUpperCase()}-${randomSegment()}-${randomSegment()}`;
 await AsyncStorage.setItem(INSTALLATION_KEY,current);
 return current;
}

export function authenticityConfig(){
 return {
  apiBase:AUTH_API_BASE,
  verifyWeb:AUTH_VERIFY_WEB,
  configured:Boolean(AUTH_API_BASE)
 };
}

export async function requestAuthenticityChallenge({edition,version}){
 const installationId=await getAuthenticityInstallationId();
 if(!AUTH_API_BASE){
  return {configured:false,installationId,edition,version};
 }
 const response=await fetch(`${AUTH_API_BASE}/v1/authenticity/challenge`,{
  method:'POST',
  headers:{'Content-Type':'application/json','Accept':'application/json'},
  body:JSON.stringify({app:'Al-Ufuq',edition,version,installationId})
 });
 if(!response.ok)throw new Error(`AUTH_HTTP_${response.status}`);
 const data=await response.json();
 const token=String(data.token||'').trim();
 if(!token)throw new Error('AUTH_TOKEN_MISSING');
 const verifyUrl=String(data.verifyUrl||'').trim()||(
  AUTH_VERIFY_WEB?`${AUTH_VERIFY_WEB}?code=${encodeURIComponent(token)}`:''
 );
 return {
  configured:true,
  token,
  verifyUrl,
  expiresAt:data.expiresAt||null,
  installationId,
  edition,
  version
 };
}
