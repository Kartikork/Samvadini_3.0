/**
 * Home Screen
 * 
 * Main screen after splash screen
 * Placeholder for future implementation
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useColorScheme } from 'react-native';

export default function HomeScreen() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' },
      ]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#000000' : '#FFFFFF'}
      />
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: isDarkMode ? '#FFFFFF' : '#000000' },
          ]}>
          Welcome to HYPED
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDarkMode ? '#AAAAAA' : '#666666' },
          ]}>
          Your chat and calling app
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
});
