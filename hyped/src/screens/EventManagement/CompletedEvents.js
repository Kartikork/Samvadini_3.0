import { useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View, StyleSheet, FlatList, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { env } from '../../config/env';
import { educationGroupIcons } from '../../assets';
import { useAppSelector } from '../../state/hooks';
import { getAppTranslations } from '../../translations';

export default function CompletedEvents({ searchQuery }) {
    const navigation = useNavigation();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const lang = useAppSelector(state => state.language.lang);
    const translations = useMemo(() => getAppTranslations(lang), [lang]);

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
                type: "Completed Events"
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
            console.error(`Error fetching Completed Events events:`, error);
        } finally {
            setLoading(false);
        }
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
                    <Text style={styles.issueMetaText}>🕒 {translations.eventPassed}</Text>
                    <Text style={styles.issueMetaText} numberOfLines={1}>
                        📍 {item.location || translations.unknownLocation}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <Text style={styles.loadingText}>{translations.loadingCompletedEvents || "Loading completed events..."}</Text>
            ) : events.length === 0 ? (
                <Text style={styles.noEventsText}>{translations.noCompletedEvents || "No completed events available"}</Text>
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
        height: 100,
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