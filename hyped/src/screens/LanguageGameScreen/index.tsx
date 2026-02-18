import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  BackHandler,
  Modal,
  Dimensions,
  PixelRatio
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import translations from './Assets/Data/games.json';
// import gameIcn1 from './Assets/gamIcn1.png';
import gameIcn2 from './Assets/gamIcn2.png';
import gameIcn3 from './Assets/gamIcn3.png';



import WaveBackground from '../../screens/LanguageGameScreen/GAMER/WaveBackground';
// import block_game_icon from '../GAMER/Assets/block_game_icon.jpg';

import Bird_icon from '../GAMER/Assets/Bird_icon.png';
import fruit_slice_icon from '../../screens/LanguageGameScreen/GAMER/icons/fruit_slice.png';



import carrom_icon from '../../screens/LanguageGameScreen/GAMER/icons/carrom_icon.png';
import NumberSort from '../../screens/LanguageGameScreen/GAMER/icons/NumberSort.png';
import Pongicon1 from '../../screens/LanguageGameScreen/GAMER/icons/Pongicon1.png';

interface GameProps {
  icon: any;
  image: any;
  title: string;
  index?: number;
  onPress: () => void;
  showDesign: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const wp = (percentage: number) => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(value);
};

const hp = (percentage: number) => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(value);
};

import snakeladder from '../../screens/LanguageGameScreen/GAMER/icons/snakeladder_icon.jpg';
const LanguageGamesScreen = ({ navigation }: { navigation: any }) => {
  const [sourceLanguage, setSourceLanguage] = useState('english');
  const [isLoading, setIsLoading] = useState(true);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showDesign, setShowDesign] = useState(true);
  const [totalCoins, setTotalCoins] = useState(0);

  const countdownInterval = useRef(null);

  const generateScatterPosition = useCallback((index: number) => {
    const basePositions = [
      { x: -150, y: -250 },
      { x: 180, y: -200 },
      { x: -130, y: 220 },
      { x: 160, y: 180 },
      { x: -100, y: 300 },
      { x: 100, y: 250 },
      { x: 0, y: 350 },
    ];

    if (index < basePositions.length) {
      return basePositions[index];
    }

    const row = Math.floor((index - basePositions.length) / 2);
    const isLeft = (index - basePositions.length) % 2 === 0;
    return {
      x: isLeft ? -150 : 150,
      y: 400 + (row * 50)
    };
  }, []);

  const games = useMemo(() => {
    const sections = [
      {
        section: 'Offline Games',
        items: [
          { icon: snakeladder, image: require('../../screens/LanguageGameScreen/GAMER/icons/snakeladder_icon.jpg'), title: 'Snake & Ladders', route: 'SnakeLaddersGame' },
          { icon: carrom_icon, image: require('../../screens/LanguageGameScreen/GAMER/CarromGame/carrom_icon.png'), title: 'CarromGame', route: 'CarromGame' },
          { icon: Pongicon1, image: require('../../screens/LanguageGameScreen/GAMER/Chess/chess.png'), title: 'Chess', route: 'chess' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/space_icon.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/space_icon.png'), title: 'Space Exploration', route: 'PlanetSelectionScreen' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/ludo_icon_new.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/ludo_icon_new.png'), title: 'Ludo', route: 'LudoWelcomeScreen' },
          { icon: Pongicon1, image: require('../../screens/LanguageGameScreen/GAMER/icons/slingshot.png'), title: 'Space Shooter', route: 'BalloonShootingGame' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/car_logo.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/car_logo.png'), title: 'Car Race', route: 'CarGame' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/gilli.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/gilli.png'), title: 'Gilli Danda', route: 'TipCat' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/basketball.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/basketball.png'), title: 'BasketBall', route: 'Basketball' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/cross-word.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/cross-word.png'), title: 'Crossword', route: 'crossword' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/memory.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/memory.png'), title: 'Memory Game', route: 'MemoryGame' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/snake.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/snake.png'), title: 'Snake Game', route: 'SnakeGameIntroScreen' },
          // { icon: block_game_icon, image: require('../../assets/games/block.png'), title: 'Block Puzzle', route: 'IntroScreen' },
          { icon: fruit_slice_icon, image: require('../../screens/LanguageGameScreen/GAMER/icons/fruit-slice.png'), title: 'Fruit Slice', route: 'SliceGame' },
          // { icon: gameIcn1, image: require('../../assets/games/sentence.png'), title: 'Sentence Scramble', route: 'SentenceScrambleScreen' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/bubble-shooter.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/bubble-shooter.png'), title: 'Bubble Shooter', route: 'BubbleShooterGame' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/tictactoe_icon2.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/tictactoe_icon2.png'), title: 'Tic Tac Toe', route: 'TicTacToe' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/maze.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/maze.png'), title: 'Maze Game', route: 'MazeGame' },
          { icon: NumberSort, image: NumberSort, title: 'NumberSort', route: 'NumberSortIntroScreen' },
          { icon: Pongicon1, image: Pongicon1, title: 'Pong', route: 'pong' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/bowling_icon.jpg'), image: require('../../screens/LanguageGameScreen/GAMER/icons/bowling_icon.jpg'), title: 'Desi Bowling', route: 'BowlingGame' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/drum_icon.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/drum_icon.png'), title: 'DrumGame', route: 'DrumGame' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/pianologo.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/pianologo.png'), title: 'Piano Game', route: 'PianoGame' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/talkingtom_icon.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/talkingtom_icon.png'), title: 'Talking Tom', route: 'talkingtom' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/icons/mathicon.png'), image: require('../../screens/LanguageGameScreen/GAMER/icons/mathicon.png'), title: 'Math Tug of War', route: 'MathTugOfWar' },
        ]
      },
      {
        section: 'Online Games',
        items: [
          // { icon: doodleDashIcon, image: require('../../assets/games/dash.png'), title: 'Doodle Dash', route: 'EnterScribble' },
          { icon: require('../../screens/LanguageGameScreen/GAMER/antarakshari/antakshari.png'), image: require('../../screens/LanguageGameScreen/GAMER/antarakshari/antakshari.png'), title: 'Antaksahri Arena', route: 'homescreen' }
        ]
      },
    ];

    // assign sequential indexes across both sections so animations and mapping stay consistent
    let idx = 0;
    return sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({ ...item, index: idx++ })),
    }));
  }, []);

  const totalGamesCount = useMemo(() => {
    return games.reduce((total, section) => total + section.items.length, 0);
  }, [games]);

  // removed animated values to improve initial render performance
  const [imagesPrefetched, setImagesPrefetched] = useState(false);

  const loadLanguage = useCallback(async () => {
    setIsLoading(true);
    const lang = await AsyncStorage.getItem('sourceLanguage');
    setSourceLanguage(lang ? lang.toLowerCase() : 'english');
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Dashboard');
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [navigation]),
  );

  const loadCoins = useCallback(async () => {
    try {
      const savedCoinsRaw = await AsyncStorage.getItem('snakeGameTotalCoins');

      // First-time install/download -> give 5000 coins and persist locally (no server calls)
      let localCoins = 0;
      if (savedCoinsRaw === null) {
        localCoins = 5000; // Default to 5000 coins
        try {
          await AsyncStorage.setItem('snakeGameTotalCoins', JSON.stringify(localCoins));
        } catch (e: any) {
          console.warn('Failed to persist default coins locally.', e?.message || e);
        }
        setTotalCoins(localCoins);
        return;
      }

      try {
        // Parse the saved coins as a stringified JSON first, then convert to Number
        localCoins = Number(JSON.parse(savedCoinsRaw)) || 0;
      } catch (e) {
        localCoins = 0;
      }

      // Use only local coins (no API / server sync)
      setTotalCoins(localCoins);
    } catch (error) {
      console.log('Failed to load coins on language screen.', error);
      // fallback to 5000 to ensure users always see a starting amount
      setTotalCoins(5000);
    }
  }, []);

  useEffect(() => {
    loadLanguage();
    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [loadLanguage]);

  const translate = useCallback((key: string) => key, [sourceLanguage]);

  // const headingText = translate('');
  // const getColorForIndex = useMemo(
  //   () => (i) => {
  //     const sequence = ['#6BCB77', '#6BCB77', '#6BCB77', '#FFA500', '#FFA500', '#FFA500', '#007AFF', '#007AFF', '#007AFF'];
  //     return sequence[i % sequence.length];
  //   },
  //   []
  // );

  useEffect(() => {
    // Prefetch all game images and icons to improve perceived load speed.
    const prefetch = async () => {
      try {
        const imgs = [];
        games.forEach((section) => section.items.forEach((item) => {
          if (item.image) imgs.push(item.image);
          if (item.icon) imgs.push(item.icon);
        }));
        imgs.push(require('../../screens/LanguageGameScreen/GAMER/gif&png/coin2.png'), require('../LanguageGameScreen/GAMER/gif&png/gameSlider.png'));

        const uniqueUris = [...new Set(
          imgs.filter(Boolean).map((img) => Image.resolveAssetSource(img).uri)
        )];

        await Promise.all(uniqueUris.map((uri) => Image.prefetch(uri).catch(() => { })));
      } catch (e) {
        // ignore
      } finally {
        setImagesPrefetched(true);
      }
    };

    prefetch();
  }, [games]);

  useFocusEffect(
    useCallback(() => {
      loadCoins();
    }, [loadCoins])
  );





  const AnimatedGame = React.memo(({ icon, image, title, index, onPress, showDesign }: GameProps) => {
    // Render without entrance animations for faster load and lower CPU usage
    return (
      <View>
        <GameButton icon={icon} image={image} title={title} onPress={onPress} showDesign={showDesign} />
      </View>
    );
  });



  const renderHeading = () => (
    <View style={styles.headingWrapper}>
      <WaveBackground />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ padding: 10 }}>
          <Image source={require('../LanguageGameScreen/GAMER/gif&png/gameSlider.png')} resizeMode='contain' fadeDuration={0} style={{ width: "100%", height: 130, borderRadius: 10 }} />
        </View>

        {renderHeading()}

        <View style={styles.grid}>
          {games.map((section, idx) => (
            <React.Fragment key={idx}>

              <View style={styles.coinContainer}>
                <Image source={require('../LanguageGameScreen/GAMER/gif&png/coin2.png')} fadeDuration={0} style={{ width: 22, height: 22 }} />
                <Text style={styles.coinText}>{totalCoins}</Text>
              </View>


              {Array.from({ length: Math.ceil(section.items.length / 2) })
                .map((_, rowIndex) => (
                  <View key={rowIndex} style={styles.row}>
                    {section.items.slice(rowIndex * 2, rowIndex * 2 + 2).map((game) => (
                      <AnimatedGame
                        key={game.index}
                        icon={game.icon}
                        image={game.image}
                        title={translate(game.title)}
                        index={game.index}
                        showDesign={showDesign}
                        onPress={() => navigation.navigate(game.route)}
                      />
                    ))}
                  </View>
                ))}
            </React.Fragment>
          ))}
        </View>
        {showCountdownModal && (
          <Modal transparent animationType="fade" visible={showCountdownModal}>
            <View style={styles.modalWrapper}>
              <View style={styles.modalOverlay}>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownTitle}>
                    {translate('Get Ready')}
                    <Text style={{ color: 'red' }}> ! ! !</Text>
                  </Text>
                  <Text style={styles.countdownText}>{translate('Redirect')}</Text>
                  <Text style={styles.countdownNumber}>{countdown}</Text>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>

    </View>
  );
};

const GameButton = React.memo(({ icon, image, title, onPress, showDesign }: GameProps) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    {showDesign ? (
      <Image source={image} fadeDuration={0} style={styles.fullImage} />
    ) : (
      <>
        <Image source={icon} fadeDuration={0} style={styles.image} />
        <Text style={styles.title}>{title}</Text>
      </>
    )}
  </TouchableOpacity>
));



const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    paddingBottom: 20,
  },
  headingWrapper: {
    alignItems: 'center',
  },
  headingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 0,
    marginBottom: 10,
  },
  animatedLetter: {
    marginHorizontal: 1,
  },
  fallingIcon: {
    fontSize: 20,
    marginBottom: 5,
    marginHorizontal: 4,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    paddingTop: 40,
  },
  grid: {
    alignItems: 'center',

  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: wp(90),
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    color: '#212121',
    fontWeight: 'bold',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    width: wp(43),
    height: hp(20),
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  image: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'cover',
  },
  title: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  changeBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 15
  },
  changeText: {
    color: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  countdownBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: '#ccc',
    elevation: 10,
  },
  countdownTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  countdownNumber: {
    fontSize: 36,
    color: '#007AFF',
  },

});

export default LanguageGamesScreen;