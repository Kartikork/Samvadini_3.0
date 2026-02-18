import notifee, { 
  TriggerType, 
  RepeatFrequency, 
  AuthorizationStatus, 
  AndroidImportance, 
  AndroidColor 
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONFIGURATION ---
const CHANNEL_ID = 'boss-baby-channel';
const CHANNEL_NAME = 'Boss Baby Demands';

/**
 * 1. Initialize Permissions and Channel
 * Call this when the app starts (e.g., inside useEffect in App.js or Context)
 */
export async function initNotificationSystem() {
  const settings = await notifee.requestPermission();
  
  if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
    console.log('User declined permissions');
    return false;
  }

  // Create the channel
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: CHANNEL_NAME,
    lights: true,
    lightColor: AndroidColor.RED,
    vibration: true,
    importance: AndroidImportance.HIGH,
    sound: 'default', 
  });

  return true;
}

/**
 * 2. Helper: Get the next occurrence of a specific time
 * If 10:00 AM has passed today, it returns 10:00 AM tomorrow.
 */
function getNextTriggerTime(hour, minute = 0) {
  const now = new Date();
  const triggerDate = new Date();
  
  // Ensure minute is a valid number (defaults to 0)
  const mins = Number.isFinite(minute) ? minute : 0;

  triggerDate.setHours(hour);
  triggerDate.setMinutes(mins);
  triggerDate.setSeconds(0);
  triggerDate.setMilliseconds(0);

  // If the time has already passed today (or is effectively "now"), schedule for tomorrow
  // Add a tiny buffer (1s) to avoid scheduling something that is about to fire immediately
  if (isNaN(triggerDate.getTime()) || triggerDate.getTime() <= now.getTime() + 1000) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  return triggerDate.getTime();
} 

/**
 * 3. Schedule the "Big Three" Daily Routine
 * 10:00 AM, 2:00 PM, 6:00 PM
 */
// Helper: map character id -> notification text
const KEY_CHARACTER = 'pet_selected_character_v16';

async function getSelectedCharacterId() {
  try {
    const idStr = await AsyncStorage.getItem(KEY_CHARACTER);
    const id = idStr ? parseInt(idStr, 10) : 1;
    return isNaN(id) ? 1 : id;
  } catch (e) {
    console.warn('Failed to read selected character id, defaulting to 1', e);
    return 1;
  }
}

function getCharacterIconResourceName(id) {
  // Maps id to an Android drawable resource name you should add to android/app/src/main/res/drawable
  switch (id) {
    case 1: return 'boss_icon';
    case 2: return 'princess_icon';
    case 3: return 'rider_icon';
    case 4: return 'elephant_icon';
    case 5: return 'book_icon';
    case 6: return 'tree_icon';
    default: return 'boss_icon';
  }
}

function characterNotificationBundle(id) {
  switch (id) {
    case 1:
      return {
        morning: { title: '👶 Morning Briefing', body: '10:00 AM: Wake up! I need my breakfast bottle immediately.' },
        afternoon: { title: '👶 Nap Negotiation', body: '2:00 PM: I am feeling cranky. Put me down for a nap or else!' },
        evening: { title: '👶 End of Day Review', body: '6:00 PM: Dinner time. I expect mashed peas and quiet.' },
        iconResource: 'boss_icon'
      };
    case 5:
      return {
        morning: { title: '📚 Book Time', body: '10:00 AM: Let us read a story together — fetch my favorite book.' },
        afternoon: { title: '📖 Quiet Hour', body: '2:00 PM: Time for calm reading and page-turning adventures.' },
        evening: { title: '🌜 Night Chapter', body: '6:00 PM: Bedtime story now — tuck me in and read softly.' },
        iconResource: 'book_icon'
      };
    case 6:
      return {
        morning: { title: '🌳 Morning Breath', body: '10:00 AM: Let us step outside to smell the fresh leaves.' },
        afternoon: { title: '🌿 Shade Break', body: '2:00 PM: Relax under the tree—bring water and a snack.' },
        evening: { title: '🌙 Sleepy Grove', body: '6:00 PM: Quiet time in the grove — wind-down and rest.' },
        iconResource: 'tree_icon'
      };
    case 2:
      return {
        morning: { title: '👑 Princess Awakens', body: '10:00 AM: Prepare my royal tea and biscuits at once, peasant.' },
        afternoon: { title: '👑 Afternoon Demand', body: '2:00 PM: My playtime awaits—arrange my dolls and cushions.' },
        evening: { title: '👑 Evening Call', body: '6:00 PM: Lay out my gown and serve a light dinner.' },
        iconResource: 'princess_icon'
      };
    case 3:
      return {
        morning: { title: '🏍️ Rider Start', body: '10:00 AM: Charge the engine and hand me the helmet!' },
        afternoon: { title: '🏍️ Pit Stop', body: '2:00 PM: Time to refuel and check my tires.' },
        evening: { title: '🏁 Wrap Up', body: '6:00 PM: Park me nicely—I deserve a rest.' },
        iconResource: 'rider_icon'
      };
    case 4:
      return {
        morning: { title: '🐘 Gentle Giant', body: '10:00 AM: Bring me peanuts and a trunk rub.' },
        afternoon: { title: '🐘 Trunk Break', body: '2:00 PM: I demand a splash in the watering hole.' },
        evening: { title: '🐘 Bedtime Story', body: '6:00 PM: Quiet time—tell me a long, soothing tale.' },
        iconResource: 'elephant_icon'
      };
    default:
      return {
        morning: { title: '👶 Morning Briefing', body: '10:00 AM: Wake up! I need my breakfast bottle immediately.' },
        afternoon: { title: '👶 Nap Negotiation', body: '2:00 PM: I am feeling cranky. Put me down for a nap or else!' },
        evening: { title: '👶 End of Day Review', body: '6:00 PM: Dinner time. I expect mashed peas and quiet.' },
        iconResource: 'boss_icon'
      };
  }
}

export async function scheduleBossDailyRoutine() {
  // Clear existing routine notifications to avoid duplicates (be defensive to avoid throwing if APIs differ)
  try { await notifee.cancelNotification('boss-morning'); } catch (e) {}
  try { await notifee.cancelNotification('boss-afternoon'); } catch (e) {}
  try { await notifee.cancelNotification('boss-evening'); } catch (e) {}

  // If the platform exposes cancelTriggerNotification, try that too (some Notifee versions differentiate)
  if (typeof notifee.cancelTriggerNotification === 'function') {
    try { await notifee.cancelTriggerNotification('boss-morning'); } catch (e) {}
    try { await notifee.cancelTriggerNotification('boss-afternoon'); } catch (e) {}
    try { await notifee.cancelTriggerNotification('boss-evening'); } catch (e) {}
  }

  // get chosen character and messages
  const charId = await getSelectedCharacterId();
  const messages = characterNotificationBundle(charId);

  // compute timestamps explicitly (use correct hours/minutes)
  const morningTimestamp = getNextTriggerTime(10, 0);   // 10:00 AM
  const afternoonTimestamp = getNextTriggerTime(14, 0); // 2:00 PM
  const eveningTimestamp = getNextTriggerTime(18, 0);   // 6:00 PM

  // --- 10:00 AM ---
  await notifee.createTriggerNotification(
    {
      id: 'boss-morning',
      title: messages.morning.title,
      body: messages.morning.body,
      data: { bossBaby: '1' },
      android: { channelId: CHANNEL_ID, smallIcon: 'ic_launcher', largeIcon: getCharacterIconResourceName(charId), pressAction: { id: 'default', launchActivity: 'default' } },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: morningTimestamp,
      repeatFrequency: RepeatFrequency.DAILY,
    }
  );
  console.debug('[BossBaby] Scheduled morning at', new Date(morningTimestamp).toISOString());

  // --- 2:00 PM ---
  await notifee.createTriggerNotification(
    {
      id: 'boss-afternoon',
      title: messages.afternoon.title,
      body: messages.afternoon.body,
      data: { bossBaby: '1' },
      android: { channelId: CHANNEL_ID, smallIcon: 'ic_launcher', largeIcon: getCharacterIconResourceName(charId) },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: afternoonTimestamp,
      repeatFrequency: RepeatFrequency.DAILY,
    }
  );
  console.debug('[BossBaby] Scheduled afternoon at', new Date(afternoonTimestamp).toISOString());

  // --- 6:00 PM ---
  await notifee.createTriggerNotification(
    {
      id: 'boss-evening',
      title: messages.evening.title,
      body: messages.evening.body,
      data: { bossBaby: '1' },
      android: { channelId: CHANNEL_ID, smallIcon: 'ic_launcher', largeIcon: getCharacterIconResourceName(charId) },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: eveningTimestamp,
      repeatFrequency: RepeatFrequency.DAILY,
    }
  );
  console.debug('[BossBaby] Scheduled evening at', new Date(eveningTimestamp).toISOString());

  console.log('Boss Baby Routine Scheduled (10am, 2pm, 6pm) for character', charId);
}

/**
 * 4. Custom Reminder Function
 * @param {Date} dateObj - The JS Date object when you want the reminder
 * @param {string} message - The body text
 */
export async function scheduleCustomBossReminder(dateObj, message) {
  if (dateObj.getTime() <= Date.now()) {
    console.warn('Cannot schedule Boss Baby reminder in the past.');
    return;
  }

  const charId = await getSelectedCharacterId();
  const messages = characterNotificationBundle(charId);
  // Use a short prefix from morning message icon/title
  const titlePrefix = messages.morning.title.split(' ')[0] || '👶';

  await notifee.createTriggerNotification(
    {
      title: `${titlePrefix} Urgent Memo`,
      body: message,
      data: { bossBaby: '1' },
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: dateObj.getTime(),
      // No repeatFrequency means it runs once
    }
  );
  
  console.log(`Custom reminder set for ${dateObj.toLocaleTimeString()} (char ${charId})`);
}

/**
 * 5. Debugging: Cancel all notifications
 */
export async function cancelAllBossNotifications() {
  await notifee.cancelAllNotifications();
  console.log('All Boss Baby notifications cancelled.');
}