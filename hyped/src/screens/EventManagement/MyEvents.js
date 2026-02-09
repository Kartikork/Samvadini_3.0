import { useEffect, useState } from 'react';
import { TouchableOpacity, View, StyleSheet, FlatList, Image, Text, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { env } from '../../config/env';
import { getEventTimeLeft } from '../../helper/DateFormate';
import { educationGroupIcons } from '../../assets';

export default function MyEvents({ searchQuery }) {
    const navigation = useNavigation();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const { lang = 'en', translations = {} } = {};

    useEffect(() => {
        getEventList();
    }, [searchQuery, lang]);

    const getEventList = async () => {
        setLoading(true);
        try {
            const uniqueId = await AsyncStorage.getItem('uniqueId');
            let payload = {
                page: 1,
                limit: 10,
                search: searchQuery || '',
                lang,
                uniqueId: uniqueId,
                type: "My Events"
            }

            const response = await axios.post(
                `${env.Market_Place_API_URL}event/get-my-and-completed-events`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.status === 200 || response.status === 201) {
                let fetchedEvents = response.data.events || [];
                setEvents(fetchedEvents);
            }
        } catch (error) {
            console.error(`Error fetching My Events events:`, error);
        } finally {
            setLoading(false);
        }
    };


    const handleDeleteEvent = async (eventId) => {
        Alert.alert(
            translations.confirmDelete,
            translations.confirmDeleteMessage,
            [
                { text: translations.cancel, style: 'cancel' },
                {
                    text: translations.delete,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await axios.delete(
                                `${env.Market_Place_API_URL}event/delete-event/${eventId}`,
                                { headers: { 'Content-Type': 'application/json' } }
                            );

                            if (response.status === 200) {
                                setEvents(events.filter(event => event._id !== eventId));
                            }
                        } catch (error) {
                            console.log('Error deleting event:', error);
                        }
                    },
                },
            ]
        );
    };

    const renderIssue = ({ item }) => (
        <TouchableOpacity
            style={styles.issueCard}
            onPress={() => navigation.navigate('DetailsScreen', { item })}
        >
            <Image
                source={
                    item?.images?.length > 0
                        ? { uri: item.images[0] + env.SAS_KEY }
                        : educationGroupIcons
                }
                style={styles.issueImage}
            />
            <View style={styles.issueDetails}>
                <Text style={styles.issueTitle} numberOfLines={1}>
                    {item.eventName || translations.untitledEvent}
                </Text>
                <Text style={styles.issueAmount} numberOfLines={2}>
                    {item.agenda || translations.noAgenda}
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
                <View style={styles.issueMeta}>
                    <Text style={styles.issueMetaText}>🕒 {getEventTimeLeft(item.startAt, item.endAt)}</Text>
                    <Text style={styles.issueMetaText} numberOfLines={1}>
                        📍 {item.location || translations.unknownLocation}
                    </Text>
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateEvents', { item })}
                        style={styles.actionButton}
                    >
                        <Icon name="pencil-outline" size={20} color="#0080ff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDeleteEvent(item._id)}
                        style={styles.actionButton}
                    >
                        <Icon name="trash-outline" size={20} color="#FF6F61" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <Text style={styles.loadingText}>{translations.loadingMyEvents || "Loading my events..."}</Text>
            ) : events.length === 0 ? (
                <Text style={styles.noEventsText}>{translations.noMyEvents || "No events available"}</Text>
            ) : (
                <FlatList
                    data={events}
                    renderItem={renderIssue}
                    keyExtractor={(item) => item._id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.flatListContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flatListContent: {
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },

    emptyText: {
        fontSize: 16,
        color: '#777',
    },
    issueCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        boxShadow: '0 0 12px -6px #999',
        marginTop: 10,
        marginHorizontal: 5,
    },
    issueImage: {
        width: 120,
        height: 120,
        borderRadius: 10,
        marginRight: 15,
    },
    issueDetails: {
        flex: 1,
    },
    issueTitle: {
        fontSize: 16,
        color: '#212121',
        marginBottom: 5,
    },
    issueAmount: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 5,
    },
    progressBarContainer: {
        height: 5,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 5,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#41d1b2',
    },
    issueMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    issueMetaText: {
        fontSize: 12,
        color: '#757575',
        maxWidth: '50%',
    },
    actionButtons: {
        flexDirection: 'row',
        alignSelf: 'flex-end',
        gap: 10,
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
    noEventsText: {
        fontSize: 16,
        color: '#757575',
        textAlign: 'center',
        marginTop: 20,
    },
});