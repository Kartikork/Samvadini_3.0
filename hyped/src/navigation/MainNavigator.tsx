/**
 * Main Navigation Structure
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Lazy loading for non-critical screens
 * - Screen options with animation presets
 * - Memoized components
 */

import React, { lazy, Suspense, useRef, useEffect } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme, View, ActivityIndicator, StyleSheet } from 'react-native';
import { AppLifecycleService } from '../services/AppLifecycleService';

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
import { JobScreen } from '../screens/CategoryScreen/JobScreen.js';
import { JobsDetailsScreen } from '../screens/CategoryScreen/JobsDetailsScreen.js';
import { CategoryScreen } from '../screens/CategoryScreen/CategoryScreen.js';
import { CategoryDetailsScreen } from '../screens/CategoryScreen/CategoryDetailsScreen.js';
import LanguageGameScreen from '../screens/LanguageGameScreen';
import ContactDesignScreen from '../screens/ContactDesignScreen';
import CallScreen from '../screens/CallScreen';
import SnakeLaddersGame from '../screens/LanguageGameScreen/GAMER/SnakeLaddersGame/SnakeLaddersGame.js';
const MemoryGame = lazy(() => import('../screens/LanguageGameScreen/GAMER/MemoryGame'));
const SnakeGameIntroScreen = lazy(() => import('../screens/LanguageGameScreen/GAMER/SnakeStack/SnakeGameIntroScreen.js'));
const SnakeGameScreen = lazy(() => import('../screens/LanguageGameScreen/GAMER/SnakeStack/SnakeGameScreen.js'));
const BubbleShooterGame = lazy(() => import('../screens/LanguageGameScreen/GAMER/BubbleShooter/BubbleShooterGame.js'));
const CarGame = lazy(() => import('../screens/LanguageGameScreen/GAMER/cargame/CarGame'));
const BalloonShootingGame = lazy(() => import('../screens/LanguageGameScreen/GAMER/BalloonShootingGame/BalloonShootingGame'));
const TicTacToe = lazy(() => import('../screens/LanguageGameScreen/GAMER/TicTacToe'));
const NumberSortIntroScreen = lazy(() => import('../screens/LanguageGameScreen/GAMER/NumberSort/NumberSortIntroScreen'));
const SortGameScreen = lazy(() => import('../screens/LanguageGameScreen/GAMER/NumberSort/SortGameScreen'));
const DrumGame = lazy(() => import('../screens/LanguageGameScreen/GAMER/DrumGame/Game'));
const CarromGame = lazy(() => import('../screens/LanguageGameScreen/GAMER/CarromGame'));
const TipCat = lazy(() => import('../screens/LanguageGameScreen/GAMER/GilliDanda/TipCat'));
const Crossword = lazy(() => import('../screens/LanguageGameScreen/GAMER/Crossword/crossword'));
const MazeGame = lazy(() => import('../screens/LanguageGameScreen/GAMER/MazeGame'));
const SliceGame = lazy(() => import('../screens/LanguageGameScreen/GAMER/FruitSlice/SliceGame'));

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
  JobScreen: undefined;
  JobsDetailsScreen: undefined;
  LanguageGameScreen: undefined;
  ContactDesignScreen: undefined;
  CategoryScreen: undefined;
  CategoryDetailsScreen: undefined;
  SnakeLaddersGame: undefined;
  MemoryGame: undefined;
  SnakeGameIntroScreen: undefined;
  SnakeGame: undefined;
  BubbleShooterGame: undefined;
  CarGame: undefined;
  BalloonShootingGame: undefined;
  TicTacToe: undefined;
  NumberSortIntroScreen: undefined;
  SortGameScreen: undefined;
  DrumGame: undefined;
  CarromGame: undefined;
  TipCat: undefined;
  crossword: undefined;
  MazeGame: undefined;
  SliceGame: undefined;
  Chat: { chatId: string };
  GroupChat: { chatId: string; groupName: string };
  Call: { callId: string; peerId: string; isVideo: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Helper to wrap screens with Header (exclude auth screens)
const wrapWithHeader = <P extends object>(
  Component: React.ComponentType<P>,
) => {
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
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Pass navigation ref to AppLifecycleService for cold start navigation
  useEffect(() => {
    if (navigationRef.current) {
      AppLifecycleService.setNavigationRef(navigationRef.current);
    }
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: isDarkMode ? '#121212' : '#F5F7FA' },
        }}
      >
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
          name="JobScreen"
          component={wrapWithHeader(JobScreen)}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="JobsDetailsScreen"
          component={wrapWithHeader(JobsDetailsScreen)}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="CategoryScreen"
          component={wrapWithHeader(CategoryScreen)}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="CategoryDetailsScreen"
          component={wrapWithHeader(CategoryDetailsScreen)}
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

        {/* Call Screen - No header, full screen */}
        <Stack.Screen
          name="Call"
          component={CallScreen}
          options={{
            animation: 'slide_from_bottom',
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />

        {/* TODO: Add GroupChat screen when needed */}


        <Stack.Screen
          name="SnakeLaddersGame"
          component={SnakeLaddersGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="MemoryGame"
          component={MemoryGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="SnakeGameIntroScreen"
          component={SnakeGameIntroScreen}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="SnakeGame"
          component={SnakeGameScreen}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="BubbleShooterGame"
          component={BubbleShooterGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="CarGame"
          component={CarGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="BalloonShootingGame"
          component={BalloonShootingGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="TicTacToe"
          component={TicTacToe}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="NumberSortIntroScreen"
          component={NumberSortIntroScreen}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />

        <Stack.Screen
          name="SortGameScreen"
          component={SortGameScreen}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="DrumGame"
          component={DrumGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="CarromGame"
          component={CarromGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="TipCat"
          component={TipCat}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="crossword"
          component={Crossword}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="MazeGame"
          component={MazeGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="SliceGame"
          component={SliceGame}
          options={{ animation: 'slide_from_right', headerShown: false }}
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
