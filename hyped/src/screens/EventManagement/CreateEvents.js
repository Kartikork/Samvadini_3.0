import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  Text,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import { env } from '../../config/env';
import { useNavigation, useRoute } from '@react-navigation/native';
// import Checking from './Checking';
import BottomNavigation from '../../components/BottomNavigation';
import useHardwareBackHandler from '../../helper/UseHardwareBackHandler';
import { useAppSelector } from '../../state/hooks';
import { getAppTranslations } from '../../translations';

export default function CreateEvents() {
  const navigation = useNavigation();
  const route = useRoute();
  const { item } = route.params || {};
  const isEditing = !!item;
  const { uniqueId } = useAppSelector(state => state.auth);
  const lang = useAppSelector(state => state.language.lang);
  const translations = useMemo(() => getAppTranslations(lang), [lang]);
  useHardwareBackHandler('Dashboard');

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const period = dateStr.includes('PM') ? 'PM' : 'AM';
      const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : period === 'AM' && hours === 12 ? 0 : hours;
      const date = new Date(year, month - 1, day, adjustedHours, minutes);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error(`Error parsing date: ${dateStr}`, error);
      return null;
    }
  };

  const [formData, setFormData] = useState({
    eventName: '',
    organizerCompany: '',
    organizerPerson: '',
    webLink: '',
    capacity: '',
    startAt: null,
    endAt: null,
    location: '',
    agenda: '',
    description: '',
    isPrivate: false,
    isVirtual: false,
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState('date');
  const [endPickerMode, setEndPickerMode] = useState('date');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [attachments, setAttachments] = useState(
    item?.images?.map(url => ({ url, type: 'image/jpeg', name: `image-${Date.now()}` })) || []
  );
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [activeField, setActiveField] = useState(null);

  const formatDateTime = (dateTime) => {
    if (!dateTime) return translations.selectDateTime;
    const day = String(dateTime.getDate()).padStart(2, '0');
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const year = dateTime.getFullYear();
    const hours = dateTime.getHours();
    const minutes = String(dateTime.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.eventName.trim()) newErrors.eventName = translations.eventNameRequired;
    if (!formData.location.trim()) newErrors.location = translations.locationRequired;
    if (!formData.description.trim()) newErrors.description = translations.descriptionRequired;
    if (formData.webLink && !/^(https?:\/\/)/i.test(formData.webLink)) {
      newErrors.webLink = translations.invalidUrl;
    }
    if (formData.capacity && isNaN(formData.capacity)) {
      newErrors.capacity = translations.capacityIsNumber;
    }
    if (!formData.startAt) {
      newErrors.startAt = translations.startAtRequired;
    } else if (formData.startAt < new Date()) {
      newErrors.startAt = translations.startAtPast;
    }
    if (!formData.endAt) {
      newErrors.endAt = translations.endAtRequired;
    } else if (formData.endAt <= formData.startAt) {
      newErrors.endAt = translations.endAtAfterStart;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const onStartPickerChange = (event, selectedValue) => {
    const currentValue = selectedValue || formData.startAt;
    setShowStartPicker(Platform.OS === 'ios');
    if (event.type === 'set') {
      if (startPickerMode === 'date') {
        const newDate = new Date(currentValue);
        newDate.setHours(
          formData.startAt ? formData.startAt.getHours() : 0,
          formData.startAt ? formData.startAt.getMinutes() : 0
        );
        handleInputChange('startAt', newDate);
        setStartPickerMode('time');
        setShowStartPicker(true);
      } else {
        const newDate = formData.startAt ? new Date(formData.startAt) : new Date();
        newDate.setHours(currentValue.getHours(), currentValue.getMinutes());
        handleInputChange('startAt', newDate);
        setShowStartPicker(false);
        setStartPickerMode('date');
      }
    } else {
      setShowStartPicker(false);
      setStartPickerMode('date');
    }
  };

  const onEndPickerChange = (event, selectedValue) => {
    const currentValue = selectedValue || formData.endAt;
    setShowEndPicker(Platform.OS === 'ios');
    if (event.type === 'set') {
      if (endPickerMode === 'date') {
        const newDate = new Date(currentValue);
        newDate.setHours(
          formData.endAt ? formData.endAt.getHours() : 0,
          formData.endAt ? formData.endAt.getMinutes() : 0
        );
        handleInputChange('endAt', newDate);
        setEndPickerMode('time');
        setShowEndPicker(true);
      } else {
        const newDate = formData.endAt ? new Date(formData.endAt) : new Date();
        newDate.setHours(currentValue.getHours(), currentValue.getMinutes());
        handleInputChange('endAt', newDate);
        setShowEndPicker(false);
        setEndPickerMode('date');
      }
    } else {
      setShowEndPicker(false);
      setEndPickerMode('date');
    }
  };

  const handleDateTimePress = (type) => {
    if (type === 'start') {
      setShowStartPicker(true);
      setStartPickerMode('date');
    } else {
      setShowEndPicker(true);
      setEndPickerMode('date');
    }
  };

  const pickImage = async () => {
    const options = {
      mediaType: 'mixed',
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      selectionLimit: 5,
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.didCancel || !result.assets) {
        return;
      }

      const newAttachments = [...attachments];
      const availableSlots = 5 - newAttachments.length;

      if (availableSlots <= 0) {
        Alert.alert("Linit Reached", "You can only upload up to 5 attachments.");
        return;
      }

      const newAssets = result?.assets?.slice(0, availableSlots).map(asset => ({
        uri: asset.uri,
        type: asset.type || 'application/octet-stream',
        name: asset.fileName || `file-${Date.now()}`,
        size: asset.fileSize || 0,
        localUri: true,
      }));

      newAttachments.push(...newAssets);
      setAttachments(newAttachments);

      setIsUploading(true);
      setUploadProgress({});

      const uploadedAttachments = await Promise.all(
        newAttachments.map(async (attachment, index) => {
          if (!attachment.localUri) {
            return attachment;
          }

          const formData = new FormData();
          formData.append('file', {
            uri: attachment.uri,
            type: attachment.type,
            name: attachment.name,
          });

          try {
            const response = await axios.post(
              `${env.API_BASE_URL}/api/chat/upload-media`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: progressEvent => {
                  const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  setUploadProgress(prev => ({
                    ...prev,
                    [index]: percentCompleted,
                  }));
                },
              }
            );

            if (response.status === 200 && response.data?.fileUrl) {
              return {
                url: response.data.fileUrl,
                type: attachment.type,
                name: attachment.name,
              };
            }
            throw new Error('Invalid response from server');
          } catch (error) {
            console.error(`Failed to upload attachment ${attachment.name}:`, error);
            return null;
          }
        })
      );

      const successfulUploads = uploadedAttachments.filter(att => att && att.url);
      setAttachments(successfulUploads);
      setIsUploading(false);
      Alert.alert("Upload Complete", "Attachments uploaded successfully.");
    } catch (error) {
      console.error('Error in pickImage:', error);
      setIsUploading(false);
      Alert.alert("Upload Failed", "Failed to upload attachments.");
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      const payload = {
        ...formData,
        startAt: formData.startAt ? formatDateTime(formData.startAt) : null,
        endAt: formData.endAt ? formatDateTime(formData.endAt) : null,
        isPrivate: formData.isPrivate.toString(),
        isVirtual: formData.isVirtual.toString(),
        images: attachments.map(att => att.url),
        creatorId: uniqueId,
      };

      // Create group only if not editing
      if (!isEditing) {
        const groupPayload = {
          pathakah_chinha: uniqueId,
          prakara: "Group",
          samuha_chitram: attachments[0]?.url || "",
          samvada_nama: formData.eventName,
          timeStamp: new Date().toISOString(),
        };

        const groupRes = await axios.post(`${env.API_BASE_URL}api/chat/create-event-chat`, groupPayload, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (groupRes.status === 201 || groupRes.status === 200) {
          const groupId = groupRes?.data?.data?._id;
          payload.chatId = groupId;
        }
      }

      const url = isEditing
        ? `${env.Market_Place_API_URL}event/update-event/${item._id}`
        : `${env.Market_Place_API_URL}event/create-event`;

      const apiMethod = isEditing ? axios.put : axios.post;

      const response = await apiMethod(url, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 201 || response.status === 200) {
        Alert.alert(isEditing ? "Event Updated" : "Event Created");
        setFormData({
          eventName: '',
          organizerCompany: '',
          organizerPerson: '',
          webLink: '',
          capacity: '',
          startAt: null,
          endAt: null,
          location: '',
          agenda: '',
          description: '',
          isPrivate: false,
          isVirtual: false,
        });
        setAttachments([]);
        navigation.navigate('HomeScreen');
      }
    } catch (error) {
      Alert.alert(translations.error, isEditing ? translations.updateEventError.replace('{error}', error.message) : translations.createEventError.replace('{error}', error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isEditing && item) {
      setFormData({
        eventName: item.eventName || '',
        organizerCompany: item.organizerCompany || '',
        organizerPerson: item.organizerPerson || '',
        webLink: item.webLink || '',
        capacity: item.capacity ? String(item.capacity) : '',
        startAt: parseDate(item.startAt) || null,
        endAt: parseDate(item.endAt) || null,
        location: item.location || '',
        agenda: item.agenda || '',
        description: item.description || '',
        isPrivate: item.isPrivate === 'true' || item.isPrivate === true,
        isVirtual: item.isVirtual === 'true' || item.isVirtual === true,
      });
      setAttachments(
        item.images?.map(url => ({
          url,
          type: 'image/jpeg',
          name: `image-${Date.now()}`,
        })) || []
      );
    }
  }, [isEditing, item]);

  return (
    <View style={styles.scrollContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.header}>{isEditing ? translations.editEvent || "Edit Event" : translations.createEvent || "Create Event"}</Text>
          <View style={styles.innerContainer}>
            <Text style={styles.label}>{translations.eventTitle || "Event Title"}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.eventName && styles.inputError]}
                value={formData.eventName}
                onChangeText={(text) => handleInputChange('eventName', text)}
                placeholder={translations.enterEventName || "Enter event name"}
                placeholderTextColor="#757575"
                onFocus={() => setActiveField('eventName')}
              />
              {/* <Checking
                onTranscription={(text) => handleInputChange('eventName', text)}
                isActive={activeField === 'eventName'}
              /> */}
            </View>
            {errors.eventName && <Text style={styles.errorText}>{errors.eventName}</Text>}

            <Text style={styles.label}>{translations.organizerCompany || "Organizer Company"}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={formData.organizerCompany}
                onChangeText={(text) => handleInputChange('organizerCompany', text)}
                placeholder={translations.enterOrganizerCompany || "Enter organizer company"}
                placeholderTextColor="#757575"
                onFocus={() => setActiveField('organizerCompany')}
              />
              {/* <Checking
                onTranscription={(text) => handleInputChange('organizerCompany', text)}
                isActive={activeField === 'organizerCompany'}
              /> */}
            </View>

            <Text style={styles.label}>{translations.organizerPerson || "Organizer Person"}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={formData.organizerPerson}
                onChangeText={(text) => handleInputChange('organizerPerson', text)}
                placeholder={translations.enterOrganizerPerson || "Enter organizer person"}
                placeholderTextColor="#757575"
                onFocus={() => setActiveField('organizerPerson')}
              />
              {/* <Checking
                onTranscription={(text) => handleInputChange('organizerPerson', text)}
                isActive={activeField === 'organizerPerson'}
              /> */}
            </View>

            <Text style={styles.label}>{translations.webLink || "Web Link"}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.webLink && styles.inputError]}
                value={formData.webLink}
                onChangeText={(text) => handleInputChange('webLink', text)}
                placeholder="https://example.com"
                placeholderTextColor="#757575"
                keyboardType="url"
                onFocus={() => setActiveField('webLink')}
              />
              {/* <Checking
                onTranscription={(text) => handleInputChange('webLink', text)}
                isActive={activeField === 'webLink'}
              /> */}
            </View>
            {errors.webLink && <Text style={styles.errorText}>{errors.webLink}</Text>}

            <Text style={styles.label}>{translations.capacity || "Capacity"}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.capacity && styles.inputError]}
                value={formData.capacity}
                onChangeText={(text) => handleInputChange('capacity', text)}
                placeholder={translations.enterCapacity || "Enter capacity"}
                placeholderTextColor="#757575"
                keyboardType="numeric"
                onFocus={() => setActiveField('capacity')}
              />
              {/* <Checking
                onTranscription={(text) => handleInputChange('capacity', text)}
                isActive={activeField === 'capacity'}
              /> */}
            </View>
            {errors.capacity && <Text style={styles.errorText}>{errors.capacity}</Text>}

            <View style={styles.dateTimeColumn}>
              <Text style={styles.label}>{translations.startAt || "Start At"}</Text>
              <TouchableOpacity
                onPress={() => handleDateTimePress('start')}
                style={[styles.input, errors.startAt && styles.inputError]}
              >
                <Text>{formatDateTime(formData.startAt)}</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={formData.startAt || new Date()}
                  mode={startPickerMode}
                  display="default"
                  minimumDate={new Date()}
                  onChange={onStartPickerChange}
                  style={styles.datePicker}
                  accentColor="#C084FC"
                />
              )}
              {errors.startAt && <Text style={styles.errorText}>{errors.startAt}</Text>}
            </View>

            <View style={styles.dateTimeColumn}>
              <Text style={styles.label}>{translations.endAt || "End At"}</Text>
              <TouchableOpacity
                onPress={() => handleDateTimePress('end')}
                style={[styles.input, errors.endAt && styles.inputError]}
              >
                <Text>{formatDateTime(formData.endAt)}</Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={formData.endAt || formData.startAt || new Date()}
                  mode={endPickerMode}
                  display="default"
                  minimumDate={formData.startAt || new Date()}
                  onChange={onEndPickerChange}
                  style={styles.datePicker}
                  accentColor="#C084FC"
                />
              )}
              {errors.endAt && <Text style={styles.errorText}>{errors.endAt}</Text>}
            </View>

            <Text style={styles.label}>{translations.imageUpload}</Text>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={pickImage}
              disabled={isSubmitting || isUploading}
            >
              <Text style={styles.mediaButtonText}>{translations.selectImage || "Select Image"}</Text>
            </TouchableOpacity>
            {attachments.length > 0 && (
              <View style={styles.previewContainer}>
                {attachments.map((attachment, index) => (
                  <View key={index} style={styles.attachmentItem}>
                    <Image
                      source={{ uri: attachment.url + env.SAS_KEY }}
                      style={styles.preview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => {
                        setAttachments(attachments.filter((_, i) => i !== index));
                      }}
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                    {uploadProgress[index] !== undefined && uploadProgress[index] < 100 && (
                      <Text style={styles.progressText}>{uploadProgress[index]}%</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>{translations.location || "Location"}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.location && styles.inputError]}
                value={formData.location}
                onChangeText={(text) => handleInputChange('location', text)}
                placeholder={translations.enterLocation || "Enter location"}
                placeholderTextColor="#757575"
                onFocus={() => setActiveField('location')}
              />
              {/* <Checking
                onTranscription={(text) => handleInputChange('location', text)}
                isActive={activeField === 'location'}
              /> */}
            </View>
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}

            <Text style={styles.label}>{translations.agenda || "Agenda"}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={formData.agenda}
                onChangeText={(text) => handleInputChange('agenda', text)}
                placeholder={translations.enterAgenda || "Enter agenda"}
                placeholderTextColor="#757575"
                onFocus={() => setActiveField('agenda')}
              />
              {/* <Checking
                onTranscription={(text) => handleInputChange('agenda', text)}
                isActive={activeField === 'agenda'}
              /> */}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{translations.privateEvent || "Private Event"}</Text>
              <Switch
                value={formData.isPrivate}
                onValueChange={(value) => handleInputChange('isPrivate', value)}
                trackColor={{ false: '#D1D5DB', true: '#C084FC' }}
                thumbColor={formData.isPrivate ? '#67E8F9' : '#F3F4F6'}
                style={styles.switch}
                accessibilityLabel="Toggle private event"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{translations.virtualEvent || "Virtual Event"}</Text>
              <Switch
                value={formData.isVirtual}
                onValueChange={(value) => handleInputChange('isVirtual', value)}
                trackColor={{ false: '#D1D5DB', true: '#C084FC' }}
                thumbColor={formData.isVirtual ? '#67E8F9' : '#F3F4F6'}
                style={styles.switch}
                accessibilityLabel="Toggle virtual event"
              />
            </View>

            <Text style={styles.label}>{translations.description || "Description"}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.multilineInput, errors.description && styles.inputError]}
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder={translations.enterDescription || "Enter description"}
                placeholderTextColor="#757575"
                multiline
                numberOfLines={4}
                onFocus={() => setActiveField('description')}
              />
              {/* <Checking
                onTranscription={(text) => handleInputChange('description', text)}
                isActive={activeField === 'description'}
              /> */}
            </View>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || isUploading}
              style={styles.submitButtonContainer}
            >
              <Animated.View style={[styles.submitButton, { opacity: fadeAnim }]}>
                <LinearGradient
                  colors={['#6462AC', '#028BD3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButton}
                >
                  <Text style={styles.submitButtonText}>
                    {isEditing ? translations.updateEvent || "Update Event" : translations.submitEvent || "Submit Event"}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
        {(isSubmitting || isUploading) && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        )}
      </ScrollView>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#fff"
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'left',
  },
  innerContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    paddingRight: 80,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 10,
    marginTop: -10,
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  datePicker: {
    width: '100%',
    marginBottom: 16,
  },
  mediaButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  mediaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  attachmentItem: {
    position: 'relative',
    marginRight: 12,
    marginBottom: 12,
  },
  preview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    padding: 6,
    position: 'absolute',
    top: -8,
    right: -8,
  },
  progressText: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    color: '#fff',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  submitButtonContainer: {
    marginTop: 20,
  },
  submitButton: {
    padding: 10,
    borderRadius: 30,
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});