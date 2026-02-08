/**
 * Navigation types - shared to avoid circular dependencies
 */

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
  Chat: { chatId: string };
  GroupChat: { chatId: string; groupName: string };
  Call: { callId: string; peerId: string; isVideo: boolean };
};
