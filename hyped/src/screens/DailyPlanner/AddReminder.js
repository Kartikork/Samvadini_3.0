import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  BackHandler,
  ActivityIndicator,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import AddReminderCalendar from './ReminderCalendar';
import BottomNavigation from '../../components/BottomNavigation';
import { scheduleReminder } from './ReminderNotification';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { env } from '../../config';
import { priorityIcon } from '../../assets';

const parseTimeToDate = (timeStr, dateObj) => {
  if (!timeStr || !dateObj) return dateObj;
  const [time, period] = timeStr.split(/(AM|PM)/i);
  if (!time || !period) return dateObj;
  const [hours, minutes] = time.trim().split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return dateObj;
  let h = hours;
  if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  return new Date(dateObj.setHours(h, minutes, 0, 0));
};

const AddReminder = ({ route, footer: footerProp }) => {
  const { data = {}, update = false } = route?.params || {};
  const footer =
    footerProp !== undefined
      ? footerProp
      : route?.params?.footer !== undefined
        ? route.params.footer
        : true;

  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const currentTime = new Date();
  const [title, setTitle] = useState(data.title || '');
  const [description, setDescription] = useState(data.description || '');
  const [date, setDate] = useState(data.date ? new Date(data.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setTime] = useState(
    data.startTime && data.date
      ? parseTimeToDate(data.startTime.replace(/\u202F/g, ' '), new Date(data.date))
      : currentTime
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [earlyReminder, setEarlyReminder] = useState(data.earlyReminder || 'None');
  const [showEarlyReminderModal, setShowEarlyReminderModal] = useState(false);
  const [repeat, setRepeat] = useState(data.repeat || 'Once');
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [priority, setPriority] = useState(data.priority || 'Medium');
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionType, setSelectionType] = useState('');
  const [weekly, setWeekly] = useState(data.weekly || []);
  const [monthly, setMonthly] = useState(data.monthly || []);
  const { lang = 'en', translations = {} } = {};

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setTitle(data.title || '');
      setDescription(data.description || '');
      setDate(data.date ? new Date(data.date) : new Date());
      setTime(
        data.startTime && data.date
          ? parseTimeToDate(data.startTime.replace(/\u202F/g, ' '), new Date(data.date))
          : currentTime
      );
      setEarlyReminder(data.earlyReminder || 'None');
      setPriority(data.priority || 'Medium');
      setRepeat(data.repeat || 'Once');
      setWeekly(data.weekly || []);
      setMonthly(data.monthly || []);
    }
  }, [data, lang]);

  const earlyReminderOptions = ['None', '5 minutes', '10 minutes', '15 minutes', '30 minutes', '1 hour'];
  const repeatOptions = ['Once', 'Daily', 'Weekly', 'Monthly'];
  const priorityOptions = ['Low', 'Medium', 'High'];
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const monthDays = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  const formatDateForDisplay = (date) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const formatTimeForDisplay = (date) => {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return date.toLocaleTimeString('en-US', options);
  };

  const formatTimeForPayload = (date) => {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return date.toLocaleTimeString('en-US', options);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      setTime(new Date(selectedDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)));
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) setTime(selectedTime);
  };

  const handleRepeatSelection = (option) => {
    setRepeat(option);
    setShowRepeatModal(false);
    if (option === 'Weekly') {
      setSelectionType('Weekly');
      setShowSelectionModal(true);
    } else if (option === 'Monthly') {
      setSelectionType('Monthly');
      setShowSelectionModal(true);
    } else {
      setWeekly([]);
      setMonthly([]);
    }
  };

  const toggleDay = (day) => {
    if (selectionType === 'Weekly') {
      setWeekly((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      );
    } else if (selectionType === 'Monthly') {
      setMonthly((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      );
    }
  };

  const toggleAllDays = () => {
    if (selectionType === 'Weekly') {
      setWeekly((prev) => (prev.length === weekDays.length ? [] : [...weekDays]));
    } else if (selectionType === 'Monthly') {
      setMonthly((prev) => (prev.length === monthDays.length ? [] : [...monthDays]));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Please enter a title for the reminder.');
      return;
    }
    const uniqueId = await AsyncStorage.getItem('uniqueId');
    if (!uniqueId) {
      Alert.alert('User ID not found. Please log in again.');
      return;
    }

    setLoading(true);
    const payload = {
      uniqueId,
      date: date.toISOString().split('T')[0],
      description,
      earlyReminder,
      priority,
      repeat,
      type: 'Reminder',
      startTime: formatTimeForPayload(startTime),
      title,
      weekly: repeat === 'Weekly' ? weekly : [],
      monthly: repeat === 'Monthly' ? monthly : [],
    };

    try {
      const response = await axios.post(`${env.Market_Place_API_URL}reminder/create`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (update) {
        await axios.put(
          `${env.Market_Place_API_URL}reminder/update-share-plan-status/${data._id}`,
          { uniqueId },
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 201 || response.status === 200) {
        await scheduleReminder(payload);
        setLoading(false);
        Alert.alert(update ? 'Reminder accepted.' : 'Reminder added.');
        handleAddToCalendar(payload);
        navigation.navigate('DailyPlanner');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(update ? 'Failed to accept reminder.' : 'Failed to add reminder.');
    }
  };

  const handleAddToCalendar = (reminderData) => {
    const { title, description, startTime, earlyReminder, repeat, weekly, monthly, date } =
      reminderData;

    let recurrence = null;
    if (repeat === 'Weekly' && weekly?.length) {
      recurrence = { type: 'weekly', days: weekly };
    } else if (repeat === 'Monthly' && monthly?.length) {
      recurrence = { type: 'monthly', days: monthly };
    } else if (repeat === 'Daily') {
      recurrence = { type: 'daily' };
    } else if (repeat === 'Once') {
      recurrence = { type: 'once' };
    }

    AddReminderCalendar({
      title,
      description,
      startTime,
      earlyReminder,
      date,
      recurrence,
      onError: (error) => {
        console.error('Calendar error:', error);
        Alert.alert('Could not open Google Calendar or app store.');
      },
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        const currentRoute = navigation.getState().routes[navigation.getState().index].name;
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
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation])
  );

  return (
    <>
      <ScrollView style={styles.container}>
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#01d5f5" />
            <Text style={styles.loaderText}>
              {translations?.Loading || dailyPlannerJson?.en?.Loading || 'Loading...'}
            </Text>
          </View>
        )}
        <Text style={styles.sectionTitle}>
          {update
            ? translations?.UpdateReminder || 'Accept Reminder'
            : translations?.CreateReminder || 'Create Reminder'}
        </Text>

        {/* <Text style={styles.label}>
          {translations?.Title || 'Title'}
        </Text> */}
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={translations?.EnterTitle || 'Enter Title'}
          placeholderTextColor="#8F9BB3"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder={translations?.EnterDescription || 'Enter Description'}
          multiline
          numberOfLines={4}
          placeholderTextColor="#8F9BB3"
          textAlignVertical="top"
        />

        {/* <Text style={styles.label}>
          {translations?.Details || 'Details'}
        </Text> */}
        <View style={styles.row}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              {formatDateForDisplay(date)}
            </Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={styles.detailValue}> <Ionicons name="calendar-clear-outline" size={20} /></Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
          )}

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              {formatTimeForDisplay(startTime)}
            </Text>
            <TouchableOpacity onPress={() => setShowTimePicker(true)}>
              <Text style={styles.detailValue}> <Ionicons name="time-outline" size={20} /></Text>
            </TouchableOpacity>
          </View>
        </View>
        {showTimePicker && (
          <DateTimePicker value={startTime} mode="time" display="default" onChange={onTimeChange} />
        )}
        <View style={styles.row}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              {priority}
            </Text>
            <TouchableOpacity onPress={() => setShowPriorityModal(true)}>
              <Text style={styles.detailValue}> <Image source={priorityIcon} /></Text>
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
                {priorityOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.modalOption}
                    onPress={() => {
                      setPriority(option);
                      setShowPriorityModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>
                      {translations?.[option] || option}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowPriorityModal(false)}
                >
                  <Text style={styles.modalCancelText}>
                    {translations?.Cancel || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              {earlyReminder}
            </Text>
            <TouchableOpacity onPress={() => setShowEarlyReminderModal(true)}>
              <Text style={styles.detailValue}> <Ionicons name="time-outline" size={20} /></Text>
            </TouchableOpacity>
          </View>
        </View>
        <Modal
          transparent
          visible={showEarlyReminderModal}
          animationType="fade"
          onRequestClose={() => setShowEarlyReminderModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {earlyReminderOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOption}
                  onPress={() => {
                    setEarlyReminder(option);
                    setShowEarlyReminderModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {translations?.[option.replace(' ', '')] || option}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEarlyReminderModal(false)}
              >
                <Text style={styles.modalCancelText}>
                  {translations?.Cancel || 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <View style={[styles.detailItem, { width: '100%' }]}>
          <Text style={styles.detailLabel}>
            {repeat}
          </Text>
          <TouchableOpacity onPress={() => setShowRepeatModal(true)}>
            <Text style={styles.detailValue}> <Ionicons name="time-outline" size={20} /></Text>
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
              {repeatOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOption}
                  onPress={() => handleRepeatSelection(option)}
                >
                  <Text style={styles.modalOptionText}>
                    {translations?.[option] || option}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRepeatModal(false)}
              >
                <Text style={styles.modalCancelText}>
                  {translations?.Cancel || 'Cancel'}
                </Text>
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
                <View style={styles.checkboxRow}>
                  <Text style={styles.checkboxLabel}>
                    {translations?.SelectAll || 'Select All'}
                  </Text>
                  <TouchableOpacity style={styles.checkbox} onPress={toggleAllDays}>
                    <Text style={styles.checkboxText}>
                      {(selectionType === 'Weekly' && weekly.length === weekDays.length) ||
                        (selectionType === 'Monthly' && monthly.length === monthDays.length)
                        ? '✓'
                        : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
                {selectionType === 'Weekly' ? (
                  weekDays.map((day) => (
                    <View key={day} style={styles.checkboxRow}>
                      <Text style={styles.checkboxLabel}>
                        {translations?.[day.toLowerCase()] || day}
                      </Text>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => toggleDay(day)}
                      >
                        <Text style={styles.checkboxText}>{weekly.includes(day) ? '✓' : ''}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : selectionType === 'Monthly' ? (
                  monthDays.map((day) => (
                    <View key={day} style={styles.checkboxRow}>
                      <Text style={styles.checkboxLabel}>
                        {translations?.Day || 'Day'} {day}
                      </Text>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => toggleDay(day)}
                      >
                        <Text style={styles.checkboxText}>{monthly.includes(day) ? '✓' : ''}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : null}
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowSelectionModal(false)}
                >
                  <Text style={styles.modalButtonText}>
                    {translations?.Close || 'Close'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSelectionModal(false)}>
                  <LinearGradient
                    colors={['#6462AC', '#028BD3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.modalButton, styles.doneButton]}
                  >
                    <Text style={styles.modalButtonText}>
                      {translations?.Done || 'Done'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
            <Text style={styles.saveText}>
              {update ? 'Accept' : translations?.Save || 'Save'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
      {footer && <BottomNavigation navigation={navigation} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', padding: 20, backgroundColor: '#fff', flex: 1 },
  sectionTitle: {
    fontSize: 18,
    color: '#212121',
    marginBottom: 10,
  },
  label: { fontSize: 16, color: '#333', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#EDF1F7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    width: '100%',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EDF1F7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    width: '48%',
  },
  detailLabel: { fontSize: 15, color: '#8F9BB3' },
  detailValue: { fontSize: 15, color: '#8F9BB3' },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 50,
    width: '100%',
  },
  saveText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    // width: wp('75%'),
    alignItems: 'center',
  },
  modalScroll: {
    // maxHeight: wp('60%')
  },
  modalOption: { paddingVertical: 10, width: '100%', alignItems: 'center' },
  modalOptionText: { fontSize: 16, color: '#333' },
  modalCancelButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: '#c02d00ff',
    width: '100%',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    paddingVertical: 5,
  },
  checkboxLabel: { fontSize: 16, color: '#333' },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxText: { fontSize: 14, color: '#333' },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  modalButton: { padding: 10, borderRadius: 30, alignItems: 'center', marginHorizontal: 5, paddingHorizontal: 20 },
  cancelButton: { backgroundColor: '#c02d00ff', borderWidth: 1, borderColor: '#fff' },
  doneButton: { backgroundColor: '#f17f5c' },
  modalButtonText: { fontSize: 16, color: '#fff' },
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

export default AddReminder;