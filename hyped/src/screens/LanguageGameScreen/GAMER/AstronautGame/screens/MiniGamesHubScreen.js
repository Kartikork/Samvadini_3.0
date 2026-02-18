import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ImageBackground } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const MiniGamesHubScreen = ({ route, navigation }) => {
  const { selectedPlanet } = route.params;

  const [completed, setCompleted] = useState(
    route.params.completedStatus || {
      game1: true,
      game2: true,
      game3: true,
      game4: true,
    }
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.completedGame) {
        const { completedGame } = route.params;
        setCompleted(prev => ({ ...prev, [completedGame]: true }));
        navigation.setParams({ completedGame: null });
      }
    }, [route.params?.completedGame])
  );

  const allCompleted = Object.values(completed).every(Boolean);

  const handleProceed = () => {
    if (!allCompleted) {
      Alert.alert("Complete All Mini Games", "You must finish all 4 mini games before continuing!");
      return;
    }
    navigation.navigate('GameScreen', { selectedPlanet });
  };

  const handleMiniGamePress = (gameKey, screenName) => {
    navigation.navigate(screenName, {
      selectedPlanet,
      onComplete: () => {
        navigation.replace('MiniGamesHubScreen', {
          selectedPlanet,
          completedGame: gameKey,
          completedStatus: { ...completed, [gameKey]: true },
        });
      },
    });
  };

  return (
    <ImageBackground
      source={require('../space_background.png')}
      style={styles.container}
    >
      <Text style={styles.title}>Mission Prep: {selectedPlanet.name}</Text>

      <View style={styles.grid}>
        {[
          { key: 'game1', label: 'Mini Game 1', screen: 'MiniGame1' },
          { key: 'game2', label: 'Mini Game 2', screen: 'MiniGame2' },
          { key: 'game3', label: 'Mini Game 3', screen: 'MiniGame3' },
          { key: 'game4', label: 'Mini Game 4', screen: 'MiniGame4' },
        ].map(({ key, label, screen }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.miniGameCard,
              completed[key] && styles.completedCard,
            ]}
            onPress={() => handleMiniGamePress(key, screen)}
          >
            <Text style={styles.miniGameText}>{label}</Text>
            {completed[key] && <Text style={styles.completedText}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.proceedButton, !allCompleted && { opacity: 0.4 }]}
        onPress={handleProceed}
        disabled={!allCompleted}
      >
        <Text style={styles.proceedText}>Continue to {selectedPlanet.name}</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  miniGameCard: {
    width: 140,
    height: 100,
    margin: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  completedCard: {
    backgroundColor: 'rgba(0,255,100,0.2)',
    borderColor: '#00ff88',
  },
  miniGameText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedText: {
    color: '#00ff88',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  proceedButton: {
    marginTop: 40,
    backgroundColor: '#00c2ff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  proceedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MiniGamesHubScreen;