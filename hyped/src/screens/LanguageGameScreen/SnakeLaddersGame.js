// SnakeLaddersGame.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  ScrollView,
  BackHandler,
} from 'react-native';

// --- Asset Imports ---
const diceImages = [
  require('../LanguageGameScreen/GAMER/dice_1.png'), require('../LanguageGameScreen/GAMER/dice_2.png'), require('../LanguageGameScreen/GAMER/dice_3.png'),
  require('../LanguageGameScreen/GAMER/dice_4.png'), require('../LanguageGameScreen/GAMER/dice_5.png'), require('../LanguageGameScreen/GAMER/dice_6.png'),
];
const playerPieces = [
  require('../LanguageGameScreen/GAMER/pawn_red.png'), require('../LanguageGameScreen/GAMER/pawn_blue.png'),
  require('../LanguageGameScreen/GAMER/pawn_green.png'), require('../LanguageGameScreen/GAMER/pawn_yellow.png'),
];
const ladderImage = require('../LanguageGameScreen/GAMER/ladder.png');
const snakes = {
  16: { end: 6, image: require('../LanguageGameScreen/GAMER/snake3.png') }, 47: { end: 26, image: require('../LanguageGameScreen/GAMER/snake2.png') },
  49: { end: 11, image: require('../LanguageGameScreen/GAMER/snake3.png') }, 67: { end: 51, image: require('../LanguageGameScreen/GAMER/snake4.png') },
  62: { end: 19, image: require('../LanguageGameScreen/GAMER/snake2.png') },
  87: { end: 24, image: require('../LanguageGameScreen/GAMER/snake4.png') }, 93: { end: 73, image: require('../LanguageGameScreen/GAMER/snake2.png') },
  95: { end: 75, image: require('../LanguageGameScreen/GAMER/snake3.png') }, 99: { end: 8, image: require('../LanguageGameScreen/GAMER/snake4.png') },
};
// const ladders are just data, no images referenced directly in the object definition except where used
const ladders = { 1: { end: 38 }, 4: { end: 14 }, 9: { end: 31 }, 21: { end: 42 }, 28: { end: 66 }, 36: { end: 44 }, 71: { end: 91 }, 60: { end: 80 } };

const boardColors = ['#FADBD8', '#D6EAF8', '#D5F5E3', '#FCF3CF', '#EBDEF0'];

// --- Constants ---
const CELL_SIZE = 30;
const BORDER_WIDTH = 1;
const ANIMATION_DURATION_STEP = 250;
const ANIMATION_DURATION_SLIDE = 500;
const BOARD_FRAME_WIDTH = 5;
const GRID_OFFSET = BOARD_FRAME_WIDTH;

const SnakeLaddersGame = () => {
  const navigation = useNavigation();
  const [numPlayers, setNumPlayers] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [winner, setWinner] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [diceImage, setDiceImage] = useState(diceImages[0]);
  const [consecutiveSixes, setConsecutiveSixes] = useState([]);
  const [streakStartPosition, setStreakStartPosition] = useState([]);
  const [isVsAI, setIsVsAI] = useState(false);
  const playerAnimatedPositions = useRef([]).current;

  // --- Sound Object Refs ---
  const diceSound = useRef(null);
  const moveSound = useRef(null);
  const ladderSound = useRef(null);
  const snakeSound = useRef(null);
  const winSound = useRef(null);

  // --- CORRECTED: Load sounds individually and robustly on component mount ---
  useEffect(() => {
    // Sound loading disabled
    /*
    try {
      Sound.setCategory('Playback');

      diceSound.current = new Sound(require('./Assets/dice_roll.mp3'), (error) => {
        if (error) console.log('Failed to load dice_roll.mp3', error);
      });
      // ... other sounds
    } catch (e) {
      console.log("Error loading sounds", e);
    }
    */

    // Handle device back button
    const backAction = () => {
      navigation.goBack();
      return true; // prevent default behavior (exit app)
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => {
      backHandler.remove();
      // diceSound.current?.release();
      // moveSound.current?.release();
      // ladderSound.current?.release();
      // snakeSound.current?.release();
      // winSound.current?.release();
    };
  }, [navigation]);

  // --- AI Turn Trigger ---
  useEffect(() => {
    if (isVsAI && currentPlayer === 1 && !isAnimating && winner === null) {
      setTimeout(() => { rollDice(); }, 1200);
    }
  }, [currentPlayer, isVsAI, isAnimating, winner]);

  const getPosition = (cellNumber) => {
    const rowFromBottom = Math.floor((cellNumber - 1) / 10);
    const rowFromTop = 9 - rowFromBottom;
    let colFromLeft = (rowFromBottom % 2 === 0) ? (cellNumber - 1) % 10 : 9 - ((cellNumber - 1) % 10);
    const x = colFromLeft * (CELL_SIZE + BORDER_WIDTH * 2) + GRID_OFFSET;
    const y = rowFromTop * (CELL_SIZE + BORDER_WIDTH * 2) + GRID_OFFSET;
    return { x, y };
  };

  const startGame = (playersCount, isAIMode = false) => {
    setNumPlayers(playersCount);
    setIsVsAI(isAIMode);
    const initialPositions = Array(playersCount).fill(1);
    setPlayers(initialPositions);
    setConsecutiveSixes(Array(playersCount).fill(0));
    setStreakStartPosition(Array(playersCount).fill(null));
    playerAnimatedPositions.length = 0;
    initialPositions.forEach(pos => playerAnimatedPositions.push(new Animated.ValueXY(getPosition(pos))));
    setCurrentPlayer(0);
    setWinner(null);
    setIsAnimating(false);
    setDiceImage(diceImages[0]);
  };

  const rollDice = () => {
    if (isAnimating || winner !== null) return;
    setIsAnimating(true);

    diceSound.current?.setNumberOfLoops(-1).play();

    let rollAnimationCount = 0;
    const rollInterval = setInterval(() => {
      setDiceImage(diceImages[Math.floor(Math.random() * 6)]);
      rollAnimationCount++;
      if (rollAnimationCount > 10) {
        clearInterval(rollInterval);
        animatePawnMovement();
      }
    }, 100);
  };

  const animatePawnMovement = () => {
    diceSound.current?.stop();

    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceImage(diceImages[roll - 1]);

    const newSixes = [...consecutiveSixes];
    const newStreakStarts = [...streakStartPosition];
    const currentPos = players[currentPlayer];

    if (roll === 6 && newSixes[currentPlayer] === 2) {
      snakeSound.current?.play();
      const revertToPos = newStreakStarts[currentPlayer];
      Animated.timing(playerAnimatedPositions[currentPlayer], {
        toValue: getPosition(revertToPos), duration: ANIMATION_DURATION_SLIDE, useNativeDriver: false,
      }).start(() => {
        const newPlayers = [...players];
        newPlayers[currentPlayer] = revertToPos;
        setPlayers(newPlayers);
        newSixes[currentPlayer] = 0;
        newStreakStarts[currentPlayer] = null;
        setConsecutiveSixes(newSixes);
        setStreakStartPosition(newStreakStarts);
        setCurrentPlayer((p) => (p + 1) % numPlayers);
        setIsAnimating(false);
      });
      return;
    }

    if (roll === 6) {
      if (newSixes[currentPlayer] === 0) {
        newStreakStarts[currentPlayer] = currentPos;
      }
    } else {
      newStreakStarts[currentPlayer] = null;
    }
    setStreakStartPosition(newStreakStarts);

    let finalNumericPos = currentPos;
    const path = [];
    for (let i = 1; i <= roll; i++) {
      if (currentPos + i <= 100) {
        finalNumericPos = currentPos + i;
        path.push(getPosition(finalNumericPos));
      } else {
        break;
      }
    }

    if (path.length === 0) {
      newSixes[currentPlayer] = 0;
      setConsecutiveSixes(newSixes);
      setTimeout(() => {
        setIsAnimating(false);
        setCurrentPlayer((p) => (p + 1) % numPlayers);
      }, 500);
      return;
    }

    let step = 0;
    const soundInterval = setInterval(() => {
      if (step < path.length) {
        moveSound.current?.play();
        step++;
      } else {
        clearInterval(soundInterval);
      }
    }, ANIMATION_DURATION_STEP);

    const moveSequence = path.map(pos => Animated.timing(playerAnimatedPositions[currentPlayer], {
      toValue: pos, duration: ANIMATION_DURATION_STEP, useNativeDriver: false,
    }));

    let finalDestination = finalNumericPos;
    if (ladders[finalNumericPos]) {
      finalDestination = ladders[finalNumericPos].end;
      setTimeout(() => ladderSound.current?.play(), (path.length - 1) * ANIMATION_DURATION_STEP);
      moveSequence.push(Animated.timing(playerAnimatedPositions[currentPlayer], { toValue: getPosition(finalDestination), duration: ANIMATION_DURATION_SLIDE, useNativeDriver: false }));
    } else if (snakes[finalNumericPos]) {
      finalDestination = snakes[finalNumericPos].end;
      setTimeout(() => snakeSound.current?.play(), (path.length - 1) * ANIMATION_DURATION_STEP);
      moveSequence.push(Animated.timing(playerAnimatedPositions[currentPlayer], { toValue: getPosition(finalDestination), duration: ANIMATION_DURATION_SLIDE, useNativeDriver: false }));
    }

    Animated.sequence(moveSequence).start(() => {
      clearInterval(soundInterval);
      const newPlayers = [...players];
      newPlayers[currentPlayer] = finalDestination;
      setPlayers(newPlayers);
      if (roll === 6) { newSixes[currentPlayer]++; } else { newSixes[currentPlayer] = 0; }
      setConsecutiveSixes(newSixes);
      if (finalDestination === 100) {
        winSound.current?.play();
        setWinner(currentPlayer);
      } else if (roll !== 6) {
        setCurrentPlayer((p) => (p + 1) % numPlayers);
      }
      setIsAnimating(false);
    });
  };

  const renderSquare = (num) => {
    const row = Math.floor((num - 1) / 10);
    const col = (num - 1) % 10;
    const colorIndex = (row + col) % boardColors.length;
    const backgroundColor = boardColors[colorIndex];
    return <View style={[styles.cell, { backgroundColor }]}><Text style={styles.cellText}>{num}</Text></View>;
  };

  const renderBoard = () => {
    let boardGrid = [];
    for (let i = 0; i < 10; i++) {
      let row = [];
      for (let j = 0; j < 10; j++) {
        row.push((i % 2 === 0) ? (9 - i) * 10 + (10 - j) : (9 - i) * 10 + j + 1);
      }
      boardGrid.push(row);
    }

    const renderGameObject = (type, start, data) => {
      const startNum = parseInt(start);
      const endNum = data.end;
      const startPos = getPosition(startNum);
      const endPos = getPosition(endNum);
      const cellSlotSize = CELL_SIZE + BORDER_WIDTH * 2;
      const startCenterX = startPos.x + cellSlotSize / 2;
      const startCenterY = startPos.y + cellSlotSize / 2;
      const endCenterX = endPos.x + cellSlotSize / 2;
      const endCenterY = endPos.y + cellSlotSize / 2;
      const dx = endCenterX - startCenterX;
      const dy = endCenterY - startCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const midpointX = (startCenterX + endCenterX) / 2;
      const midpointY = (startCenterY + endCenterY) / 2;
      const imageHeight = 25;
      let transforms = [{ rotate: `${angle}deg` }];
      if (type === 'snake' && (angle > 90 || angle < -90)) {
        transforms.push({ scaleY: -1 });
      }
      return <Image key={`${type}-${start}`} source={type === 'snake' ? data.image : ladderImage} style={[styles.gameObject, { width: distance, height: imageHeight, left: midpointX - distance / 2, top: midpointY - imageHeight / 2, transform: transforms, }]} />;
    };

    return (
      <View style={styles.boardContainer}>
        <View style={styles.gridContainer}>
          {boardGrid.map((row, rowIndex) => (<View key={rowIndex} style={styles.row}> {row.map((cellNum) => (<View key={cellNum}>{renderSquare(cellNum)}</View>))} </View>))}
        </View>
        {Object.entries(ladders).map(([start, data]) => renderGameObject('ladder', start, data))}
        {Object.entries(snakes).map(([start, data]) => renderGameObject('snake', start, data))}
        {numPlayers && playerAnimatedPositions.map((animatedPos, index) => (
          <Animated.View key={index} style={[styles.playerPawn, animatedPos.getLayout()]}>
            <Image source={playerPieces[index]} style={styles.playerPieceImage} />
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderGame = () => (
    <>
      <View style={styles.statusContainer}>
        {winner !== null ? (<Text style={styles.winnerText}> {isVsAI && winner === 1 ? 'AI Wins! 🤖' : `Player ${winner + 1} Wins! 🏆`} </Text>) : (
          <View style={styles.turnContainer}>
            <Text style={styles.turnText}> {isVsAI && currentPlayer === 1 ? "AI's Turn" : `Player ${currentPlayer + 1}'s Turn `} </Text>
            <Image source={playerPieces[currentPlayer]} style={styles.turnIndicator} />
          </View>
        )}
      </View>
      {renderBoard()}
      <View style={styles.controlsContainer}>
        <Image source={diceImage} style={styles.diceImage} />
        <TouchableOpacity
          style={[styles.diceButton, (isAnimating || winner !== null || (isVsAI && currentPlayer === 1)) && styles.diceButtonDisabled]}
          onPress={rollDice}
          disabled={isAnimating || winner !== null || (isVsAI && currentPlayer === 1)}
        >
          <Text style={styles.diceText}>Roll Dice</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.rootContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>🎲 Snake & Ladders 🎲</Text>
        {!numPlayers ? (
          <View style={styles.selectionContainer}>
            <Text style={styles.subTitle}>Choose a Game Mode:</Text>
            <View style={styles.selectionRow}>
              <TouchableOpacity style={styles.selectionButton} onPress={() => startGame(2, true)}>
                <Text style={styles.selectionText}>VS AI</Text>
              </TouchableOpacity>
              {[2, 3, 4].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={styles.selectionButton}
                  onPress={() => startGame(count, false)}
                >
                  <Text style={styles.selectionText}>{count} Players</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : renderGame()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#fdf6e3',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 22,
    color: '#2C3E50',
    marginBottom: 15,
  },
  subTitle: {
    fontSize: 18,
    color: '#34495E',
    marginBottom: 20,
  },
  selectionContainer: {
    alignItems: 'center',
  },
  selectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  selectionButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 12,
    paddingHorizontal: 20,
    margin: 5,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectionText: {
    color: '#fff',
    fontSize: 16,
  },
  statusContainer: {
    marginBottom: 10,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  turnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  turnText: {
    fontSize: 22,
    color: '#2C3E50',
  },
  turnIndicator: {
    width: 35,
    height: 35,
    marginLeft: 10,
    resizeMode: 'contain',
  },
  winnerText: {
    fontSize: 22,
    color: '#27AE60',
  },
  boardContainer: {
    width: (CELL_SIZE + BORDER_WIDTH * 2) * 10 + (BOARD_FRAME_WIDTH * 2),
    height: (CELL_SIZE + BORDER_WIDTH * 2) * 10 + (BOARD_FRAME_WIDTH * 2),
    position: 'relative',
    borderWidth: BOARD_FRAME_WIDTH,
    borderColor: '#795548',
    backgroundColor: '#FDF6E3',
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    width: (CELL_SIZE + BORDER_WIDTH * 2) * 10,
    height: (CELL_SIZE + BORDER_WIDTH * 2) * 10,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: BORDER_WIDTH,
    borderColor: 'rgba(121, 85, 72, 0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    margin: BORDER_WIDTH,
    padding: 2,
  },
  cellText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.6)',
  },
  playerPawn: {
    position: 'absolute',
    width: CELL_SIZE + BORDER_WIDTH * 2,
    height: CELL_SIZE + BORDER_WIDTH * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerPieceImage: {
    width: '85%',
    height: '85%',
    resizeMode: 'contain',
  },
  gameObject: {
    position: 'absolute',
    resizeMode: 'stretch',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 15,
    marginTop: 15,
  },
  diceImage: {
    width: 60,
    height: 60,
  },
  diceButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  diceButtonDisabled: {
    backgroundColor: '#a9a9a9',
  },
  diceText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default SnakeLaddersGame;