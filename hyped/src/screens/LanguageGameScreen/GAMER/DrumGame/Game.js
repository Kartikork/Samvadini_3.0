import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Button, Alert, Modal, BackHandler, AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DrumPad from '../DrumGame/DrumPad';
// import TrackPlayer, { Capability } from 'react-native-track-player';
import SoundPlayer from 'react-native-sound-player';

const drumPads = [
  {
    id: 0,
    soundName: 'snare-drum',
    label: 'Kick',
    imageFile: require('./drum1.png'),
  },
  {
    id: 1,
    soundName: 'hand-drum',
    label: 'Snare',
    imageFile: require('./drum2.png'),
  },
  {
    id: 2,
    soundName: 'kick-drum',
    label: 'Hi-Hat',
    imageFile: require('./drum3.png'),
  },
  {
    id: 3,
    soundName: 'clap-drum',
    label: 'Tom',
    imageFile: require('./drum5.png'),
    customImageStyle: { height: 120, width: 120 },
  },
  {
    id: 4,
    soundName: 'cymbal-drum',
    label: 'Cymbal',
    imageFile: require('./drum4.png'),
    customImageStyle: { height: 100, width: 100 },
  },
];


const Game = () => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [activePad, setActivePad] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInstructionVisible, setInstructionVisible] = useState(false);
  const navigation = useNavigation();
  const appState = useRef(AppState.currentState);

  const padTimeout = useRef(null);

  // Initialize TrackPlayer
  /*
  useEffect(() => {
    const setup = async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          capabilities: [Capability.Play],
        });
      } catch (e) {
        console.log('TrackPlayer setup error:', e);
      }
    };
    setup();
  }, []);
  */

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      navigation.navigate('LanguageGameScreen');
      return true; // Prevent default behavior (exit app)
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        // console.log('App has come to the foreground!');
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background - pause game if playing
        if (isPlaying) {
          setIsPlaying(false);
          clearTimeout(padTimeout.current);
          Alert.alert("Paused", "Game paused while you were away.", [
            { text: "Resume", onPress: () => setIsPlaying(true) }
          ]);
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isPlaying]);

  // Function to activate a new random pad
  const nextStep = () => {
    // Ensure any previous timeout is cleared before setting a new one
    clearTimeout(padTimeout.current);

    // Prevent picking the same pad twice in a row
    let nextPadId;
    do {
      nextPadId = Math.floor(Math.random() * drumPads.length);
    } while (nextPadId === activePad);

    setActivePad(nextPadId);

    // If the player doesn't hit the pad in time, it counts as a miss
    padTimeout.current = setTimeout(() => {
      handleMiss();
    }, 1500); // Set to a fixed time of 1.5 seconds
  };

  const handleMiss = () => {
    // This function is now used for both timeouts and wrong presses
    const newLives = lives - 1;
    setLives(newLives);
    if (newLives <= 0) {
      gameOver();
    } else {
      // Move to the next pad without awarding points
      nextStep();
    }
  }

  // Effect to control the game loop
  useEffect(() => {
    if (isPlaying && lives > 0) {
      nextStep(); // Start the first step
    } else if (!isPlaying) {
      clearTimeout(padTimeout.current);
    }
    return () => {
      clearTimeout(padTimeout.current);
    };
  }, [isPlaying, lives]); // Rerun effect if lives change to handle game over

  const handlePadPress = (padId, soundName) => {
    // Play drum sound
    try {
      SoundPlayer.playSoundFile(soundName, 'mp3');
    } catch (e) {}

    if (!isPlaying) return; // Do nothing if the game is not active

    // Player hit the correct pad
    if (padId === activePad) {
      clearTimeout(padTimeout.current); // Prevent timeout miss
      setScore(prevScore => prevScore + 10);
      nextStep(); // Move to the next step
    } else {
      // Player hit the wrong pad
      clearTimeout(padTimeout.current); // Prevent timeout miss
      handleMiss(); // Penalize the player by deducting a life
    }
  };

  const playGame = () => {
    setScore(0);
    setLives(3);
    setActivePad(null);
    setIsPlaying(true);
  };

  const handleStartPress = () => {
    setInstructionVisible(false);
    playGame();
  };

  const showInstructions = () => {
    setInstructionVisible(true);
  }

  const gameOver = () => {
    setIsPlaying(false);
    setActivePad(null);
    Alert.alert(
      'Game Over',
      `Final Score: ${score}`,
      [
        {
          text: 'Restart',
          onPress: playGame, // Restart the game directly
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ],
      { cancelable: false }
    );
  };

  const getPadProps = (pad) => ({
    key: pad.id,
    soundName: pad.soundName,
    label: pad.label,
    imageFile: pad.imageFile,
    onPadPress: () => handlePadPress(pad.id, pad.soundName),
    isActive: activePad === pad.id,
    customImageStyle: pad.customImageStyle || {},
  });

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isInstructionVisible}
        onRequestClose={() => {
          setInstructionVisible(!isInstructionVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Welcome to Reaction Drums!</Text>
            <Text style={styles.modalBody}>
              Hit the highlighted drum pad as quickly as you can.
              Hitting the wrong pad or taking too long will cost you a life.
            </Text>
            <Button title="Let's Go!" onPress={handleStartPress} />
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <Text style={styles.title}>Reaction Drums</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.score}>Score: {score}</Text>
          <Text style={styles.lives}>Lives: {lives}</Text>
        </View>
      </View>

      <View style={styles.drumPadContainer}>
        <View style={styles.drumPairContainer}>
          <DrumPad {...getPadProps(drumPads[0])} />
          <View style={styles.drum5Position}>
            <DrumPad {...getPadProps(drumPads[4])} />
          </View>
        </View>
        <View style={styles.drum2Wrapper}>
          <DrumPad {...getPadProps(drumPads[1])} />
        </View>
        <View style={styles.drumPairContainer}>
          <DrumPad {...getPadProps(drumPads[2])} />
          <View style={styles.drum4Position}>
            <DrumPad {...getPadProps(drumPads[3])} />
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        {!isPlaying && (
          <Button title="Start Game" onPress={showInstructions} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343a40',
    alignItems: 'center',
    justifyContent: 'space-between', // Changed from 'center'
    paddingVertical: 70, // Added vertical padding
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8f9fa',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginTop: 10,
  },
  score: {
    fontSize: 24,
    color: '#e9ecef',
  },
  lives: {
    fontSize: 24,
    color: '#dc3545',
  },
  drumPadContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 10,
    minHeight: 150,
  },
  drumPairContainer: {},
  drum2Wrapper: {
    marginHorizontal: -20,
  },
  drum4Position: {
    position: 'absolute',
    top: -80,
    right: -80,
  },
  drum5Position: {
    position: 'absolute',
    top: -60,
    left: -50,
  },
  controls: {
    minHeight: 40,
    width: '60%',
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontWeight: 'bold',
    fontSize: 20
  },
  modalBody: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  }
});

export default Game;