/**
 * Header Component
 * 
 * App header shown on all screens with navigation, SOS, and menu
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Modal,
  Text,
  PermissionsAndroid,
  Platform,
  Animated,
  Easing,
  Linking,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../state/hooks';
import { clearAuth } from '../../state/authSlice';
import { getHeaderTexts } from './headerTranslations';
import { headerStyles } from './HeaderStyles';
import { bossBabyIndianFigure, hypedLogo, sos } from '../../assets';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const Header = React.memo(() => {
  const navigation = useNavigation();
  const routeName = useNavigationState((state) => state?.routes[state?.index]?.name || '');
  const dispatch = useAppDispatch();
  const lang = useAppSelector((state) => state.language.lang);
  const uniqueId = useAppSelector((state) => state.auth.uniqueId);
  const [selfProfile, setSelfProfile] = useState({ photo: '', name: '' });
  const [modalVisible, setModalVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosModalMessage, setSosModalMessage] = useState('');
  const [showNoEmergencyModal, setShowNoEmergencyModal] = useState(false);
  const [showSosTimer, setShowSosTimer] = useState(false);
  const [sosTimerValue, setSosTimerValue] = useState(3);
  const [showSosTooltip, setShowSosTooltip] = useState(false);
  const sosTimerAnim = useRef(new Animated.Value(0)).current;
  const sosDebounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const pressStartTime = useRef<number | null>(null);

  const t = getHeaderTexts(lang);

  useEffect(() => {
    fetchUserProfile();
    return () => {
      if (sosDebounceTimeout.current) {
        clearTimeout(sosDebounceTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (showSosTimer && sosTimerValue > 0) {
      interval = setInterval(() => {
        setSosTimerValue((prev) => prev - 1);
      }, 1000);
    } else if (showSosTimer && sosTimerValue === 0) {
      setTimeout(() => {
        setShowSosTimer(false);
        setSosTimerValue(3);
        sendEmergencySOS();
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showSosTimer, sosTimerValue]);

  useEffect(() => {
    if (showSosTimer) {
      sosTimerAnim.setValue(0);
      Animated.timing(sosTimerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      sosTimerAnim.stopAnimation();
      sosTimerAnim.setValue(0);
    }
  }, [showSosTimer, sosTimerAnim]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const userName = await AsyncStorage.getItem('userName');
      const userPhoto = await AsyncStorage.getItem('userProfilePhoto');
      setSelfProfile({
        name: userName || '',
        photo: userPhoto || '',
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, []);

  const handleSetting = useCallback(() => {
    navigation.navigate('Setting' as never, {
      userPhoto: selfProfile.photo,
      userName: selfProfile.name,
    });
  }, [navigation, selfProfile]);

  const handleLogOut = useCallback(async () => {
    Alert.alert(
      t.logout,
      'Are you sure you want to logout?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.logout,
          style: 'destructive',
          onPress: async () => {
            try {
              const keysToRemove = [
                'userToken',
                'userProfilePhoto',
                'uniqueId',
                'currUserPhn',
                'userLang',
                'userName',
                'fcmToken',
                'isRegister',
              ];
              await AsyncStorage.multiRemove(keysToRemove);
              dispatch(clearAuth());
              navigation.reset({
                index: 0,
                routes: [{ name: 'Splash' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  }, [dispatch, navigation, t]);

  const getLocationIfPermitted = useCallback(async () => {
    const fallbackLocation = { latitude: 0, longitude: 0 };
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (!hasPermission) {
          return fallbackLocation;
        }
      }
      // For now return fallback - can integrate Geolocation later
      return fallbackLocation;
    } catch (error) {
      console.log('Location check error:', error);
      return fallbackLocation;
    }
  }, []);

  const sendEmergencySOS = useCallback(async () => {
    if (!uniqueId || isSending) {
      return;
    }
    setIsSending(true);
    try {
      const location = await getLocationIfPermitted();
      const { latitude, longitude } = location;
      const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

      // Check if emergency contacts exist (simplified - can be enhanced)
      const emergencyContacts = await AsyncStorage.getItem('emergencyContacts');
      const hasContacts = emergencyContacts && JSON.parse(emergencyContacts).length > 0;

      if (!hasContacts) {
        setSosModalMessage(t.NoEmAdded);
        setShowNoEmergencyModal(true);
        setSosModalVisible(true);
        setIsSending(false);
        return;
      }

      // TODO: Send SOS via socket/API
      // For now, just show success message
      setSosModalMessage(t.sosmsg);
      setShowNoEmergencyModal(false);
      setSosModalVisible(true);
    } catch (error) {
      console.error('Error in sendEmergencySOS:', error);
      Alert.alert(t.sos, 'Failed to send SOS message');
    } finally {
      setIsSending(false);
    }
  }, [uniqueId, isSending, t, getLocationIfPermitted]);

  const hasEmergencyContacts = useCallback(async () => {
    try {
      const contacts = await AsyncStorage.getItem('emergencyContacts');
      return contacts && JSON.parse(contacts).length > 0;
    } catch {
      return false;
    }
  }, []);

  const handlePressIn = useCallback(async () => {
    pressStartTime.current = Date.now();
    isHoldingRef.current = true;
    const hasContacts = await hasEmergencyContacts();
    if (!hasContacts) {
      setSosModalMessage(t.NoEmAdded);
      setShowNoEmergencyModal(true);
      setSosModalVisible(true);
      setShowSosTimer(false);
      setSosTimerValue(3);
      isHoldingRef.current = false;
      return;
    }
    sosDebounceTimeout.current = setTimeout(() => {
      if (isHoldingRef.current) {
        setShowSosTimer(true);
        setSosTimerValue(3);
      }
    }, 120);
  }, [hasEmergencyContacts, t]);

  const handlePressOut = useCallback(() => {
    isHoldingRef.current = false;
    if (sosDebounceTimeout.current) {
      clearTimeout(sosDebounceTimeout.current);
      sosDebounceTimeout.current = null;
    }
    if (pressStartTime.current) {
      const pressDuration = Date.now() - pressStartTime.current;
      if (showSosTimer && pressDuration < 3000) {
        setShowSosTimer(false);
        setSosTimerValue(3);
        Alert.alert('', t.HolSec);
      } else if (pressDuration < 2000 && !showSosTimer) {
        setShowSosTooltip(true);
        setTimeout(() => {
          setShowSosTooltip(false);
        }, 2000);
      } else {
        setShowSosTimer(false);
        setSosTimerValue(3);
      }
    }
    pressStartTime.current = null;
  }, [showSosTimer, t]);

  return (
    <SafeAreaView edges={['top']} style={headerStyles.safeAreaContainer}>
      <View style={headerStyles.header}>
        <View style={headerStyles.headerLeft}>
          {routeName !== 'Dashboard' && (
            <TouchableOpacity
              style={headerStyles.backButton}
              onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color="#000000" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              headerStyles.headerCenter,
              routeName === 'Dashboard' ? { marginLeft: 10 } : null,
            ]}
            onPress={() => navigation.navigate('Dashboard' as never)}>
            <Image
              source={hypedLogo}
              style={headerStyles.logo}
            />
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            onPress={() => navigation.navigate('talkingtom')}
            style={headerStyles.sosButton}>
            <Image
              source={bossBabyIndianFigure}
              resizeMode="contain"
              style={headerStyles.sosText}
            />
          </TouchableOpacity>
        </View>
        <View style={headerStyles.headerRight}>

          {/* SOS Button */}
          <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isSending}>
            <View style={headerStyles.sosButton}>
              <Image resizeMode="contain"
                style={headerStyles.sosText}
                source={sos} />
            </View>
            {showSosTooltip && (
              <View style={headerStyles.sosTooltip}>
                <View style={headerStyles.tooltipArrow} />
                <Text style={headerStyles.tooltipText}>{t.HolSec}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Language Selection */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('LanguageSelection' as never, {
                currentScreen: routeName,
              })
            }>
            <Image
              source={hypedLogo}
              style={headerStyles.profilePhoto}
            />
          </TouchableOpacity>

          {/* Menu */}
          <TouchableOpacity
            style={headerStyles.dotsContainer}
            onPress={() => setModalVisible(true)}>
            <Icon name="dots-vertical" size={26} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SOS Timer Modal */}
      <Modal
        transparent
        visible={showSosTimer}
        animationType="none"
        onRequestClose={() => { }}>
        <TouchableWithoutFeedback>
          <View style={headerStyles.sosTimerOverlay} pointerEvents="none">
            <View style={headerStyles.sosTimerContent}>
              <Text style={headerStyles.sosTimerHeading}>{t.hdstill}</Text>
              <SosCircularTimer
                progress={sosTimerAnim}
                value={sosTimerValue}
              />
              <Text style={headerStyles.sosTimerText}>
                {sosTimerValue > 0
                  ? `${t.soscount}${sosTimerValue}`
                  : t.sent}
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SOS Result Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={sosModalVisible}
        onRequestClose={() => {
          setSosModalVisible(false);
          setShowNoEmergencyModal(false);
        }}>
        <View style={headerStyles.sosModalOverlay}>
          <View style={headerStyles.sosModalContent}>
            {showNoEmergencyModal ? (
              <>
                <Text style={headerStyles.sosModalErrorTitle}>{t.sosModalMessage}</Text>
                <Text style={headerStyles.sosModalText}>{sosModalMessage}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setSosModalVisible(false);
                    setShowNoEmergencyModal(false);
                    navigation.navigate('EmergencyContactScreen' as never);
                  }}
                  style={headerStyles.sosModalButton}>
                  <Text style={headerStyles.sosModalButtonText}>{t.AddEM}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSosModalVisible(false);
                    setShowNoEmergencyModal(false);
                  }}
                  style={headerStyles.sosModalButtonLast}>
                  <Text style={headerStyles.sosModalButtonText}>{t.cancel}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={headerStyles.sosModalTitle}>{t.sos}</Text>
                <Text style={headerStyles.sosModalText}>{sosModalMessage}</Text>
                <TouchableOpacity
                  onPress={() => setSosModalVisible(false)}
                  style={headerStyles.sosModalButtonLast}>
                  <Text style={headerStyles.sosModalButtonText}>{t.ok}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={headerStyles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}>
          <View style={headerStyles.modalContent}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                Linking.openURL('https://anuvadini.aicte-india.org');
              }}
              style={headerStyles.modalOptionContainer}>
              <Image
                source={require('../../assets/images/anuvadini-logo.png')}
                style={headerStyles.anuvadini}
              />
              <Text style={headerStyles.modalOption}>About Anuvadini</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('StarredMessage' as never);
              }}
              style={headerStyles.modalOptionContainer}>
              <MaterialIcons name="star" size={22} color="#FFD700" style={headerStyles.modalIcon} />
              <Text style={headerStyles.modalOption}>{t.starredMessage}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('BroadcastScreen' as never);
              }}
              style={headerStyles.modalOptionContainer}>
              <Ionicons
                name="megaphone-outline"
                size={22}
                color="#555"
                style={headerStyles.modalIcon}
              />
              <Text style={headerStyles.modalOption}>{t.newBroadcast}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                handleSetting();
              }}
              style={headerStyles.modalOptionContainer}>
              <Ionicons
                name="settings-outline"
                size={22}
                color="#555"
                style={headerStyles.modalIcon}
              />
              <Text style={headerStyles.modalOption}>{t.settings}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('AnalysisReport' as never, {
                  userPhoto: selfProfile.photo,
                  userName: selfProfile.name,
                });
              }}
              style={headerStyles.modalOptionContainer}>
              <Icon name="chart-bar" size={22} color="#555" style={headerStyles.modalIcon} />
              <Text style={headerStyles.modalOption}>{t.analysisReport}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('ImportChat' as never);
              }}
              style={headerStyles.modalOptionContainer}>
              <Ionicons
                name="download-outline"
                size={22}
                color="#555"
                style={headerStyles.modalIcon}
              />
              <Text style={headerStyles.modalOption}>{t.importChat}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                handleLogOut();
              }}
              style={headerStyles.modalOptionContainer}>
              <MaterialIcons
                name="logout"
                size={22}
                color="#FF3B30"
                style={headerStyles.modalIcon}
              />
              <Text style={[headerStyles.modalOption, headerStyles.logoutText]}>
                {t.logout}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
});

Header.displayName = 'Header';

const SosCircularTimer = React.memo<{
  progress: Animated.Value;
  value: number;
}>(({ progress, value }) => {
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedStroke = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={headerStyles.timerContainer}>
      <View
        style={[
          headerStyles.timerTextContainer,
          {
            width: size,
            height: size,
          },
        ]}>
        <Text style={headerStyles.timerText}>{value > 0 ? value : '✓'}</Text>
      </View>
      <Animated.View style={{ transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E3F2FD"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1976D2"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={animatedStroke}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
});

SosCircularTimer.displayName = 'SosCircularTimer';

export default Header;
