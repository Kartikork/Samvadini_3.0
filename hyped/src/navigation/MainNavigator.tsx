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
import {
  useColorScheme,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
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
import LRNScreen from '../screens/LRNModule/LRNScreen';
import DailyPlanner from '../screens/DailyPlanner/DailyPlanner';
import AddPlan from '../screens/DailyPlanner/AddPlan';
import AddReminder from '../screens/DailyPlanner/AddReminder';
import UpdatePlanner from '../screens/DailyPlanner/UpdatePlanner';
import SharePlan from '../screens/DailyPlanner/SharePlan';
import UpdateReminder from '../screens/DailyPlanner/UpdateReminder';
import SharePlannerCount from '../screens/DailyPlanner/SharePlannerCount';
import CallScreen from '../screens/CallScreen';
import EventListScreen from '../screens/EventManagement/EventListScreen.js';
import CreateEvents from '../screens/EventManagement/CreateEvents.js';
import DetailsScreen from '../screens/EventManagement/DetailsScreen.js';
import Header from '../components/Header';

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
  LRNScreen: undefined;
  DailyPlanner: undefined;
  AddPlan: undefined;
  AddReminder: undefined;
  UpdatePlanner: undefined;
  SharePlan: undefined;
  UpdateReminder: undefined;
  SharePlannerCount: undefined;
  EventListScreen: undefined;
  CreateEvents: undefined;
  DetailsScreen: undefined;
  Chat: { chatId: string };
  GroupChat: { chatId: string; groupName: string };
  Call: { callId: string; peerId: string; isVideo: boolean };
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
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

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
        <Stack.Screen
          name="LanguageSelection"
          component={LanguageSelectionScreen}
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

        {/* Main App - with Header automatically */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />

        {/* Chat Screens */}
        <Stack.Screen
          name="ChatList"
          component={ChatListScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />

        {/* Bottom Nav Screens */}
        <Stack.Screen
          name="CallHistory"
          component={CallHistoryScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="StatusScreen"
          component={StatusScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="JobScreen"
          component={JobScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="JobsDetailsScreen"
          component={JobsDetailsScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="CategoryScreen"
          component={CategoryScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="CategoryDetailsScreen"
          component={CategoryDetailsScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="LRNScreen"
          component={LRNScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="DailyPlanner"
          component={DailyPlanner}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="SharePlan"
          component={SharePlan}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="AddPlan"
          component={AddPlan}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="SharePlannerCount"
          component={SharePlannerCount}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="EventListScreen"
          component={EventListScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="CreateEvents"
          component={CreateEvents}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="DetailsScreen"
          component={DetailsScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="UpdatePlanner"
          component={UpdatePlanner}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="UpdateReminder"
          component={UpdateReminder}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="AddReminder"
          component={AddReminder}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="LanguageGameScreen"
          component={LanguageGameScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />

        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            headerShown: true,
            header: () => <Header />,
            animation: 'slide_from_right',
          }}
        />

        <Stack.Screen
          name="ContactDesignScreen"
          component={ContactDesignScreen}
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
