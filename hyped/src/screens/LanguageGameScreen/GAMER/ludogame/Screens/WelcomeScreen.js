import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, BackHandler, AppState } from 'react-native';

const WelcomeScreen = ({ navigation }) => {
  useEffect(() => {
    const handleBackPress = () => {
      navigation.navigate('LanguageGameScreen');
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

  return (
    <SafeAreaView style={styles.container}>
      {/* You can replace this with your own logo image */}
      <Image
        source={require('../ludo_board_new.png')} // Update this path to your logo
        style={styles.logo}
      />
      <Text style={styles.title}>Ludo </Text>
      <Text style={styles.subtitle}></Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('LudoColorSelectionScreen')}
      >
        <Text style={styles.buttonText}>Start Game</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 20,
    color: '#ccc',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 15,
    marginTop: 60,
    elevation: 5,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A2A3A',
  },
});

export default WelcomeScreen;