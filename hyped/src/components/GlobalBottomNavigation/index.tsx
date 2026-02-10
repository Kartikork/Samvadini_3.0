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
import { useUnreadChatsCount } from '../../hooks/useUnreadChatsCount';
import { getAppTranslations } from '../../translations';

const ICON_SIZE = 26;

const GlobalBottomNavigation = ({
  navigation,
  activeScreen,
}: {
  navigation: any;
  activeScreen: string;
}) => {
  const lang = useSelector((state: { language?: { lang?: string } }) => state.language?.lang ?? 'en');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const unreadChatsCount = useUnreadChatsCount();

  const dashboardTexts = getAppTranslations(lang);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

  const handleNavigation = (screenName: string) => {
    if (screenName === 'Dashboard') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } else {
      navigation.navigate(screenName);
    }
  };

  const items = [
    { name: 'HomeTab', icon: 'home-outline', activeIcon: 'home', title: 'Home', screen: 'Dashboard' },
    { name: 'Listing', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', title: dashboardTexts.chats, screen: 'ChatList' },
  ];

  return (
    <View
      style={[
        styles.bottomNavContainer,
        {
          transform: [{ translateY: isKeyboardVisible ? 1000 : 0 }],
          opacity: isKeyboardVisible ? 0 : 1,
        },
      ]}
    >
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={styles.container}>
          {items.map(item => (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, activeScreen === item.name && styles.activeNavItem]}
              onPress={() => handleNavigation(item.screen)}
            >
              <View style={styles.iconWrapper}>
                <Icon
                  name={activeScreen === item.name ? item.activeIcon : item.icon}
                  size={ICON_SIZE}
                  color={activeScreen === item.name ? '#ED713C' : '#555'}
                />
                {item.name === 'Listing' && unreadChatsCount > 0 && (
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
                  { color: activeScreen === item.name ? '#ED713C' : '#555' },
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
};

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

export default GlobalBottomNavigation;
