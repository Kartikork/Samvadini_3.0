// PianoGame.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Alert,
  BackHandler,
  AppState,
} from 'react-native';
import SoundPlayer from 'react-native-sound-player';
import Piano from './Piano';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const TILE_HEIGHT = 70;
const FALL_DURATION = 3500;
const notesToPlay = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];

/* ------------------ AUDIO FILES ------------------ */
// All note sounds are stored in android/app/src/main/res/raw as .mp3 or .wav files.
// Map note names to sound file base names (without extension):
const noteToSoundFile = {
  'C4': { name: 'c_note', ext: 'wav' },
  'C#4': { name: 'd_note', ext: 'wav' },
  'D4': { name: 'f_note', ext: 'wav' },
  'D#4': { name: 'g_note', ext: 'wav' },
  'E4': { name: 'a_note', ext: 'wav' },
  'F4': { name: 'c_note', ext: 'wav' },
  'F#4': { name: 'd_note', ext: 'wav' },
  'G4': { name: 'f_note', ext: 'wav' },
  'G#4': { name: 'g_note', ext: 'wav' },
  'A4': { name: 'a_note', ext: 'wav' },
  'A#4': { name: 'c_note', ext: 'wav' },
  'B4': { name: 'd_note', ext: 'wav' },
};

function playNoteSound(note) {
  const sound = noteToSoundFile[note];
  if (!sound) return;
  try {
    SoundPlayer.playSoundFile(sound.name, sound.ext);
  } catch (e) {
    console.log('Failed to play note sound', note, e);
  }
}

/* ------------------ MAIN GAME ------------------ */
export default function PianoGame({ navigation }) {
  // tiles: { id, note, lane, animatedY, anim } where anim is the Animated.timing instance
  const [tiles, setTiles] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const spawnInterval = useRef(null);

  const PLAYABLE_TOP = -TILE_HEIGHT;            // playable as soon as they spawn / visible
  const MISS_Y = SCREEN_HEIGHT;                 // when tile reaches bottom (miss)
  const TILE_HIDE_Y = SCREEN_HEIGHT - 120;      // visual hide point (behind piano)

  /* ------------------ GAME OVER ------------------ */
  const endGame = () => {
    if (gameOver) return;
    setGameOver(true);
    clearInterval(spawnInterval.current);

    Alert.alert(
      'Game Over',
      `Your score: ${score}`,
      [
        {
          text: 'Restart',
          onPress: () => {
            // stop any running animations to avoid callbacks
            tiles.forEach(t => {
              if (t.anim && typeof t.anim.stop === 'function') {
                try { t.anim.stop(); } catch (e) { }
              }
            });

            setTiles([]);
            setScore(0);
            setGameOver(false);
            startGame();
          },
        },
      ],
      { cancelable: false }
    );
  };

  /* ------------------ SPAWN / START ------------------ */
  const startGame = () => {
    spawnInterval.current = setInterval(() => {
      // pick a random note
      const randomNote = notesToPlay[Math.floor(Math.random() * notesToPlay.length)];
      const lane = notesToPlay.indexOf(randomNote);

      const animatedY = new Animated.Value(-TILE_HEIGHT);

      // create animation object so we can stop it when we remove the tile
      const anim = Animated.timing(animatedY, {
        toValue: MISS_Y,
        duration: FALL_DURATION,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const id = Date.now() + Math.floor(Math.random() * 1000);

      const tile = { id, note: randomNote, lane, animatedY, anim };

      // add tile
      setTiles(prev => [...prev, tile]);

      // start animation and check for finish (miss)
      anim.start(({ finished }) => {
        // If the animation finished (tile reached bottom) and tile still exists -> miss -> game over
        if (finished) {
          // check if tile still present
          setTiles(prevTiles => {
            const exists = prevTiles.some(t => t.id === id);
            if (exists) {
              // tile was not hit -> missed -> trigger endGame
              endGame();
            }
            // remove tile from state (cleanup) if it still exists
            return prevTiles.filter(t => t.id !== id);
          });
        }
      });

    }, 1100);
  };

  useEffect(() => {
    // Sound.setCategory('Playback');
    // preloadSounds();
    startGame();

    const onBackPress = () => {
      navigation.navigate('LanguageGameScreen');
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        console.log('App is in background');
      }
    });

    return () => {
      backHandler.remove();
      subscription.remove();
      clearInterval(spawnInterval.current);
      // stop animations on unmount
      tiles.forEach(t => {
        if (t.anim && typeof t.anim.stop === 'function') {
          try { t.anim.stop(); } catch (e) { }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  /* ------------------ KEY PRESS LOGIC ------------------ */
  const handleKeyPress = (note) => {
    if (gameOver) return;

    // play sound
    playNoteSound(note);

    // Find playable tiles: those between PLAYABLE_TOP and MISS_Y (i.e. from spawn to bottom)
    // They can be visible or hidden; both are still hittable until MISS_Y
    const playableTiles = tiles.filter(tile => {
      const y = tile.animatedY.__getValue();
      return y >= PLAYABLE_TOP && y < MISS_Y;
    });

    // If there are no playable tiles at all, ignore wrong presses (no penalty)
    if (playableTiles.length === 0) {
      return;
    }

    // Try to find a matching playable tile for this note.
    // Prefer the top-most matching tile (closest to keys) to avoid hitting far-away duplicates.
    let matchingTile = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    playableTiles.forEach(tile => {
      if (tile.note !== note) return;
      const y = tile.animatedY.__getValue();
      // distance to bottom: smaller = closer to keys/bottom
      const distToBottom = MISS_Y - y;
      if (distToBottom < bestDistance) {
        bestDistance = distToBottom;
        matchingTile = tile;
      }
    });

    if (matchingTile) {
      // Correct press: stop animation and remove tile immediately
      try {
        if (matchingTile.anim && typeof matchingTile.anim.stop === 'function') {
          matchingTile.anim.stop();
        } else {
          matchingTile.animatedY.stopAnimation && matchingTile.animatedY.stopAnimation();
        }
      } catch (e) {
        // swallow stop errors
      }

      // Remove matching tile from state
      setTiles(prev => prev.filter(t => t.id !== matchingTile.id));
      setScore(prev => prev + 10);
      return;
    }

    // No matching playable tile -> this is a WRONG NOTE while there are playable tiles -> GAME OVER
    endGame();
  };

  const laneWidth = SCREEN_WIDTH / notesToPlay.length;

  /* ------------------ RENDER ------------------ */
  return (
    <View style={styles.container}>
      <Text style={styles.score}>Score: {score}</Text>

      <View style={styles.gameArea}>
        {tiles.map(tile => {
          // reading current y for render decisions
          const yVal = tile.animatedY.__getValue();
          const isVisible = yVal < TILE_HIDE_Y; // visually hide behind piano after this point

          return (
            isVisible ? (
              <Animated.View
                key={tile.id}
                style={[
                  styles.tile,
                  {
                    top: tile.animatedY,
                    left: tile.lane * laneWidth + 4,
                    width: laneWidth - 8,
                    zIndex: 1,
                  },
                ]}
              >
                <Text style={styles.tileLabel}>{tile.note}</Text>
              </Animated.View>
            ) : null
          );
        })}
      </View>

      {/* Piano stays above falling tiles */}
      <View style={{ zIndex: 99 }}>
        <Piano onKeyPress={handleKeyPress} />
      </View>
    </View>
  );
}

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  score: {
    fontSize: 26,
    color: 'white',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: 'bold',
  },
  gameArea: {
    flex: 1,
    backgroundColor: '#181818',
  },
  tile: {
    position: 'absolute',
    height: TILE_HEIGHT,
    backgroundColor: '#4dabf7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tileLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});