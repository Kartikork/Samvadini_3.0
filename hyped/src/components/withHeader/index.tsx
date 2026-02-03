/**
 * withHeader HOC
 *
 * Wraps screens with Header and BottomNavigation.
 * Header is hidden on: Splash, LanguageSelection, Login, Signup
 * BottomNavigation is shown on main app screens only.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Header from '../Header';
import BottomNavigation from '../BottomNavigation';

// Screens that should NOT show Header
const NO_HEADER_SCREENS = ['Splash', 'LanguageSelection', 'Login', 'Signup'];

// Screens that show BottomNavigation (main app tabs) - Dashboard excluded
const BOTTOM_NAV_SCREENS = ['ChatList', 'CallHistory', 'StatusScreen', 'LanguageGameScreen'];

// Map route name to bottom nav active tab name
const ROUTE_TO_ACTIVE_TAB: Record<string, string> = {
  Dashboard: 'HomeTab',
  ChatList: 'Listing',
  CallHistory: 'CallHistory',
  StatusScreen: 'Status',
  LanguageGameScreen: 'GameZone',
};

export function withHeader<P extends object>(
  Component: React.ComponentType<P>,
  showHeader: boolean = true
) {
  return function WrappedComponent(props: P) {
    const route = useRoute();
    const navigation = useNavigation();
    const routeName = route.name || '';

    const shouldShowHeader = showHeader && !NO_HEADER_SCREENS.includes(routeName);
    const shouldShowBottomNav = BOTTOM_NAV_SCREENS.includes(routeName);
    const activeScreen = ROUTE_TO_ACTIVE_TAB[routeName] ?? routeName;

    return (
      <View style={styles.container}>
        {shouldShowHeader && <Header />}
        <View style={styles.content}>
          <Component {...props} />
        </View>
        {shouldShowBottomNav && (
          <BottomNavigation navigation={navigation} activeScreen={activeScreen} />
        )}
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
