import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import notifee, { EventType } from '@notifee/react-native';
import { 
  initNotificationSystem, 
  scheduleBossDailyRoutine,
  cancelAllBossNotifications // Ensure this is exported in your Handler file
} from './BossBabyNotificationHandler';

const BossBabyContext = createContext();

export const useBossBaby = () => useContext(BossBabyContext);

export const BossBabyProvider = ({ children }) => {
  // --- STATE ---
  const [isBossBabyEnabled, setIsBossBabyEnabled] = useState(true); // Default to true
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isHeaderIconHidden, setIsHeaderIconHidden] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState(1); // 1..4 per characters list
  const KEY_CHARACTER = 'pet_selected_character_v16';

  // --- WIDGET CONTROLS ---
  const triggerWidget = useCallback((msg) => {
    // Only trigger if enabled
    if (!isBossBabyEnabled) return;

    // Small delay to ensure the UI is ready if booting from a cold start
    setTimeout(() => {
        setMessage(msg);
        setIsVisible(true);
        setIsHeaderIconHidden(false); 
    }, 500);
  }, [isBossBabyEnabled]);

  const dismissWidget = useCallback(() => {
    setIsVisible(false);
    setMessage('');
    setIsHeaderIconHidden(false); 
  }, []);

  const hideHeaderIcon = useCallback(() => {
    setIsHeaderIconHidden(true);
  }, []);

  const showHeaderIcon = useCallback(() => {
    setIsHeaderIconHidden(false);
  }, []);

  // --- TOGGLE FEATURE (NEW) ---
  const toggleBossMode = async (shouldEnable) => {
    try {
      // 1. Update State
      setIsBossBabyEnabled(shouldEnable);
      
      // 2. Persist to Storage
      await AsyncStorage.setItem('BOSS_BABY_ENABLED', String(shouldEnable));

      // 3. Handle Notification System
      if (shouldEnable) {
        console.log('👶 Boss Baby Enabled: Initializing system...');
        const hasPerms = await initNotificationSystem();
        if (hasPerms) {
          await scheduleBossDailyRoutine();
        }
      } else {
        console.log('👶 Boss Baby Disabled: Cancelling all notifications...');
        await cancelAllBossNotifications();
        dismissWidget(); // Close widget if currently open
      }
    } catch (error) {
      console.error('Error toggling Boss Baby mode:', error);
    }
  };

  // Allow app to change selected character and persist
  const setSelectedCharacter = useCallback(async (id) => {
    try {
      const newId = Number(id) || 1;
      setSelectedCharacterId(newId);
      await AsyncStorage.setItem(KEY_CHARACTER, newId.toString());
      // Reschedule notifications for the new character
      if (isBossBabyEnabled) {
        await scheduleBossDailyRoutine();
      }
    } catch (e) {
      console.error('Failed to set selected character', e);
    }
  }, [isBossBabyEnabled]);

  // --- INITIALIZATION & LISTENER LOGIC ---
  useEffect(() => {
    let unsubscribeForeground = () => {};

    const initialize = async () => {
      try {
        // 1. Load User Preference
        const storedSetting = await AsyncStorage.getItem('BOSS_BABY_ENABLED');
        // Default to true if null (first run), otherwise parse string 'true'/'false'
        const isEnabled = storedSetting === null ? true : storedSetting === 'true';
        
        setIsBossBabyEnabled(isEnabled);

        // 2. If Disabled, ensure everything is clean and stop here
        if (!isEnabled) {
          await cancelAllBossNotifications();
          return; 
        }

        // 3. If Enabled, Setup System
        const hasPerms = await initNotificationSystem();
        if (hasPerms) {
          await scheduleBossDailyRoutine();
        }

        // 4. CHECK: Cold Start (App opened from dead state via notification)
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification) {
          console.log('App opened from KILLED state via notification');
          // Only trigger Boss Baby widget for Boss Baby channel notifications or explicit bossBaby flag
          const channelId = initialNotification.notification?.android?.channelId;
          const isBossBabyFlag = initialNotification.notification?.data?.bossBaby === '1';
          if (channelId === 'boss-baby-channel' || isBossBabyFlag) {
            triggerWidget(initialNotification.notification.body);
          } else {
            console.log('Ignored initial notification as it is not a Boss Baby notification', channelId, initialNotification.notification?.data);
          }
        }

        // 5. LISTEN: Foreground/Background events
        unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }) => {
          if (type === EventType.PRESS) {
            console.log('User tapped notification (Foreground/Minimized)');
            if (detail.notification) {
              // Only trigger Boss Baby widget for Boss Baby channel notifications or explicit bossBaby flag
              const channelId = detail.notification?.android?.channelId;
              const isBossBabyFlag = detail.notification?.data?.bossBaby === '1';
              if (channelId === 'boss-baby-channel' || isBossBabyFlag) {
                triggerWidget(detail.notification.body);
              } else {
                console.log('Ignored notification press - not Boss Baby channel', channelId, detail.notification?.data);
              }
            }
          }
        });

      } catch (error) {
        console.error('Boss Baby Init Error:', error);
      }
    };

    initialize();

    // Also read selected character from storage so UI can react immediately
    (async () => {
      try {
        const idStr = await AsyncStorage.getItem(KEY_CHARACTER);
        const id = idStr ? parseInt(idStr, 10) : 1;
        setSelectedCharacterId(isNaN(id) ? 1 : id);
      } catch (e) {
        // ignore
      }
    })();

    // Cleanup listener on unmount
    return () => {
      unsubscribeForeground();
    };
  }, [triggerWidget]); // Dependencies

  return (
    <BossBabyContext.Provider value={{ 
      isBossBabyEnabled, // Exposed for UI to show correct toggle state
      toggleBossMode,    // Exposed to change state
      isVisible, 
      message, 
      triggerWidget, 
      dismissWidget,
      isHeaderIconHidden, 
      hideHeaderIcon,
      showHeaderIcon,
      selectedCharacterId,
      setSelectedCharacter
    }}>
      {children}
    </BossBabyContext.Provider>
  );
};