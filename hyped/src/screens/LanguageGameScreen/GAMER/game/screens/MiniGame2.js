import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Animated, PanResponder, TouchableOpacity, ImageBackground, AppState, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Sound from 'react-native-sound';
import Icon from 'react-native-vector-icons/Ionicons';


const dropSoundFile = require('../../Assets/drop_sound.mp3');
const taskCompleteSoundFile = require('../../Assets/click.mp3');
const backgroundMusicFile = require('../../Assets/background_music_alien.mp3');


const Draggable = ({ children, onDrop, initialPosition, parentLayout, isPaused }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const LEAF_WIDTH = 70;
  const LEAF_HEIGHT = 70;

  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);


  const boundaries = useMemo(() => {
    if (!parentLayout) return null;
    return {
      minTranslateX: -initialPosition.left,
      maxTranslateX: parentLayout.width - initialPosition.left - LEAF_WIDTH,
      minTranslateY: -initialPosition.top,
      maxTranslateY: parentLayout.height - initialPosition.top - LEAF_HEIGHT,
    };
  }, [parentLayout, initialPosition]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPaused,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (e, gesture) => {
        if (!boundaries) return;
        const proposedTotalX = pan.x._offset + gesture.dx;
        const proposedTotalY = pan.y._offset + gesture.dy;
        const clampedTotalX = Math.max(boundaries.minTranslateX, Math.min(proposedTotalX, boundaries.maxTranslateX));
        const clampedTotalY = Math.max(boundaries.minTranslateY, Math.min(proposedTotalY, boundaries.maxTranslateY));
        pan.setValue({
          x: clampedTotalX - pan.x._offset,
          y: clampedTotalY - pan.y._offset,
        });
      },
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        const finalLeafX = initialPosition.left + pan.x._value;
        if (finalLeafX < 5) {
          Animated.parallel([
            Animated.timing(pan, { toValue: { x: pan.x._value - 100, y: pan.y._value }, duration: 300, useNativeDriver: false }),
            Animated.timing(scale, { toValue: 0, duration: 300, useNativeDriver: false }),
          ]).start(() => onDropRef.current && onDropRef.current());
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
        }
      },
    }),
    [isPaused, boundaries, initialPosition]
  );


  const animatedStyle = {
    position: 'absolute',
    top: initialPosition.top,
    left: initialPosition.left,
    transform: [...pan.getTranslateTransform(), { scale: scale }],
  };

  return (
    <Animated.View style={animatedStyle} {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
};


const MiniGame2 = ({ route }) => {
  const { onComplete } = route.params || {};

  const initialLeaves = [
    { id: 1, pos: { top: 20, left: 30 }, image: require('../../Assets/debris_3.png') },
    { id: 2, pos: { top: 90, left: 180 }, image: require('../../Assets/debris_1.png') },
    { id: 3, pos: { top: 190, left: 20 }, image: require('../../Assets/debris_2.png') },
    { id: 4, pos: { top: 150, left: 90 }, image: require('../../Assets/debris_3.png') },
    { id: 5, pos: { top: 30, left: 150 }, image: require('../../Assets/debris_4.png') },
  ];
  
  const [leaves, setLeaves] = useState(initialLeaves);
  const [isTaskComplete, setIsTaskComplete] = useState(false);
  const [leafAreaLayout, setLeafAreaLayout] = useState(null);
  const totalLeavesRef = useRef(initialLeaves.length);
  const [taskProgress, setTaskProgress] = useState(0);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const suckSound = useRef(null);
  const taskCompleteSound = useRef(null);
  const backgroundMusic = useRef(null);
  const appState = useRef(AppState.currentState);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [areSoundsOn, setAreSoundsOn] = useState(true);
  const [isPaused, setIsPaused] = useState(false);


  useEffect(() => {
    Sound.setCategory('Playback');

    suckSound.current = new Sound(dropSoundFile, (error) => {
      if (error) console.log('failed to load the drop sound', error);
    });

    taskCompleteSound.current = new Sound(taskCompleteSoundFile, (error) => {
        if (error) console.log('failed to load the task complete sound', error);
    });

    backgroundMusic.current = new Sound(backgroundMusicFile, (error) => {
        if (error) {
            console.log('failed to load the background music', error);
            return;
        }
        if (isMusicOn) {
            backgroundMusic.current.setNumberOfLoops(-1);
            backgroundMusic.current.play();
        }
    });

    return () => {
      if (suckSound.current) suckSound.current.release();
      if (taskCompleteSound.current) taskCompleteSound.current.release();
      if (backgroundMusic.current) {
        backgroundMusic.current.stop();
        backgroundMusic.current.release();
      }
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            if (backgroundMusic.current && !isTaskComplete && isMusicOn && !isPaused) {
                backgroundMusic.current.play();
            }
        } else if (nextAppState.match(/inactive|background/)) {
            if (backgroundMusic.current) {
                backgroundMusic.current.pause();
            }
        }
        appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
        subscription.remove();
    };
  }, [isTaskComplete, isMusicOn, isPaused]);


  const handleLeafDrop = (leafId) => {
    if (suckSound.current && areSoundsOn) {
      suckSound.current.stop(() => {
        suckSound.current.play();
      });
    }
    setLeaves((prevLeaves) => prevLeaves.filter((leaf) => leaf.id !== leafId));
  };
  
  useEffect(() => {
    const newProgress = 1 - (leaves.length / totalLeavesRef.current);
    setTaskProgress(newProgress);

    if (leaves.length === 0 && !isTaskComplete) {
      if (backgroundMusic.current) {
        backgroundMusic.current.stop();
      }

      if (taskCompleteSound.current && areSoundsOn) {
        taskCompleteSound.current.play((success) => {
            if (!success) console.log('Task complete sound playback failed');
        });
      }

      const timer = setTimeout(() => {
        setIsTaskComplete(true);
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [leaves, isTaskComplete, onComplete, areSoundsOn]);

  const toggleMusic = () => {
    const newIsMusicOn = !isMusicOn;
    setIsMusicOn(newIsMusicOn);
    if (backgroundMusic.current) {
        if (newIsMusicOn && !isPaused) {
            backgroundMusic.current.setNumberOfLoops(-1).play();
        } else {
            backgroundMusic.current.pause();
        }
    }
  };

  const toggleSounds = () => {
    setAreSoundsOn(prev => !prev);
  };

  const openSettings = () => {
    setIsPaused(true);
    if (backgroundMusic.current?.isPlaying()) {
        backgroundMusic.current.pause();
    }
    setIsSettingsVisible(true);
  };

  const closeSettings = () => {
    setIsSettingsVisible(false);
    setIsPaused(false);
    if (isMusicOn && !isTaskComplete) {
        backgroundMusic.current?.play();
    }
  };


  return (
    <View style={styles.container}>
      <Modal
        transparent={true}
        visible={isSettingsVisible}
        animationType="fade"
        onRequestClose={closeSettings}
      >
        <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Settings</Text>

                <TouchableOpacity style={styles.settingOption} onPress={toggleMusic}>
                    <Text style={styles.settingText}>Background Music</Text>
                    <Text style={styles.settingStatus}>{isMusicOn ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingOption} onPress={toggleSounds}>
                    <Text style={styles.settingText}>Drag Sound</Text>
                    <Text style={styles.settingStatus}>{areSoundsOn ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeSettings}
                >
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <View style={styles.gameContainer}>
        <ImageBackground
            source={require('../../Assets/minigame_background.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
          {/* MODIFICATION: Use the openSettings function */}
          <TouchableOpacity style={styles.topRightButton} onPress={openSettings}>
            <Icon name="settings-sharp" size={30} color="white" />
          </TouchableOpacity>

          <View style={styles.topLeftUI}>
            <View style={styles.taskList}>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${taskProgress * 100}%` }]} />
                </View>
                <Text style={styles.taskText}>Drag the leaves to the panel</Text>
            </View>
          </View>

          {!isTaskComplete && (
            <View style={styles.modalBorder}>
              <View style={styles.modalContent}>
                <ImageBackground 
                  source={require('../../Assets/vent.png')} 
                  style={[styles.ventArea, isHintVisible && styles.hintGlow]}
                  resizeMode="cover"
                >
                </ImageBackground>

                <LinearGradient
                  colors={['#4c669f', '#3b5998', '#192f6a']}
                  start={{x: 0, y: 0}}
                  end={{x: 0, y: 1}}
                  style={styles.leafArea}
                  onLayout={(event) => setLeafAreaLayout(event.nativeEvent.layout)}
                >
                  {leafAreaLayout && leaves.map((leaf) => (
                    <Draggable 
                      key={leaf.id} 
                      onDrop={() => handleLeafDrop(leaf.id)} 
                      initialPosition={leaf.pos}
                      parentLayout={leafAreaLayout}
                      // MODIFICATION: Pass the paused state to the Draggable component
                      isPaused={isPaused}
                    >
                      <Image source={leaf.image} style={styles.leaf}/>
                    </Draggable>
                  ))}
                </LinearGradient>

              </View>
               <Text style={styles.o2Label}></Text>
            </View>
          )}

          {isTaskComplete && (
            <View style={styles.taskCompleteContainer}>
                <Text style={styles.taskCompleteText}>Task Complete</Text>
            </View>
          )}

          <View style={styles.joystickArea} />
        </ImageBackground>
      </View>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333' },
  gameContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 20, 
  },
  topLeftUI: { position: 'absolute', top: 20, left: 10, right: 10, zIndex: 10 },
  taskList: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 5, width: 'auto' },
  progressBarContainer: { height: 20, width: '100%', backgroundColor: 'black', borderRadius: 4, marginBottom: 8},
  progressBar: { height: '100%', backgroundColor: '#7FFF00', borderRadius: 4},
  taskText: { color: '#7FFF00', fontSize: 13, lineHeight: 18 },
  joystickArea: { position: 'absolute', bottom: 40, left: 20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 10 },
  modalBorder: {
    backgroundColor: 'black',
    padding: 5,
    borderRadius: 5,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 5,
    borderWidth: 2,
    borderColor: '#121111ff'
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#C7C7C7',
    flexDirection: 'row',
  },
  ventArea: { 
    width: 70, 
    borderRadius: 5,
    overflow: 'hidden',
  },
  hintGlow: {
    backgroundColor: '#fffcab',
    shadowColor: '#ffc400',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  leafArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#0b0b0bff',
  },
  leaf: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
  o2Label: { marginTop: 10, fontSize: 24, color: 'black', fontWeight: 'bold' },
  taskCompleteContainer: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 20, paddingHorizontal: 40, borderRadius: 10, zIndex: 20 },
  taskCompleteText: { fontSize: 32, color: '#7FFF00', fontWeight: 'bold' },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalView: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderColor: '#FFF',
    borderWidth: 1,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  settingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 10,
  },
  settingText: {
    color: 'white',
    fontSize: 16,
  },
  settingStatus: {
    color: '#7FFF00',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#555',
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    marginTop: 15,
    width: '100%',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default MiniGame2;