import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StatusBar, Image, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Board from './Board';
import WinningLine from './WinningLine';
import { styles } from './styles';
// import Sound from 'react-native-sound';

// --- Sound Setup ---
/*
Sound.setCategory('Playback');

// 1. Load the first sound
const triumphSound = new Sound(require('../Assets/shabaash.mp3'), (error) => {
    if (error) { console.log('Failed to load the first sound', error); return; }
    console.log('First sound loaded successfully');
});

// 2. Load the second sound
const applauseSound = new Sound(require('../Assets/cheer_high.mp3'), (error) => {
    if (error) { console.log('Failed to load the second sound', error); return; }
    console.log('Second sound loaded successfully');
});
*/

const calculateWinner = (currentSquares) => {
  const lines = [
    [0, 1, 2], [3, 4, 5],
    [6, 7, 8], [0, 3, 6],
    [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (currentSquares[a] && currentSquares[a] === currentSquares[b] && currentSquares[a] === currentSquares[c]) {
      return { winner: currentSquares[a], line: lines[i] };
    }
  }
  return null;
};


const Game = () => {
  const navigation = useNavigation();
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winnerInfo, setWinnerInfo] = useState(null);

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => {
      // triumphSound.release();
      // applauseSound.release();
      backHandler.remove();
    };
  }, [navigation]);

  const handleSquarePress = (i) => {
    if (winnerInfo || squares[i]) return;
    const newSquares = squares.slice();
    newSquares[i] = isXNext ? 'X' : 'O';
    setSquares(newSquares);
    setIsXNext(!isXNext);
    const newWinnerInfo = calculateWinner(newSquares);
    if (newWinnerInfo) {
      setWinnerInfo(newWinnerInfo);

      /*
      triumphSound.play((success) => {
        if (success) {
          applauseSound.play();
        }
      });
      */
    }
  };

  const handleReset = () => {
    setSquares(Array(9).fill(null));
    setIsXNext(true);
    setWinnerInfo(null);
    // triumphSound.stop();
    // applauseSound.stop();
  };

  let status;
  if (winnerInfo) {
    status = `Winner: ${winnerInfo.winner}`;
  } else if (squares.every(Boolean)) {
    status = 'Draw: Reset to play again';
  } else {
    status = `Next player: ${isXNext ? 'X' : 'O'}`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20, marginTop: 10 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={30} color="#333" />
        </TouchableOpacity>
        <Text style={[styles.title, { marginLeft: 20, marginBottom: 0 }]}>Tic Tac Toe</Text>
      </View>

      <View style={styles.boardContainer}>
        <Board squares={squares} onPress={handleSquarePress} />
        {winnerInfo && <WinningLine line={winnerInfo.line} />}

        {/* 🆕 Added GIF ABOVE the existing one */}
        {winnerInfo && (
          <>
            {/* <Image
              source={require('../Assets/auto.gif')} // 👈 your new gif here
              style={[styles.winImage, { marginBottom: 1300, width: 300, height: 300 }]} // slightly above
              resizeMode="contain"
            />
            <Image
              source={require('../Assets/we-won-1-unscreen.gif')}
              style={[styles.winImage, { width: 250, height: 250 }]}
              resizeMode="contain"
            /> */}
          </>
        )}
      </View>

      <Text style={styles.status}>{status}</Text>
      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset Game</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Game;
