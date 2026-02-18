import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  Switch,
  Alert,
  AppState,
  TouchableOpacity
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useBossBaby } from './BossBabyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CharacterSelectionScreen from './CharacterSelectionScreen';
import KitchenScreen from './KitchenScreen';
import BathroomScreen from './BathroomScreen';
import BedroomScreen from './BedroomScreen';
import PlayroomScreen from './PlayroomScreen';
import RiderFeedScreen from './RiderFeedScreen';
import BikeWashScreen from './BikeWashScreen';
import RiderPlayScreen from './Riderplayscreen';
import BikeServiceScreen from './BikeServiceScreen';
import ElephantFeedScreen from './ElephantFeedScreen';
// import ElephantWashScreen from './ElephantWashScreen';
import ElephantPlayScreen from './ElephantPlayScreen';
import TreeFeedScreen from './TreeFeedScreen';
import TreePlayScreen from './TreePlayScreen';
import TreeSleepScreen from './TreeSleepScreen';
import TreeCleanScreen from './TreeCleanScreen';

const { width, height } = Dimensions.get('window');

const SCHEDULES = {
  feed: [8.5, 14, 19],
  play: [11, 16],
  sleep: [21],
  clean: [8],
  service: [10],
};

const KEY_STATUS = 'pet_status_v16';
const KEY_RESETS = 'pet_resets_v16';
const KEY_COINS = 'snakeGameTotalCoins';
const KEY_CHARACTER = 'pet_selected_character_v16';
const KEY_CHARACTER_FEED_PROGRESS_PREFIX = 'pet_char_feed_progress_';

const ACTION_WINDOW_MS = 5 * 60 * 1000;

const CHARACTERS = [
  {
    id: 1,
    name: 'Boss Baby',
    icon: 'tie',
    gradient: ['#f093fb', '#f5576c'],
    image: require('./baby_indian_figure.png'),
    bathImage: require('./Bath/boy.png'),
    sleepImageOpen: require('./sleep/b_open.png'),
    sleepImageClosed: require('./sleep/b_close.png'),
    actionGradients: {
      play: ['#11998e', '#38ef7d'],
      feed: ['#ff6b6b', '#ee5a6f'],
      clean: ['#4facfe', '#00f2fe'],
      sleep: ['#a8edea', '#fed6e3'],
    },
    actionIcons: {
      play: 'emoticon-happy-outline',
      feed: 'food-apple',
      clean: 'shower',
      sleep: 'weather-night',
    }
  },
  {
    id: 2,
    name: 'Princess',
    icon: 'crown',
    gradient: ['#4facfe', '#00f2fe'],
    image: require('./princess.png'),
    bathImage: require('./princess.png'),
    sleepImageOpen: require('./princess_eyes_open.png'),
    sleepImageClosed: require('./princess_eyes_closed.png'),
    actionGradients: {
      play: ['#ffafbd', '#ffc3a0'],
      feed: ['#a1c4fd', '#c2e9fb'],
      clean: ['#d4fc79', '#96e6a1'],
      sleep: ['#fad0c4', '#ffd1ff'],
    },
    actionIcons: {
      play: 'crown',
      feed: 'cake',
      clean: 'bathtub',
      sleep: 'moon-waning-crescent',
    }
  },
  {
    id: 3,
    name: 'Rider',
    icon: 'motorbike',
    gradient: ['#43e97b', '#38f9d7'],
    image: require('./rider.png'),
    bathImage: require('./Bath/rider.png'),
    sleepImageOpen: require('./sleep/r_open.png'),
    sleepImageClosed: require('./sleep/r_close.png'),
    actionGradients: {
      play: ['#f6d365', '#fda085'],
      feed: ['#a3bbf3', '#8e7cef'],
      clean: ['#f093fb', '#f5576c'],
      sleep: ['#f1c40f', '#e67e22'], // Service gradient
    },
    actionIcons: {
      play: 'motorbike',
      feed: 'pizza',
      clean: 'car-wash',
      sleep: 'wrench-outline', // Service icon
    }
  },
  {
    id: 4,
    name: 'Elephant',
    icon: 'elephant',
    gradient: ['#a18cd1', '#fbc2eb'],
    image: require('./elephant.png'),
    bathImage: require('./Bath/elephant.png'),
    sleepImageOpen: require('./sleep/e_open.png'),
    sleepImageClosed: require('./sleep/e_close.png'),
    actionGradients: {
      play: ['#c4c4c4', '#e8e8e8'],
      feed: ['#83a4d4', '#ba56e3'],
      clean: ['#fddb92', '#d1fdff'],
      sleep: ['#b3ffab', '#12fff7'],
    },
    actionIcons: {
      play: 'ballot',
      feed: 'leaf',
      clean: 'spray-bottle', // <--- UPDATED: Specific icon for elephant wash
      sleep: 'bed',
    }
  },
  {
    id: 5,
    name: 'Book',
    icon: 'book-open-variant',
    gradient: ['#a18cd1', '#fbc2eb'],
    image: require('./book.png'),
    bathImage: require('./Bath/book.png'),
    sleepImageOpen: require('./sleep/bb_open.png'),
    sleepImageClosed: require('./sleep/bb_close.png'),
    actionGradients: {
      play: ['#c79081', '#dfa579'],
      feed: ['#ffecd2', '#fcb69f'],
      clean: ['#cfd9ed', '#e2e2e2'],
      sleep: ['#a8edea', '#fed6e3'],
    },
    actionIcons: {
      play: 'book-open-variant',
      feed: 'food-fork-drink',
      clean: 'pencil-box-multiple',
      sleep: 'sleep',
    }
  },
  {
    id: 6,
    name: 'Tree',
    icon: 'tree',
    gradient: ['#134e5e', '#71b280'],
    image: require('./tree.png'),
    bathImage: require('./Bath/tree.png'),
    sleepImageOpen: require('./sleep/t_open.png'),
    sleepImageClosed: require('./sleep/t_close.png'),
    actionGradients: {
      play: ['#43e97b', '#38f9d7'],
      feed: ['#6a9113', '#11998e'],
      clean: ['#00b09b', '#96c93d'],
      sleep: ['#3a7bd5', '#3a6073'],
    },
    actionIcons: {
      play: 'flower',
      feed: 'nutrition',
      clean: 'recycle',
      sleep: 'moon-full',
    }
  },
];
const App = () => {

  const [taskStatus, setTaskStatus] = useState({ feed: 1, play: 1, sleep: 1, clean: 1 });
  const [lastResetTimes, setLastResetTimes] = useState({ feed: 0, play: 0, sleep: 0, clean: 0 });
  const [elephantCurrentFeedProgress, setElephantCurrentFeedProgress] = useState(0); // NEW STATE: For Elephant's specific feed progress
  const [treeCurrentFeedProgress, setTreeCurrentFeedProgress] = useState(0); // NEW STATE: For Tree's specific feed progress


  const taskStatusRef = useRef(taskStatus);
  const lastResetTimesRef = useRef(lastResetTimes);

  useEffect(() => { taskStatusRef.current = taskStatus; }, [taskStatus]);
  useEffect(() => { lastResetTimesRef.current = lastResetTimes; }, [lastResetTimes]);

  const [coins, setCoins] = useState(0);
  const [inventory, setInventory] = useState({ 1: 5, 2: 3, 3: 10, 4: 15 });
  const [expression, setExpression] = useState('happy');
  const [particles, setParticles] = useState([]);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0]);
  const [currentScreen, setCurrentScreen] = useState('living');

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const [slapHandVisible, setSlapHandVisible] = useState(false);
  const appState = useRef(AppState.currentState);
  // const { isBossBabyEnabled, toggleBossMode, setSelectedCharacter: setGlobalSelectedCharacter } = useBossBaby();

  useEffect(() => {
    const loadGameData = async () => {
      try {
        const savedCoins = await AsyncStorage.getItem(KEY_COINS);
        if (savedCoins) {
          // Parse savedCoins as a string, then convert to integer
          setCoins(parseInt(JSON.parse(savedCoins), 10));
        } else {
          // If no coins are saved, set default 5000 coins and persist as stringified JSON
          setCoins(5000);
          await AsyncStorage.setItem(KEY_COINS, JSON.stringify(5000));
        }

        const savedStatus = await AsyncStorage.getItem(KEY_STATUS);
        if (savedStatus) setTaskStatus(JSON.parse(savedStatus));

        const savedResets = await AsyncStorage.getItem(KEY_RESETS);
        if (savedResets) setLastResetTimes(JSON.parse(savedResets));

        const savedCharId = await AsyncStorage.getItem(KEY_CHARACTER);
        if (savedCharId) {
          const id = parseInt(savedCharId, 10);
          const loadedChar = CHARACTERS.find(c => c.id === id);
          if (loadedChar) {
            setSelectedCharacter(loadedChar);
            // Load character-specific feed progress for the loaded character
            const savedCharFeedProgress = await AsyncStorage.getItem(`${KEY_CHARACTER_FEED_PROGRESS_PREFIX}${id}`);
            const feedProgress = savedCharFeedProgress ? parseInt(savedCharFeedProgress, 10) : 0;
            console.log(`Loading character ${loadedChar.name} (ID: ${id}) with feed progress:`, feedProgress);
            setElephantCurrentFeedProgress(feedProgress);
            setTreeCurrentFeedProgress(feedProgress);

          }
        }

        setIsDataLoaded(true);
      } catch (error) {
        console.log('Error loading data:', error);
      }
    };
    loadGameData();
  }, []);

  const checkTime = useCallback(async () => {
    if (!isDataLoaded) return;

    const now = new Date();
    const currentTimestamp = now.getTime();

    let newStatus = { ...taskStatusRef.current };
    let newResets = { ...lastResetTimesRef.current };
    let stateChanged = false;

    // Added 'service' to the loop if you introduce a separate schedule/status for it
    ['feed', 'play', 'sleep', 'clean'].forEach(task => { // Add 'service' here if you make it a general task
      const scheduleHours = SCHEDULES[task];
      const lastReset = newResets[task] || 0;

      if (lastReset > currentTimestamp + 60000) { // Safety check for future dates
        newResets[task] = 0;
        stateChanged = true;
        return;
      }

      scheduleHours.forEach(hour => {
        const scheduleDate = new Date();
        const h = Math.floor(hour);
        const m = Math.floor((hour - h) * 60);
        scheduleDate.setHours(h, m, 0, 0);

        const scheduleTimestamp = scheduleDate.getTime();

        if (currentTimestamp >= scheduleTimestamp) {
          if (lastReset < scheduleTimestamp) {
            const diff = currentTimestamp - scheduleTimestamp;
            if (diff < ACTION_WINDOW_MS) {
              newStatus[task] = 0;
              stateChanged = true;
            }
            if (scheduleTimestamp > (newResets[task] || 0)) {
              newResets[task] = scheduleTimestamp;
              stateChanged = true;
            }
          }
        }
      });
    });

    if (stateChanged) {
      setTaskStatus(newStatus);
      setLastResetTimes(newResets);
      await AsyncStorage.setItem(KEY_STATUS, JSON.stringify(newStatus));
      await AsyncStorage.setItem(KEY_RESETS, JSON.stringify(newResets));
    }

  }, [isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    checkTime();
    const interval = setInterval(checkTime, 3000);
    return () => clearInterval(interval);
  }, [isDataLoaded, checkTime]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkTime();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [checkTime]);

  const updateGlobalCoins = async (amount) => {
    const newCoins = coins + amount;
    setCoins(newCoins);
    // Persist coins as a stringified JSON
    await AsyncStorage.setItem(KEY_COINS, JSON.stringify(newCoins));
  };

  const saveStatus = async (newStatus) => {
    setTaskStatus(newStatus);
    await AsyncStorage.setItem(KEY_STATUS, JSON.stringify(newStatus));
  };

  const handleKitchenFeed = async (foodItem) => {
    await updateGlobalCoins(foodItem.reward); // Changed from -cost to +reward
    setInventory(prev => ({ ...prev, [foodItem.id]: prev[foodItem.id] - 1 }));
    await saveStatus({ ...taskStatus, feed: 1 });
    createParticles('feed');
    // setTimeout(() => setCurrentScreen('living'), 500); // Removed to allow continuous feeding
  };

  

  const handleTreeFeedLevelCompleted = async (feedDetails) => {
    // Update tree feed progress in parent state
    setTreeCurrentFeedProgress(feedDetails.newFeedProgress);
    await AsyncStorage.setItem(`${KEY_CHARACTER_FEED_PROGRESS_PREFIX}${selectedCharacter.id}`, feedDetails.newFeedProgress.toString());

    if (feedDetails.feedLevelCompleted) {
      await saveStatus({ ...taskStatus, feed: 1 }); // Mark general feed task as complete for the character
      createParticles('tree_feed'); // Specific particle type for tree
      Alert.alert("Level Up!", `${selectedCharacter.name} is fully watered!`,
        [{
          text: "Awesome!",
          onPress: () => setCurrentScreen('living')
        }]
      );
    }
  };

  const handleRiderFeedFinished = async (feedDetails) => {
    await updateGlobalCoins(feedDetails.coinsEarned); // Changed from -coinsSpent to +coinsEarned
    await saveStatus({ ...taskStatus, feed: feedDetails.finalFuelLevel });
    createParticles('feed');
    setTimeout(() => setCurrentScreen('living'), 500);
  };

  const handleBikeWashFinished = async (amount = 1) => {
    await saveStatus({ ...taskStatus, clean: amount });
    await updateGlobalCoins(50);
    createParticles('clean');
    setTimeout(() => setCurrentScreen('living'), 500);
  };

  const handleElephantFeedLevelCompleted = async (feedDetails) => {
    // Coins provide visual updates in ElephantFeedScreen and are persisted via onCoinDeduction callback.
    // So we don't need to update coins here.

    // Always update feed progress in parent state
    setElephantCurrentFeedProgress(feedDetails.newFeedProgress);
    await AsyncStorage.setItem(`${KEY_CHARACTER_FEED_PROGRESS_PREFIX}${selectedCharacter.id}`, feedDetails.newFeedProgress.toString());


    if (feedDetails.feedLevelCompleted) {
      await saveStatus({ ...taskStatus, feed: 1 }); // Mark general feed task as complete for the character
      createParticles('elephant_feed'); // Specific particle type for elephant
      Alert.alert("Level Up!", `${selectedCharacter.name} reached a new Feed Level!`,
        [{
          text: "Awesome!",
          onPress: () => setCurrentScreen('living') // <--- ADDED THIS LINE
        }]
      );
    }
  };

  // NEW: handleElephantWashFinished
  const handleElephantWashFinished = async (amount = 1) => {
    await saveStatus({ ...taskStatus, clean: amount });
    await updateGlobalCoins(75); // Award some coins for washing
    createParticles('elephant_wash'); // Use a specific particle type
    setTimeout(() => setCurrentScreen('living'), 500);
  };

  const handleServiceFinished = async () => {
    await saveStatus({ ...taskStatus, sleep: 1 }); // We are re-using 'sleep' status for now
    await updateGlobalCoins(100); // Example: Earn more coins for service
    createParticles('service'); // You might want a distinct 'service' particle effect
    setTimeout(() => setCurrentScreen('living'), 500);
  };

  const handleCleanFinished = async (amount = 0.5) => {
    const currentClean = taskStatus.clean || 0;
    const newLevel = Math.min(1, currentClean + amount);
    await saveStatus({ ...taskStatus, clean: newLevel });
    await updateGlobalCoins(25);
    createParticles('toilet');
  };

  const handleSleepFinished = async () => {
    await saveStatus({ ...taskStatus, sleep: 1 });
    await updateGlobalCoins(75);
    createParticles('sleep');
    setTimeout(() => setCurrentScreen('living'), 500);
  };

  const handleTreeCleanFinished = async () => {
    await saveStatus({ ...taskStatus, clean: 1 });
    await updateGlobalCoins(60);
    createParticles('tree_clean');
    setTimeout(() => setCurrentScreen('living'), 500);
  };

  
  const handleToggleSwitch = (value) => {
    if (!value) {
      Alert.alert(
        "Disable Notifications?",
        "I will stop sending you demands and disappear from the header.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Disable", onPress: () => toggleBossMode(false) }
        ]
      );
    } else {
      toggleBossMode(true);
    }
  };

  const createParticles = (type) => {
    const newParticles = [];
    for (let i = 0; i < 5; i++) {
      let icon = '✨'; // Default
      if (type === 'feed') icon = '🍎';
      else if (type === 'elephant_feed') icon = '🌿'; // Specific particle for elephant feed
      else if (type === 'tree_feed') icon = '💧🌳'; // NEW: Specific particle for tree feed
      else if (type === 'elephant_wash') icon = '🚿💧'; // Specific particle for elephant wash
      else if (type === 'tree_clean') icon = '🌬️💨'; // Energetic air/oxygen particles
      else if (type === 'play') icon = '🎉';
      else if (type === 'sleep') icon = '😴';
      else if (type === 'clean' || type === 'toilet') icon = '🚿';
      else if (type === 'service') icon = '🛠️'; // NEW: Particle for service

      newParticles.push({ id: Date.now() + i, icon: icon, x: Math.random() * width, y: height / 2 });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 2000);
  };

  const handlePlayFinished = async () => {
    await saveStatus({ ...taskStatus, play: 1 });
    await updateGlobalCoins(100);
    createParticles('play');
    setTimeout(() => setCurrentScreen('living'), 500);
  };

  const handleAction = (type) => {
    if (type === 'feed') {
      if (selectedCharacter.name === 'Rider') {
        setCurrentScreen('riderFeed');
      } else if (selectedCharacter.name === 'Elephant') {
        setCurrentScreen('elephantFeed');
      } else if (selectedCharacter.name === 'Tree') {
        setCurrentScreen('treeFeed');
      }
      else {
        setCurrentScreen('kitchen');
      }
      return;
    }
    if (type === 'toilet') {
      if (selectedCharacter.name === 'Rider') {
        setCurrentScreen('bikeWash');
      } else if (selectedCharacter.name === 'Elephant') { // <--- NEW: Route to elephant wash
        setCurrentScreen('elephantWash');
      } else if (selectedCharacter.name === 'Tree') {
        setCurrentScreen('treeClean');
      } else {
        setCurrentScreen('bathroom');
      }
      return;
    }

    if (type === 'sleep') {
      if (selectedCharacter.name === 'Rider') {
        setCurrentScreen('bikeService');
      } else if (selectedCharacter.name === 'Tree') {
        setCurrentScreen('treeSleep');
      } else {
        setCurrentScreen('bedroom');
      }
      return;
    }

    if (type === 'play') {
      if (selectedCharacter.name === 'Rider') {
        setCurrentScreen('riderPlay');
      } else if (selectedCharacter.name === 'Elephant') { // <--- ADDED: Route to ElephantPlayScreen
        setCurrentScreen('elephantPlay');
      } else if (selectedCharacter.name === 'Tree') {
        setCurrentScreen('treePlay');
      } else {
        setCurrentScreen('playroom');
      }
      return;
    }
  };


  const handleSlap = () => {
    setSlapHandVisible(true);
    setExpression('dizzy');
    setTimeout(() => { setSlapHandVisible(false); setExpression('happy'); }, 300);
  };

  // MODIFIED: handleCharacterSelect to also load/save character specific feed progress
  const handleCharacterSelect = async (char) => {
    setSelectedCharacter(char);
    setCurrentScreen('living');
    try {
      await AsyncStorage.setItem(KEY_CHARACTER, char.id.toString());
      // Load character-specific feed progress when character changes
      const savedCharFeedProgress = await AsyncStorage.getItem(`${KEY_CHARACTER_FEED_PROGRESS_PREFIX}${char.id}`);
      const feedProgress = savedCharFeedProgress ? parseInt(savedCharFeedProgress, 10) : 0;
      setElephantCurrentFeedProgress(feedProgress);
      setTreeCurrentFeedProgress(feedProgress);

      try {
        await setGlobalSelectedCharacter(char.id);
      } catch (err) {
        console.warn('Failed to update global selected character', err);
      }
    } catch (e) {
      console.error("Failed to save character", e);
    }
  };

  // NEW: handleElephantFeedScreenBack - handles data coming back from ElephantFeedScreen
  const handleElephantFeedScreenBack = async () => {
    // ElephantFeedScreen doesn't pass back final coins or progress on `onBack`
    // It updates its own state and then `onFeedLevelCompleted` updates parent state.
    // So here, we just navigate back to living.
    // The feed progress for the selected character would have already been saved
    // by `handleElephantFeedLevelCompleted` if a level was completed,
    // or loaded from storage if the screen was just exited.
    setCurrentScreen('living');
  };


  const getExpressionEmoji = () => {
    if (expression === 'dizzy') return '😵';
    // If Rider and 'sleep' (now 'service') is due
    if (selectedCharacter.name === 'Rider' && taskStatus.sleep < 1) return '⚙️'; // Gear icon for service needed
    if (Object.values(taskStatus).some(val => val < 1)) return '😫';
    return '😊';
  };

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);


  if (currentScreen === 'riderFeed') {
    return <RiderFeedScreen
      onBack={() => setCurrentScreen('living')}
      onFeedFinished={handleRiderFeedFinished}
      coins={coins}
      inventory={inventory}
      selectedCharacter={selectedCharacter}
    />;
  }
  if (currentScreen === 'kitchen') {
    return <KitchenScreen onBack={() => setCurrentScreen('living')} onFeed={handleKitchenFeed} coins={coins} inventory={inventory} selectedCharacter={selectedCharacter} />;
  }
  if (currentScreen === 'bathroom') {
    return <BathroomScreen onBack={() => setCurrentScreen('living')} onCleanFinished={handleCleanFinished} selectedCharacter={selectedCharacter} />;
  }
  if (currentScreen === 'bedroom') {
    return <BedroomScreen onBack={() => setCurrentScreen('living')} onSleepFinished={handleSleepFinished} selectedCharacter={selectedCharacter} />;
  }
  if (currentScreen === 'playroom') {
    return <PlayroomScreen onBack={() => setCurrentScreen('living')} onPlayFinished={handlePlayFinished} selectedCharacter={selectedCharacter} />;
  }
  if (currentScreen === 'bikeWash') {
    return <BikeWashScreen
      onBack={() => setCurrentScreen('living')}
      onCleanFinished={handleBikeWashFinished}
      coins={coins}
      selectedCharacter={selectedCharacter}
    />;
  }
  if (currentScreen === 'riderPlay') {
    return <RiderPlayScreen
      onBack={() => setCurrentScreen('living')}
      onPlayFinished={handlePlayFinished}
      coins={coins}
      selectedCharacter={selectedCharacter}
    />;
  }
  if (currentScreen === 'bikeService') {
    return <BikeServiceScreen
      onBack={() => setCurrentScreen('living')}
      onServiceFinished={handleServiceFinished}
      coins={coins}
      selectedCharacter={selectedCharacter}
    />;
  }
  // MODIFIED CONDITIONAL RENDERING FOR ElephantFeedScreen
  if (currentScreen === 'elephantFeed') {
    return <ElephantFeedScreen
      onBack={handleElephantFeedScreenBack} // Use the new handler for back navigation
      onFeedLevelCompleted={handleElephantFeedLevelCompleted} // Call when a feed level is completed
      onCoinEarned={(amount) => updateGlobalCoins(amount)} // Handle coin earning
      coins={coins}
      selectedCharacter={selectedCharacter}
      initialFeedProgress={elephantCurrentFeedProgress} // Pass current progress
    />;
  }
  if (currentScreen === 'treeFeed') {
    console.log('Rendering TreeFeedScreen with treeCurrentFeedProgress:', treeCurrentFeedProgress);
    return <TreeFeedScreen
      onBack={() => setCurrentScreen('living')}
      onFeedLevelCompleted={handleTreeFeedLevelCompleted}
      onCoinEarned={(amount) => updateGlobalCoins(amount)} // Changed from onCoinDeduction to onCoinEarned, and positive update
      coins={coins}
      selectedCharacter={selectedCharacter}
      initialFeedProgress={treeCurrentFeedProgress}
    />;
  }
  // NEW CONDITIONAL RENDERING FOR ElephantPlayScreen
  if (currentScreen === 'elephantPlay') {
    return <ElephantPlayScreen
      onBack={() => setCurrentScreen('living')}
      onPlayFinished={handlePlayFinished} // This will mark the 'play' task as complete
      coins={coins}
      selectedCharacter={selectedCharacter}
      onCoinUpdate={(amount) => updateGlobalCoins(amount)} // Pass the updateGlobalCoins function
    />;
  }
  if (currentScreen === 'treePlay') {
    return <TreePlayScreen
      onBack={() => setCurrentScreen('living')}
      onPlayFinished={handlePlayFinished}
      coins={coins}
      selectedCharacter={selectedCharacter}
      onCoinUpdate={(amount) => updateGlobalCoins(amount)}
    />;
  }
  if (currentScreen === 'treeSleep') {
    return <TreeSleepScreen
      onBack={() => setCurrentScreen('living')}
      onSleepFinished={handleSleepFinished}
      selectedCharacter={selectedCharacter}
    />;
  }
  if (currentScreen === 'treeClean') {
    return <TreeCleanScreen
      onBack={() => setCurrentScreen('living')}
      onCleanFinished={handleTreeCleanFinished}
      selectedCharacter={selectedCharacter}
    />;
  }
  if (currentScreen === 'characterSelect') {
    return <CharacterSelectionScreen onBack={() => setCurrentScreen('living')} onSelect={handleCharacterSelect} currentCharacterId={selectedCharacter.id} characters={CHARACTERS} />;
  }

  const RenderButton = ({ iconName, gradient, onPress, label, isFull }) => {
    const buttonScale = useRef(new Animated.Value(1)).current;
    const safeFull = isFull !== undefined ? isFull : 1;
    const fillPercent = `${safeFull * 100}%`;

    return (
      <View style={styles.buttonWrapper}>
        <TouchableWithoutFeedback
          onPressIn={() => Animated.spring(buttonScale, { toValue: 0.85, useNativeDriver: true }).start()}
          onPressOut={() => {
            Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
            onPress();
          }}>
          <Animated.View style={[styles.actionBtnContainer, { transform: [{ scale: buttonScale }] }]} accessible={true} accessibilityLabel={label} accessibilityRole="button">
            {safeFull < 1 && (
              <View style={[styles.glowRing, { backgroundColor: 'red', opacity: 0.8 }]} />
            )}
            <LinearGradient colors={['#ffffff', '#f0f0f0']} style={styles.btnBackground}>
              <View style={styles.progressContainer}>
                <View style={{ width: '100%', height: fillPercent }}>
                  <LinearGradient colors={gradient} style={{ flex: 1 }} />
                </View>
              </View>
              <View style={styles.iconContainer}>
                <Icon name={iconName} size={32} color={safeFull === 1 ? '#fff' : '#2c3e50'} />
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableWithoutFeedback>
        <Text style={styles.buttonLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <LinearGradient colors={['#4facfe', '#00f2fe', '#43e97b']} style={styles.backgroundGradient}>

        <View style={[styles.decorCircle, { top: 50, left: 30, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        {particles.map((p) => <Animated.Text key={p.id} style={[styles.particle, { left: p.x, top: p.y }]}>{p.icon}</Animated.Text>)} {/* Display particle icon */}

        <View style={styles.header}>
          <TouchableWithoutFeedback onPress={() => setCurrentScreen('characterSelect')}>
            <View style={styles.levelBadge}>
              <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.levelGradient}>
                <Icon name="account-switch" size={32} color="#fff" />
              </LinearGradient>
            </View>
          </TouchableWithoutFeedback>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Notifications</Text>
            {/* <Switch value={isBossBabyEnabled} onValueChange={handleToggleSwitch} /> */}
          </View>

          <View style={styles.currencyContainer}>
            <LinearGradient colors={['#ffd89b', '#19547b']} style={styles.currencyPill}>
              <Icon name="cash" size={24} color="#FFD700" />
              <Text style={styles.currencyText}>{coins.toLocaleString()}</Text>
            </LinearGradient>
          </View>

          <View style={styles.expressionBubble}>
            <Text style={styles.expressionText}>{getExpressionEmoji()}</Text>
          </View>
        </View>

        <TouchableWithoutFeedback onPress={handleSlap}>
          <View style={styles.gameAreaWrapper}>
            <Animated.View style={[styles.gameArea, { transform: [{ translateY: bounceAnim }] }]}>
              <View style={styles.shadowEllipse} />
              <Image
                source={selectedCharacter.image}
                style={styles.character}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.footer}>
          <View style={styles.actionBar}>
            <RenderButton
              iconName={selectedCharacter.actionIcons.play}
              gradient={selectedCharacter.actionGradients.play}
              isFull={taskStatus.play}
              onPress={() => handleAction('play')}
              label="Play"
            />
            <RenderButton
              iconName={selectedCharacter.actionIcons.feed}
              gradient={selectedCharacter.actionGradients.feed}
              isFull={taskStatus.feed}
              onPress={() => handleAction('feed')}
              label="Feed"
            />
            <RenderButton
              iconName={selectedCharacter.actionIcons.clean}
              gradient={selectedCharacter.actionGradients.clean}
              isFull={taskStatus.clean}
              onPress={() => handleAction('toilet')}
              label="Clean"
            />
            <RenderButton
              iconName={selectedCharacter.actionIcons.sleep}
              gradient={selectedCharacter.actionGradients.sleep}
              isFull={taskStatus.sleep}
              onPress={() => handleAction('sleep')}
              label={selectedCharacter.name === 'Rider' ? "Service" : "Sleep"}
            />
          </View>
        </View>

      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundGradient: { flex: 1 },
  particle: { position: 'absolute', fontSize: 24, zIndex: 1000 },
  header: { paddingTop: 50, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, width: '100%' },
  levelBadge: { width: 70, height: 70 },
  levelGradient: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  currencyContainer: { alignItems: 'center', justifyContent: 'center' },
  currencyPill: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 3, borderColor: '#fff' },
  currencyText: { color: '#fff', fontWeight: '900', fontSize: 20 },
  gameAreaWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gameArea: { justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  shadowEllipse: { position: 'absolute', bottom: -20, width: 200, height: 60, borderRadius: 100, backgroundColor: 'rgba(0,0,0,0.15)', transform: [{ scaleX: 1.5 }] },
  character: { width: 300, height: 400, zIndex: 5 },
  expressionBubble: { backgroundColor: '#fff', borderRadius: 30, width: 60, height: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#f093fb', elevation: 8 },
  expressionText: { fontSize: 32 },
  footer: { paddingBottom: 30, paddingHorizontal: 15 },
  actionBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 40, paddingVertical: 15, elevation: 10 },
  buttonWrapper: { alignItems: 'center', gap: 8 },
  actionBtnContainer: { width: 70, height: 70 },
  glowRing: { position: 'absolute', top: -6, bottom: -6, left: -6, right: -6, borderRadius: 41 },
  btnBackground: { width: 70, height: 70, borderRadius: 35, overflow: 'hidden', borderWidth: 4, borderColor: '#fff', backgroundColor: 'white' },
  progressContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, justifyContent: 'flex-end' },
  iconContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  buttonLabel: { fontSize: 12, fontWeight: '700', color: '#2c3e50', textAlign: 'center' },
  decorCircle: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  toggleContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2
  }
});

export default App;