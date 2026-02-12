import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Text,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FruitSliceGame from './FruitSliceGame';
import LinearGradient from 'react-native-linear-gradient';

const backgroundImage = require('./fruit_background.jpg');

const SliceGame = () => {
  const navigation = useNavigation();
  const [isGameVisible, setGameVisible] = useState(false);

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      if (isGameVisible) {
        setGameVisible(false);
      } else {
        navigation.navigate('LanguageGameScreen');
      }
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isGameVisible, navigation]);

  if (isGameVisible) {
    return (
      <FruitSliceGame onExit={() => setGameVisible(false)} />
    );
  }

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('LanguageGameScreen')}
        >
          <Icon name="arrow-left" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setGameVisible(true)}>
          <LinearGradient
            colors={['#ea6011ff', '#ea6011ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: 'bold' }}>Play Fruit Slice!</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  gradientButton: {
    padding: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});

export default SliceGame;