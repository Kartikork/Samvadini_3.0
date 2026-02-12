import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  BackHandler,
  AppState
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import GraphemeSplitter from 'grapheme-splitter';
import lessonManifest from '../Crossword/levels.json';
import { useFocusEffect } from '@react-navigation/native';
// import Sound from 'react-native-sound';

import axios from 'axios';
// import { API_URL } from '../../Helper/config'; // ensure this holds your backend base URL
// import icon from '../../assets/gamIcn5.png';


// import AssameseChars from './Crossword_lang/Assamese.json';
// import BengaliChars from './Crossword_lang/Bengali.json';
// import BodoChars from './Crossword_lang/Bodo.json';
// import DogriChars from './Crossword_lang/Dogri.json';
import EnglishChars from '../Crossword/English.json';
import LinearGradient from 'react-native-linear-gradient';
// import GujaratiChars from './Crossword_lang/Gujarati.json';
// import HindiChars from './Crossword_lang/Hindi.json';
// import KanadaChars from './Crossword_lang/Kanada.json';
// import KashmiriChars from './Crossword_lang/Kashmiri.json';
// import KonkaniChars from './Crossword_lang/Konkani.json';
// import MaithiliChars from './Crossword_lang/Maithili.json';
// import MalayalamChars from './Crossword_lang/Malayalam.json';
// import ManipuriChars from './Crossword_lang/Manipuri.json';
// import MarathiChars from './Crossword_lang/Marathi.json';
// import NepaliChars from './Crossword_lang/Nepali.json';
// import OdiaChars from './Crossword_lang/Odia.json';
// import PunjabiChars from './Crossword_lang/Punjabi.json';
// import SanskritChars from './Crossword_lang/Sanskrit.json';
// import UrduChars from './Crossword_lang/Urdu.json';
// import TeluguChars from './Crossword_lang/Telugu.json';
// import TamilChars from './Crossword_lang/Tamil.json';
// import SindhiChars from './Crossword_lang/Sindhi.json';
// import SantaliChars from './Crossword_lang/Santali.json';

// const icon = <Image source={require('../../assets/crossword_design.png')} style={{ width: 284, height: 124 }} />;

// Shared key for coins across games

const COIN_STORAGE_KEY = 'snakeGameTotalCoins';

const translations = {
  // "crossword puzzle": {
  Assamese: "শব্দ ধাঁধা",
  Bengali: "শব্দ ধাঁধা",
  Bodo: "बिहेब गोंथा",
  Dogri: "शब्द पहेली",
  English: "Crossword Puzzle",
  Gujarati: "શબ્દપેઢી",
  Hindi: "शब्द पहेली",
  Kanada: "ಪದಜಾಲ ಪಾಠ",
  Kashmiri: "لفظی پہیلی",
  Konkani: "शब्दकोड",
  Maithili: "शब्द पहेली",
  Malayalam: "വാക്കുകൾ കൊണ്ട് കുഴപ്പം",
  Manipuri: "পদ শেলফ",
  Marathi: "शब्दकोड",
  Nepali: "शब्द पहेली",
  Odia: "ଶବ୍ଦ ପହେଳୀ",
  Punjabi: "ਸ਼ਬਦ ਪਹੇਲੀ",
  Sanskrit: "शब्दकोडः",
  Santali: "ᱪᱟᱞᱟᱢ ᱯᱟᱞᱤ",
  Sindhi: "لفظن جي پزل",
  Tamil: "சொல் புதிர்",
  Telugu: "పదాల పొడుగు",
  Urdu: "الفاظ کا کھیل"
  // }
};

const hintTranslations = {
  Assamese: "ইঙ্গিত",
  Bengali: "ইঙ্গিত",
  Bodo: "संकेत",
  Dogri: "संकेत",
  English: "Hint",
  Gujarati: "ઇંગિત",
  Hindi: "संकेत",
  Kanada: "ಸೂಚನೆ",
  Kashmiri: "اشارہ",
  Konkani: "सूचना",
  Maithili: "संकेत",
  Malayalam: "സൂചന",
  Manipuri: "ইঙ্গিত",
  Marathi: "सूचना",
  Nepali: "संकेत",
  Odia: "ସୂଚନା",
  Punjabi: "ਸੰਕੇਤ",
  Sanskrit: "सूचनम्",
  Santali: "ᱥᱚᱨᱟᱹᱞ",
  Sindhi: "اشارو",
  Tamil: "தூகை",
  Telugu: "సూచన",
  Urdu: "اشارہ"
};

const charFiles = {
  English: EnglishChars,
  //   Assamese: AssameseChars,
  //   Bengali: BengaliChars,
  //   Bodo: BodoChars,
  //   Dogri: DogriChars,
  //   Gujarati: GujaratiChars,
  //   Hindi: HindiChars,
  //   Kanada: KanadaChars,
  //   Kashmiri: KashmiriChars,
  //   Konkani: KonkaniChars,
  //   Maithili: MaithiliChars,
  //   Malayalam: MalayalamChars,
  //   Manipuri: ManipuriChars,
  //   Marathi: MarathiChars,
  //   Nepali: NepaliChars,
  //   Odia: OdiaChars,
  //   Punjabi: PunjabiChars,
  //   Sanskrit: SanskritChars,
  //   Santali: SantaliChars,
  //   Sindhi: SindhiChars,
  //   Tamil: TamilChars,
  //   Telugu: TeluguChars,
  //   Urdu: UrduChars,
};

const wordColors = [
  '#c6f6d5', // green
  '#fcd5ce', // peach
  '#a0c4ff', // blue
  '#ffd6a5', // orange
  '#bdb2ff', // purple
  '#ffadad', // pink
  '#fdffb6', // yellow
  '#d0f4de', // mint
  '#f0a6ca', // rose
];

const splitter = new GraphemeSplitter();
const segmentWord = (word) => splitter.splitGraphemes(word);

const CELL_SIZE = 30;

const pickRandomWords = (source, count) => {
  if (!source || !Array.isArray(source)) {
    console.warn("pickRandomWords: source is not an array", source);
    return [];
  }
  const shuffled = [...source].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const calculateScore = (timeInSeconds) => {
  if (timeInSeconds <= 150) return 300;
  else if (timeInSeconds <= 210) return 200;
  else return 100;
};

const Crossword = ({ navigation }) => {
  const route = useRoute();
  const { lesson } = route.params || {};

  const categoryMap = {
    'Fruits & Vegetables': 1,
    'Animals & Birds': 2,
    'Family & People': 3,
    'Common Objects': 4,
    'Greetings & Basics': 5,
    'Days & Time Basics': 6,
    'Food & Drinks': 7,
    'Daily Routine': 8,
    'At Home': 9,
    'School & Study': 10,
    'Weather & Nature': 11,
    'Common Verbs & Actions': 12,
    'Emotions & Feelings': 13,
    'Places in Town': 14,
    'Travel & Transport': 15,
    'Conversations in Context': 16,
    'Jobs & Workplaces': 17,
    'Technology & Gadgets': 18,
    'News & Social Media': 19,
    'Formal/Informal Speech': 20,
    'Story Building & Paragraphs': 21,
    'Cultural Events & Festivals': 22
  };

  const [userId, setUserId] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [chars, setChars] = useState([]);
  const [words, setWords] = useState([]);
  const [gridSize] = useState(10);
  const [grid, setGrid] = useState([]);
  const [showList, setShowList] = useState(false);
  const [foundWords, setFoundWords] = useState([]);
  const [lockedCells, setLockedCells] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [lastSelectedCell, setLastSelectedCell] = useState(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [auto, setauto] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [correctSound, setCorrectSound] = useState(null);

  const [score, setScore] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const soundRef = useRef(null);
  const clickSoundRef = useRef(null);
  const [wordColorMap, setWordColorMap] = useState({});
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [isPausedModalVisible, setIsPausedModalVisible] = useState(false);
  const appState = useRef(AppState.currentState);

  const [flyingWord, setFlyingWord] = useState(null);
  const shimmerOpacity = new Animated.Value(0.3);
  const flyX = new Animated.Value(0);
  const flyY = new Animated.Value(0);
  const flyOpacity = new Animated.Value(0);

  const flyingStyle = {
    transform: [{ translateX: flyX }, { translateY: flyY }],
    opacity: flyOpacity
  };

  const getEnglishLessonName = (translatedName) => {
    if (!lessonManifest || !Array.isArray(lessonManifest)) return translatedName;
    for (const level of lessonManifest) {
      if (level.categories) {
        for (const category of level.categories) {
          const allTranslations = category.categoryName;
          for (const langKey in allTranslations) {
            if (allTranslations[langKey]?.trim() === translatedName?.trim()) {
              return allTranslations["english"];
            }
          }
        }
      }
    }
    return translatedName;
  };

  // --- SOUND TOGGLE FUNCTION ---
  const toggleMusic = () => {
    const newState = !isMusicOn;
    setIsMusicOn(newState);

    /*
    // Immediately affect background music
    if (soundRef.current) {
      if (newState) {
        soundRef.current.play();
      } else {
        soundRef.current.pause();
      }
    }
    */
  };

  useFocusEffect(
    useCallback(() => {
      /*
      if (soundRef.current && isMusicOn) {
        soundRef.current.play();
      }
      */
      return () => {
        // if (soundRef.current) soundRef.current.pause();
      };
    }, [isMusicOn])
  );

  /*
  useEffect(() => {
    Sound.setCategory('Playback');
    const whistle = new Sound(require('./Assets/whistle.mp3'), (error) => {
      if (!error) setCorrectSound(whistle);
    });

    const backgroundSound = new Sound(require('./Assets/maze_bm.mp3'), (error) => {
      if (!error) {
        soundRef.current = backgroundSound;
        soundRef.current.setNumberOfLoops(-1);
        soundRef.current.setVolume(0.5);
        if (isMusicOn) soundRef.current.play();
      }
    });

    const click = new Sound(require('./Assets/click.mp3'), (error) => {
      if (!error) clickSoundRef.current = click;
    });

    return () => {
      if (correctSound) correctSound.release();
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
      }
      if (clickSoundRef.current) clickSoundRef.current.release();
    };
  }, []);
  */

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const uid = await AsyncStorage.getItem('userId') || 'default';
        setUserId(uid);
        setSourceLanguage('English');
        await loadLanguageData('English');
      } catch (err) {
        console.error("Async load error:", err);
      }
    };
    loadAsyncData();
  }, [lesson]);

  const loadLanguageData = async (lang) => {
    let dataFile = charFiles[lang] || charFiles['English'];
    if (!dataFile) return;

    if (dataFile.chars) {
      setChars(dataFile.chars);
    } else {
      setChars("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
    }

    const englishCategoryName = getEnglishLessonName(lesson?.name) || 'Fruits & Vegetables';
    let targetId = categoryMap[englishCategoryName] || 1;

    let possibleWordList = null;
    if (dataFile.level) possibleWordList = dataFile.level[targetId] || dataFile.level[String(targetId)];
    if (!possibleWordList && dataFile.words) possibleWordList = dataFile.words[targetId] || dataFile.words[String(targetId)];

    if (!possibleWordList || possibleWordList.length === 0) {
      const container = dataFile.level || dataFile.words || {};
      const firstKey = Object.keys(container)[0];
      if (firstKey) possibleWordList = container[firstKey];
    }

    if (!possibleWordList || possibleWordList.length === 0) {
      possibleWordList = ['APPLE', 'BANANA', 'CAT', 'DOG', 'FISH', 'EGG'];
    }

    const selected = pickRandomWords(possibleWordList, 6);
    setWords(selected);
  };

  useEffect(() => {
    if (words.length > 0 && chars.length > 0) {
      generateGrid();
    }
  }, [words, chars]);

  const generateGrid = () => {
    const used = new Map();
    const g = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());
    const normalize = (n) => (n === 0 ? 0 : n > 0 ? 1 : -1);
    const pointKey = (x, y) => `${x},${y}`;

    const conflict = (map, [x, y], letter) => {
      const v = map.get(pointKey(x, y));
      return v != null && v !== letter;
    };

    for (let word of words) {
      const segments = segmentWord(word);
      if (segments.length > gridSize) continue;
      let placed = false;

      for (let i = 0; i < 100 && !placed; i++) {
        const origin = [randInt(0, gridSize - 1), randInt(0, gridSize - 1)];
        if (conflict(used, origin, segments[0])) continue;
        const directions = shuffle([[1, 0], [0, 1], [1, 1], [-1, 1]]);

        for (let dir of directions) {
          const offset = [normalize(dir[0]), normalize(dir[1])];
          let current = origin;
          let valid = true;
          const path = [origin];

          for (let j = 1; j < segments.length; j++) {
            current = [current[0] + offset[0], current[1] + offset[1]];
            const [x, y] = current;
            if (x < 0 || y < 0 || x >= gridSize || y >= gridSize || conflict(used, current, segments[j])) {
              valid = false;
              break;
            }
            path.push(current);
          }

          if (valid) {
            path.forEach(([x, y], idx) => {
              g[y][x] = segments[idx];
              used.set(pointKey(x, y), segments[idx]);
            });
            placed = true;
            break;
          }
        }
      }
    }

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!g[y][x]) {
          g[y][x] = chars[randInt(0, chars.length - 1)];
        }
      }
    }

    setGrid(g);
    setFoundWords([]);
    setLockedCells([]);
    setSelectedCells([]);
    setGameFinished(false);
    setElapsedTime(0);
  };

  const isSameCell = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
  const isNeighbor = (a, b) => {
    const dx = Math.abs(a[0] - b[0]);
    const dy = Math.abs(a[1] - b[1]);
    return dx <= 1 && dy <= 1 && dx + dy > 0;
  };

  const timerRef = useRef(null);
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isPausedModalVisible && !gameFinished) {
        setElapsedTime(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isPausedModalVisible, gameFinished]);

  const submitSessionToBackend = async () => {
    await AsyncStorage.setItem('refreshCrosswordLevels', 'true');
  };

  const handleCellPress = async (x, y) => {
    if (isPausedModalVisible || gameFinished) return;

    /*
    // UPDATED: Check isMusicOn
    if (clickSoundRef.current && isMusicOn) {
        clickSoundRef.current.stop(() => clickSoundRef.current.play());
    }
    */

    const currentCell = [x, y];
    if (lockedCells.some(c => isSameCell(c.cell, currentCell))) return;

    let updatedSelection;
    if (lastSelectedCell && (isNeighbor(lastSelectedCell, currentCell) || isSameCell(lastSelectedCell, currentCell))) {
      updatedSelection = [...selectedCells, currentCell];
    } else {
      updatedSelection = [currentCell];
    }

    const forward = updatedSelection.map(([cx, cy]) => grid[cy][cx]).join("");
    const backward = [...updatedSelection].reverse().map(([cx, cy]) => grid[cy][cx]).join("");

    if (words.includes(forward) || words.includes(backward)) {
      const foundWord = words.includes(forward) ? forward : backward;

      if (foundWords.includes(foundWord)) {
        setSelectedCells([]);
        setLastSelectedCell(null);
        return;
      }

      const newFound = [...foundWords, foundWord];
      setFoundWords(newFound);

      const lockedData = updatedSelection.map(cell => ({ cell, word: foundWord }));
      setLockedCells(prev => [...prev, ...lockedData]);

      if (!wordColorMap[foundWord]) {
        setWordColorMap(prev => ({
          ...prev,
          [foundWord]: wordColors[Object.keys(prev).length % wordColors.length]
        }));
      }

      setSelectedCells([]);
      setLastSelectedCell(null);

      /*
      // UPDATED: Check isMusicOn
      if (correctSound && isMusicOn) {
        correctSound.play();
      }
      */

      if (newFound.length === words.length) {
        setGameFinished(true);
        const finalScore = calculateScore(elapsedTime);
        const coinsEarned = Math.floor(finalScore / 10);
        setScore(finalScore);
        setEarnedCoins(coinsEarned);

        const currentCoinsStr = await AsyncStorage.getItem(COIN_STORAGE_KEY);
        const currentCoins = currentCoinsStr ? parseInt(JSON.parse(currentCoinsStr)) : 0;
        await AsyncStorage.setItem(COIN_STORAGE_KEY, JSON.stringify(currentCoins + coinsEarned));

        setTimeout(() => submitSessionToBackend(), 500);
      }
    } else {
      setSelectedCells(updatedSelection);
      setLastSelectedCell(currentCell);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const playAgain = () => {
    setGameFinished(false);
    setElapsedTime(0);
    setFoundWords([]);
    setLockedCells([]);
    setSelectedCells([]);
    setLastSelectedCell(null);
    setScore(0);
    if (words.length > 0) {
      loadLanguageData('English');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setIsPausedModalVisible(true)} style={styles.pauseButton}>
          <Text style={styles.pauseButtonText}>⏸️</Text>
        </TouchableOpacity>
        <Text style={styles.timerText}>⏱ {formatTime(elapsedTime)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.row}>
          <Text style={styles.hintText}>{hintTranslations['English']}</Text>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Words</Text>
            <Switch value={showList} onValueChange={setShowList} />
          </View>
        </View>

        <View style={styles.gridContainer}>
          {grid.map((row, i) => (
            <View key={i} style={styles.gridRow}>
              {row.map((cell, j) => {
                const isSelected = selectedCells.some(c => isSameCell(c, [j, i]));
                const isLocked = lockedCells.find(c => isSameCell(c.cell, [j, i]));
                const foundColor = isLocked ? wordColorMap[isLocked.word] : null;

                return (
                  <TouchableOpacity key={j} onPress={() => handleCellPress(j, i)} activeOpacity={0.7}>
                    <View
                      style={[
                        styles.cell,
                        isLocked ? { backgroundColor: foundColor } :
                          isSelected ? styles.selectedCell : null,
                      ]}
                    >
                      <Text style={styles.cellText}>{cell}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {showList && (
          <View style={styles.wordList}>
            <Text style={styles.subtitle}>Words to Find:</Text>
            <View style={styles.wordGrid}>
              {words.map((w, idx) => {
                const isFound = foundWords.includes(w);
                return (
                  <View key={idx} style={[styles.wordItem, isFound && styles.wordFoundBackground]}>
                    <Text style={isFound ? styles.popupWordText : styles.wordPlainText}>
                      {isFound ? `✅ ${w}` : `• ${w}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* PAUSE MODAL */}
      <Modal visible={isPausedModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={{ fontSize: 20, marginBottom: 15, fontWeight: 'bold' }}>Game Paused</Text>

            {/* UPDATED: Music Toggle Section */}
            <View style={styles.musicToggleContainer}>
              <Text style={styles.musicToggleText}>Sound: {isMusicOn ? 'ON' : 'OFF'}</Text>
              <Switch
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={isMusicOn ? '#f5dd4b' : '#f4f3f4'}
                onValueChange={toggleMusic}
                value={isMusicOn}
              />
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={() => setIsPausedModalVisible(false)}>
              <Text style={styles.modalButtonText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ff4d6d' }]} onPress={() => navigation.goBack()}>
              <Text style={styles.modalButtonText}>Quit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WIN OVERLAY */}
      {gameFinished && (
        <View style={styles.fullScreenOverlay}>
          <View style={styles.popupContainer}>
            <View style={[styles.banner, { backgroundColor: '#2797e2ff' }]}>
              <Text style={styles.bannerText}>{'LEVEL COMPLETE!'}</Text>
            </View>
            <Text style={styles.scoreLabel}>Total Score</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>{score}</Text>
            </View>
            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardLabel}>Coins</Text>
                <Text style={[styles.rewardText, { color: '#FFD700', fontWeight: 'bold' }]}>🪙 {earnedCoins}</Text>
              </View>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardLabel}>Time</Text>
                <Text style={styles.rewardText}>{formatTime(elapsedTime)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <TouchableOpacity style={styles.button} onPress={playAgain}>
                <Text style={styles.buttonText}>Replay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#6462AC' }]} onPress={() => navigation.goBack()}>
                <Text style={styles.buttonText}>Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1
  },
  title: {
    fontSize: 28,
    marginBottom: 10,
    paddingTop: 10,
    textAlign: 'center',
    color: '#003366'
  },
  topBar: {
    position: 'absolute', top: 10, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#e06117ff', padding: 10, borderRadius: 20, zIndex: 10, elevation: 5
  },
  pauseButtonText: { fontSize: 20, color: '#fff' },
  timerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingTop: 80, paddingBottom: 100, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  hintText: { fontSize: 16, color: '#444' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontSize: 16, color: '#e96011ff', marginRight: 8 },
  gridContainer: {
    padding: 5, backgroundColor: '#dfefff', borderRadius: 10,
    borderWidth: 2, borderColor: '#e98615ff'
  },
  gridRow: { flexDirection: 'row' },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    margin: 1, // keep it minimal
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCell: { backgroundColor: '#ffe680', borderColor: '#ffd700' },
  cellText: { fontSize: 16, fontWeight: 'bold' },
  wordList: { marginTop: 20, width: '100%' },
  subtitle: { fontSize: 18, marginBottom: 10, color: '#444', textAlign: 'center' },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  wordItem: { padding: 8, margin: 5, backgroundColor: '#f0f0f0', borderRadius: 8 },
  wordFoundBackground: { backgroundColor: '#c6f6d5' },
  wordPlainText: { fontSize: 16, color: '#333' },
  popupWordText: { fontSize: 16, color: '#155724', textDecorationLine: 'line-through' },

  // Modal & Popup Styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: 280, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', elevation: 5 },
  modalButton: { borderRadius: 10, padding: 10, elevation: 2, backgroundColor: '#2196F3', marginTop: 10, width: '100%' },
  modalButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },

  // Music Toggle Styles
  musicToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 10
  },
  musicToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },

  fullScreenOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  popupContainer: { width: '80%', backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', paddingBottom: 20, overflow: 'hidden' },
  banner: { width: '100%', padding: 15, alignItems: 'center', marginBottom: 10 },
  bannerText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  scoreLabel: { fontSize: 18, color: '#555' },
  scoreBox: { backgroundColor: '#eee', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 10, marginVertical: 10 },
  scoreText: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  rewardsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  rewardItem: { alignItems: 'center' },
  rewardLabel: { fontSize: 14, color: '#666' },
  rewardText: { fontSize: 18, fontWeight: 'bold' },
  button: { backgroundColor: '#ff4d6d', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default Crossword;