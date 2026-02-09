import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DashboardScreen } from '../screens/DashboardScreen';
import ChatListScreen from '../screens/ChatListScreen';
import CallHistoryScreen from '../screens/CallHistoryScreen';
import StatusScreen from '../screens/StatusScreen';
import LanguageGameScreen from '../screens/LanguageGameScreen';
import DailyPlanner from '../screens/DailyPlanner/DailyPlanner';
import AddPlan from '../screens/DailyPlanner/AddPlan';
import AddReminder from '../screens/DailyPlanner/AddReminder';
import UpdatePlanner from '../screens/DailyPlanner/UpdatePlanner';
import UpdateReminder from '../screens/DailyPlanner/UpdateReminder';
import SharePlan from '../screens/DailyPlanner/SharePlan';
import SharePlannerCount from '../screens/DailyPlanner/SharePlannerCount';
import EventListScreen from '../screens/EventManagement/EventListScreen.js';
import CreateEvents from '../screens/EventManagement/CreateEvents.js';
import { JobScreen } from '../screens/CategoryScreen/JobScreen.js';
import { JobsDetailsScreen } from '../screens/CategoryScreen/JobsDetailsScreen.js';
import { CategoryScreen } from '../screens/CategoryScreen/CategoryScreen.js';
import { CategoryDetailsScreen } from '../screens/CategoryScreen/CategoryDetailsScreen.js';
import LRNScreen from '../screens/LRNModule/LRNScreen';

import { CustomTabBar } from '../components/BottomNavigation';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F7FA' },
      }}
    >
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="DailyPlanner" component={DailyPlanner} />
      <HomeStack.Screen name="AddPlan" component={AddPlan} />
      <HomeStack.Screen name="AddReminder" component={AddReminder} />
      <HomeStack.Screen name="UpdatePlanner" component={UpdatePlanner} />
      <HomeStack.Screen name="UpdateReminder" component={UpdateReminder} />
      <HomeStack.Screen name="SharePlan" component={SharePlan} />
      <HomeStack.Screen name="SharePlannerCount" component={SharePlannerCount} />
      <HomeStack.Screen name="EventListScreen" component={EventListScreen} />
      <HomeStack.Screen name="CreateEvents" component={CreateEvents} />
      <HomeStack.Screen name="JobScreen" component={JobScreen} />
      <HomeStack.Screen name="JobsDetailsScreen" component={JobsDetailsScreen} />
      <HomeStack.Screen name="CategoryScreen" component={CategoryScreen} />
      {/* <HomeStack.Screen name="CategoryDetailsScreen" component={CategoryDetailsScreen} />s */}
      <HomeStack.Screen name="LRNScreen" component={LRNScreen} />
    </HomeStack.Navigator>
  );
}

export type MainTabsParamList = {
  Dashboard: undefined;
  LanguageGameScreen: undefined;
  StatusScreen: undefined;
  CallHistory: undefined;
  ChatList: undefined;
};

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeStackScreen}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="LanguageGameScreen"
        component={LanguageGameScreen}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="StatusScreen"
        component={StatusScreen}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="CallHistory"
        component={CallHistoryScreen}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ tabBarLabel: '' }}
      />
    </Tab.Navigator>
  );
}
