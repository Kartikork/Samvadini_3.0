import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import { env } from '../../config';

const SharePlannerCount = ({ route }) => {
    const { data, curUserUid } = route.params;
    const [shareRemindersPending, setShareRemindersPending] = useState([]);
    const [shareRemindersAccepted, setShareRemindersAccepted] = useState([]);
    const [shareRemindersAll, setShareRemindersAll] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const { lang = 'en', translations = {} } = {};

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${env.Market_Place_API_URL}reminder/get-share-plan-by-id/${data._id}`,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.status === 200) {
                const sharedPlans = response.data.sharedPlans || [];
                setShareRemindersAll(sharedPlans);
                const acceptedPlans = sharedPlans?.filter(plan => plan.status === 'Accepted');
                const pendingPlans = sharedPlans?.filter(plan => plan.status !== 'Accepted');
                setShareRemindersAccepted(acceptedPlans);
                setShareRemindersPending(pendingPlans);
            }
        } catch (error) {
            console.error('Error fetching data:', error.response?.data || error.message);
            setShareRemindersAccepted([]);
            setShareRemindersPending([]);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredData = () => {
        if (filter === 'accepted') return shareRemindersAccepted;
        if (filter === 'pending') return shareRemindersPending;
        return shareRemindersAll;
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const renderDetails = (item) => {
        if (item.type === 'Planner') {
            return (
                <View style={styles.detailsContainer}>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Frequency:</Text> {item.freq || 'N/A'}</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Date:</Text> {item.date || 'N/A'}</Text>
                    {item.plan && item.plan.length > 0 && (
                        <View>
                            <Text style={styles.detailLabel}>Sub-Plans:</Text>
                            {item.plan.map((subPlan, index) => (
                                <View key={index} style={styles.subPlanContainer}>
                                    <Text style={styles.detailText}>Title: {subPlan.title}</Text>
                                    <Text style={styles.detailText}>Description: {subPlan.description}</Text>
                                    <Text style={styles.detailText}>Start Time: {subPlan.startTime}</Text>
                                    <Text style={styles.detailText}>End Time: {subPlan.endTime}</Text>
                                    <Text style={styles.detailText}>Priority: {subPlan.priority}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            );
        } else if (item.type === 'Reminder') {
            return (
                <View style={styles.detailsContainer}>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Description:</Text> {item.description || 'N/A'}</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Priority:</Text> {item.priority || 'N/A'}</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Repeat:</Text> {item.repeat || 'N/A'}</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Early Reminder:</Text> {item.earlyReminder || 'N/A'}</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Date:</Text> {item.date || 'N/A'}</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Weekly Days:</Text> {item.weekly?.join(', ') || 'N/A'}</Text>
                </View>
            );
        }
        return null;
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity onPress={() => toggleExpand(item._id)} activeOpacity={0.8}>
            <View style={[styles.reminderItem, { backgroundColor: item.color }]}>
                <View style={styles.reminderContent}>
                    <View style={styles.titleRow}>
                        <Text style={styles.reminderName}>{item.sharewithName || item.title}</Text>
                        <View style={styles.titleRight}>
                            <Text style={styles.countText}>{item.status === 'Accepted' ? 'Accepted' : 'Pending'}</Text>
                            <Icon
                                name={expandedId === item._id ? 'expand-less' : 'expand-more'}
                                size={25}
                                color="#333"
                            />
                        </View>
                    </View>
                    <Text style={styles.reminderTime}>{item.startTime}</Text>
                    {expandedId === item._id && renderDetails(item)}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {loading && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color="#01d5f5" />
                    <Text style={styles.loaderText}>
                        {translations?.Loading || 'Loading...'}
                    </Text>
                </View>
            )}

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={true}>
                <TouchableOpacity onPress={() => toggleExpand(data._id)} activeOpacity={0.8}>
                    <View style={[styles.reminderItem, { backgroundColor: data.color }]}>
                        <View style={styles.reminderContent}>
                            <View style={styles.titleRow}>
                                <Text style={styles.reminderName}>{data.title || ''}</Text>
                                <Icon
                                    name={expandedId === data._id ? 'expand-less' : 'expand-more'}
                                    size={25}
                                    color="#333"
                                />
                            </View>
                            <Text style={styles.reminderTime}>{data.startTime || ''}</Text>
                            {expandedId === data._id && renderDetails(data)}
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.countBoxesContainer}>
                    <TouchableOpacity
                        style={[styles.countBox, { backgroundColor: filter === 'accepted' ? '#388e3c' : '#4caf50' }]}
                        onPress={() => setFilter('accepted')}
                    >
                        <Text style={styles.countBoxTitle}>Accepted</Text>
                        <Text style={styles.countBoxValue}>{shareRemindersAccepted.length || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.countBox, { backgroundColor: filter === 'pending' ? '#f57c00' : '#ff9800' }]}
                        onPress={() => setFilter('pending')}
                    >
                        <Text style={styles.countBoxTitle}>Pending</Text>
                        <Text style={styles.countBoxValue}>{shareRemindersPending.length || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.countBox, { backgroundColor: filter === 'all' ? '#0288d1' : '#03a9f4' }]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={styles.countBoxTitle}>All</Text>
                        <Text style={styles.countBoxValue}>{shareRemindersAll.length || 0}</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={getFilteredData()}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    style={styles.remindersList}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Data not shared</Text>
                    }
                />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flex: 1,
        // padding: wp(2),
    },
    countBoxesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // marginBottom: hp(2),
    },
    countBox: {
        flex: 1,
        // marginHorizontal: wp(1),
        // padding: wp(3),
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBoxTitle: {
        // fontSize: wp(4),
        color: '#fff',
    },
    countBoxValue: {
        // fontSize: wp(5),
        color: '#fff',
        // marginTop: hp(0.5),
    },
    reminderItem: {
        borderRadius: 10,
        // marginBottom: hp(1),
        // padding: wp(2),
    },
    reminderContent: {
        flexDirection: 'column',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reminderName: {
        // fontSize: wp(4.5),
        color: '#333',
    },
    countText: {
        // fontSize: wp(4),
        color: '#f17f5c',
        // marginRight: wp(2),
    },
    reminderTime: {
        // fontSize: wp(3.5),
        color: '#666',
        // marginTop: hp(0.5),
    },
    remindersList: {
        flexGrow: 0,
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        // fontSize: wp(4.5),
        // marginTop: hp(2),
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loaderText: {
        // marginTop: hp(1),
        // fontSize: wp(4.5),
        color: '#333',
    },
    detailsContainer: {
        // marginTop: hp(1),
        // padding: wp(2),
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 5,
    },
    detailText: {
        // fontSize: wp(3.5),
        color: '#333',
        // marginBottom: hp(0.5),
    },
    detailLabel: {
        fontWeight: '600',
        color: '#000',
    },
    subPlanContainer: {
        // marginTop: hp(1),
        // paddingLeft: wp(2),
        borderLeftWidth: 2,
        borderLeftColor: '#ccc',
    },
});

export default SharePlannerCount;