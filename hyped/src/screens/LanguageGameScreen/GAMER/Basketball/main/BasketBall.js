import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  ImageBackground,
  Modal,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  BackHandler,
  Switch, // ✅ Added
} from 'react-native';

import Ball from '../components/Ball';
import Hoop from '../components/Hoop';
import Net from '../components/Net';
import Floor from '../components/Floor';
import Emoji from '../components/Emoji';
import Score from '../components/Score';
import Vector from '../components/Vector';

import SoundPlayer from 'react-native-sound-player';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// physical variables
const gravity = 0.6;
const radius = 48;
const rotationFactor = 10;

// components sizes and positions
const FLOOR_HEIGHT = 48;
const FLOOR_Y = 11;
const HOOP_Y = Dimensions.get('window').height - 227;
const NET_HEIGHT = 6;
const NET_WIDTH = 83;
const NET_Y = Dimensions.get('window').height - 216;
const NET_X = Dimensions.get('window').width / 2 - NET_WIDTH / 2;
const NET_LEFT_BORDER_X = NET_X + NET_HEIGHT / 2;
const NET_LEFT_BORDER_Y = NET_Y;
const NET_RIGHT_BORDER_X = NET_X + NET_WIDTH - NET_HEIGHT / 2;
const NET_RIGHT_BORDER_Y = NET_LEFT_BORDER_Y;

// ball lifecycle
const LC_WAITING = 0;
const LC_STARTING = 1;
const LC_FALLING = 2;
const LC_BOUNCING = 3;
const LC_RESTARTING = 4;
const LC_RESTARTING_FALLING = 5;

class Basketball extends Component {
  constructor(props) {
    super(props);

    this.interval = null;

    // sound event listener handle
    this.finishedPlayingListener = null;

    this.state = {
      x: Dimensions.get('window').width / 2 - radius,
      y: FLOOR_Y,
      vx: 0,
      vy: 0,
      rotate: 0,
      scale: 1,
      lifecycle: LC_WAITING,
      scored: null,
      score: 0,
      showInstructions: true,
      showCelebration: false,
      fadeAnim: new Animated.Value(0),
      scaleAnim: new Animated.Value(0.5),
      // ⚙️ Settings-related states
      showSettings: false,
      bgMusicOn: true,
      effectsOn: true,
    };

    // sounds are played via react-native-sound-player when needed
  }

  componentDidMount() {
    this.interval = setInterval(this.update.bind(this), 1000 / 60);

    // ✅ Handle Android hardware back button
    this.backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      this.stopAllSounds();
      if (this.props.navigation) {
        this.props.navigation.goBack();
        return true;
      }
      return false;
    });

    // Listen for finished playing to loop background music if enabled
    try {
      this.finishedPlayingListener = SoundPlayer.addEventListener('FinishedPlaying', () => {
        if (this.state.bgMusicOn) {
          try {
            SoundPlayer.playSoundFile('birdschirping', 'mp3');
          } catch (e) {
            console.warn('Basketball: failed to replay bg music', e && e.message ? e.message : e);
          }
        }
      });
    } catch (e) {
      console.warn('Basketball: failed to add FinishedPlaying listener', e);
    }

    // start background music if enabled
    if (this.state.bgMusicOn) this.playBgMusic();
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
    // this.stopAllSounds();
    this.stopAllSounds();
    if (this.backHandler) this.backHandler.remove();
    try {
      if (this.finishedPlayingListener && typeof this.finishedPlayingListener.remove === 'function') {
        this.finishedPlayingListener.remove();
      }
    } catch (e) {
      console.warn('Basketball: error removing FinishedPlaying listener', e);
    }
  }

  // ✅ Stops all sounds when exiting
  // stopAllSounds = () => {
  //   if (this.scoreSound) {
  //     this.scoreSound.stop();
  //     this.scoreSound.release();
  //   }
  //   if (this.missSound) {
  //     this.missSound.stop();
  //     this.missSound.release();
  //   }
  //   if (this.bgMusic) {
  //     this.bgMusic.stop(() => this.bgMusic.release());
  //   }
  // };

  playScoreEffect = () => {
    if (this.state.effectsOn) this.playScoreSound();

    this.setState({ showCelebration: true }, () => {
      this.state.fadeAnim.setValue(0);
      this.state.scaleAnim.setValue(0.5);

      Animated.parallel([
        Animated.timing(this.state.fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(this.state.scaleAnim, {
          toValue: 1.2,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(this.state.fadeAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(this.state.scaleAnim, {
              toValue: 0.5,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start(() => this.setState({ showCelebration: false }));
        }, 1000);
      });
    });
  };

  onStart(angle) {
    if (this.state.lifecycle === LC_WAITING) {
      this.setState({ vx: angle * 0.2, vy: -16, lifecycle: LC_STARTING });
    }
  }

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  circlesColliding(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    return Math.sqrt(dx * dx + dy * dy) < circle1.radius + circle2.radius;
  }

  updateCollisionVelocity(nextState, ball, netBorder) {
    const xDistance = netBorder.x - ball.x;
    const yDistance = netBorder.y - ball.y;
    let normalVector = new Vector(xDistance, yDistance).normalise();
    const tangentVector = new Vector(normalVector.getY() * -1, normalVector.getX());

    const ballScalarNormal = normalVector.dot(ball.velocity);
    const netScalarNormal = normalVector.dot(netBorder.velocity);
    const ballScalarTangential = tangentVector.dot(ball.velocity);

    const ballScalarNormalAfter =
      (ballScalarNormal * (ball.mass - netBorder.mass) + 2 * netBorder.mass * netScalarNormal) /
      (ball.mass + netBorder.mass);

    const ballScalarNormalAfterVector = normalVector.multiply(ballScalarNormalAfter);
    const ballScalarNormalVector = tangentVector.multiply(ballScalarTangential);
    const nextVelocity = ballScalarNormalVector.add(ballScalarNormalAfterVector);

    nextState.vx = ball.y < NET_Y + NET_HEIGHT / 2 ? nextVelocity.x : -nextVelocity.x;
    nextState.vy = nextVelocity.y;
    nextState.x = this.state.x + nextState.vx;
    nextState.y = this.state.y - nextState.vy;
  }

  handleCollision(nextState) {
    if (![LC_FALLING, LC_BOUNCING].includes(nextState.lifecycle)) return;

    const ball = {
      x: nextState.x + radius,
      y: nextState.y + radius,
      radius: radius * nextState.scale,
      velocity: { getX: () => this.state.vx, getY: () => this.state.vy },
      mass: 2,
    };

    const borders = [
      { x: NET_LEFT_BORDER_X, y: NET_LEFT_BORDER_Y },
      { x: NET_RIGHT_BORDER_X, y: NET_RIGHT_BORDER_Y },
    ];

    borders.forEach((b) => {
      const border = { ...b, radius: NET_HEIGHT / 2, velocity: { getX: () => 0, getY: () => 0 }, mass: 10 };
      if (this.circlesColliding(ball, border)) {
        nextState.lifecycle = LC_BOUNCING;
        this.updateCollisionVelocity(nextState, ball, border);
      }
    });
  }

  updateVelocity(nextState) {
    nextState.vx = this.state.vx;
    nextState.vy =
      nextState.lifecycle === LC_STARTING && nextState.y < NET_Y - 200 ? this.state.vy : this.state.vy + gravity;
  }

  updatePosition(nextState) {
    nextState.x = this.state.x + nextState.vx;
    nextState.y = this.state.y - nextState.vy;

    if (nextState.lifecycle === LC_STARTING && nextState.y < this.state.y) nextState.lifecycle = LC_FALLING;
    if (nextState.lifecycle === LC_RESTARTING && nextState.y < this.state.y)
      nextState.lifecycle = LC_RESTARTING_FALLING;

    if (this.state.scored === null) {
      if (this.state.y + radius > NET_Y + NET_HEIGHT / 2 && nextState.y + radius < NET_Y + NET_HEIGHT / 2) {
        if (nextState.x + radius > NET_LEFT_BORDER_X && nextState.x + radius < NET_RIGHT_BORDER_X) {
          nextState.scored = true;
          nextState.score += 1;
          this.playScoreEffect();
        } else {
          nextState.scored = false;
          if (this.state.effectsOn) this.playMissSound();
        }
      }
    }
  }

  updateScale(nextState) {
    if ([LC_BOUNCING, LC_RESTARTING, LC_RESTARTING_FALLING].includes(nextState.lifecycle)) return;
    let scale = this.state.scale;
    if (scale > 0.4 && this.state.y > FLOOR_HEIGHT) scale -= 0.01;
    nextState.scale = scale;
  }

  updateRotate(nextState) {
    nextState.rotate = this.state.rotate + nextState.vx * rotationFactor;
  }

  handleRestart(nextState) {
    if (nextState.lifecycle === LC_RESTARTING_FALLING && nextState.y <= FLOOR_Y) {
      nextState.y = FLOOR_Y;
      nextState.vx = 0;
      nextState.vy = 0;
      nextState.rotate = 0;
      nextState.scale = 1;
      nextState.lifecycle = LC_WAITING;
      nextState.scored = null;
    }

    const outOfScreen =
      nextState.x > Dimensions.get('window').width + 100 || nextState.x < 0 - radius * 2 - 100;

    if (
      outOfScreen ||
      (([LC_FALLING, LC_BOUNCING].includes(nextState.lifecycle)) &&
        nextState.y + radius * nextState.scale * 2 < FLOOR_Y + radius * -2)
    ) {
      if (outOfScreen && nextState.scored === null) nextState.scored = false;

      nextState.y = FLOOR_Y;
      nextState.x = this.randomIntFromInterval(4, Dimensions.get('window').width - radius * 2 - 4);
      if (!nextState.scored) nextState.score = 0;

      nextState.vy = -8;
      nextState.vx = 0;
      nextState.scale = 1;
      nextState.rotate = 0;
      nextState.lifecycle = LC_RESTARTING;
    }
  }

  update() {
    if (this.state.lifecycle === LC_WAITING) return;

    let nextState = { ...this.state };
    this.updateVelocity(nextState);
    this.updatePosition(nextState);
    this.updateScale(nextState);
    this.updateRotate(nextState);
    this.handleCollision(nextState);
    this.handleRestart(nextState);

    this.setState(nextState);
  }

  // // 🎛️ Settings handlers
  toggleBgMusic = (value) => {
    this.setState({ bgMusicOn: value }, () => {
      if (value) this.playBgMusic();
      else this.stopBgMusic();
    });
  };

  toggleEffects = (value) => {
    this.setState({ effectsOn: value });
  };

  /* Sound helpers using react-native-sound-player */
  playScoreSound = () => {
    try {
      console.log('Basketball: playing score sound truck_horn.mp3');
      SoundPlayer.playSoundFile('truck_horn', 'mp3');
    } catch (e) {
      console.warn('Basketball: failed to play score sound', e && e.message ? e.message : e);
    }
  };

  playMissSound = () => {
    try {
      console.log('Basketball: playing miss sound ayen.mp3');
      SoundPlayer.playSoundFile('ayen', 'mp3');
    } catch (e) {
      console.warn('Basketball: failed to play miss sound', e && e.message ? e.message : e);
    }
  };

  playBgMusic = () => {
    try {
      console.log('Basketball: playing background music birdschirping.mp3');
      SoundPlayer.playSoundFile('birdschirping', 'mp3');
    } catch (e) {
      console.warn('Basketball: failed to play bg music', e && e.message ? e.message : e);
    }
  };

  stopBgMusic = () => {
    try {
      console.log('Basketball: stopping bg music');
      SoundPlayer.stop();
    } catch (e) {
      console.warn('Basketball: failed to stop bg music', e && e.message ? e.message : e);
    }
  };

  stopAllSounds = () => {
    try {
      console.log('Basketball: stopping all sounds');
      SoundPlayer.stop();
    } catch (e) {
      console.warn('Basketball: failed to stop all sounds', e && e.message ? e.message : e);
    }
  };

  renderSettings() {
    if (!this.state.showSettings) return null;
    return (
      <View style={styles.settingsContainer}>
        <Text style={styles.settingsTitle}>Settings</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Background Music</Text>
          <Switch
            value={this.state.bgMusicOn}
            onValueChange={this.toggleBgMusic}
            thumbColor="#fff"
            trackColor={{ false: '#555', true: '#4caf50' }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Effects</Text>
          <Switch
            value={this.state.effectsOn}
            onValueChange={this.toggleEffects}
            thumbColor="#fff"
            trackColor={{ false: '#555', true: '#4caf50' }}
          />
        </View>
      </View>
    );
  }

  renderNet(render) {
    return render ? <Net y={NET_Y} x={NET_X} height={NET_HEIGHT} width={NET_WIDTH} /> : null;
  }

  renderFloor(render) {
    if ([LC_RESTARTING, LC_RESTARTING_FALLING].includes(this.state.lifecycle)) render = !render;
    return render ? <Floor height={FLOOR_HEIGHT} /> : null;
  }

  hideInstructions = () => this.setState({ showInstructions: false });

  renderInstructions() {
    return (
      <Modal animationType="fade" transparent={true} visible={this.state.showInstructions} onRequestClose={this.hideInstructions}>
        <View style={styles.instructionContainer}>
          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>How to Play</Text>
            <Text style={styles.instructionText}>
              1. Tap and drag the ball to aim{'\n'}
              2. Release to shoot the ball{'\n'}
              3. Score points by getting the ball through the hoop{'\n'}
              4. Missing a shot resets your score{'\n'}
              5. Try to get a high score!
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={this.hideInstructions}>
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  renderCelebration() {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.celebrationContainer,
          {
            opacity: this.state.fadeAnim,
            transform: [{ scale: this.state.scaleAnim }],
          },
        ]}
      >

        <Image
          source={require('../assets/cheer-cheers.gif')}
          style={{
            width: 290,
            height: 250,
            resizeMode: 'contain',
            position: 'center',
            left: width * 0.02,
            bottom: 150,
          }}
        />
      </Animated.View>
    );
  }

  render() {
    return (
      <ImageBackground
        source={require('../assets/basketballgames.jpg')}
        style={{ flex: 1, resizeMode: 'cover' }}
      >
        <View style={styles.container}>
          {/* ⚙️ Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => this.setState({ showSettings: !this.state.showSettings })}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>

          {this.renderSettings()}

          <Score y={FLOOR_HEIGHT * 3} score={this.state.score} scored={this.state.scored} />
          <Hoop y={HOOP_Y} />
          {this.renderNet(this.state.lifecycle === LC_STARTING)}
          {this.renderFloor(this.state.vy <= 0)}

          <Ball
            onStart={this.onStart.bind(this)}
            x={this.state.x}
            y={this.state.y}
            radius={radius}
            rotate={this.state.rotate}
            scale={this.state.scale}
          />

          {this.renderNet(this.state.lifecycle !== LC_STARTING)}
          {this.renderFloor(this.state.vy > 0)}
          <Emoji y={NET_Y} scored={this.state.scored} />
          {this.renderInstructions()}
        </View>

        {this.renderCelebration()}
      </ImageBackground>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  settingsButton: {
    position: 'absolute',
    top: 45,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 12,
    zIndex: 999,
  },
  settingsContainer: {
    position: 'absolute',
    top: 90,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 12,
    zIndex: 998,
    width: 200,
  },
  settingsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  switchLabel: {
    color: 'white',
    fontSize: 15,
  },
  instructionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  instructionBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
  },
  instructionTitle: {
    fontSize: 22,
    marginBottom: 20,
    color: '#212121',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 28,
    marginBottom: 25,
    color: '#444',
  },
  startButton: {
    backgroundColor: '#4169e1',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startButtonText: { color: 'white', fontSize: 16 },
  celebrationContainer: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
});

// ✅ Wrapper to inject navigation
function BasketballWrapper(props) {
  const navigation = useNavigation();
  return <Basketball {...props} navigation={navigation} />;
}

export default BasketballWrapper;
