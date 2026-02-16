import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomNavigation from '../../components/BottomNavigation';

export default function StatusScreen() {
  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Updates</Text>
        <Text style={styles.subtitle}>Status updates will appear here</Text>
      </View>
      <BottomNavigation activeScreen="Status" />
    </>
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
