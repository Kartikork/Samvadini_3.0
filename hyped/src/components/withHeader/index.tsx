/**
 * withHeader HOC
 * 
 * Higher-order component that wraps screens with Header
 */

/**
 * withHeader HOC
 * 
 * Wraps screens with Header component automatically.
 * Header is hidden on: Splash, LanguageSelection, Login, Signup
 * 
 * Usage in navigator:
 * <Stack.Screen name="MyScreen" component={withHeader(MyScreen)} />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Header from '../Header';

// Screens that should NOT show Header
const NO_HEADER_SCREENS = ['Splash', 'LanguageSelection', 'Login', 'Signup'];

export function withHeader<P extends object>(
  Component: React.ComponentType<P>,
  showHeader: boolean = true
) {
  return function WrappedComponent(props: P) {
    const route = useRoute();
    const routeName = route.name || '';
    
    const shouldShowHeader = showHeader && !NO_HEADER_SCREENS.includes(routeName);

    return (
      <View style={styles.container}>
        {shouldShowHeader && <Header />}
        <View style={styles.content}>
          <Component {...props} />
        </View>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
