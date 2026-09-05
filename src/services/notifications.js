
import * as Notifications from "expo-notifications";

export async function requestNotificationPermission(){
  const r=await Notifications.requestPermissionsAsync();
  return r.granted || r.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function schedulePrayerReminder({title,body,date,sound=null}){
  return Notifications.scheduleNotificationAsync({
    content:{title,body,sound:sound||"default"},
    trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date}
  });
}

export async function scheduleEventEve({eventTitle,date}){
  return Notifications.scheduleNotificationAsync({
    content:{title:`غدًا ${eventTitle}`,body:"افتح التقويم لمشاهدة التفاصيل.",sound:"default"},
    trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date}
  });
}
