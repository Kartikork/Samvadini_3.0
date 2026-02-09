/**
 * LanguageGameScreen - Placeholder for Game Zone / Language games
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LanguageGameScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Zone</Text>
      <Text style={styles.subtitle}>Language games will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});
