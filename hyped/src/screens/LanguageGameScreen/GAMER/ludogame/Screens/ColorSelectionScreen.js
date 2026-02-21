// ColorSelectionScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, BackHandler, AppState } from 'react-native';
import { PAWN_COLORS } from '../utils/gameEngine';

const ColorSelectionScreen = ({ navigation }) => {
  useEffect(() => {
    const handleBackPress = () => {
      navigation.navigate('LudoWelcomeScreen');
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, [navigation]);

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

  const allColors = ['red', 'green', 'yellow', 'blue'];
  const [selectedColors, setSelectedColors] = useState([]);
  const [gameMode, setGameMode] = useState(null); // 'vsComputer' or 'vsFriend'

  const handleColorSelect = (color) => {
    if (gameMode === 'vsComputer') {
      // In Vs. Computer mode, you only select one color
      setSelectedColors([color]);
    } else if (gameMode === 'vsFriend') {
      // In Vs. Friend mode, you can select multiple colors
      const newSelection = [...selectedColors];
      const index = newSelection.indexOf(color);

      if (index > -1) {
        newSelection.splice(index, 1); // Deselect color
      } else {
        if (newSelection.length < 4) {
          newSelection.push(color); // Select color
        }
      }
      setSelectedColors(newSelection);
    }
  };

  const startGame = () => {
    if (gameMode === 'vsComputer' && selectedColors.length !== 1) {
      Alert.alert("Selection Needed", "Please choose one color to play against the computer.");
      return;
    }
    if (gameMode === 'vsFriend' && selectedColors.length < 2) {
      Alert.alert("Selection Needed", "Please select at least 2 player colors.");
      return;
    }

    navigation.replace('ludoGame', {
      gameMode: gameMode,
      playerColors: selectedColors, // Pass the array of selected colors
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {!gameMode ? (
        // Initial Game Mode Selection
        <View style={styles.modeSelectionContainer}>
          <Text style={styles.title}>How do you want to play?</Text>
          <TouchableOpacity style={styles.button} onPress={() => setGameMode('vsComputer')}>
            <Text style={styles.buttonText}>Play vs. Computer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => setGameMode('vsFriend')}>
            <Text style={styles.buttonText}>Play with Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Color Selection View
        <>
          <TouchableOpacity style={styles.backButton} onPress={() => { setGameMode(null); setSelectedColors([]); }}>
            <Text style={styles.backButtonText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {gameMode === 'vsComputer' ? 'Choose Your Color' : 'Select Player Colors'}
          </Text>
          <Text style={styles.subtitle}>
            {gameMode === 'vsFriend' && `(${selectedColors.length} selected, min 2)`}
          </Text>
          <View style={styles.colorContainer}>
            {allColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: PAWN_COLORS[color] },
                  selectedColors.includes(color) && styles.selectedColor,
                ]}
                onPress={() => handleColorSelect(color)}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={startGame}>
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A2A3A', alignItems: 'center', justifyContent: 'center' },
  modeSelectionContainer: { alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 20, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#ccc', marginBottom: 40, textAlign: 'center' },
  colorContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '80%', marginBottom: 60 },
  colorOption: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: 'transparent', margin: 15 },
  selectedColor: { borderColor: 'white', transform: [{ scale: 1.15 }] },
  button: { backgroundColor: '#00B300', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 15, marginVertical: 10 },
  buttonText: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  backButton: { position: 'absolute', top: 60, left: 20 },
  backButtonText: { color: 'white', fontSize: 18 },
});

export default ColorSelectionScreen;