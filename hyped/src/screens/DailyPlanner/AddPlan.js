import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import BottomNavigation from '../../components/BottomNavigation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { env } from '../../config';

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

const AddPlan = ({ route, footer: footerProp }) => {
  const { data = {}, update = false } = route?.params || {};
  const footer =
    footerProp !== undefined
      ? footerProp
      : route?.params?.footer !== undefined
        ? route.params.footer
        : true;

  const navigation = useNavigation();
  const translations = {};
  const [loading, setLoading] = useState(false);
  const currentTime = new Date();
  const [date, setDate] = useState(data.date ? new Date(data.date) : new Date());
  const [weekly, setWeekly] = useState(data.weekly || []);
  const [monthly, setMonthly] = useState(data.monthly || []);
  const [planTitle, setPlanTitle] = useState(data.title || '');
  const [plans, setPlans] = useState(() => {
    if (data.plan && Array.isArray(data.plan) && data.plan.length > 0) {
      return data.plan.map(plan => ({
        title: plan.title || '',
        description: plan.description || '',
        startTime: plan.startTime
          ? parseTimeToDate(plan.startTime.replace(/\u202F/g, ' '), new Date(data.date || currentTime))
          : currentTime,
        endTime: plan.endTime
          ? parseTimeToDate(plan.endTime.replace(/\u202F/g, ' '), new Date(data.date || currentTime))
          : new Date(currentTime.getTime() + 10 * 60 * 1000),
        freq: plan.freq || data.freq || 'Once',
        priority: plan.priority || 'Medium',
      }));
    }
    return [{
      title: '',
      description: '',
      startTime: new Date(currentTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0)),
      endTime: new Date(currentTime.getTime() + 10 * 60 * 1000),
      freq: 'Once',
      priority: 'Medium',
    }];
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState({ index: null, show: false });
  const [showEndTimePicker, setShowEndTimePicker] = useState({ index: null, show: false });
  const [showFreqModal, setShowFreqModal] = useState({ index: null, show: false });
  const [showSelectionModal, setShowSelectionModal] = useState({ index: null, show: false });
  const [selectionType, setSelectionType] = useState('');
  const [selectAll, setSelectAll] = useState({ week: false, date: false });
  const [showPriorityModal, setShowPriorityModal] = useState({ index: null, show: false });

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setDate(data.date ? new Date(data.date) : new Date());
      setWeekly(data.weekly || []);
      setMonthly(data.monthly || []);
      setPlanTitle(data.title || '');
      if (data.plan && Array.isArray(data.plan) && data.plan.length > 0) {
        setPlans(data.plan.map(plan => ({
          title: plan.title || '',
          description: plan.description || '',
          startTime: plan.startTime
            ? parseTimeToDate(plan.startTime.replace(/\u202F/g, ' '), new Date(data.date || currentTime))
            : currentTime,
          endTime: plan.endTime
            ? parseTimeToDate(plan.endTime.replace(/\u202F/g, ' '), new Date(data.date || currentTime))
            : new Date(currentTime.getTime() + 10 * 60 * 1000),
          freq: plan.freq || data.freq || 'Once',
          priority: plan.priority || 'Medium',
        })));
      }
    }
  }, []);

  const freqOptions = ['Once', 'Daily', 'Weekly', 'Monthly'];
  const priorityOptions = ['Low', 'Medium', 'High'];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const monthDays = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  const formatDateForDisplay = (date) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const formatTimeForDisplay = (date) => {
    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
    return date.toLocaleTimeString('en-US', options).replace(' ', '\u202F');
  };

  const formatTimeForPayload = (date) => {
    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
    return date.toLocaleTimeString('en-US', options);
  };

  const addNewPlan = () => {
    const sameDatePlans = plans.filter((plan) =>
      plan.startTime.toISOString().split('T')[0] === date.toISOString().split('T')[0]
    );
    let newStartTime = new Date(date.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0));
    if (sameDatePlans.length > 0) {
      const latestEndTime = Math.max(
        ...sameDatePlans.map((plan) => plan.endTime.getTime())
      );
      newStartTime = new Date(latestEndTime + 5 * 60 * 1000);
    }
    setPlans([...plans, {
      title: '',
      description: '',
      startTime: newStartTime,
      endTime: new Date(newStartTime.getTime() + 10 * 60 * 1000),
      freq: plans[0].freq,
      priority: 'Medium',
    }]);
  };

  const removePlan = (index) => {
    if (plans.length > 1) {
      setPlans(plans.filter((_, i) => i !== index));
    }
  };

  const updatePlan = (index, field, value) => {
    const updatedPlans = [...plans];
    updatedPlans[index][field] = value;
    if (field === 'freq' && index === 0) {
      setPlans(updatedPlans.map((plan, i) => ({ ...plan, freq: value })));
    } else {
      setPlans(updatedPlans);
    }
  };

  const checkTimeOverlap = (index, newStartTime, newEndTime) => {
    const newStart = newStartTime.getTime();
    const newEnd = newEndTime.getTime();
    const checkDateStr = date.toISOString().split('T')[0];

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
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const updatedPlans = plans.map((plan, index) => {
        const newStartTime = new Date(
          selectedDate.setHours(
            plan.startTime.getHours(),
            plan.startTime.getMinutes(),
            0,
            0
          )
        );
        const newEndTime = new Date(
          selectedDate.setHours(
            plan.endTime.getHours(),
            plan.endTime.getMinutes(),
            0,
            0
          )
        );
        if (checkTimeOverlap(index, newStartTime, newEndTime)) {
          Alert.alert('Selected date causes time slot overlap with another plan.');
          return plan;
        }
        return { ...plan, startTime: newStartTime, endTime: newEndTime };
      });
      setPlans(updatedPlans);
    }
  };

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

      updatePlan(index, 'startTime', selectedTime);
      updatePlan(index, 'endTime', newEndTime);
    }
  };

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

      updatePlan(index, 'endTime', selectedTime);
    }
  };

  const handleSave = async () => {
    for (const plan of plans) {
      if (!plan.title.trim()) {
        Alert.alert('Please enter a title for all plans.');
        return;
      }
      if (plan.endTime <= plan.startTime) {
        Alert.alert('End time must be after start time for all plans.');
        return;
      }
      if (checkTimeOverlap(plans.indexOf(plan), plan.startTime, plan.endTime)) {
        Alert.alert('One or more plans have overlapping time slots on the same date.');
        return;
      }
    }
    if (!planTitle.trim()) {
      Alert.alert('Please enter a plan title.');
      return;
    }
    setLoading(true);

    try {
      const uniqueId = await AsyncStorage.getItem('uniqueId');
      if (!uniqueId) {
        throw new Error('User ID not found');
      }

      const payload = {
        uniqueId,
        planTitle,
        type: 'Planner',
        date: date.toISOString().split('T')[0],
        startTime: formatTimeForPayload(plans[0].startTime),
        freq: plans[0].freq,
        weekly: plans[0].freq === 'Weekly' ? weekly : [],
        monthly: plans[0].freq === 'Monthly' ? monthly : [],
        plan: plans.map((plan) => ({
          startTime: formatTimeForPayload(plan.startTime),
          endTime: formatTimeForPayload(plan.endTime),
          priority: plan.priority,
          title: plan.title,
          description: plan.description,
        })),
      };

      const response = await axios.post(
        `${env.Market_Place_API_URL}reminder/create-plan`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (update) {
        await axios.put(`${env.Market_Place_API_URL}reminder/update-share-plan-status/${data._id}`, { uniqueId }, {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 201 || response.status === 200) {
        setLoading(false);
        Alert.alert(update ? 'Plan Accepted.' : 'Plan added.');
        navigation.navigate('DailyPlanner');
      } else {
        setLoading(false);
        throw new Error(translations?.FailedToAcceptPlan || 'Failed to Accept plan');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(update ? 'Failed to accept plan.' : 'Failed to add plan.');
    }
  };

  const toggleSelection = (item, type) => {
    const currentSelections = type === 'weekly' ? weekly : monthly;
    const updatedSelections = currentSelections.includes(item)
      ? currentSelections.filter(i => i !== item)
      : [...currentSelections, item];
    if (type === 'weekly') setWeekly(updatedSelections);
    else setMonthly(updatedSelections);
  };

  const toggleSelectAll = (type) => {
    const allItems = type === 'weekly' ? daysOfWeek : monthDays;
    const currentSelections = type === 'weekly' ? weekly : monthly;
    const isAllSelected = currentSelections.length === allItems.length;
    const updatedSelections = isAllSelected ? [] : [...allItems];
    if (type === 'weekly') {
      setWeekly(updatedSelections);
      setSelectAll(prev => ({ ...prev, week: !isAllSelected }));
    } else {
      setMonthly(updatedSelections);
      setSelectAll(prev => ({ ...prev, date: !isAllSelected }));
    }
  };

  const closeModal = (setModalState) => {
    setModalState({ index: null, show: false });
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
              {translations?.Loading || 'Loading...'}
            </Text>
          </View>
        )}
        <Text style={styles.sectionTitle}>
          {update
            ? translations?.AcceptPlanner || 'Accept Planner'
            : translations?.CreatePlanner || 'Create Planner'}
        </Text>
        <TextInput
          style={styles.input}
          value={planTitle}
          onChangeText={setPlanTitle}
          placeholder={translations?.EnterTitle || 'Enter Title'}
          placeholderTextColor="#8F9BB3"
        />
        {plans.map((plan, index) => (
          <View key={index}>
            {index === 0 && (
              <>
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
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>
                      {plan.freq}
                    </Text>
                    <TouchableOpacity onPress={() => setShowFreqModal({ index: 0, show: true })}>
                      <Text style={styles.detailValue}> <Ionicons name="calendar-clear-outline" size={20} /></Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Modal
                  transparent
                  visible={showFreqModal.show && showFreqModal.index === 0}
                  animationType="fade"
                  onRequestClose={() => closeModal(setShowFreqModal)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      {freqOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={styles.modalOption}
                          onPress={() => {
                            updatePlan(0, 'freq', option);
                            if (option === 'Weekly') {
                              setSelectionType('Weekly');
                              setShowSelectionModal({ index: 0, show: true });
                            } else if (option === 'Monthly') {
                              setSelectionType('Monthly');
                              setShowSelectionModal({ index: 0, show: true });
                            } else {
                              setWeekly([]);
                              setMonthly([]);
                            }
                            closeModal(setShowFreqModal);
                          }}
                        >
                          <Text style={styles.modalOptionText}>
                            {translations?.[option] || option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.modalCancelButton}
                        onPress={() => closeModal(setShowFreqModal)}
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
                  visible={showSelectionModal.show && showSelectionModal.index === 0}
                  animationType="fade"
                  onRequestClose={() => closeModal(setShowSelectionModal)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <ScrollView style={styles.modalScroll}>
                        <TouchableOpacity
                          style={styles.modalOption}
                          onPress={() =>
                            toggleSelectAll(selectionType === 'Weekly' ? 'weekly' : 'monthly')
                          }
                        >
                          <Text style={styles.modalOptionText}>
                            {translations?.SelectAll || 'Select All'}
                          </Text>
                          <View
                            style={[
                              styles.checkbox,
                              ((selectionType === 'Weekly' && selectAll.week) ||
                                (selectionType === 'Monthly' && selectAll.date)) &&
                              styles.checkedBox,
                            ]}
                          >
                            {((selectionType === 'Weekly' && selectAll.week) ||
                              (selectionType === 'Monthly' && selectAll.date)) && (
                                <Text style={styles.tick}>✓</Text>
                              )}
                          </View>
                        </TouchableOpacity>
                        {selectionType === 'Weekly'
                          ? daysOfWeek.map((day) => (
                            <TouchableOpacity
                              key={day}
                              style={styles.modalOption}
                              onPress={() => toggleSelection(day, 'weekly')}
                            >
                              <Text style={styles.modalOptionText}>
                                {translations?.[day.toLowerCase()] || day}
                              </Text>
                              <View
                                style={[
                                  styles.checkbox,
                                  weekly.includes(day) && styles.checkedBox,
                                ]}
                              >
                                {weekly.includes(day) && <Text style={styles.tick}>✓</Text>}
                              </View>
                            </TouchableOpacity>
                          ))
                          : selectionType === 'Monthly'
                            ? monthDays.map((day) => (
                              <TouchableOpacity
                                key={day}
                                style={styles.modalOption}
                                onPress={() => toggleSelection(day, 'monthly')}
                              >
                                <Text style={styles.modalOptionText}>
                                  {translations?.Day || 'Day'} {day}
                                </Text>
                                <View
                                  style={[
                                    styles.checkbox,
                                    monthly.includes(day) && styles.checkedBox,
                                  ]}
                                >
                                  {monthly.includes(day) && <Text style={styles.tick}>✓</Text>}
                                </View>
                              </TouchableOpacity>
                            ))
                            : null}
                        <View style={styles.buttonContainer}>
                          <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => closeModal(setShowSelectionModal)}
                          >
                            <Text style={styles.closeButtonText}>
                              {translations?.Close || 'Close'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => closeModal(setShowSelectionModal)}>
                            <LinearGradient
                              style={styles.modalCancelButton}
                              colors={['#6462AC', '#028BD3']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                            >
                              <Text style={styles.modalCancelText}>
                                {translations?.Done || 'Done'}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
              </>
            )}
            <View style={styles.row}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  {formatTimeForDisplay(plan.startTime)}
                </Text>
                <TouchableOpacity onPress={() => setShowStartTimePicker({ index, show: true })}>
                  <Text style={styles.detailValue}> <Ionicons name="time-outline" size={20} /></Text>
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
                <Text style={styles.detailLabel}>
                  {formatTimeForDisplay(plan.endTime)}
                </Text>
                <TouchableOpacity onPress={() => setShowEndTimePicker({ index, show: true })}>
                  <Text style={styles.detailValue}> <Ionicons name="time-outline" size={20} /></Text>
                </TouchableOpacity>
              </View>
            </View>
            {showEndTimePicker.show && showEndTimePicker.index === index && (
              <DateTimePicker
                value={plan.endTime}
                mode="time"
                display="default"
                onChange={(e, t) => onEndTimeChange(e, t, index)}
              />
            )}
            <TextInput
              style={styles.input}
              value={plan.title}
              onChangeText={(text) => updatePlan(index, 'title', text)}
              placeholder={translations?.EnterTitle || 'Enter Title'}
              placeholderTextColor="#8F9BB3"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={plan.description}
              onChangeText={(text) => updatePlan(index, 'description', text)}
              placeholder={translations?.EnterDescription || 'Enter Description'}
              multiline
              numberOfLines={4}
              placeholderTextColor="#8F9BB3"

            />
            <View style={[styles.detailItem, { width: "100%" }]}>
              <Text style={styles.detailLabel}>
                {translations?.Priority || 'Priority'}
              </Text>
              <TouchableOpacity onPress={() => setShowPriorityModal({ index, show: true })}>
                <Text style={styles.detailValue}>{plan.priority} ⬇</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={plan.title}
              onChangeText={(text) => updatePlan(index, 'title', text)}
              placeholder='Add URL (Optional)'
              placeholderTextColor="#8F9BB3"
            />
            <Modal
              transparent
              visible={showPriorityModal.show && showPriorityModal.index === index}
              animationType="fade"
              onRequestClose={() => closeModal(setShowPriorityModal)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  {priorityOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.modalOption}
                      onPress={() => {
                        updatePlan(index, 'priority', option);
                        closeModal(setShowPriorityModal);
                      }}
                    >
                      <Text style={styles.modalOptionText}>
                        {translations?.[option] || option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => closeModal(setShowPriorityModal)}
                  >
                    <Text style={styles.modalCancelText}>
                      {translations?.Cancel || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            {/* <Text style={styles.label}>
              {translations?.Title || 'Title'}
            </Text>
            <TextInput
              style={styles.input}
              value={plan.title}
              onChangeText={(text) => updatePlan(index, 'title', text)}
              placeholder={translations?.EnterTitle || 'Enter Title'}
            /> */}
            {/* <Text style={styles.label}>
              {translations?.Description || 'Description'}
            </Text> */}

            <View style={styles.addbuttonContainer}>
              <TouchableOpacity onPress={addNewPlan} style={styles.addButton}>
                <Text style={styles.addIcon}>+ Add new</Text>
              </TouchableOpacity>
              {plans.length > 1 && (
                <TouchableOpacity onPress={() => removePlan(index)} style={styles.removeButton}>
                  <Text style={[styles.addIcon, { color: "rgba(198, 0, 0, 1)" }]}> - Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        <TouchableOpacity onPress={handleSave}>
          <LinearGradient
            style={styles.saveButton}
            colors={['#6462AC', '#028BD3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveText}>
              {update ? (translations?.Accept || 'Accept') : (translations?.Save || 'Save')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
      {footer && <BottomNavigation navigation={navigation} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', padding: 20, backgroundColor: '#fff' },
  sectionTitle: {
    fontSize: 18,
    color: '#212121',
    marginBottom: 15,
    textAlign: 'left',
  },
  label: { fontSize: 16, color: '#333', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#EDF1F7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
    width: "48%"
  },
  detailLabel: { fontSize: 15, color: '#8F9BB3' },
  detailValue: { fontSize: 15, color: '#8F9BB3' },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 50,
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
    padding: 15,
    // minWidth: wp('70%'),
    alignItems: 'center',
    paddingHorizontal: 10
  },
  modalScroll: {
    // maxHeight: hp('50%'), width: wp('70%')
  },
  modalOption: {
    paddingVertical: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOptionText: { fontSize: 15, color: '#555' },
  modalCancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 10,
    backgroundColor: '#c02d00ff',
    borderWidth: 1,
    borderColor: '#fff',
  },
  modalCancelText: { fontSize: 15, color: '#fff', fontWeight: 'bold' },

  addButton: {
    marginRight: 10,
  },
  removeButton: {

    alignSelf: "flex-end"
  },
  addIcon: { fontSize: 14, color: '#C2C2C2', textAlign: "left", },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    width: '80%',
  },
  addbuttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    width: '100%',
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
  checkedBox: { backgroundColor: '#000' },
  tick: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  closeButton: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: '#c02d00ff',
    borderRadius: 30,
    paddingHorizontal: 20,
  },
  closeButtonText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
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

export default AddPlan;