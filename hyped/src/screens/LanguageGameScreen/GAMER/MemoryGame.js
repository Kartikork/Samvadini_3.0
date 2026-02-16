import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  AppState,
  BackHandler,
  Alert,
  Modal,
  Switch,
} from "react-native";
// import Sound from 'react-native-sound';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cardEmojis = ["🍎", "🍎", "🐶", "🐶", "🍌", "🍌", "🐱", "🐱", "⚽", "⚽", "🚗", "🚗"];

const screenWidth = Dimensions.get('window').width;

const shuffleArray = (array) => {
  return array
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
};

const MemoryGame = ({ navigation }) => {
  const [cards, setCards] = useState(shuffleArray(cardEmojis));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [disabled, setDisabled] = useState(false);

  // Settings State
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);

  // Sound Refs
  const backgroundMusic = useRef(null);
  const flipSound = useRef(null);
  const matchSound = useRef(null);
  const mismatchSound = useRef(null);
  const winSound = useRef(null);

  const appState = useRef(AppState.currentState);

  // --- Settings Persistence ---
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('memoryGameSettings');
      if (savedSettings !== null) {
        const { music, soundEffects } = JSON.parse(savedSettings);
        setMusicEnabled(music);
        setSoundEffectsEnabled(soundEffects);
      }
    } catch (error) {
      console.log('Failed to load settings.', error);
    }
  };

  const saveSettings = useCallback(async () => {
    try {
      const settings = { music: musicEnabled, soundEffects: soundEffectsEnabled };
      await AsyncStorage.setItem('memoryGameSettings', JSON.stringify(settings));
    } catch (error) {
      console.log('Failed to save settings.', error);
    }
  }, [musicEnabled, soundEffectsEnabled]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);


  // --- Sound Initialization ---
  useEffect(() => {
    // Sound loading disabled
    /*
    Sound.setCategory('Playback');

    const loadSound = (soundPath, soundRef) => {
      const sound = new Sound(soundPath, (error) => {
        if (error) {
          console.error('Failed to load sound', soundPath, error);
          return;
        }
        soundRef.current = sound;
      });
    };

    loadSound(require('../GAMER/Assets/audio/background_music.mp3'), backgroundMusic);
    loadSound(require('../GAMER/Assets/audio/flip.mp3'), flipSound);
    loadSound(require('../GAMER/Assets/audio/match1.mp3'), matchSound);
    loadSound(require('../GAMER/Assets/audio/mismatch.m4a'), mismatchSound);
    loadSound(require('../GAMER/Assets/audio/yay.mp3'), winSound);
    */

    return () => {
      // backgroundMusic.current?.release();
      // flipSound.current?.release();
      // matchSound.current?.release();
      // mismatchSound.current?.release();
      // winSound.current?.release();
    };
  }, []);

  // --- App State and Screen Focus Handling ---
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      const isGameOver = matched.length > 0 && matched.length === cards.length;

      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        backgroundMusic.current?.pause();
        winSound.current?.pause();
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (!isGameOver && musicEnabled && backgroundMusic.current) {
          backgroundMusic.current.play();
        } else if (isGameOver && soundEffectsEnabled && winSound.current) {
          winSound.current.play();
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [cards.length, matched.length, musicEnabled, soundEffectsEnabled]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      if (musicEnabled && backgroundMusic.current) {
        const isGameOver = matched.length > 0 && matched.length === cards.length;
        if (!isGameOver) {
          backgroundMusic.current.setNumberOfLoops(-1);
          backgroundMusic.current.play();
        }
      }
      return () => {
        backHandler.remove();
        backgroundMusic.current?.stop();
        winSound.current?.stop();
      };
    }, [musicEnabled, matched, cards, navigation])
  );

  const playSound = (soundRef) => {
    if (soundEffectsEnabled && soundRef.current) {
      soundRef.current.stop(() => soundRef.current.play());
    }
  };

  const handleFlip = (index) => {
    if (disabled || flipped.includes(index) || matched.includes(index)) return;
    if (flipped.length === 1 && flipped[0] === index) return;
    // playSound(flipSound);
    setFlipped([...flipped, index]);
  };

  useEffect(() => {
    if (flipped.length === 2) {
      setDisabled(true);
      const [first, second] = flipped;
      if (cards[first] === cards[second]) {
        // playSound(matchSound);
        setMatched((prev) => [...prev, first, second]);
        setFlipped([]);
        setDisabled(false);
      } else {
        // playSound(mismatchSound);
        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1000);
      }
    }
  }, [flipped, cards]);

  const resetGame = () => {
    winSound.current?.stop();
    setCards(shuffleArray(cardEmojis));
    setFlipped([]);
    setMatched([]);
    setDisabled(false);
    if (musicEnabled) {
      backgroundMusic.current?.play();
    }
  };

  const isGameOver = matched.length > 0 && matched.length === cards.length;

  useEffect(() => {
    if (isGameOver) {
      // backgroundMusic.current?.stop();
      if (soundEffectsEnabled && winSound.current) {
        // winSound.current.setNumberOfLoops(-1);
        // winSound.current.play();
      }
    }
  }, [isGameOver, soundEffectsEnabled]);

  return (
    <View style={styles.container}>
      {/* --- Settings Modal --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.modalText}>Settings</Text>
            <View style={styles.settingRow}>
              <Text>Background Music</Text>
              <Switch
                value={musicEnabled}
                onValueChange={(value) => {
                  setMusicEnabled(value);
                  if (value) backgroundMusic.current?.play();
                  else backgroundMusic.current?.pause();
                }}
              />
            </View>
            <View style={styles.settingRow}>
              <Text>Sound Effects</Text>
              <Switch
                value={soundEffectsEnabled}
                onValueChange={setSoundEffectsEnabled}
              />
            </View>
          </View>
        </View>
      </Modal>

      {isGameOver && (
        // <Image
        //   source={require('../GAMER/we-won-1-unscreen.gif')}
        //   style={styles.gifAnimation}
        //   resizeMode="contain"
        // />
        null
      )}

      <View style={styles.header}>
        <Text style={styles.title}>🃏 Memory Game</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setSettingsModalVisible(true)}
        >
          <Text style={{ fontSize: 28 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {cards.map((card, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => handleFlip(index)}
          >
            <Text style={styles.cardText}>
              {flipped.includes(index) || matched.includes(index) ? card : "❓"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isGameOver && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.winText}>🎉 You matched all cards!</Text>
          <TouchableOpacity style={styles.button} onPress={resetGame}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'absolute',
    top: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: 'center',
    flex: 1,
    marginLeft: -20, // Offset to center title
  },
  settingsButton: {
    position: 'absolute',
    right: 10,
    // left: 10,
    padding: 10,
    top: -50,
  },
  gifAnimation: {
    position: 'absolute',
    zIndex: 10,
    width: screenWidth * 0.9,
    height: screenWidth * 0.9,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 320, // Increased width
    justifyContent: "center",
  },
  card: {
    width: 80,
    height: 80,
    margin: 8, // Increased margin
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#333",
    borderRadius: 10,
    elevation: 4,
  },
  cardText: {
    fontSize: 30,
  },
  gameOverContainer: {
    position: 'absolute',
    bottom: 50,
    zIndex: 20,
    alignItems: "center",
  },
  winText: {
    fontSize: 22,
    color: "green",
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 10,
  },
  button: {
    padding: 10,
    backgroundColor: "#333",
    borderRadius: 8,
    marginTop: 10,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
  // Modal Styles
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    paddingTop: 45,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#aaa',
  },
  modalText: {
    marginBottom: 25,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
});

export default MemoryGame;