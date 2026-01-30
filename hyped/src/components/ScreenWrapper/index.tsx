/**
 * ScreenWrapper
 * 
 * Wraps screens with Header component automatically
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Header from '../Header';

interface ScreenWrapperProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export function ScreenWrapper({ children, showHeader = true }: ScreenWrapperProps) {
  return (
    <View style={styles.container}>
      {showHeader && <Header />}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
