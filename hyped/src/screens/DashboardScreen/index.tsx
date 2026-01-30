/**
 * DashboardScreen
 * Uses Redux for language and country. Redirect target after login.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  SafeAreaView,
  Linking,
  Alert,
  Text
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

import { Footer } from '../../components/Footer';
import TextToVoiceIconWrapper from '../../components/TextToVoiceIconWrapper';
import GlobalDashboard from '../../components/GlobalDashboard';
import { useAppSelector } from '../../state/hooks';
import { getDashboardTexts } from './translations';
import styles from './DashboardStyles';
import { anuvadiniLogo, ellipsCallBottom, ellipsCallTop } from '../../assets';


const NavigationCard = memo(function NavigationCard({
  icon,
  text,
  onPress,
  cardStyle,
  textStyle,
  iconSize = 26,
  iconColor = '#fff',
}: {
  icon: string;
  text: string;
  onPress: () => void;
  cardStyle: object;
  textStyle: object;
  iconSize?: number;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={cardStyle}>
      <Icon name={icon as any} size={iconSize} color={iconColor} style={styles.iconCenter} />
      <Text style={textStyle}>{text}</Text>
      <Image source={ellipsCallTop} style={[styles.shapes, { width: 50, height: 50 }]} />
      <Image source={ellipsCallBottom} style={[styles.shapesbottom, { width: 30, height: 30 }]} />
    </TouchableOpacity>
  );
});

export function DashboardScreen({ navigation }: { navigation: any }) {
  const lang = useAppSelector((state) => state.language.lang);
  const isIndia = useAppSelector((state) => state.country.isIndia);
  const textToVoiceRef = useRef(null);
  const [userNames, setUserName] = useState<string | null>(null);
  const [isUserNameLoaded, setIsUserNameLoaded] = useState(false);

  const dashboardTexts = useMemo(() => getDashboardTexts(lang), [lang]);
  const welcomeText = useMemo(
    () => `${dashboardTexts.welcome}${userNames ? `, ${userNames}` : ''}`,
    [dashboardTexts.welcome, userNames]
  );

  const navigateToCallHistory = useCallback(() => navigation.navigate('CallHistory'), [navigation]);
  const navigateToListing = useCallback(() => navigation.navigate('Listing'), [navigation]);
  const navigateToNewContactForm = useCallback(() => navigation.navigate('NewContactForm'), [navigation]);
  const navigateToCreateNewGroup = useCallback(() => navigation.navigate('CreateNewGroup'), [navigation]);
  const navigateToPrivateRoom = useCallback(() => navigation.navigate('PrivateRoom'), [navigation]);
  const navigateToDailyPlanner = useCallback(() => navigation.navigate('DailyPlanner'), [navigation]);
  const navigateToHomeScreen = useCallback(() => navigation.navigate('HomeScreen', {}), [navigation]);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const name = await AsyncStorage.getItem('userName');
        setUserName(name);
      } catch (e) {
        console.error(e);
      } finally {
        setIsUserNameLoaded(true);
      }
    };
    fetchUserName();
  }, []);

  useEffect(() => {
    const backAction = () => {
      Alert.alert('Exit', 'Do you want to exit the app?', [
        { text: 'No', onPress: () => {} },
        { text: 'Yes', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, []);

  if (!isIndia) {
    return <GlobalDashboard navigation={navigation} />;
  }

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <View style={styles.flexContainer}>
        <View style={styles.container}>
          <View style={styles.scrollView}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.welcomeRow}>
                <Text style={styles.welcomeText}>{welcomeText}</Text>
                
              </View>

              <View style={[styles.gridContainer, { flexWrap: 'nowrap' }]}>
                <View style={styles.ordersCard}>
                 
                  <NavigationCard
                    icon="call-outline"
                    text={dashboardTexts.calls}
                    onPress={navigateToCallHistory}
                    cardStyle={styles.callsButton}
                    textStyle={styles.cardText}
                  />
                </View>
                <View style={styles.ordersCard}>
                 
                  <NavigationCard
                    icon="chatbox-ellipses-outline"
                    text={dashboardTexts.chats}
                    onPress={navigateToListing}
                    cardStyle={styles.callsButton}
                    textStyle={styles.cardText}
                  />
                </View>
              </View>

              <View style={styles.gridContainer}>
                <View style={styles.addContactIcon}>
                  <TextToVoiceIconWrapper text={[dashboardTexts.addContact, dashboardTexts.addGroup, dashboardTexts.temporaryId]} lang={lang} autoplay={false} size={28} iconColor="#fff" />
                </View>
                <TouchableOpacity style={[styles.row, styles.addContactRow]} onPress={navigateToNewContactForm}>
                  <Icon name="person-add-outline" size={24} color="#333" />
                  <Text style={styles.addText} numberOfLines={1}>{dashboardTexts.addContact}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.row, styles.addGroupRow]} onPress={navigateToCreateNewGroup}>
                  <Icon name="people-outline" size={24} color="#333" />
                  <Text style={styles.addGroupText} numberOfLines={1}>{dashboardTexts.addGroup}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.row, styles.temporaryRow]} onPress={navigateToPrivateRoom}>
                  <Icon name="key-outline" size={24} color="#333" />
                  <Text style={styles.temporaryIdText} numberOfLines={1}>{dashboardTexts.temporaryId}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                <View style={{ flex: 1, marginRight: 5 }}>
                  <View style={[styles.gameZoneContainer, { backgroundColor: '#0293A3', marginRight: 0 }]}>
                    <TouchableOpacity style={styles.gameZoneButton} onPress={() => navigation.navigate('lingoweb')}>
                      <Icon name="language-outline" size={40} color="#fff" />
                      <Text style={styles.whiteCenterText} numberOfLines={1}>{dashboardTexts.learn}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={styles.gameZoneContainer}>
                    <TouchableOpacity style={[styles.gameZoneButton, { padding: 0, width: '100%' }]} onPress={() => navigation.navigate('LanguageGameScreen')}>
                      <Icon name="game-controller-outline" size={40} color="#fff" />
                      <Text style={styles.whiteCenterText} numberOfLines={1}>{dashboardTexts.gameZone}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <TouchableOpacity style={styles.dailyPlannerButton} onPress={navigateToDailyPlanner}>
                  
                  <Icon name="alarm-outline" size={26} color="#fff" />
                  <Text style={[styles.whiteCenterText, { marginLeft: 10, flexShrink: 1 }]} numberOfLines={1}>{dashboardTexts.dailyPlanner}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={navigateToHomeScreen} style={styles.eventButton}>
                 
                  <Icon name="calendar-outline" size={26} color="#fff" />
                  <Text style={[styles.whiteCenterText, { marginLeft: 10, flexShrink: 1 }]} numberOfLines={1}>{dashboardTexts.evMang}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.reminderContainer}>
                <View style={styles.addPlanIcon}>
                  <TextToVoiceIconWrapper text={[dashboardTexts.addPlan, dashboardTexts.addReminder, dashboardTexts.addEmergency]} lang={lang} autoplay={false} size={28} iconColor="#fff" />
                </View>
                <TouchableOpacity style={styles.addPlanRow} onPress={() => navigation.navigate('AddPlan')}>
                  <Icon name="calendar-outline" size={24} color="#333" />
                  <Text style={styles.addPlanText} numberOfLines={1}>{dashboardTexts.addPlan}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addReminderRow} onPress={() => navigation.navigate('AddReminder')}>
                  <Icon name="alarm-outline" size={24} color="#333" />
                  <Text style={styles.addReminderText} numberOfLines={1}>{dashboardTexts.addReminder}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addReminderRow} onPress={() => navigation.navigate('EmergencyContactScreen')}>
                  <Icon name="medkit-outline" size={24} color="#333" />
                  <Text style={styles.emergencyText} numberOfLines={1}>{dashboardTexts.addEmergency}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomContainer}>
                <View style={styles.bankingbg}>
                  <View style={styles.banking}>
                    <TouchableOpacity style={styles.jobsButton} onPress={() => navigation.navigate('JobScreen')}>
                      
                      <Icon name="briefcase-outline" size={28} color="#fff" />
                      <Text style={[styles.whiteCenterText, { marginLeft: 8 }]}>{dashboardTexts.jobs}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.admissions} onPress={() => navigation.navigate('AdmissionTabsScreen')}>
                     
                      <Icon name="school-outline" size={28} color="#fff" />
                      <Text style={[styles.whiteCenterText, { marginLeft: 10 }]}>Admission, Competition, Event & Course</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.startupsButton}
                      onPress={() => navigation.navigate('Category', { id: 'Startups, MSMEs, SMEs', name: 'startups' })}
                    >
                      
                      <Icon name="rocket-outline" size={28} color="#fff" />
                      <Text style={[styles.whiteCenterText, { marginLeft: 10 }]}>{dashboardTexts.startups}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.govtSchemesButton}
                      onPress={() => navigation.navigate('Category', { name: 'govtSchemes', id: 'Central Govt. Schemes, Policies' })}
                    >
                      
                      <Icon name="document-text-outline" size={28} color="#fff" />
                      <Text style={styles.govtText}>{dashboardTexts.govtSchemesShort}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.womenButton}
                      onPress={() => navigation.navigate('Category', { name: 'Women empowerment, Parenting', id: 'Women empowerment, Parenting, Children care' })}
                    >
                     
                      <Icon name="people-outline" size={28} color="#fff" />
                      <Text style={styles.womenText}>{dashboardTexts.women}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.farmersButton}
                      onPress={() => navigation.navigate('Category', { id: 'Farmers, Agriculture, Rural Development', name: 'agriculture' })}
                    >
                      
                      <Icon name="leaf-outline" size={28} color="#fff" />
                      <Text style={[styles.whiteCenterText, { marginLeft: 10 }]}>{dashboardTexts.farmersRural}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.aboutButton} onPress={() => Linking.openURL('https://anuvadini.aicte-india.org/AboutUs')}>
                      <Text style={styles.aboutText}>About Anuvadini</Text>
                      <View style={styles.anuvadiniLogoContainer}>
                        <Image source={anuvadiniLogo} style={styles.anuvadiniLogo} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={[styles.bottomContainer, { marginBottom: 12 }]}>
                <View style={styles.banking} />
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
      <Footer />
    </SafeAreaView>
  );
}

export default memo(DashboardScreen);
