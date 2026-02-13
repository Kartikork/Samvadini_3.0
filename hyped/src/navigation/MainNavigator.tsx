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
import HomeScreen from '../screens/HomeScreen';
import { LanguageSelectionScreen } from '../screens/LanguageSelectionScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import LanguageGameScreen from '../screens/LanguageGameScreen';
import ContactDesignScreen from '../screens/ContactDesignScreen';
import NewContactFormScreen from '../screens/NewContactFormScreen';
import CreateNewGroupScreen from '../screens/CreateNewGroup';
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
const Carrom = lazy(() => import('../screens/LanguageGameScreen/GAMER/CarromGame/CarromGame.js'));
const chess = lazy(() => import('../screens/LanguageGameScreen/GAMER/Chess/chess.js'));
const pong = lazy(() => import('../screens/LanguageGameScreen/GAMER/pong/footballNet.js'));
const homescreen = lazy(() => import('../screens/LanguageGameScreen/GAMER/antarakshari/src/screens/HomeScreen.js'));
const roomscreen = lazy(() => import('../screens/LanguageGameScreen/GAMER/antarakshari/src/screens/RoomScreen.js'));
import Header from '../components/Header';
import SelectedFilesScreen from '../screens/ChatScreen/components/SelectedFilesScreen';

// Loader Component
const ScreenLoader = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.loader,
        { backgroundColor: isDarkMode ? '#121212' : '#F5F7FA' },
      ]}
    >
      <ActivityIndicator size="large" color="#028BD3" />
    </View>
  );
};

// Lazy Wrapper
const LazyScreen = (Component: React.LazyExoticComponent<any>) => {
  return (props: any) => (
    <Suspense fallback={<ScreenLoader />}>
      <Component {...props} />
    </Suspense>
  );
};

// Lazy loaded screens
const CallHistoryScreen = LazyScreen(
  lazy(() => import('../screens/CallHistoryScreen')),
);

const StatusScreen = LazyScreen(lazy(() => import('../screens/StatusScreen')));

const JobScreen = LazyScreen(
  lazy(() => import('../screens/CategoryScreen/JobScreen')),
);

const LRNScreen = LazyScreen(
  lazy(() => import('../screens/LRNModule/LRNScreen')),
);

const DailyPlanner = LazyScreen(
  lazy(() => import('../screens/DailyPlanner/DailyPlanner')),
);

const AddPlan = LazyScreen(
  lazy(() => import('../screens/DailyPlanner/AddPlan')),
);

const AddReminder = LazyScreen(
  lazy(() => import('../screens/DailyPlanner/AddReminder')),
);

const EventListScreen = LazyScreen(
  lazy(() => import('../screens/EventManagement/EventListScreen')),
);

const CreateEvents = LazyScreen(
  lazy(() => import('../screens/EventManagement/CreateEvents')),
);

const DetailsScreen = LazyScreen(
  lazy(() => import('../screens/EventManagement/DetailsScreen')),
);

const JobsDetailsScreen = LazyScreen(
  lazy(() => import('../screens/CategoryScreen/JobsDetailsScreen')),
);

const CategoryScreen = LazyScreen(
  lazy(() => import('../screens/CategoryScreen/CategoryScreen')),
);

const CategoryDetailsScreen = LazyScreen(
  lazy(() => import('../screens/CategoryScreen/CategoryDetailsScreen')),
);

const UpdatePlanner = LazyScreen(
  lazy(() => import('../screens/DailyPlanner/UpdatePlanner')),
);

const SharePlan = LazyScreen(
  lazy(() => import('../screens/DailyPlanner/SharePlan')),
);

const UpdateReminder = LazyScreen(
  lazy(() => import('../screens/DailyPlanner/UpdateReminder')),
);

const SharePlannerCount = LazyScreen(
  lazy(() => import('../screens/DailyPlanner/SharePlannerCount')),
);

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
  NewContactForm: undefined;
  CreateNewGroup: undefined;
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
  SelectedFiles: { assets: any[] } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainNavigator() {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? DarkTheme : DefaultTheme;
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (navigationRef.current) {
      AppLifecycleService.setNavigationRef(navigationRef.current);
    }
  }, []);

  const commonHeaderOptions = {
    headerShown: true,
    header: () => <Header />,
    animation: 'slide_from_right' as const,
  };

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

        {/* Main App */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={commonHeaderOptions}
        />

        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="ChatList"
          component={ChatListScreen}
          options={commonHeaderOptions}
        />

        {/* Lazy Screens */}
        <Stack.Screen
          name="CallHistory"
          component={CallHistoryScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="StatusScreen"
          component={StatusScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="JobScreen"
          component={JobScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="JobsDetailsScreen"
          component={JobsDetailsScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="CategoryScreen"
          component={CategoryScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="CategoryDetailsScreen"
          component={CategoryDetailsScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="LRNScreen"
          component={LRNScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="DailyPlanner"
          component={DailyPlanner}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="SharePlan"
          component={SharePlan}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="AddPlan"
          component={AddPlan}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="SharePlannerCount"
          component={SharePlannerCount}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="EventListScreen"
          component={EventListScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="CreateEvents"
          component={CreateEvents}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="DetailsScreen"
          component={DetailsScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="UpdatePlanner"
          component={UpdatePlanner}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="UpdateReminder"
          component={UpdateReminder}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="AddReminder"
          component={AddReminder}
          options={commonHeaderOptions}
        />

        {/* Other Screens */}
        <Stack.Screen
          name="LanguageGameScreen"
          component={LanguageGameScreen}
        />

        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={commonHeaderOptions}
        />

        <Stack.Screen
          name="SelectedFiles"
          component={SelectedFilesScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />

        <Stack.Screen
          name="ContactDesignScreen"
          component={ContactDesignScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="NewContactForm"
          component={NewContactFormScreen}
          options={commonHeaderOptions}
        />
        <Stack.Screen
          name="CreateNewGroup"
          component={CreateNewGroupScreen}
          options={commonHeaderOptions}
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
          name="pong"
          component={pong}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="chess"
          component={chess}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="homescreen"
          component={homescreen}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="roomscreen"
          component={roomscreen}
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
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
