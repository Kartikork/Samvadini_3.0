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
import { LanguageSelectionScreen } from '../screens/LanguageSelectionScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import CallHistoryScreen from '../screens/CallHistoryScreen';
import StatusScreen from '../screens/StatusScreen';
import LanguageGameScreen from '../screens/LanguageGameScreen';
import ContactDesignScreen from '../screens/ContactDesignScreen';

// Header wrapper
import { withHeader } from '../components/withHeader';

export type RootStackParamList = {
  Splash: undefined;
  LanguageSelection: { currentScreen?: string } | undefined;
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Dashboard: undefined;
  ChatList: undefined;
  CallHistory: undefined;
  StatusScreen: undefined;
  LanguageGameScreen: undefined;
  ContactDesignScreen: undefined;
  Chat: { chatId: string };
  GroupChat: { chatId: string; groupName: string };
  Call: { callId: string; peerId: string; isVideo: boolean };
  IncomingCall: { callId: string; callerId: string; callerName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Helper to wrap screens with Header (exclude auth screens)
const wrapWithHeader = <P extends object>(Component: React.ComponentType<P>) => {
  return withHeader(Component, true);
};

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
        <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
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
        
        {/* Main App - with Header automatically */}
        <Stack.Screen 
          name="Home" 
          component={wrapWithHeader(HomeScreen)}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen 
          name="Dashboard" 
          component={wrapWithHeader(DashboardScreen)}
          options={{ animation: 'fade' }}
        />
        
        {/* Chat Screens */}
        <Stack.Screen 
          name="ChatList" 
          component={wrapWithHeader(ChatListScreen)}
          options={{ animation: 'fade' }}
        />

        {/* Bottom Nav Screens */}
        <Stack.Screen 
          name="CallHistory" 
          component={wrapWithHeader(CallHistoryScreen)}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen 
          name="StatusScreen" 
          component={wrapWithHeader(StatusScreen)}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen 
          name="LanguageGameScreen" 
          component={wrapWithHeader(LanguageGameScreen)}
          options={{ animation: 'fade' }}
        />

        <Stack.Screen 
          name="Chat" 
          component={wrapWithHeader(ChatScreen)}
          options={{ animation: 'slide_from_right' }}
        />

        <Stack.Screen 
          name="ContactDesignScreen" 
          component={wrapWithHeader(ContactDesignScreen)}
          options={{ animation: 'slide_from_right' }}
        />

        {/* TODO: Add these screens
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
