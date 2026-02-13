import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, BackHandler } from 'react-native'; // 1. Removed SafeAreaView from imports
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const SnakeGameIntroScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    return () => backHandler.remove();
  }, [navigation]);

  return (
    <ImageBackground
      source={require('../snake.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      {/* 2. Replaced SafeAreaView with a standard View */}
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>CLASSIC SNAKE</Text>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>HOW TO PLAY</Text>
          <View style={styles.rule}>
            <Icon name="arrow-up" size={20} color="#333" />
            <Icon name="arrow-down" size={20} color="#333" />
            <Icon name="arrow-back-outline" size={20} color="#333" />
            <Icon name="arrow-forward" size={20} color="#333" />
            <Text style={styles.instructionsText}>Use the arrow buttons to control the snake.</Text>
          </View>
          <View style={styles.rule}>
            <Icon name="logo-apple" size={20} color="#E60012" />
            <Text style={styles.instructionsText}>Eat the food to grow longer and score points.</Text>
          </View>
          <View style={styles.rule}>
            <Icon name="warning" size={20} color="#333" />
            <Text style={styles.instructionsText}>Avoid hitting the walls or your own tail!</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('SnakeGame')}
        >
          <Text style={styles.startButtonText}>START GAME</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    resizeMode: 'cover',
    opacity: 0.6,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(211, 255, 149, 0.7)',
    padding: 20,
  },
  // ... the rest of your styles remain the same
  titleContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#35c869ff',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#333',
  },
  title: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'monospace',
    textShadowColor: '#333',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  instructionsContainer: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 20,
    borderWidth: 4,
    borderColor: '#333',
  },
  instructionsTitle: {
    fontSize: 22,
    color: '#333',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 20,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  instructionsText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'monospace',
    marginLeft: 15,
    flex: 1,
  },
  startButton: {
    backgroundColor: '#35c869ff',
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#333',
    elevation: 5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'monospace',
  },
});

export default SnakeGameIntroScreen;
