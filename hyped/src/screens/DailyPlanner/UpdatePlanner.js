import React, { useState, useEffect, memo } from 'react';
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
import { useAppSelector } from '../../state/hooks';
import { getAppTranslations } from '../../translations';

// Parse 12-hour time (e.g., "9:50 PM") to Date object
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

const UpdatePlanner = ({ route }) => {
    const { _id, title, date, startTime, freq, weekly, monthly, plan, uniqueId } = route.params;
    const navigation = useNavigation();
    const lang = useAppSelector(state => state.language.lang);
    const translations = useMemo(() => getAppTranslations(lang), [lang]);

    // Initialize state with received data
    const [planTitle, setPlanTitle] = useState(title || '');
    const [selectedDate, setSelectedDate] = useState(date ? new Date(date) : new Date());
    const [selectedStartTime, setSelectedStartTime] = useState(startTime && date ? parseTimeToDate(startTime, date) : new Date());
    const [selectedFreq, setSelectedFreq] = useState(freq || 'Once');
    const [selectedWeekly, setSelectedWeekly] = useState(Array.isArray(weekly) ? weekly : []);
    const [selectedMonthly, setSelectedMonthly] = useState(Array.isArray(monthly) ? monthly.map(String) : []);
    const [plans, setPlans] = useState(plan && plan.length > 0 ? plan.map(p => ({
        title: p.title || '',
        description: p.description || '',
        startTime: p.startTime && date ? parseTimeToDate(p.startTime, date) : new Date(),
        endTime: p.endTime && date ? parseTimeToDate(p.endTime, date) : new Date(new Date().getTime() + 10 * 60 * 1000),
        priority: p.priority || 'Medium',
    })) : [{
        title: '',
        description: '',
        startTime: new Date(),
        endTime: new Date(new Date().getTime() + 10 * 60 * 1000),
        priority: 'Medium',
    }]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState({ index: null, show: false });
    const [showEndTimePicker, setShowEndTimePicker] = useState({ index: null, show: false });
    const [showFreqModal, setShowFreqModal] = useState(false);
    const [showWeeklyModal, setShowWeeklyModal] = useState(false);
    const [showMonthlyModal, setShowMonthlyModal] = useState(false);
    const [showPriorityModal, setShowPriorityModal] = useState({ index: null, show: false });

    const freqOptions = ['Once', 'Daily', 'Weekly', 'Monthly'];
    const priorityOptions = ['Low', 'Medium', 'High'];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const monthDays = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

    // Format Date for display
    const formatDateForDisplay = (date) => {
        try {
            const options = { day: '2-digit', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('en-GB', options);
        } catch (error) {
            console.error('Error formatting date:', error.message);
            return 'Invalid Date';
        }
    };

    // Format Time for display and API
    const formatTimeForDisplay = (date) => {
        try {
            const options = { hour: 'numeric', minute: '2-digit', hour12: true };
            return date.toLocaleTimeString('en-US', options).replace(' ', '\u202f');
        } catch (error) {
            console.error('Error formatting time:', error.message);
            return 'Invalid Time';
        }
    };

    // Format Date for API
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

    // Update individual plan field
    const updatePlan = (index, field, value) => {
        const updatedPlans = [...plans];
        updatedPlans[index][field] = value;
        setPlans(updatedPlans);
    };

    // Add new sub-plan
    const addNewPlan = () => {
        const lastPlan = plans[plans.length - 1];
        const newStartTime = new Date(lastPlan.endTime.getTime() + 5 * 60 * 1000);
        setPlans([...plans, {
            title: '',
            description: '',
            startTime: newStartTime,
            endTime: new Date(newStartTime.getTime() + 10 * 60 * 1000),
            priority: 'Medium',
        }]);
    };

    // Remove sub-plan
    const removePlan = (index) => {
        if (plans.length > 1) {
            setPlans(plans.filter((_, i) => i !== index));
        }
    };

    // Check for time overlap
    const checkTimeOverlap = (index, newStartTime, newEndTime) => {
        try {
            const newStart = newStartTime.getTime();
            const newEnd = newEndTime.getTime();
            const checkDateStr = selectedDate.toISOString().split('T')[0];

            for (let i = 0; i < plans.length; i++) {
                if (i === index) continue;
                const plan = plans[i];
                if (plan.startTime.toISOString().split('T')[0] !== checkDateStr) continue;
                const existingStart = plan.startTime.getTime();
                const existingEnd = plan.endTime.getTime();
                if (newStart < existingEnd && newEnd > existingStart) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking time overlap:', error.message);
            return false;
        }
    };

    // Handle date change
    const onDateChange = (event, newDate) => {
        setShowDatePicker(false);
        if (newDate) {
            setSelectedDate(newDate);
            setSelectedStartTime(updateDateTime(selectedStartTime, newDate));
            setPlans(plans.map(plan => ({
                ...plan,
                startTime: updateDateTime(plan.startTime, newDate),
                endTime: updateDateTime(plan.endTime, newDate),
            })));
        }
    };

    // Update time's date portion
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

    // Handle start time change
    const onStartTimeChange = (event, selectedTime, index) => {
        setShowStartTimePicker({ index: null, show: false });
        if (selectedTime) {
            const updatedPlans = [...plans];
            const plan = updatedPlans[index];
            const newEndTime = new Date(selectedTime.getTime() + 10 * 60 * 1000);

            if (newEndTime <= selectedTime) {
                Alert.alert('End time must be after start time.');
                return;
            }

            if (checkTimeOverlap(index, selectedTime, newEndTime)) {
                Alert.alert('Time slot overlaps with another plan.');
                return;
            }

            updatedPlans[index].startTime = updateDateTime(selectedTime, selectedDate);
            updatedPlans[index].endTime = updateDateTime(newEndTime, selectedDate);
            setPlans(updatedPlans);
        }
    };

    // Handle main start time change
    const onMainStartTimeChange = (event, selectedTime) => {
        setShowStartTimePicker({ index: null, show: false });
        if (selectedTime) {
            setSelectedStartTime(updateDateTime(selectedTime, selectedDate));
        }
    };

    // Handle end time change
    const onEndTimeChange = (event, selectedTime, index) => {
        setShowEndTimePicker({ index: null, show: false });
        if (selectedTime) {
            const plan = plans[index];
            if (selectedTime <= plan.startTime) {
                Alert.alert('End time must be after start time.');
                return;
            }

            if (checkTimeOverlap(index, plan.startTime, selectedTime)) {
                Alert.alert('Time slot overlaps with another plan.');
                return;
            }

            updatePlan(index, 'endTime', updateDateTime(selectedTime, selectedDate));
        }
    };

    // Toggle weekly/monthly selections
    const toggleSelection = (item, type) => {
        const setFunction = type === 'weekly' ? setSelectedWeekly : setSelectedMonthly;
        const currentSelections = type === 'weekly' ? selectedWeekly : selectedMonthly;
        const updatedSelections = currentSelections.includes(item)
            ? currentSelections.filter(i => i !== item)
            : [...currentSelections, item];
        setFunction(updatedSelections);
    };

    // Handle save (update planner)
    const handleSave = async () => {
        if (!planTitle.trim()) {
            Alert.alert('Plan title is required.');
            return;
        }
        for (const plan of plans) {
            if (!plan.title.trim()) {
                Alert.alert('All sub-plan titles are required.');
                return;
            }
            if (plan.endTime <= plan.startTime) {
                Alert.alert('End time must be after start time.');
                return;
            }
            if (checkTimeOverlap(plans.indexOf(plan), plan.startTime, plan.endTime)) {
                Alert.alert('Sub-plans have overlapping time slots.');
                return;
            }
        }

        try {
            const userId = await AsyncStorage.getItem('uniqueId');
            if (!userId) {
                throw new Error('User ID not found');
            }

            const payload = {
                uniqueId: userId,
                planTitle,
                type: 'Planner',
                date: formatDateToYYYYMMDD(selectedDate),
                startTime: formatTimeForDisplay(selectedStartTime),
                freq: selectedFreq,
                weekly: selectedFreq === 'Weekly' ? selectedWeekly : [],
                monthly: selectedFreq === 'Monthly' ? selectedMonthly : [],
                plan: plans.map(p => ({
                    title: p.title,
                    description: p.description,
                    startTime: formatTimeForDisplay(p.startTime),
                    endTime: formatTimeForDisplay(p.endTime),
                    priority: p.priority,
                })),
            };

            const response = await axios.put(
                `${env.Market_Place_API_URL}reminder/update-plan/${_id}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            Alert.alert('Planner updated successfully.', {
                type: 'success',
                placement: 'top',
                duration: 3000,
            });
            navigation.navigate('DailyPlanner');
        } catch (error) {
            console.error('Error updating planner:', error.response?.data || error.message);
            Alert.alert('Failed to update planner.');
        }
    };

    // Initialize state with received data
    useEffect(() => {
        try {
            setPlanTitle(title || '');
            setSelectedDate(date ? new Date(date) : new Date());
            setSelectedStartTime(startTime && date ? parseTimeToDate(startTime, date) : new Date());
            setSelectedFreq(freq || 'Once');
            setSelectedWeekly(Array.isArray(weekly) ? weekly : []);
            setSelectedMonthly(Array.isArray(monthly) ? monthly.map(String) : []);
            setPlans(plan && plan.length > 0 ? plan.map(p => ({
                title: p.title || '',
                description: p.description || '',
                startTime: p.startTime && date ? parseTimeToDate(p.startTime, date) : new Date(),
                endTime: p.endTime && date ? parseTimeToDate(p.endTime, date) : new Date(new Date().getTime() + 10 * 60 * 1000),
                priority: p.priority || 'Medium',
            })) : [{
                title: '',
                description: '',
                startTime: new Date(),
                endTime: new Date(new Date().getTime() + 10 * 60 * 1000),
                priority: 'Medium',
            }]);
        } catch (error) {
            console.error('Error initializing state:', error.message);
            Alert.alert('Failed to load planner data.');
        }
    }, [title, date, startTime, freq, weekly, monthly, plan]);

    return (
        <>
            <ScrollView style={styles.container}>
                <Text style={styles.sectionTitle}>{translations?.updatePlanner || 'Update Planner'}</Text>

                {/* Plan Title */}
                <Text style={styles.label}>{translations?.planTitle || 'Plan Title'}</Text>
                <TextInput
                    style={styles.input}
                    value={planTitle}
                    onChangeText={setPlanTitle}
                    placeholder={translations?.enterPlanTitle || 'Enter Plan Title'}
                />

                {/* Main Date and Start Time */}
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{translations?.date || 'Date'}</Text>
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
                    <Text style={styles.detailLabel}>{translations?.startTime || 'Start Time'}</Text>
                    <TouchableOpacity onPress={() => setShowStartTimePicker({ index: -1, show: true })}>
                        <Text style={styles.detailValue}>{formatTimeForDisplay(selectedStartTime)} ⬇</Text>
                    </TouchableOpacity>
                </View>
                {showStartTimePicker.index === -1 && showStartTimePicker.show && (
                    <DateTimePicker
                        value={selectedStartTime}
                        mode="time"
                        display="default"
                        onChange={onMainStartTimeChange}
                    />
                )}

                {/* Frequency */}
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{translations?.frequency || 'Frequency'}</Text>
                    <TouchableOpacity onPress={() => setShowFreqModal(true)}>
                        <Text style={styles.detailValue}>{selectedFreq} ⬇</Text>
                    </TouchableOpacity>
                </View>
                <Modal
                    transparent
                    visible={showFreqModal}
                    animationType="fade"
                    onRequestClose={() => setShowFreqModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <ScrollView style={styles.modalScroll}>
                            <View style={styles.modalContent}>
                                {freqOptions.map(option => (
                                    <TouchableOpacity
                                        key={option}
                                        style={[styles.modalOption, { justifyContent: "center" }]}
                                        onPress={() => {
                                            setSelectedFreq(option);
                                            setShowFreqModal(false);
                                            if (option === 'Weekly') setShowWeeklyModal(true);
                                            if (option === 'Monthly') setShowMonthlyModal(true);
                                        }}
                                    >
                                        <Text style={styles.modalOptionText}>{option}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setShowFreqModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>{translations?.cancel || 'Cancel'}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </Modal>

                {/* Weekly Selection */}
                <Modal
                    transparent
                    visible={showWeeklyModal}
                    animationType="fade"
                    onRequestClose={() => setShowWeeklyModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <ScrollView style={styles.modalScroll}>
                            <View style={styles.modalContent}>
                                {daysOfWeek.map(day => (
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
                                ))}
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => setShowWeeklyModal(false)}>
                                        <Text style={styles.closeButtonText}>{translations?.close || 'Close'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setShowWeeklyModal(false)}
                                    >
                                        <LinearGradient
                                            style={styles.closeButton}
                                            colors={['#6462AC', '#028BD3']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}>
                                            <Text style={styles.closeButtonText}>{translations?.done || 'Done'}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </Modal>

                {/* Monthly Selection */}
                <Modal
                    transparent
                    visible={showMonthlyModal}
                    animationType="fade"
                    onRequestClose={() => setShowMonthlyModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <ScrollView style={styles.modalScroll}>
                                {monthDays.map(day => (
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
                                ))}
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => setShowMonthlyModal(false)}>
                                        <Text style={styles.closeButtonText}>{translations?.close || 'Close'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setShowMonthlyModal(false)}
                                    >
                                        <LinearGradient
                                            style={styles.closeButton}
                                            colors={['#6462AC', '#028BD3']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}>
                                            <Text style={styles.closeButtonText}>{translations?.done || 'Done'}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Sub-Plans */}
                {plans.map((plan, index) => (
                    <View key={index} style={styles.detailBox}>
                        <Text style={styles.subTitle}>{translations?.subPlan || 'Sub-Plan'} {index + 1}</Text>

                        <Text style={styles.label}>{translations?.title || 'Title'}</Text>
                        <TextInput
                            style={styles.input}
                            value={plan.title}
                            onChangeText={text => updatePlan(index, 'title', text)}
                            placeholder={translations?.enterSubPlanTitle || 'Enter Sub-Plan Title'}
                        />

                        <Text style={styles.label}>{translations?.description || 'Description'}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={plan.description}
                            onChangeText={text => updatePlan(index, 'description', text)}
                            placeholder={translations?.enterDescription || 'Enter Description'}
                            multiline
                            numberOfLines={4}
                        />

                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>{translations?.startTime || 'Start Time'}</Text>
                            <TouchableOpacity onPress={() => setShowStartTimePicker({ index, show: true })}>
                                <Text style={styles.detailValue}>{formatTimeForDisplay(plan.startTime)} ⬇</Text>
                            </TouchableOpacity>
                        </View>
                        {showStartTimePicker.show && showStartTimePicker.index === index && (
                            <DateTimePicker
                                value={plan.startTime}
                                mode="time"
                                display="default"
                                onChange={(e, t) => onStartTimeChange(e, t, index)}
                            />
                        )}

                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>{translations?.endTime || 'End Time'}</Text>
                            <TouchableOpacity onPress={() => setShowEndTimePicker({ index, show: true })}>
                                <Text style={styles.detailValue}>{formatTimeForDisplay(plan.endTime)} ⬇</Text>
                            </TouchableOpacity>
                        </View>
                        {showEndTimePicker.show && showEndTimePicker.index === index && (
                            <DateTimePicker
                                value={plan.endTime}
                                mode="time"
                                display="default"
                                onChange={(e, t) => onEndTimeChange(e, t, index)}
                            />
                        )}

                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>{translations?.priority || 'Priority'}</Text>
                            <TouchableOpacity onPress={() => setShowPriorityModal({ index, show: true })}>
                                <Text style={styles.detailValue}>{translations?.[plan.priority.toLowerCase()] || plan.priority} ⬇</Text>
                            </TouchableOpacity>
                        </View>
                        <Modal
                            transparent
                            visible={showPriorityModal.show && showPriorityModal.index === index}
                            animationType="fade"
                            onRequestClose={() => setShowPriorityModal({ index: null, show: false })}
                        >
                            <View style={styles.modalOverlay}>
                                <ScrollView style={styles.modalScroll}>
                                    <View style={styles.modalContent}>
                                        {priorityOptions.map(option => (
                                            <TouchableOpacity
                                                key={option}
                                                style={[styles.modalOption, { justifyContent: "center" }]}
                                                onPress={() => {
                                                    updatePlan(index, 'priority', option);
                                                    setShowPriorityModal({ index: null, show: false });
                                                }}
                                            >
                                                <Text style={styles.modalOptionText}>{translations?.[option.toLowerCase()] || option}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            style={styles.modalCancelButton}
                                            onPress={() => setShowPriorityModal({ index: null, show: false })}
                                        >
                                            <Text style={styles.modalCancelText}>{translations?.cancel || 'Cancel'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </View>
                        </Modal>

                        <View style={styles.addbuttonContainer}>
                            <TouchableOpacity onPress={() => addNewPlan()}>
                                <LinearGradient
                                    style={styles.addButton}
                                    colors={['#6462AC', '#028BD3']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.addIcon}>+</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            {plans.length > 1 && (
                                <TouchableOpacity onPress={() => removePlan(index)}>
                                    <LinearGradient
                                        colors={['#f17f5c', '#ff4d4d']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.removeButton}
                                    >
                                        <Text style={styles.addIcon}>−</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}

                {/* Save Button */}
                <TouchableOpacity onPress={handleSave}>
                    <LinearGradient
                        style={styles.saveButton}
                        colors={['#6462AC', '#028BD3']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.saveText}>{translations?.updatePlanner || 'Update Planner'}</Text>
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
    subTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
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
        paddingRight: 10
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
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
    detailBox: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#999',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    removeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addIcon: {
        fontSize: 24,
        color: '#fff',
    },
    addbuttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    buttonContainer: { flexDirection: 'row', justifyContent: "space-between", marginTop: 10, },
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

export default UpdatePlanner;