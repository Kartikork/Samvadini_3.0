import React, { useState, useEffect, useMemo } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import CommunityScreen from './CommunityScreen';
import AttendeesScreen from './AttendeesScreen';
import AgendaScreen from './AgendaScreen';
import JoinEventModal from './JoinEventModal';
import { getEventTimeLeft } from '../../helper/DateFormate';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavigation from '../../components/BottomNavigation';

export default function DetailsScreen({ route, navigation }) {
  const { item } = route.params;
  const [tab, setTab] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [myId, setMyId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState(item.applicationStatus || 'Not Applied');

  useEffect(() => {
    const fetchMyId = async () => {
      try {
        const id = await AsyncStorage.getItem('uniqueId');
        setMyId(id);
      } catch (error) {
        console.error('Failed to load ID:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyId();
  }, []);

  useEffect(() => {
    const validStatuses = ['Not Applied', 'Pending', 'Accepted', 'Rejected'];
    const newStatus = validStatuses.includes(item.applicationStatus)
      ? item.applicationStatus
      : 'Not Applied';
    setApplicationStatus(newStatus);
  }, [item.applicationStatus]);

  const eventTimeLeft = useMemo(() => {
    return getEventTimeLeft(item.startAt, item.endAt);
  }, [item.startAt, item.endAt]);

  const gradientColors = useMemo(() => {
    switch (applicationStatus) {
      case 'Not Applied':
        return ['#67E8F9', '#C084FC'];
      case 'Pending':
        return ['#FFD700', '#FFA500'];
      case 'Accepted':
        return ['#00FF00', '#32CD32'];
      case 'Rejected':
        return ['#FF4500', '#DC143C'];
      default:
        return ['#67E8F9', '#C084FC'];
    }
  }, [applicationStatus]);

  const handleJoinSuccess = (message, newStatus) => {
    setApplicationStatus(newStatus || 'Pending');
    Alert.alert('Success', message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  const shouldHideButton = myId === item.creatorId || eventTimeLeft === 'Event passed';

  return (
    <>
      <View>
        <View style={styles.container}>
          {tab === null && (
            <>
              <Image
                source={
                  item?.images?.length > 0
                    ? { uri: item.images[0] + env.SAS_KEY }
                    : require('../../assets/education.jpg')
                }
                style={styles.headerImage}
              />
              <View style={styles.detailsContainer}>
                <View style={styles.header}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.eventName || 'Untitled Event'}
                  </Text>
                  <TouchableOpacity>
                    <Icon name="heart" size={24} color="#FF6F61" style={styles.heartIcon} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.amount} numberOfLines={2}>
                  {item.agenda || 'No agenda provided'}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${item.capacity > 0 && item.attendeesCount >= 0
                          ? (item.attendeesCount / item.capacity) * 100
                          : 0
                          }%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.meta}>
                  <Text style={styles.metaText}>
                    🕒 {eventTimeLeft}
                  </Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    📍 {item.location || 'Unknown'}
                  </Text>
                </View>
                <Text style={styles.description}>
                  {item.description || 'No description available for this event.'}
                </Text>
                {isLoading ? (
                  <Text style={styles.placeholderText}>Loading...</Text>
                ) : shouldHideButton ? (
                  <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderText}>
                      {myId === item.creatorId ? 'You created this event' : 'Event has passed'}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    disabled={applicationStatus === 'Accepted' || applicationStatus === 'Rejected'}
                  >
                    <LinearGradient
                      colors={['#6462AC', '#028BD3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.donateButton,
                        (applicationStatus === 'Accepted' || applicationStatus === 'Rejected') &&
                        styles.disabledButton,
                      ]}
                    >
                      <Text style={styles.donateButtonText}>
                        {applicationStatus === 'Not Applied' ? 'Join' : applicationStatus}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          {tab === 1 && <AgendaScreen />}
          {tab === 2 && (
            <AttendeesScreen eventId={item._id} creatorId={item.creatorId} chatId={item.chatId} />
          )}
          {tab === 3 && <CommunityScreen />}
        </View>
      </View>
      <BottomNavigation navigation={navigation} />
      <JoinEventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        eventId={item._id}
        onSuccess={handleJoinSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F1F1',
  },
  headerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  heartIcon: {
    padding: 5,
  },
  amount: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#41d1b2',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 14,
    color: '#757575',
    maxWidth: '50%',
  },
  description: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 20,
    lineHeight: 22,
  },
  donateButton: {
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    alignSelf: 'center',
  },
  donateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTabText: {
    color: '#FF6F61',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inactiveTabText: {
    color: '#212121',
    fontSize: 12,
    textAlign: 'center',
  },
});