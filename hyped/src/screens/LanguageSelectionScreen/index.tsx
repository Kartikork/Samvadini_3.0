/**
 * Language Selection Screen
 * 
 * Allows users to select their preferred language
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
  Text
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { setLanguage } from '../../state/languageSlice';
import { setFontSize } from '../../state/fontSizeSlice';
import { GradientBackground } from '../../components/GradientBackground';
import { Footer } from '../../components/Footer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { hypedLogo } from '../../assets';

const ACTIVE_COLOR = '#ff8c42';

const languages = [
  { id: "en", name: "English", englishName: "English", transName: "Choose for English", bgcolor: "#d0f4de" },
  { id: "hi", name: "हिंदी", englishName: "Hindi", transName: "Hindi ke liye chuniye", bgcolor: "#bee1e6" },
  { id: "sa", name: "संस्कृत", englishName: "Sanskrit", transName: "Sanskrit ke liye chuniye", bgcolor: "#f0e68c" },
  { id: "te", name: "తెలుగు", englishName: "Telugu", transName: "Telugu kosam endukondi", bgcolor: "#a9def9" },
  { id: "ta", name: "தமிழ்", englishName: "Tamil", transName: "Tamilukku tervu ceyyavum", bgcolor: "#e4c1f9" },
  { id: "kn", name: "ಕನ್ನಡ", englishName: "Kannada", transName: "Kannadakke agi arisi", bgcolor: "#ede7b1" },
  { id: "bn", name: "বাংলা", englishName: "Bengali", transName: "Banglar janya niron kora", bgcolor: "#fde4cf" },
  { id: "gu", name: "ગુજરાતી", englishName: "Gujarati", transName: "Gujarati mate pasand karo", bgcolor: "#ffcfd2" },
  { id: "ml", name: "മലയാളം", englishName: "Malayalam", transName: "Malayalattinu vendi teranhedu", bgcolor: "#cfbaf0" },
  { id: "mr", name: "मराठी", englishName: "Marathi", transName: "Marathisathi nivad kar", bgcolor: "#8eecf5" },
  { id: "ur", name: "اردو", englishName: "Urdu", transName: "Urdu ke lie chuniye", bgcolor: "#f2d0a9" },
  { id: "as", name: "অসমীয়া", englishName: "Assamese", transName: "Asamiyar babe nirbachan kara", bgcolor: "#FFD700" },
  { id: "brx", name: "बोड़ो", englishName: "Bodo", transName: "Bodo khatir chunav karo", bgcolor: "#FFA07A" },
  { id: "doi", name: "डोगरी", englishName: "Dogri", transName: "Dogri lai chon karo", bgcolor: "#DDA0DD" },
  { id: "ks", name: "کٲشُر", englishName: "Kashmiri", transName: "Kashmiri khatir intikhab karo", bgcolor: "#E6E6FA" },
  { id: "gom", name: "कोंकणी", englishName: "Konkani", transName: "Konkani khatir nivad kar", bgcolor: "#F08080" },
  { id: "mai", name: "मैथिली", englishName: "Maithili", transName: "Maithili ke lie chayan karu", bgcolor: "#00FA9A" },
  { id: "mni", name: "মৈতৈলোন্", englishName: "Manipuri", transName: "Meiteilon-gi matungda chathokpa", bgcolor: "#FF6347" },
  { id: "ne", name: "नेपाली", englishName: "Nepali", transName: "Nepali ko lagi chayan garnus", bgcolor: "#00CED1" },
  { id: "or", name: "ଓଡ଼ିଆ", englishName: "Odia", transName: "Odia pain chayan karantu", bgcolor: "#7FFFD4" },
  { id: "pa", name: "ਪੰਜਾਬੀ", englishName: "Punjabi", transName: "Punjabi lai chunna karo", bgcolor: "#FA8072" },
  { id: "sat", name: "ᱥᱟᱱᱛᱟᱞᱤ", englishName: "Santali", transName: "Santali lagi chayan karo", bgcolor: "#F5DEB3" },
  { id: "satdev", name: "ᱥᱟᱱᱛᱟᱞᱤ", englishName: "Santali(Devnagri)", transName: "Santali Devnagri lagi chayan karo", bgcolor: "#422e9346" },
  { id: "sd", name: "سنڌي", englishName: "Sindhi", transName: "Sindhi le chonjo", bgcolor: "#DEB887" },
  { id: "separator", name: "", englishName: "", transName: "", bgcolor: "#99c1b9" },
  { id: "ar", name: "عربي", englishName: "Arabic", transName: "Ikhtar lil-Arabiyya", bgcolor: "#bdb2ff" },
  { id: "zh", name: "中国人", englishName: "Chinese", transName: "Wei Zhongwen xuanze", bgcolor: "#ffcab1" },
  { id: "fr", name: "Français", englishName: "French", transName: "Choisir pour le Français", bgcolor: "#d3cdc7" },
  { id: "de", name: "Deutsch", englishName: "German", transName: "Für Deutsch auswählen", bgcolor: "#fbe3d0" },
  { id: "it", name: "Italiano", englishName: "Italian", transName: "Scegli per Italiano", bgcolor: "#dfe7fd" },
  { id: "ja", name: "日本", englishName: "Japanese", transName: "Nihongo no tame ni erabu", bgcolor: "#edffbb" },
  { id: "ko", name: "한국인", englishName: "Korean", transName: "Hangukeo-reul seontaekhada", bgcolor: "#97c6f0" },
  { id: "pt", name: "Português", englishName: "Portuguese", transName: "Escolher para Português", bgcolor: "#f4f1bb" },
  { id: "ru", name: "Русский", englishName: "Russian", transName: "Vybrat' dlya Russkogo", bgcolor: "#c2c1c2" },
  { id: "es", name: "Español", englishName: "Spanish", transName: "Elegir para Español", bgcolor: "#c6ffa3" },
  { id: "ms", name: "Melayu", englishName: "Malay", transName: "Pilih untuk Melayu", bgcolor: "#8eecf5" },
  { id: "he", name: "עברית", englishName: "Hebrew", transName: "Bachar le-Ivrit", bgcolor: "#ffd6e0" },
  { id: "ha", name: "Hausa", englishName: "Hausa", transName: "Zaɓi don Hausa", bgcolor: "#e2f0cb" },
  { id: "hu", name: "Magyar", englishName: "Hungarian", transName: "Válassz a Magyarhoz", bgcolor: "#f1c0e8" },
  { id: "ig", name: "Asụsụ Igbo", englishName: "Igbo", transName: "Họrọ maka Igbo", bgcolor: "#bee1e6" },
  { id: "mn", name: "Монгол", englishName: "Mongolian", transName: "Mongolyn khel sonsokh", bgcolor: "#8eecf5" },
  { id: "cs", name: "Česko", englishName: "Czech", transName: "Vybrat pro Češtinu", bgcolor: "#FFD700" },
  { id: "fa", name: "فارسی", englishName: "Persian", transName: "Baraye Farsi entekhab konid", bgcolor: "#c6ffa3" },
  { id: "pl", name: "Polskie", englishName: "Polish", transName: "Wybierz dla Polskiego", bgcolor: "#cfbaf0" },
  { id: "el", name: "Ελληνικά", englishName: "Greek", transName: "Epilexte gia Ellinika", bgcolor: "#8eecf5" },
  { id: "ro", name: "Română", englishName: "Romanian", transName: "Alege pentru Română", bgcolor: "#f1c0e8" },
  { id: "id", name: "Indonesia", englishName: "Indonesian", transName: "Pilih untuk Bahasa Indonesia", bgcolor: "#edffbb" },
  { id: "tr", name: "Türkçe", englishName: "Turkish", transName: "Türkçe için seç", bgcolor: "#ffb3ba" },
  { id: "vi", name: "Tiếng Việt", englishName: "Vietnamese", transName: "Chọn cho Tiếng Việt", bgcolor: "#baffc9" },
  { id: "yo", name: "Yorùbá", englishName: "Yoruba", transName: "Yan fun Yoruba", bgcolor: "#ffdfba" },
  { id: "si", name: "හින්දු", englishName: "Sinhala", transName: "Sinhala sathu thora ganna", bgcolor: "#bee1e6" },
  { id: "so", name: "Af-Soomaali", englishName: "Somali", transName: "U dooro Af-Soomaali", bgcolor: "#d0f4de" },
  { id: "sv", name: "Svenska", englishName: "Swedish", transName: "Välj för Svenska", bgcolor: "#e4c1f9" },
  { id: "sw", name: "Kiswahili", englishName: "Swahili", transName: "Chagua kwa Kiswahili", bgcolor: "#fde4cf" },
  { id: "sk", name: "slovenský", englishName: "Slovak", transName: "Vybrať pre Slovenčinu", bgcolor: "#edffbb" },
  { id: "th", name: "ชาวไทย", englishName: "Thai", transName: "Leuak suam phasa Thai", bgcolor: "#edffbb" },
];

export function LanguageSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentScreen } = (route.params as any) || {};
  const dispatch = useAppDispatch();
  const lang = useAppSelector((state) => state.language.lang);
  const { token, uniqueId } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(false);

  const handleLanguageSelect = async (language: typeof languages[0]) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      // Update language using Redux
      await dispatch(setLanguage(language.id)).unwrap();
      
      // Update font size for specific languages
      if (language.id === 'ta' || language.id === 'ml') {
        await dispatch(setFontSize('very_small')).unwrap();
      } else {
        await dispatch(setFontSize('system')).unwrap();
      }

      // Check auth from Redux (Redux Persist has restored it)
      if (currentScreen) {
        navigation.goBack();
      } else if (token && uniqueId) {
        navigation.navigate('Dashboard' as never);
      } else {
        navigation.navigate('Login' as never);
      }
    } catch (error) {
      console.error('Error selecting language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLanguageItem = (langItem: typeof languages[0]) => {
    const isSelected = lang === langItem.id;
    
    return (
      <TouchableOpacity
        key={langItem.id}
        style={[
          styles.languageBox,
          { backgroundColor: isSelected ? ACTIVE_COLOR : langItem.bgcolor },
        ]}
        disabled={isLoading}
        onPress={() => handleLanguageSelect(langItem)}>
        <Text style={styles.languageName}>{langItem.name}</Text>
        <Text style={styles.languageEnglishName}>
          {langItem.englishName}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Changing language...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <GradientBackground>
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <Image source={hypedLogo} style={styles.hypedLogo} />
            </View>
            
            <View style={styles.languageContainer}>
              <Text style={styles.formTitle}>
                Choose Your Language
              </Text>
              
              <ScrollView
                style={styles.gridScrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>
                <View style={styles.languageGrid}>
                  {languages.map(renderLanguageItem)}
                </View>
              </ScrollView>
            </View>
          </View>
        </GradientBackground>
      </View>
      <Footer />
    </>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.02,
  },
  logoContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  logoText: {
    fontSize: width * 0.1,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
  },
  hypedLogo: {
    width: width * 0.5,
    height: width * 0.3,
    resizeMode: 'contain',
  },
  languageContainer: {
    width: '90%',
    flex: 1,
  },
  formTitle: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000000',
  },
  gridScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  languageBox: {
    width: '48%',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  languageName: {
    fontSize: width * 0.045,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  languageEnglishName: {
    fontSize: width * 0.035,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
