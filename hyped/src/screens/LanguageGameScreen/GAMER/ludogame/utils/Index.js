// ludogame/Index.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Dimensions, SafeAreaView, View, StyleSheet, Text, Alert, BackHandler, AppState } from 'react-native';
import Board from './components/Board';
import Dice from './components/Dice';
import SoundPlayer from 'react-native-sound-player';
import { useFocusEffect } from '@react-navigation/native';

import {
  getInitialState,
  rollDice,
  getComputerMove,
  PAWN_COLORS,
  START_INDICES,
  PRE_HOME_INDICES,
  TOTAL_PATH_LENGTH,
  hasPossibleMoves,
  SAFE_SPOTS,
  getReturnPath,
} from '../utils/gameEngine';


// Sound names: 'pawn_move2', 'cheer_low', 'yay' (all .mp3 in android/app/src/main/res/raw)
const playPawnMoveSound = () => {
  try {
    SoundPlayer.playSoundFile('pawn_move2', 'mp3');
  } catch (e) {
    console.log('Failed to play pawn move sound', e);
  }
};

const playPawnCutSound = () => {
  try {
    SoundPlayer.playSoundFile('cheer_low', 'mp3');
  } catch (e) {
    console.log('Failed to play pawn cut sound', e);
  }
};

const playDiceSixSound = () => {
  try {
    SoundPlayer.playSoundFile('yay', 'mp3');
  } catch (e) {
    console.log('Failed to play dice six sound', e);
  }
};


const { width } = Dimensions.get('window');
const ANIMATION_SPEED_MS = 350;
const RETURN_ANIMATION_SPEED_MS = 60;

const DICE_AREA_HEIGHT = 80;
const LudoGame = ({ route, navigation }) => {
  const { gameMode, playerColors } = route.params;
  const isVsComputer = gameMode === 'vsComputer';

  const computerColor = isVsComputer
    ? ['red', 'green', 'yellow', 'blue'].find(c => !playerColors.includes(c))
    : null;

  const PLAYERS = {};
  playerColors.forEach(color => {
    PLAYERS[color] = isVsComputer ? 'You' : `${color.charAt(0).toUpperCase() + color.slice(1)}`;
  });
  if (isVsComputer) {
    PLAYERS[computerColor] = 'Computer';
  }

  const allGamePlayers = isVsComputer ? [...playerColors, computerColor] : playerColors;

  const [gameState, setGameState] = useState(getInitialState(allGamePlayers));
  const { diceValue, currentPlayer, pawnPositions, isRolling, winner, activePlayers } = gameState;

  const [isAnimatingMove, setIsAnimatingMove] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(true);
  const [hasRolled, setHasRolled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Exit Game", "Are you sure you want to leave the game?", [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel"
          },
          { text: "YES", onPress: () => navigation.goBack() }
        ]);
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => backHandler.remove();
    }, [navigation])
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsModalVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        console.log('App is in background');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isVsComputer || isModalVisible || currentPlayer !== computerColor || winner || isAnimatingMove) {
      return;
    }
    setIsThinking(true);
    const thinkingTimer = setTimeout(() => {
      setIsThinking(false);
      setGameState(prev => ({ ...prev, isRolling: true }));
      const rollTimer = setTimeout(() => {
        const newDiceValue = rollDice();
        if (newDiceValue === 6) {
          playDiceSixSound();
        }
        setGameState(prev => ({ ...prev, diceValue: newDiceValue, isRolling: false }));
        // CORRECT
        const canMove = hasPossibleMoves(computerColor, newDiceValue, pawnPositions);

        if (canMove) {
          const moveTimer = setTimeout(() => {
            const move = getComputerMove(pawnPositions, newDiceValue, computerColor);
            if (move) {
              handlePawnMove(computerColor, move.pawnIndex, newDiceValue);
            }
          }, 1000);
          return () => clearTimeout(moveTimer);
        } else {
          if (newDiceValue !== 6) {
            setTimeout(() => handleTurnSwitch(), 1000);
          }
        }
      }, 500);
      return () => clearTimeout(rollTimer);
    }, 1000);
    return () => clearTimeout(thinkingTimer);
  }, [currentPlayer, winner, pawnPositions, isModalVisible, isAnimatingMove]);

  const handleTurnSwitch = () => {
    const currentIndex = activePlayers.indexOf(currentPlayer);
    const nextPlayer = activePlayers[(currentIndex + 1) % activePlayers.length];
    setGameState(prev => ({ ...prev, currentPlayer: nextPlayer }));
    setHasRolled(false);
  };

  const handlePlayerDiceRoll = () => {
    if (isRolling || winner || isAnimatingMove || (isVsComputer && currentPlayer === computerColor) || hasRolled) return;
    setGameState(prev => ({ ...prev, isRolling: true }));

    setTimeout(() => {
      const newDiceValue = rollDice();
      if (newDiceValue === 6) {
        playDiceSixSound();
      }
      const canMove = hasPossibleMoves(currentPlayer, newDiceValue, pawnPositions);
      setGameState(prev => ({ ...prev, diceValue: newDiceValue, isRolling: false }));

      if (canMove) {
        setHasRolled(true);
      } else {
        if (newDiceValue !== 6) {
          setTimeout(() => handleTurnSwitch(), 1000);
        }
      }
    }, 500);
  };

  const animateReturn = async (player, pawnIndex, path) => {
    playPawnCutSound();
    for (const pos of path) {
      setGameState(prev => {
        const newPositions = JSON.parse(JSON.stringify(prev.pawnPositions));
        newPositions[player][pawnIndex] = pos;
        return { ...prev, pawnPositions: newPositions };
      });
      await new Promise(res => setTimeout(res, RETURN_ANIMATION_SPEED_MS));
    }
    // No stop needed for SoundPlayer
  };


  const animateMove = async (player, pawnIndex, path, moveDiceValue) => {
    setIsAnimatingMove(true);

    for (const pos of path) {
      playPawnMoveSound();
      setGameState(prev => {
        const newPositions = JSON.parse(JSON.stringify(prev.pawnPositions));
        newPositions[player][pawnIndex] = pos;
        return { ...prev, pawnPositions: newPositions };
      });
      await new Promise(res => setTimeout(res, ANIMATION_SPEED_MS));
    }

    const finalPos = path[path.length - 1];
    let finalPositions = JSON.parse(JSON.stringify(gameState.pawnPositions));
    finalPositions[player][pawnIndex] = finalPos;

    const isDestinationSafe = SAFE_SPOTS.includes(finalPos);
    if (!isDestinationSafe && finalPos < 100) {
      for (const opponent of activePlayers) {
        if (opponent !== player) {
          const pawnToCutIndex = finalPositions[opponent].findIndex(pawnPos => pawnPos === finalPos);
          if (pawnToCutIndex !== -1) {
            const returnPath = getReturnPath(opponent, finalPos);
            await animateReturn(opponent, pawnToCutIndex, returnPath);
            finalPositions[opponent][pawnToCutIndex] = -1;
          }
        }
      }
    }

    const didPlayerWin = finalPositions[player].every(pos => pos === 106);
    if (didPlayerWin) {
      Alert.alert("Game Over", `${PLAYERS[player]} wins!`);
      setGameState(prev => ({ ...prev, winner: player, pawnPositions: finalPositions }));
      setIsAnimatingMove(false);
      return;
    }

    if (moveDiceValue === 6) {
      setGameState(prev => ({ ...prev, pawnPositions: finalPositions }));
      setHasRolled(false);
    } else {
      const nextPlayer = activePlayers[(activePlayers.indexOf(currentPlayer) + 1) % activePlayers.length];
      setGameState(prev => ({
        ...prev,
        pawnPositions: finalPositions,
        currentPlayer: nextPlayer,
      }));
      setHasRolled(false);
    }
    setIsAnimatingMove(false);
  };

  const handlePawnMove = (player, pawnIndex, moveDiceValue) => {
    const isHumanPlayer = !isVsComputer || player !== computerColor;
    if (player !== currentPlayer || isAnimatingMove || (isHumanPlayer && !hasRolled)) return;

    const dValue = moveDiceValue || diceValue;
    const startPos = pawnPositions[player][pawnIndex];
    const path = [];

    if (startPos === -1) {
      if (dValue !== 6) {
        if (isHumanPlayer) Alert.alert("Invalid Move", "You need a 6 to get out.");
        return;
      }
      path.push(START_INDICES[player]);

    } else {
      if (startPos >= 101 && startPos + dValue > 106) return;

      const preHomeIndex = PRE_HOME_INDICES[player];
      const potentialFinalPos = startPos + dValue;
      if (startPos <= preHomeIndex && potentialFinalPos > preHomeIndex) {
        const stepsIntoHome = potentialFinalPos - preHomeIndex;
        if (stepsIntoHome > 6) return;
      }

      let currentPathPos = startPos;
      for (let i = 0; i < dValue; i++) {
        if (currentPathPos >= 101) {
          currentPathPos++;
        } else if (currentPathPos === preHomeIndex) {
          currentPathPos = 101;
        } else {
          currentPathPos = (currentPathPos + 1) % TOTAL_PATH_LENGTH;
        }
        path.push(currentPathPos);
      }
    }

    if (path.length > 0) {
      animateMove(player, pawnIndex, path, dValue);
    }
  };

  const isTopPlayer = ['red', 'green'].includes(currentPlayer);
  const isBottomPlayer = ['blue', 'yellow'].includes(currentPlayer);
  const diceAlignment = ['red', 'blue'].includes(currentPlayer) ? 'flex-start' : 'flex-end';

  return (
    <SafeAreaView style={styles.container}>
      <Modal transparent={true} animationType="fade" visible={isModalVisible}>
      </Modal>

      <View style={styles.header}><Text style={styles.title}>Ludo Game</Text></View>

      <View style={[styles.diceArea, { justifyContent: diceAlignment }]}>
        {isTopPlayer && (
          <Dice
            value={diceValue}
            onRoll={handlePlayerDiceRoll}
            isRolling={isRolling}
            disabled={isModalVisible || (isVsComputer && currentPlayer === computerColor) || isRolling || !!winner || isAnimatingMove || hasRolled}
          />
        )}
      </View>

      <View style={styles.boardWrapper}>
        <Board
          pawnPositions={pawnPositions}
          onPawnPress={(player, pawnIndex) => handlePawnMove(player, pawnIndex, diceValue)}
        />
      </View>

      <View style={[styles.diceArea, { justifyContent: diceAlignment }]}>
        {isBottomPlayer && (
          <Dice
            value={diceValue}
            onRoll={handlePlayerDiceRoll}
            isRolling={isRolling}
            disabled={isModalVisible || (isVsComputer && currentPlayer === computerColor) || isRolling || !!winner || isAnimatingMove || hasRolled}
          />
        )}
      </View>

      <View style={styles.controls}>
        <Text style={styles.turnIndicator}>
          Turn: {PLAYERS[currentPlayer]}
          {isThinking && ' (Thinking...)'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A2A3A', alignItems: 'center', justifyContent: 'space-around' },
  header: { alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white' },

  diceArea: {
    height: DICE_AREA_HEIGHT,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  boardWrapper: {
    width: width,
    height: width,
  },

  controls: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  turnIndicator: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  modalContent: { width: '80%', backgroundColor: '#1F3548', paddingVertical: 30, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', borderColor: 'white', borderWidth: 2, elevation: 10 },
  modalText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  colorIndicator: { width: 50, height: 50, borderRadius: 25, marginBottom: 15, borderWidth: 2, borderColor: 'white' },
});

export default LudoGame;