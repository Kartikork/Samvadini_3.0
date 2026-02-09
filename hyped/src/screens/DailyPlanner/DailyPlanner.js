import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, BackHandler, Text, FlatList, Modal, ActivityIndicator, TouchableWithoutFeedback, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import BottomNavigation from '../../components/BottomNavigation';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AddReminder from './AddReminder';
import AddPlan from './AddPlan';
import { env } from '../../config';
import { useAppSelector } from '../../state/hooks';

const DailyPlanner = () => {
    const { uniqueId } = useAppSelector(state => state.auth);
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [reminders, setReminders] = useState([]);
    const [activeTab, setActiveTab] = useState('All');
    const [loading, setLoading] = useState(false);
    const translations = {};
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [selectedTab, setSelectedTab] = useState(1);

    const handleTab = () => {
        setSelectedTab(selectedTab === 1 ? 2 : 1);
    }

    const toggleReminder = (id) => {
        setReminders((prevReminders) =>
            prevReminders.map((reminder) =>
                reminder._id === id
                    ? { ...reminder, status: reminder.status === 'pending' ? 'completed' : 'pending' }
                    : reminder
            )
        );
    };

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                const currentRoute =
                    navigation.getState().routes[navigation.getState().index].name;

                if (currentRoute === 'Dashboard') {
                    Alert.alert(
                        'Exit App',
                        'Are you sure you want to exit?',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'YES', onPress: () => BackHandler.exitApp() },
                        ]
                    );
                    return true;
                }

                if (navigation.canGoBack()) {
                    navigation.goBack();
                    return true;
                }

                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Dashboard' }],
                    })
                );

                return true;
            };

            const subscription = BackHandler.addEventListener(
                'hardwareBackPress',
                onBackPress
            );

            return () => subscription.remove();
        }, [navigation])
    );


    const handleDelete = async (id, type) => {
        try {
            let deleteId = id;
            let planTitle = null;

            if (type === 'Planner') {
                const [plannerId, title] = id.split('-');
                deleteId = plannerId;
                planTitle = title;
            }
            const url = type === "Planner" ? `reminder/delete-plan` : "reminder/delete";
            const response = await axios.delete(
                `${env.Market_Place_API_URL + url}/${deleteId}`,
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            if (response.status === 200) {
                Alert.alert(`${type} deleted successfully`);
                setReminders((prevReminders) => prevReminders.filter((reminder) => reminder._id !== id));
            }
        } catch (error) {
            console.error('Error deleting item:', error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    const openModal = () => {
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    const addReminder = (newReminder) => {
        setReminders((prevReminders) => [
            ...prevReminders,
            {
                ...newReminder,
                _id: `${prevReminders.length + 1}-${new Date().getTime()}`,
                color: newReminder.type === 'Planner' ? '#aaebff' : '#d4f6ff',
            },
        ]);
    };

    const formatDateDisplay = (date) => {
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options);
    };

    const formatTimeDisplay = (date) => {
        const options = { hour: '2-digit', minute: '2-digit', hour12: true };
        return date.toLocaleTimeString('en-US', options);
    };

    const formatDateToYYYYMMDD = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getWeekDates = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = (dayOfWeek + 6) % 7;
        const monday = new Date(today);
        monday.setDate(today.getDate() - diff);
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            weekDates.push(date.getDate());
        }
        return weekDates;
    };

    const weekDates = getWeekDates();

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryDate = formatDateToYYYYMMDD(selectedDate);
            const todayDay = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
            const todayDate = selectedDate.getDate();
            const payload = {
                uniqueId,
                todayDate,
                todayDay,
                date: queryDate,
            };
            const response = await axios.post(
                `${env.Market_Place_API_URL}reminder/get-both`,
                payload,
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            if (response.status == 200) {
                const { planners, reminders } = response.data;

                const normalizedData = [
                    ...planners.map((planner) => ({
                        ...planner,
                        color: '#aaebff',
                    })),
                    ...reminders.map((reminder) => ({
                        ...reminder,
                        color: '#d4f6ff',
                    })),
                ];

                normalizedData.sort((a, b) => {
                    const timeA = new Date(`1970-01-01 ${a.startTime}`);
                    const timeB = new Date(`1970-01-01 ${b.startTime}`);
                    return timeA - timeB;
                });

                setReminders(normalizedData);
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
            console.error('Error fetching data:', error.response?.data || error.message);
            setReminders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setSelectedDate(new Date());
        fetchData();
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const isCheckboxDisabled = (item) => {
        if (item.status === 'completed') return false;
        try {
            const time12h = item.startTime?.trim()?.toLowerCase();
            const [startTime, modifier] = time12h.split(' ');
            let [hours, minutes] = startTime.split(':').map(Number);

            if (modifier === 'pm' && hours !== 12) {
                hours += 12;
            }
            if (modifier === 'am' && hours === 12) {
                hours = 0;
            }

            const hoursStr = String(hours).padStart(2, '0');
            const minutesStr = String(minutes).padStart(2, '0');

            const combinedDateTime = new Date(`${item.date}T${hoursStr}:${minutesStr}:00`);
            const now = new Date();
            return now > combinedDateTime;
        } catch (error) {
            return false;
        }
    };

    const showDatePicker = () => {
        setDatePickerVisible(true);
        DateTimePickerAndroid.open({
            value: selectedDate,
            onChange: (event, date) => {
                setDatePickerVisible(false);
                if (date) {
                    setSelectedDate(date);
                }
            },
            mode: 'date',
            is24Hour: true,
        });
    };

    return (
        <>
            <View style={styles.container}>
                {loading && (
                    <View style={styles.loaderOverlay}>
                        <ActivityIndicator size="large" color="#01d5f5" />
                        <Text style={styles.loaderText}>
                            {translations?.Loading || 'Loading...'}
                        </Text>
                    </View>
                )}

                <View style={styles.calendar}>
                    {days.map((day, index) => {
                        const currentDate = new Date();
                        currentDate.setDate(weekDates[0] + index);
                        const isSelected = currentDate.toDateString() === selectedDate.toDateString();
                        return (
                            <TouchableOpacity
                                key={day}
                                style={[styles.dayButton, isSelected && styles.selectedDay]}
                                onPress={() => setSelectedDate(currentDate)}
                            >
                                <Text style={[styles.dayText, isSelected && styles.selectedText]}>
                                    {translations?.[day.toLowerCase()] || day}
                                </Text>
                                <Text style={[styles.dateText, isSelected && styles.selectedText]}>
                                    {currentDate.getDate()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity
                        style={[styles.dayButton, { marginTop: 7 }, datePickerVisible && styles.selectedDay]}
                        onPress={showDatePicker}
                    >
                        <Ionicons color={datePickerVisible ? '#fff' : '#555'} size={30} name="calendar-outline" />
                    </TouchableOpacity>
                </View>
                <View style={styles.dateInfo}>
                    <TouchableOpacity style={styles.todayButton} onPress={() => setSelectedDate(new Date())}>
                        <Text style={styles.todayText}>
                            {translations?.Today || 'Today'}
                        </Text>
                    </TouchableOpacity>
                    <Text style={[styles.dateText]}>
                        {formatDateDisplay(selectedDate)}
                    </Text>
                </View>

                <View style={styles.tabContainer}>
                    <View style={styles.tabHorizontal}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'All' && styles.activeTab]}
                            onPress={() => setActiveTab('All')}
                        >
                            <Text style={[styles.tabText, activeTab === 'All' && styles.activeTabText]}>
                                {translations?.All || 'All'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'Planner' && styles.activeTab]}
                            onPress={() => setActiveTab('Planner')}
                        >
                            <Text style={[styles.tabText, activeTab === 'Planner' && styles.activeTabText]}>
                                {translations?.Planner || 'Planner'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'Reminder' && styles.activeTab]}
                            onPress={() => setActiveTab('Reminder')}
                        >
                            <Text style={[styles.tabText, activeTab === 'Reminder' && styles.activeTabText]}>
                                {translations?.Reminder || 'Reminder'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={reminders.filter((reminder) => {
                        if (activeTab === 'All') {
                            return true;
                        }
                        return reminder.type.toLowerCase() === activeTab.toLowerCase();
                    })}
                    renderItem={({ item }) => (
                        <View style={[styles.reminderItem, { backgroundColor: item.color }]}>
                            <TouchableOpacity
                                style={[styles.checkbox, isCheckboxDisabled(item) && { opacity: 0.4 }]}
                                onPress={() => toggleReminder(item._id)}
                                disabled={isCheckboxDisabled(item)}
                            >
                                <Text>{item.status === 'completed' ? '✓' : ''}</Text>
                            </TouchableOpacity>
                            <View style={styles.reminderContent}>
                                <TouchableOpacity
                                    onPress={() => {
                                        navigation.navigate('SharePlannerCount', { data: item, curUserUid: uniqueId });
                                    }}
                                >
                                    <Text style={styles.reminderName}>{item.title}</Text>
                                    <View style={{ flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
                                        <Text style={[styles.reminderTime, { marginRight: 0 }]}>{item.startTime}</Text>
                                        {item.shareCounts.totalCount > 0 && <>
                                            <View style={{ width: 30 }} />
                                            <Text style={styles.reminderTime}>
                                                Shared: {item.shareCounts.totalCount > 0 &&
                                                    <Text style={styles.reminderTime}>{item.shareCounts.acceptedCount || ""} / {item.shareCounts.totalCount || ""}</Text>
                                                }
                                            </Text>
                                        </>}
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.customButton}
                                onPress={() => {
                                    const screenName = item.type === 'Reminder' ? 'UpdateReminder' : 'UpdatePlanner';
                                    navigation.navigate(screenName, item);
                                }}
                            >
                                <Ionicons name="pencil" size={20} color="#387fbe" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.customButton}
                                onPress={() => {
                                    navigation.navigate('SharePlan', { selectedMessages: [item], curUserUid: uniqueId });
                                }}
                            >
                                <Ionicons name="share-social" size={20} color="#387fbe" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.customButton}
                                onPress={() => handleDelete(item._id, item.type)}
                            >
                                <Ionicons name="trash-outline" size={20} color="#f08" />
                            </TouchableOpacity>
                        </View>
                    )}
                    keyExtractor={(item) => item._id}
                    style={styles.remindersList}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {translations?.NoPlannersReminders || 'No planners or reminders for this date'}
                        </Text>
                    }
                />

                <View style={styles.bottomNav}>
                    <TouchableOpacity onPress={openModal}>
                        <LinearGradient
                            style={styles.addButton}
                            colors={['#6462AC', '#028BD3']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.addIcon}>+</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={closeModal}
                >
                    <TouchableWithoutFeedback onPress={closeModal}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <View style={styles.modalContent}>
                                    <TouchableWithoutFeedback onPress={closeModal}>
                                        <View style={styles.close} />
                                    </TouchableWithoutFeedback>
                                    <View style={styles.row}>
                                        <TouchableOpacity style={selectedTab === 1 ? styles.activebtn : styles.modalButton} onPress={() => handleTab(1)}>
                                            <Text style={selectedTab === 1 ? styles.modalText : { color: "#333", textAlign: "center" }}>
                                                {translations?.AddReminder || 'Add Reminder'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={selectedTab === 2 ? styles.activebtn : styles.modalButton} onPress={() => handleTab(2)}>
                                            <Text style={selectedTab === 2 ? styles.modalText : { color: "#333", textAlign: "center" }}>
                                                {translations?.AddPlanner || 'Add Planner'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    {selectedTab === 1 && <AddReminder footer={false} />}
                                    {selectedTab === 2 && <AddPlan footer={false} />}
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </View>
            <BottomNavigation navigation={navigation} activeScreen="DailyPlanner" />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        marginTop: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
    },
    close: {
        backgroundColor: '#ddd',
        // height: hp('0.9%'),
        width: '30%',
        borderRadius: 5,
        alignSelf: 'center',
        marginVertical: 10,
    },
    calendar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dayButton: {
        alignItems: 'center',
        padding: 5,
        // width: wp('12%'),
    },
    selectedDay: {
        backgroundColor: '#01d5f5',
        borderRadius: 10,
        paddingHorizontal: 8,
    },
    dayText: {
        fontSize: 12,
        color: '#333',
    },
    dateText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    todayButton: {
        backgroundColor: '#f17f5c',
        borderRadius: 5,
        padding: 5,
        marginRight: 10,
    },
    todayText: {
        color: '#fff',
        fontSize: 14,
    },
    reminderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reminderContent: {
        flex: 1,
    },
    reminderName: {
        fontSize: 16,
        color: '#333',
    },
    reminderTime: {
        fontSize: 14,
        color: '#666',
    },
    customButton: {
        backgroundColor: '#fff',
        borderRadius: 50,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginHorizontal: 2,
    },
    remindersList: {
        flex: 1,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: 10,
        position: 'absolute',
        // bottom: hp('5%'),
        right: 10,
    },
    addButton: {
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addIcon: {
        fontSize: 24,
        color: '#fff',
    },
    usageInfo: {
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
    },
    usageText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',

    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 0,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        // height: hp('75%'),
        paddingBottom: 0,
        flexWrap: 'wrap',
        position: 'absolute',
        zIndex: 99999999,
        bottom: 0,
        left: 0,
        right: 0,
    },


    selectedText: {
        color: '#fff',
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 16,
        marginTop: 10,
    },
    modalButton: {
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 5,
        marginTop: 10,
        backgroundColor: '#EFEFEF',
        // width: wp('45%'),
    },
    activebtn: {
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 5,
        marginTop: 10,
        backgroundColor: '#0095FF',
        // width: wp('45%'),
    },
    modalText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    tab: {
        marginRight: 20,
    },
    tabText: {
        fontSize: 16,
        color: '#333',
    },
    tabHorizontal: {
        flexDirection: 'row',
        justifyContent: 'start',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderColor: '#f17f5c',
    },
    activeTabText: {
        color: '#f17f5c',
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loaderText: {
        marginTop: 10,
        fontSize: 16,
        color: '#333',
    },
});

export default DailyPlanner;