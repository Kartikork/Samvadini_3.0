import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal,
    Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import BottomNavigation from '../../components/BottomNavigation';
import { env } from '../../config';

// Parse 12-hour time (e.g., "9:49 PM") to Date object
const parseTimeToDate = (timeStr, dateStr) => {
    try {
        if (!timeStr || !dateStr) {
            console.error('Invalid time or date:', { timeStr, dateStr });
            return new Date();
        }
        const [time, modifier] = timeStr.trim().split('\u202f');
        let [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            console.error('Invalid time format:', timeStr);
            return new Date();
        }
        if (modifier.toLowerCase() === 'pm' && hours !== 12) hours += 12;
        if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;
        const date = new Date(dateStr);
        date.setHours(hours, minutes, 0, 0);
        return date;
    } catch (error) {
        console.error('Error parsing time:', error.message, { timeStr, dateStr });
        return new Date();
    }
};

const UpdateReminder = ({ route }) => {
    const { _id, title, description, date, startTime, earlyReminder, priority, repeat, weekly, monthly, uniqueId } = route.params || {};
    const navigation = useNavigation();
    const { translations } = {};
    const [reminderTitle, setReminderTitle] = useState(title || '');
    const [reminderDescription, setReminderDescription] = useState(description || '');
    const [selectedDate, setSelectedDate] = useState(date ? new Date(date) : new Date());
    const [selectedTime, setSelectedTime] = useState(startTime && date ? parseTimeToDate(startTime, date) : new Date());
    const [selectedEarlyReminder, setSelectedEarlyReminder] = useState(earlyReminder || 'None');
    const [selectedPriority, setSelectedPriority] = useState(priority || 'Medium');
    const [selectedRepeat, setSelectedRepeat] = useState(repeat || 'Once');
    const [selectedWeekly, setSelectedWeekly] = useState(Array.isArray(weekly) ? weekly : []);
    const [selectedMonthly, setSelectedMonthly] = useState(Array.isArray(monthly) ? monthly.map(String) : []);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showEarlyReminderModal, setShowEarlyReminderModal] = useState(false);
    const [showRepeatModal, setShowRepeatModal] = useState(false);
    const [showPriorityModal, setShowPriorityModal] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectionType, setSelectionType] = useState('');

    const earlyReminderOptions = ['None', '5 minutes', '10 minutes', '15 minutes', '30 minutes', '1 hour'];
    const repeatOptions = ['Once', 'Daily', 'Weekly', 'Monthly'];
    const priorityOptions = ['Low', 'Medium', 'High'];
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const monthDays = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

    const formatDateForDisplay = (date) => {
        try {
            const options = { day: '2-digit', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('en-GB', options);
        } catch (error) {
            console.error('Error formatting date:', error.message);
            return 'Invalid Date';
        }
    };

    const formatTimeForDisplay = (date) => {
        try {
            const options = { hour: 'numeric', minute: '2-digit', hour12: true };
            return date.toLocaleTimeString('en-US', options).replace(' ', '\u202f');
        } catch (error) {
            console.error('Error formatting time:', error.message);
            return 'Invalid Time';
        }
    };

    const formatDateToYYYYMMDD = (date) => {
        try {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Error formatting date to YYYY-MM-DD:', error.message);
            return new Date().toISOString().split('T')[0];
        }
    };

    const onDateChange = (event, newDate) => {
        setShowDatePicker(false);
        if (newDate) {
            setSelectedDate(newDate);
            setSelectedTime(updateDateTime(selectedTime, newDate));
        }
    };

    const updateDateTime = (time, newDate) => {
        try {
            const updatedTime = new Date(time);
            updatedTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
            return updatedTime;
        } catch (error) {
            console.error('Error updating date-time:', error.message);
            return time;
        }
    };

    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) {
            setSelectedTime(updateDateTime(selectedTime, selectedDate));
        }
    };

    const handleRepeatSelection = (option) => {
        setSelectedRepeat(option);
        setShowRepeatModal(false);
        if (option === 'Weekly') {
            setSelectionType('Weekly');
            setShowSelectionModal(true);
        } else if (option === 'Monthly') {
            setSelectionType('Monthly');
            setShowSelectionModal(true);
        }
    };

    const toggleSelection = (item, type) => {
        const setFunction = type === 'weekly' ? setSelectedWeekly : setSelectedMonthly;
        const currentSelections = type === 'weekly' ? selectedWeekly : selectedMonthly;
        const updatedSelections = currentSelections.includes(item)
            ? currentSelections.filter(i => i !== item)
            : [...currentSelections, item];
        setFunction(updatedSelections);
    };

    const handleSave = async () => {
        if (!reminderTitle.trim()) {
            Alert.alert('Reminder title is required.');
            return;
        }

        try {
            const userId = await AsyncStorage.getItem('uniqueId');
            if (!userId) {
                throw new Error('User ID not found');
            }

            const payload = {
                uniqueId: userId,
                title: reminderTitle,
                description: reminderDescription,
                date: formatDateToYYYYMMDD(selectedDate),
                startTime: formatTimeForDisplay(selectedTime),
                earlyReminder: selectedEarlyReminder,
                priority: selectedPriority,
                repeat: selectedRepeat,
                type: 'Reminder',
                weekly: selectedRepeat === 'Weekly' ? selectedWeekly : [],
                monthly: selectedRepeat === 'Monthly' ? selectedMonthly : [],
            };

            const response = await axios.put(
                `${env.Market_Place_API_URL}reminder/update/${_id}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            Alert.alert('Reminder updated successfully.', {
                type: 'success',
                placement: 'top',
                duration: 300,
            });
            navigation.navigate('DailyPlanner');
        } catch (error) {
            console.error('Error updating reminder:', error.response?.data || error.message);
            Alert.alert('Failed to update reminder.');
        }
    };

    const closeModal = (setModalState, index) => {
        setModalState({ index: null, show: false });
    };

    useEffect(() => {
        try {
            setReminderTitle(title || '');
            setReminderDescription(description || '');
            setSelectedDate(date ? new Date(date) : new Date());
            setSelectedTime(startTime && date ? parseTimeToDate(startTime, date) : new Date());
            setSelectedEarlyReminder(earlyReminder || 'None');
            setSelectedPriority(priority || 'Medium');
            setSelectedRepeat(repeat || 'Once');
            setSelectedWeekly(Array.isArray(weekly) ? weekly : []);
            setSelectedMonthly(Array.isArray(monthly) ? monthly.map(String) : []);
        } catch (error) {
            console.error('Error initializing state:', error.message);
            Alert.alert('Failed to load reminder data.');
        }
    }, [title, description, date, startTime, earlyReminder, priority, repeat, weekly, monthly]);

    return (
        <>
            <ScrollView style={styles.container}>
                <Text style={styles.sectionTitle}>{translations.updateReminder || 'Update Reminder'}</Text>

                <Text style={styles.label}>{translations.title || 'Title'}</Text>
                <TextInput
                    style={styles.input}
                    value={reminderTitle}
                    onChangeText={setReminderTitle}
                    placeholder={translations.enterReminderTitle || 'Enter Reminder Title'}
                />

                <Text style={styles.label}>{translations.description || 'Description'}</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reminderDescription}
                    onChangeText={setReminderDescription}
                    placeholder={translations.enterDescription || 'Enter Description'}
                    multiline
                    numberOfLines={4}
                />

                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{translations.date || 'Date'}</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <Text style={styles.detailValue}>{formatDateForDisplay(selectedDate)} ⬇</Text>
                    </TouchableOpacity>
                </View>
                {showDatePicker && (
                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}

                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{translations.time || 'Time'}</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                        <Text style={styles.detailValue}>{formatTimeForDisplay(selectedTime)} ⬇</Text>
                    </TouchableOpacity>
                </View>
                {showTimePicker && (
                    <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
                    />
                )}

                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{translations.priority || 'Priority'}</Text>
                    <TouchableOpacity onPress={() => setShowPriorityModal(true)}>
                        <Text style={styles.detailValue}>{selectedPriority} ⬇</Text>
                    </TouchableOpacity>
                </View>
                <Modal
                    transparent
                    visible={showPriorityModal}
                    animationType="fade"
                    onRequestClose={() => setShowPriorityModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {priorityOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.modalOption, { justifyContent: "center" }]}
                                    onPress={() => {
                                        setSelectedPriority(option);
                                        setShowPriorityModal(false);
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowPriorityModal(false)}
                            >
                                <Text style={styles.modalCancelText}>{translations.cancel || 'Cancel'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{translations.earlyReminder || 'Early Reminder'}</Text>
                    <TouchableOpacity onPress={() => setShowEarlyReminderModal(true)}>
                        <Text style={styles.detailValue}>{selectedEarlyReminder} ⬇</Text>
                    </TouchableOpacity>
                </View>
                <Modal
                    transparent
                    visible={showEarlyReminderModal}
                    animationType="fade"
                    onRequestClose={() => setShowEarlyReminderModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {earlyReminderOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.modalOption, { justifyContent: "center" }]}
                                    onPress={() => {
                                        setSelectedEarlyReminder(option);
                                        setShowEarlyReminderModal(false);
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowEarlyReminderModal(false)}
                            >
                                <Text style={styles.modalCancelText}>{translations.cancel || 'Cancel'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{translations.repeat || 'Repeat'}</Text>
                    <TouchableOpacity onPress={() => setShowRepeatModal(true)}>
                        <Text style={styles.detailValue}>{selectedRepeat} ⬇</Text>
                    </TouchableOpacity>
                </View>
                <Modal
                    transparent
                    visible={showRepeatModal}
                    animationType="fade"
                    onRequestClose={() => setShowRepeatModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {repeatOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.modalOption, { justifyContent: "center" }]}
                                    onPress={() => handleRepeatSelection(option)}
                                >
                                    <Text style={styles.modalOptionText}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowRepeatModal(false)}
                            >
                                <Text style={styles.modalCancelText}>{translations.cancel || 'Cancel'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <Modal
                    transparent
                    visible={showSelectionModal}
                    animationType="fade"
                    onRequestClose={() => setShowSelectionModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <ScrollView style={styles.modalScroll}>
                                {selectionType === 'Weekly' ? (
                                    weekDays.map(day => (
                                        <TouchableOpacity
                                            key={day}
                                            style={styles.modalOption}
                                            onPress={() => toggleSelection(day, 'weekly')}
                                        >
                                            <Text style={styles.modalOptionText}>{day}</Text>
                                            <View style={[styles.checkbox, selectedWeekly.includes(day) && styles.checkedBox]}>
                                                {selectedWeekly.includes(day) && <Text style={styles.tick}>✓</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : selectionType === 'Monthly' ? (
                                    monthDays.map(day => (
                                        <TouchableOpacity
                                            key={day}
                                            style={styles.modalOption}
                                            onPress={() => toggleSelection(day, 'monthly')}
                                        >
                                            <Text style={styles.modalOptionText}>Day {day}</Text>
                                            <View style={[styles.checkbox, selectedMonthly.includes(day) && styles.checkedBox]}>
                                                {selectedMonthly.includes(day) && <Text style={styles.tick}>✓</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : null}
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => closeModal(setShowSelectionModal, 0)}>
                                        <Text style={styles.closeButtonText}>{translations.close || 'Close'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setShowSelectionModal(false)}>
                                        <LinearGradient
                                            colors={['#6462AC', '#028BD3']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.closeButton}
                                        >
                                            <Text style={styles.closeButtonText}>{translations.done || 'Done'}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                <TouchableOpacity onPress={handleSave}>
                    <LinearGradient
                        style={styles.saveButton}
                        colors={['#6462AC', '#028BD3']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.saveText}>{translations.updateReminder || 'Update Reminder'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
            <BottomNavigation />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        padding: 20,
        backgroundColor: '#fff',
    },
    sectionTitle: {
        fontSize: 22,
        color: '#212121',
        marginBottom: 15,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    detailLabel: {
        fontSize: 16,
        color: '#333',
    },
    detailValue: {
        fontSize: 16,
        color: '#666',
    },
    saveButton: {
        borderRadius: 30,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    saveText: {
        fontSize: 16,
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalScroll: {
        // maxHeight: hp('50%'),
        // width: wp('70%'),
        paddingRight: 15
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        width: '80%'
    },
    modalOption: {
        paddingVertical: 10,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
    },
    modalCancelButton: {
        paddingVertical: 10,
        width: '50%',
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#f17f5c',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkedBox: {
        backgroundColor: '#000',
    },
    tick: {
        color: '#fff',
        fontSize: 14,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        width: '100%',
    },
    closeButton: {
        marginTop: 10,
        paddingVertical: 10,
        backgroundColor: '#c02d00ff',
        borderRadius: 30,
        paddingHorizontal: 20,
    },
    closeButtonText: {
        fontSize: 16,
        color: '#fff',
    },
});

export default UpdateReminder;