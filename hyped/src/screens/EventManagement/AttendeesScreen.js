import { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, Image, StyleSheet, Alert, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import BottomNavigation from '../../components/BottomNavigation';
import { env } from '../../config/env';
import { userIcon } from '../../assets';

export default function AttendeesScreen({ eventId, creatorId, chatId }) {
  const navigation = useNavigation();
  const [attendees, setAttendees] = useState();
  const [loading, setLoading] = useState(false);
  const { uniqueId } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (eventId) {
      fetchAttendees(eventId);
    }
  }, [eventId]);

  const fetchAttendees = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${env.Market_Place_API_URL}event/get-join-request/${id}/en`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.status === 200) {
        setAttendees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendees:', error);
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (Id, newStatus, participantId) => {
    Alert.alert(
      `Confirm ${newStatus === 'Accepted' ? 'Accept' : 'Reject'}`,
      `Are you sure you want to ${newStatus === 'Accepted' ? 'accept' : 'reject'} this attendee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'Accepted' ? 'Accepted' : 'Rejected',
          style: newStatus === 'Accepted' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (newStatus == "Accepted") {
                const groupPayload = {
                  "_id": chatId,
                  "participantId": participantId, newStatus,
                  timeStamp: new Date().toISOString(),
                }
                const groupRes = await axios.post(`${env.API_BASE_URL}/chat/add-event-participant`, groupPayload, {
                  headers: { 'Content-Type': 'application/json' },
                });
              }

              const response = await axios.put(
                `${env.Market_Place_API_URL}event/update-attendee-status`,
                { id: Id, status: newStatus, eventId },
                { headers: { 'Content-Type': 'application/json' } }
              );
              if (response.status === 200) {
                setAttendees(
                  attendees.map(attendee =>
                    attendee._id === Id ? { ...attendee, status: newStatus } : attendee
                  )
                );
                Alert.alert('Success', `Attendee ${newStatus} successfully`);
              } else if (response.status === 202) {
                Alert.alert('warning', `Attendee capacity full.`);
              }
            } catch (error) {
              console.error(`Error updating attendee status:`, error);
              Alert.alert('Error', `Failed to ${newStatus} attendee`);
            }
          },
        },
      ]
    );
  };

  const renderAttendee = ({ item }) => (
    <TouchableOpacity
      style={styles.attendeeCard}
      onPress={() => navigation.navigate('DetailsScreen', { issue: item })}
    >
      <Image
        source={
          item.photo
            ? { uri: item.photo + env.SAS_KEY }
            : userIcon
        }
        style={styles.attendeeImage}
      />

      <View style={styles.attendeeDetails}>
        <Text style={styles.attendeeName}>{item?.name || 'Unknown'}</Text>
        <Text style={styles.attendeeRole}>{item?.role || 'No role'}</Text>
        <Text style={styles.attendeeRole}>{item?.company || 'No Company'}</Text>
        <Text style={styles.attendeeRole}>{item?.designation || 'No Designation'}</Text>
        <Text
          style={[
            styles.attendeeStatus,
            item.status === 'Accepted' && styles.acceptedStatus,
            item.status === 'Rejected' && styles.rejectedStatus,
          ]}
        >
          Status: {item.status}
        </Text>
        {item.status === 'Pending' && uniqueId === creatorId && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handleUpdateStatus(item._id, 'Accepted', item.participantId)}
              style={styles.actionButton}
            >
              <Icon name="checkmark-circle-outline" size={24} color="#41d1b2" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleUpdateStatus(item._id, 'Rejected')}
              style={styles.actionButton}
            >
              <Icon name="close-circle-outline" size={24} color="#FF6F61" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Attendees</Text>
      {loading ? (
        <Text style={styles.loadingText}>Loading attendees...</Text>
      ) : attendees?.length === 0 ? (
        <Text style={styles.noAttendeesText}>No attendees found</Text>
      ) : (
        <FlatList
          data={attendees}
          renderItem={renderAttendee}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
        />
      )}
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 15,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  attendeeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginHorizontal: 8,
  },
  attendeeImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginRight: 10,
  },
  attendeeDetails: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  attendeeRole: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 2,
  },
  attendeeStatus: {
    fontSize: 12,
    color: '#757575',
    marginTop: 5,
  },
  acceptedStatus: {
    color: '#41d1b2',
  },
  rejectedStatus: {
    color: '#FF6F61',
  },
  actionButtons: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: 10,
    marginTop: 5,
  },
  actionButton: {
    padding: 5,
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 20,
  },
  noAttendeesText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 20,
  },
});