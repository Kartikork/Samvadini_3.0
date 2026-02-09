import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Keyboard,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { axiosConn } from '../../storage/helper/Config';
import GlobalBottomNavigation from '../GlobalBottomNavigation/index';
import { useUnreadChatsCount } from '../../hooks/useUnreadChatsCount';
import { getAppTranslations } from '../../translations';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ICON_SIZE = 26;

const ROUTE_TO_TAB: Record<string, string> = {
  Dashboard: 'HomeTab',
  LanguageGameScreen: 'GameZone',
  StatusScreen: 'Status',
  CallHistory: 'CallHistory',
  ChatList: 'Listing',
};

/**
 * Custom tab bar for @react-navigation/bottom-tabs.
 * Used by MainTabs in BottomTabNavigator.
 */
export function CustomTabBar(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const activeRouteName = state.routes[state.index]?.name ?? 'Dashboard';
  const activeScreen = ROUTE_TO_TAB[activeRouteName] ?? 'HomeTab';

  // Hide tab bar when we're on the Dashboard screen (root of Home stack)
  const isOnDashboardScreen =
    state.index === 0 &&
    (() => {
      const tabRoute = state.routes[0];
      const nested = tabRoute?.state as { routes?: { name: string }[]; index?: number } | undefined;
      if (!nested?.routes?.length) return true;
      const idx = nested.index ?? 0;
      return nested.routes[idx]?.name === 'Dashboard';
    })();
  if (isOnDashboardScreen) return null;

  const lang = useSelector(
    (state: { language?: { lang?: string } }) => state.language?.lang ?? 'en',
  );
  const isIndia = useSelector(
    (state: { country?: { isIndia?: boolean } }) =>
      state.country?.isIndia ?? true,
  );
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const unreadChatsCount = useUnreadChatsCount();
  const [isNewStatus, setIsNewStatus] = useState(false);
  const t = getAppTranslations(lang);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      show?.remove();
      hide?.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const myId = await AsyncStorage.getItem('uniqueId');
        const response = await axiosConn(
          'get',
          `status/check-status?my_id=${myId}`,
        );
        if (!cancelled && response.status === 200) {
          setIsNewStatus(
            (response?.data as { has_new_status?: boolean })?.has_new_status ??
              false,
          );
        }
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isIndia) {
    return (
      <GlobalBottomNavigation
        navigation={navigation as any}
        activeScreen={activeScreen}
      />
    );
  }
  if (isKeyboardVisible) return null;

  const handlePress = (routeName: string, params?: object) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes.find(r => r.name === routeName)?.key ?? '',
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      if (routeName === 'Dashboard') {
        navigation.navigate('Dashboard');
      } else {
        navigation.navigate(routeName as any, params);
      }
    }
  };

  const items = [
    {
      name: 'GameZone',
      icon: 'game-controller-outline' as const,
      activeIcon: 'game-controller' as const,
      title: t.gameZone,
      route: 'LanguageGameScreen',
    },
    {
      name: 'Status',
      icon: isNewStatus ? ('ellipse' as const) : ('ellipse-outline' as const),
      activeIcon: 'ellipse' as const,
      title: t.updates ?? 'Updates',
      route: 'StatusScreen',
      params: { id: 'Status', name: 'Status' },
    },
    {
      name: 'HomeTab',
      icon: 'home-outline' as const,
      activeIcon: 'home' as const,
      title: t.home,
      route: 'Dashboard',
    },
    {
      name: 'CallHistory',
      icon: 'call-outline' as const,
      activeIcon: 'call' as const,
      title: t.calls,
      route: 'CallHistory',
    },
  ];

  return (
    <View style={styles.bottomNavContainer}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={styles.container}>
          {items.map(item => (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.navItem,
                activeScreen === item.name && styles.activeNavItem,
              ]}
              onPress={() => handlePress(item.route as any, item.params)}
            >
              <View style={styles.iconWrapper}>
                <Icon
                  name={
                    activeScreen === item.name ? item.activeIcon : item.icon
                  }
                  size={ICON_SIZE}
                  color={activeScreen === item.name ? '#F8732B' : '#484C52'}
                />
              </View>
              <Text
                allowFontScaling={false}
                style={[
                  styles.tabBarLabel,
                  { color: activeScreen === item.name ? '#F8732B' : '#484C52' },
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.navItem,
              activeScreen === 'Listing' && styles.activeNavItem,
            ]}
            onPress={() => handlePress('ChatList')}
          >
            <View style={styles.iconWrapper}>
              <Icon
                name={
                  activeScreen === 'Listing'
                    ? 'chatbubbles'
                    : 'chatbubbles-outline'
                }
                size={ICON_SIZE}
                color={activeScreen === 'Listing' ? '#ED713C' : '#555'}
              />
              {unreadChatsCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              allowFontScaling={false}
              style={[
                styles.tabBarLabel,
                { color: activeScreen === 'Listing' ? '#ED713C' : '#555' },
              ]}
            >
              {t.chats}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavContainer: { zIndex: 1000 },
  safeArea: { backgroundColor: '#fff' },
  container: {
    flexDirection: 'row',
    height: 75,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeNavItem: { backgroundColor: 'transparent' },
  iconWrapper: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 2,
    fontWeight: '600',
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 4,
    backgroundColor: '#FF3B30',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default CustomTabBar;
