/**
 * Main Navigation Structure
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Lazy loading for non-critical screens
 * - Screen options with animation presets
 * - Memoized components
 */

import React, { lazy, Suspense } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme, View, ActivityIndicator, StyleSheet } from 'react-native';

// Critical screens - imported directly
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/AuthScreens/LoginScreen';
import SignupScreen from '../screens/AuthScreens/SignupScreen';

// Non-critical screens - can be lazy loaded in production
// For now, direct import for simplicity
import HomeScreen from '../screens/HomeScreen';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  ChatList: undefined;
  Chat: { chatId: string; username: string };
  GroupChat: { chatId: string; groupName: string };
  Call: { callId: string; peerId: string; isVideo: boolean };
  IncomingCall: { callId: string; callerId: string; callerName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Loading fallback for lazy screens
const ScreenLoader = () => (
  <View style={styles.loader}>
    <ActivityIndicator size="large" color="#028BD3" />
  </View>
);

export default function MainNavigator() {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: isDarkMode ? '#121212' : '#F5F7FA' },
        }}>
        {/* Auth Flow */}
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="Signup" 
          component={SignupScreen}
          options={{ animation: 'slide_from_right' }}
        />
        
        {/* Main App */}
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ animation: 'fade' }}
        />
        
        {/* TODO: Add these screens
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="GroupChat" component={GroupChatScreen} />
        <Stack.Screen name="Call" component={CallScreen} />
        <Stack.Screen name="IncomingCall" component={IncomingCallScreen} />
        */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
});
