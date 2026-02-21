import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Ionicons } from '@expo/vector-icons';
import lessonManifest from './levels.json';
// import uiStrings from '../../assets/create_profile.json';
// import lessonScreenStrings from '../../assets/data/lessonscreen.json';
// import LottieView from 'lottie-react-native';

// import CustomTabBar from '../Footer/CustomTabBar';
// import { useProgress } from '../../context/ProgressContext';
// import FeedbackForm from '../Feedback/FeedbackForm';
import Entypo from "react-native-vector-icons/Entypo"
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

// import { API_URL } from '../../Helper/config'; // Replace with your actual API base URL
import axios from 'axios';

const langKeyMap = {
  gujarati: 'gujarati',
  hindi: 'hindi',
  english: 'english',
  bodo: 'bodo',
  sanskrit: 'sanskrit',
  bengali: 'bengali',
  marathi: 'marathi',
  tamil: 'tamil',
  telugu: 'telugu',
  assamese: 'assamese',
  santali: 'santali',
  urdu: 'urdu',
  kannada: 'kannada',
  malayalam: 'malayalam',
  punjabi: 'punjabi',
  maithili: 'maithili',
  dogri: 'dogri',
  manipuri: 'manipuri',
  konkani: 'konkani',
  odia: 'odia',
  kashmiri: 'kashmiri',
  sindhi: 'sindhi',
};

const tileColors = [
  { background: '#FFF9E5', border: '#FFD580' }, // soft yellow
  { background: '#F5F9FF', border: '#A3C9FF' }, // baby blue
  { background: '#F9F0FF', border: '#D6A3FF' }, // lavender
  { background: '#E5FFF4', border: '#80FFD0' }, // mint
  { background: '#F0F7FF', border: '#A3C5FF' }, // icy blue
  { background: '#FFF0F0', border: '#FFA3A3' }, // light pink
  { background: '#FEF9E7', border: '#F7DC6F' }, // cream yellow
  { background: '#FFF5E6', border: '#FFBB80' }, // peach
  { background: '#F0FFF0', border: '#98FB98' }, // pale green
  { background: '#F3F0FF', border: '#B6A3FF' }, // periwinkle
  { background: '#FFF8FB', border: '#FFB3D1' }, // light rose
  { background: '#F0FFFF', border: '#A3FFFF' }, // sky cyan
  { background: '#FFF6F0', border: '#FFC299' }, // soft orange
  { background: '#F7FFF0', border: '#C0FFA3' }, // lime mist
  { background: '#FFF0FB', border: '#ECA3FF' }, // orchid pink
];



const fixedEmojiList = [
  '🍎', // Fruits & Vegetables  
  '🐘', // Animal & Birds  
  '👪', // Family & People  
  '📦', // Common Objects  
  '🙋‍♂️', // Greetings & Basics  
  '⏰', // Day & Time Basics  
  '🍽️', // Food & Drinks  
  '🧼', // Daily Routine  
  '🏠', // At Home  
  '📚', // School & Study  
  '🌦️', // Weather & Nature  
  '🏃', // Common Verbs & Actions  
  '😊', // Emotions & Feelings  
  '🏙️', // Places in Town  
  '🚌', // Travel & Transport  
  '🗣️', // Conversations in Context  
  '👷‍♂️', // Jobs & Workplaces  
  '💻', // Technology & Gadgets  
  '📰', // News & Social Media  
  '🎩', // Formal/Informal Speech  
  '📖', // Story Building & Paragraphs  
  '🎉', // Cultural Events & Festivals  
];

const translations = {
  // "crossword puzzle": {
    assamese: "শব্দ ধাঁধা",
    bengali: "শব্দ ধাঁধা",
    bodo: "बिहेब गोंथा",
    dogri: "शब्द पहेली",
    english: "Crossword Puzzle",
    gujarati: "શબ્દપેઢી",
    hindi: "शब्द पहेली",
    kanada: "ಪದಜಾಲ ಪಾಠ",
    kashmiri: "لفظی پہیلی",
    konkani: "शब्दकोड",
    maithili: "शब्द पहेली",
    malayalam: "വാക്കുകൾ കൊണ്ട് കുഴപ്പം",
    manipuri: "পদ শেলফ",
    marathi: "शब्दकोड",
    nepali: "शब्द पहेली",
    odia: "ଶବ୍ଦ ପହେଳୀ",
    punjabi: "ਸ਼ਬਦ ਪਹੇਲੀ",
    sanskrit: "शब्दकोडः",
    santali: "ᱪᱟᱞᱟᱢ ᱯᱟᱞᱤ",
    sindhi: "لفظن جي پزل",
    tamil: "சொல் புதிர்",
    telugu: "పదాల పొడుగు",
    urdu: "الفاظ کا کھیل"
  // }
};
// console.log("CrosswordLevel.js file from [current time] is now loading.");

const getTranslation = (obj, lang) => {
  if (!obj) return '';
  const key = lang === 'gujarati' ? 'gujrati' : lang;
  return obj[key] || obj.english || '';
};

export default function CrosswordLevel({ navigation }) {
  const [unlockedLevel, setUnlockedLevel] = useState(23);
  const [levelStars, setLevelStars] = useState({});
  const [sourceLang, setSourceLang] = useState('english');
  const [targetLang, setTargetLang] = useState('english');
  const [userLang, setUserLang] = useState('english');
  const [lessonData, setLessonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  const translate = (key) => {
    return lessonScreenStrings[key]?.[userLang] || lessonScreenStrings[key]?.english || key;
  };

  // Function to fetch unlocked levels and stars
  const fetchUnlockedLevels = async (userId) => {
    try {
      console.log('Fetching unlocked levels for user:', userId);
      console.log('API URL being used:', API_URL);
      
      if (!userId) {
        console.error('Error: User ID is missing or invalid');
        return;
      }
      
      const apiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const endpoint = `${apiUrl}/api/crossword/unlocked-levels/${userId}`;
      
      console.log('Fetching from endpoint:', endpoint);
      
      const response = await axios.get(endpoint, { 
        timeout: 10000, // 10 second timeout
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = response.data;
      
      console.log('Unlocked levels data:', data);
      
      // Set unlocked level from response
      if (data && data.unlockedLevel) {
        console.log('Setting unlocked level to:', data.unlockedLevel);
        setUnlockedLevel(data.unlockedLevel);
        
        // Cache the unlocked level in AsyncStorage
        await AsyncStorage.setItem('cachedUnlockedLevel', String(data.unlockedLevel));
        
        // Cache the stars data if available
        if (data.stars) {
          await AsyncStorage.setItem('cachedLevelStars', JSON.stringify(data.stars));
        }
      }
      
      // Set stars data if available
      if (data && data.stars) {
        console.log('Setting level stars:', data.stars);
        setLevelStars(data.stars);
      }
    } catch (error) {
      console.error('Error fetching unlocked levels:', error.message);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      } else if (error.request) {
        console.error('Error request:', error.request);
      }
      
      // Fallback to level 1
      setUnlockedLevel(1);
      
      // Try to get cached data from AsyncStorage as fallback
      try {
        const cachedLevel = await AsyncStorage.getItem('cachedUnlockedLevel');
        if (cachedLevel) {
          setUnlockedLevel(parseInt(cachedLevel, 10));
        }
        
        const cachedStars = await AsyncStorage.getItem('cachedLevelStars');
        if (cachedStars) {
          setLevelStars(JSON.parse(cachedStars));
        }
      } catch (storageError) {
        console.error('Error getting cached data:', storageError);
      }
    }
  };

  // Count total categories up to a specific index
  const countCategoriesUpToIndex = (targetIndex) => {
    let count = 0;
    let found = false;
    
    for (let levelIdx = 0; levelIdx < lessonManifest.length && !found; levelIdx++) {
      const level = lessonManifest[levelIdx];
      for (let catIdx = 0; catIdx < level.categories.length && !found; catIdx++) {
        count++;
        if (count === targetIndex) {
          found = true;
          break;
        }
      }
    }
    
    return count;
  };

  // Function to refresh data
  const refreshData = async () => {
    try {
      console.log('Refreshing data...');
      const storedUserId = await AsyncStorage.getItem('userId');
      
      if (storedUserId) {
        setUserId(storedUserId);
        await fetchUnlockedLevels(storedUserId);
      }
      
      // Clear the refresh flag
      await AsyncStorage.setItem('refreshCrosswordLevels', 'false');
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Process lesson data based on unlocked level
  const processLessonData = useCallback((lang, unlockedLevelValue) => {
    console.log('Processing lesson data with unlocked level:', unlockedLevelValue);
    let categoryCount = 0;
    let unlockedFirst = false;
    let flatIndex = 0;

    const levels = lessonManifest.map((level, levelIndex) => {
      const levelTitle = getTranslation(level.levelName, lang);
      const colorTheme = ['green', 'orange', 'blue'][levelIndex] || 'gray';
      const bgColor = ['#e6ffdb', '#ffebd7', '#e0e3ff'][levelIndex];

      const lessons = level.categories.map((category, categoryIndex) => {
        const englishName = getTranslation(category.categoryName, 'english');
        // Skip alphabets category for crossword games
        if (englishName === 'Alphabets') {
          return null;
        }

        categoryCount++;
        const isLocked = categoryCount > unlockedLevelValue;
        // const isStart = !isLocked && !unlockedFirst;
        // if (isStart) unlockedFirst = true;
        const isStart = false; // no tile is marked as selected by default


        const emoji = fixedEmojiList[flatIndex] || '📘';
        const colorIndex = flatIndex % tileColors.length;
        const tileStyle = tileColors[colorIndex];

        flatIndex++;

        return {
          name: getTranslation(category.categoryName, lang),
          levelIndex,
          categoryIndex,
          categoryCount,
          isLocked,
          isStart,
          color: tileStyle.background,
          borderColor: tileStyle.border,
          rawLessons: category.lessons,
          emoji,
        };

      }).filter(lesson => lesson !== null);

      return { title: levelTitle, color: colorTheme, lessons };
    });

    setLessonData(levels);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const storedSource = await AsyncStorage.getItem('sourceLanguage');
        const storedTarget = await AsyncStorage.getItem('targetLanguage');
        const storedUserId = await AsyncStorage.getItem('userId');
        
        const src = langKeyMap[storedSource?.toLowerCase()] || 'english';
        const tgt = langKeyMap[storedTarget?.toLowerCase()] || 'english';

        setSourceLang(src);
        setTargetLang(tgt);
        setUserLang(src);
        setUserId(storedUserId);

        // Fetch unlocked levels first
        if (storedUserId) {
          await fetchUnlockedLevels(storedUserId);
        }
      } catch (error) {
        console.error('Error initializing:', error);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Add focus listener to refresh data when screen is focused
    const onFocus = async () => {
      try {
        // Check if we need to refresh the levels
        const shouldRefresh = await AsyncStorage.getItem('refreshCrosswordLevels');
        if (shouldRefresh === 'true') {
          console.log('Refresh flag detected, refreshing levels...');
          await refreshData();
          // Clear the refresh flag
          await AsyncStorage.setItem('refreshCrosswordLevels', 'false');
        }
      } catch (error) {
        console.error('Error in focus listener:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', onFocus);

    return unsubscribe;
  }, [navigation]);

  // Update lesson data whenever unlockedLevel changes
  useEffect(() => {
    console.log('Unlocked level changed to:', unlockedLevel);
    processLessonData(userLang, unlockedLevel);
  }, [unlockedLevel, userLang, processLessonData]);

  // Function to render stars based on level score
  const renderStars = (levelIndex, categoryIndex, categoryCount) => {
    // Use the category's absolute position as the level key
    const levelKey = `level_${categoryCount}`;
    const score = levelStars[levelKey] || 0;
    
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3].map((star) => (
          <Entypo
            key={star}
            name={star <= score ? "star" : "star-outlined"}
            color={star <= score ? "#FFD700" : "#f04"}
            size={20}
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  const SectionHeader = ({ title, color }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.line} />
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={styles.line} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        {/* <LottieView
          source={require('../../assets/bunny-loading .json')}
          autoPlay
          loop
          style={styles.bunnyLoadingAnimation}
        /> */}
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <Text style={styles.crosswordTitle}>{translations[sourceLang]}</Text>
      <ScrollView>
        {lessonData.map((level, i) => (
          <View key={i}>
            <SectionHeader title={level.title} color={level.color} />
            <View style={styles.lessonContainer}>                
              {level.lessons.map((lesson, j) => (
                <View key={j} style={styles.lessonWrapper}>
                  {!lesson.isLocked && renderStars(i, j, lesson.categoryCount)}
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate('crossword', {
                        lesson: {
                          name: lesson.name,
                          color: lesson.color,
                          rawLessons: lesson.rawLessons,
                          isLocked: lesson.isLocked,
                          levelIndex: i,
                          categoryIndex: j,
                          categoryCount: lesson.categoryCount
                        }
                      });
                    }}
                    style={[
                      styles.lessonButton,
                      {
                        backgroundColor: lesson.color,
                        borderColor: lesson.borderColor,
                        borderWidth: 3,
                      },
                      styles.shadow,
                      lesson.isLocked && styles.lockedButton,
                      lesson.isStart && styles.startBox,
                    ]}

                    disabled={lesson.isLocked}>
                    {lesson.isLocked ? (
                      <>
                        {/* <Ionicons name="lock-closed" size={32} color="#9E9E9E" style={styles.lockIcon} /> */}
                        <Text style={styles.lessonText}>{lesson.name}</Text>
                      </>
                    ) : lesson.isStart ? (
                      <View style={styles.startContainer}>
                        <Text style={styles.emojiIcon}>{lesson.emoji}</Text>
                        <Text style={styles.lessonText}>{lesson.name}</Text>
                      </View>
                    ) : (
                      <View style={styles.unlockedContainer}>
                        <Text style={styles.emojiIcon}>{lesson.emoji}</Text>
                        <Text style={styles.lessonText}>{lesson.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  crosswordTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2C2C',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bunnyLoadingAnimation: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 230,
    height: 80,
    marginBottom: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    marginHorizontal: 10,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#ccc',
  },
  lessonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lessonButton: {
  width: wp('40%'),
  height: 140,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  margin: 10,
  backgroundColor: '#f9f9f9', // soft background
  borderWidth: 2,
  borderColor: '#e0e0e0',
},
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  lockedButton: {
    opacity: 0.6,
  },
  startBox: {
    borderWidth: 2,
    borderColor: '#40d2ae',
  },
  startContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    fontSize: 16,
    color: '#2d2d2d',
    marginBottom: 4,
  },
  emojiIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  lockIcon: {
    marginBottom: 10,
  },
  lessonText: {
  fontSize: 16,
  color: '#333',
  textAlign: 'center',
  marginTop: 4,
},

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
  },
  btmSpace: {
    marginBottom: 55,
  },
  startLesson: {
    color: '#82d3c1',
  },
  intermdlesson: {
    color: '#b17e4e',
  },
  advanceLesson: {
    color: '#5862c4',
  },
  finalAssessmentButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 100,
    justifyContent: 'center',
    backgroundColor: '#14b981',

  },
  finalText: {
    fontWeight: '500',
    color: '#fff',
    textTransform: 'uppercase',
    fontSize: 18,
  },
  unlockedContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  lessonWrapper: {
    position: "relative",
    paddingTop: 10,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    position: "absolute",
    zIndex: 1,
    top: -5,
  },
  starIcon: {
    marginHorizontal: 2,
  },
});
