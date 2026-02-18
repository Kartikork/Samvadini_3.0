  import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  BackHandler,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import ImageCropPicker from 'react-native-image-crop-picker';
import DatePicker from 'react-native-date-picker';
import axios from 'axios';
import { env } from '../../../config/env';
import { useUsernameSuggestions } from '../../../hooks/useUsernameSuggestions';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBackground } from '../../../components/GradientBackground';
import { Footer } from '../../../components/Footer';
import { FormInput } from '../../../components/shared';
import { useAppSelector, useAppDispatch } from '../../../state/hooks';
import { setUserCountryCode } from '../../../state/countrySlice';
import { setAuthData, setUserProfile } from '../../../state/authSlice';
import { getAppTranslations } from '../../../translations';
import { userAPI } from '../../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Redux

// Services
import { AppBootstrap } from '../../../services/AppBootstrap';
import type { UpdateProfileRequest } from '../../../api/endpoints';
import { hypedLogo } from '../../../assets';

const { width, height } = Dimensions.get('window');

function formatDOBInput(text: string): string {
  let cleaned = text.replace(/\D/g, '');
  if (cleaned.length >= 1) {
    let day = cleaned.substring(0, 2);
    if (day.length === 1 && parseInt(day, 10) > 3) {
      day = '0' + day;
      cleaned = day + cleaned.substring(1);
    } else if (day.length === 2) {
      const dayNum = parseInt(day, 10);
      if (dayNum === 0) day = '01';
      else if (dayNum > 31) day = '31';
      cleaned = day + cleaned.substring(2);
    }
  }
  if (cleaned.length >= 3) {
    let month = cleaned.substring(2, 4);
    if (month.length === 1 && parseInt(month, 10) > 1) {
      month = '0' + month;
      cleaned = cleaned.substring(0, 2) + month + cleaned.substring(3);
    } else if (month.length === 2) {
      const monthNum = parseInt(month, 10);
      if (monthNum === 0) month = '01';
      else if (monthNum > 12) month = '12';
      cleaned = cleaned.substring(0, 2) + month + cleaned.substring(4);
    }
  }
  if (cleaned.length > 4) {
    let year = cleaned.substring(4, 8);
    const currentYear = new Date().getFullYear();
    if (year.length === 4 && parseInt(year, 10) > currentYear) {
      year = currentYear.toString();
      cleaned = cleaned.substring(0, 4) + year;
    }
  }
  if (cleaned.length > 4) {
    cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
  } else if (cleaned.length > 2) {
    cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
  }
  return cleaned.slice(0, 10);
}

function isValidDOB(dob: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return false;
  const [day, month, year] = dob.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const daysInMonth: Record<number, number> = {
    1: 31,
    2: year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
  };
  if (day > daysInMonth[month]) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const dispatch = useAppDispatch();  
  // Get auth data from Redux
  const { token, uniqueId } = useAppSelector(state => state.auth);

  const lang = useAppSelector((state) => state.language.lang);
  const isMountedRef = useRef(true);
  const scrollRef = useRef<ScrollView>(null);

  const [keyboardShown, setKeyboardShown] = useState(false);
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState(true);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedGender, setSelectedGender] = useState<{ label: string; value: string } | null>(null);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [dateOfBirthError, setDateOfBirthError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');

  const screenHeight = Dimensions.get('window').height;
  const dynamicMarginTop = screenHeight * 0.1;
  const t = useMemo(() => getAppTranslations(lang), [lang]);

  const GENDER_OPTIONS = useMemo(
    () => [
      { label: t.male, value: 'male' },
      { label: t.female, value: 'female' },
      { label: t.OthersLabel, value: 'other' },
    ],
    [t]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [navigation]);


  // Username suggestion / availability hook
  const {
    uniqueUsername,
    setUniqueUsername,
    usernameSuggestions,
    isUsernameLoading,
    usernameError,
    isUsernameValid,
    handleUsernameChange,
    selectSuggestion,
    fetchUsernameSuggestions,
    checkUsernameAvailability,
    clearSuggestions,
  } = useUsernameSuggestions('');

  useEffect(() => {
    if (username.length >= 2) {
      const timer = setTimeout(() => fetchUsernameSuggestions(username), 800);
      return () => clearTimeout(timer);
    }
  }, [username, fetchUsernameSuggestions]);

  const parsedDOBForPicker = useMemo(() => {
    if (!dateOfBirth || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) return new Date(2000, 0, 1);
    if (!isValidDOB(dateOfBirth)) return new Date(2000, 0, 1);
    const [d, m, y] = dateOfBirth.split('/').map(Number);
    return new Date(y, m - 1, d);
  }, [dateOfBirth]);

  const handleSubmit = useCallback(async () => {
    if (!username || username.length < 3) {
      Alert.alert(t.Error, t.AllFieldsAreMandatory);
      return;
    }
    if (!uniqueUsername || uniqueUsername.length < 3) {
      Alert.alert(t.Error, t.UsernameRequired);
      return;
    }
    if (!isUsernameValid) {
      Alert.alert(t.Error, usernameError || 'Please enter or select a valid username');
      return;
    }
    if (!dateOfBirth || !isValidDOB(dateOfBirth)) {
      Alert.alert(t.Error, 'Please enter a valid date of birth (DD/MM/YYYY)');
      return;
    }
    if (!selectedGender) {
      Alert.alert(t.Error, t.selectGender);
      return;
    }

    // Check auth from Redux (Redux Persist has restored it)
    if (!uniqueId || !token) {
      Alert.alert(t.Error, 'Session expired. Please login again.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      return;
    }

    const [day, month, year] = dateOfBirth.split('/').map(Number);
    const dobDate = new Date(year, month - 1, day);

    const postData: UpdateProfileRequest = {
      uniqueId,
      name: username.trim(),
      dateOfBirth: dobDate.toISOString(),
      gender: selectedGender.value,
      username: uniqueUsername,
    };
    const trimmedReferral = referredBy?.trim();
    if (trimmedReferral) postData.referredBy = trimmedReferral;
    if (photo) postData.imageUrl = photo;
    try {
      setIsLoading(true);
      const response = await userAPI.updateProfile(postData);
      const payload = response.data as any;
      const data = payload?.data ?? payload;
      const user = data?.user;
      const user_settings = data?.user_settings;

      if (user_settings?.desha_suchaka_koda) {
        await AsyncStorage.setItem('userCountryCode', user_settings.desha_suchaka_koda);
        dispatch(setUserCountryCode(user_settings.desha_suchaka_koda));
      }
      await AsyncStorage.setItem('isRegister', 'true');
      await AsyncStorage.setItem('uniqueUsername', uniqueUsername);
      await AsyncStorage.setItem('userName', user_settings?.praman_patrika ?? username.trim());
      if (photo && user_settings?.parichayapatra) {
        await AsyncStorage.setItem('userProfilePhoto', user_settings.parichayapatra);
      } else {
        await AsyncStorage.removeItem('userProfilePhoto');
      }
      try {
        const returnedUniqueId = user?.ekatma_chinha ?? uniqueId ?? '';
        const mappedUserSettings = {
          is_register: user_settings?.is_register,
          janma_tithi: user_settings?.janma_tithi,
          linga: user_settings?.linga,
          durasamparka_sankhya: user_settings?.durasamparka_sankhya ?? user?.durasamparka_sankhya,
          parichayapatra: user_settings?.parichayapatra ?? user?.parichayapatra,
          upayogakarta_nama: user_settings?.upayogakarta_nama ?? user?.upayogakarta_nama,
          praman_patrika: user_settings?.praman_patrika ?? user?.praman_patrika,
          ekatma_chinha: user?.ekatma_chinha ?? user_settings?.ekatma_chinha,
          dhwani: user_settings?.dhwani ?? null,
          durasamparka_gopaniya: user_settings?.durasamparka_gopaniya,
          desha_suchaka_koda: user_settings?.desha_suchaka_koda,
        };

        // token is expected to be present from login; keep it as-is
        dispatch(setAuthData({ token: token ?? '', uniqueId: returnedUniqueId ?? '', userSettings: mappedUserSettings }));

        const profile = {
          name: user_settings?.praman_patrika ?? user?.praman_patrika ?? user?.upayogakarta_nama,
          avatar: user_settings?.parichayapatra ?? user?.parichayapatra ?? '',
          phone: user?.durasamparka_sankhya ?? '',
          email: user?.dootapatra ?? '',
          username: uniqueUsername,
          status: user?.status ?? '',
        };
        dispatch(setUserProfile(profile));
      } catch (e) {
        console.warn('[SignupScreen] Error saving auth/profile to Redux', e);
      }

      // Step 2: Bootstrap the app (orchestrated flow)
      setLoadingMessage('Setting up app...');
      const bootstrapResult = await AppBootstrap.bootstrapAfterSignup(
        token,
        uniqueId,
        true // isNewUser
      );

      if (!bootstrapResult.success) {
        console.warn('[SignupScreen] Bootstrap warning:', bootstrapResult.error);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } catch (error: any) {
      console.error('[SignupScreen] Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.error  || 'Failed to setup. Please try again.',
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [
    username,
    uniqueUsername,
    isUsernameValid,
    usernameError,
    dateOfBirth,
    selectedGender,
    referredBy,
    photo,
    t,
    dispatch,
    navigation,
  ]);

  const handlePhotoUpload = useCallback(() => {
    Alert.alert(t.choosePhoto, t.selectPhoto, [
      {
        text: t.takePhoto,
        onPress: () => {
          ImageCropPicker.openCamera({
            width: 1200,
            height: 1200,
            cropping: true,
            includeBase64: false,
            mediaType: 'photo',
            cropperToolbarTitle: t.edit || 'Edit',
            hideBottomControls: false,
            compressImageQuality: 0.9,
          })
            .then(image => {
              if (isMountedRef.current) {
                setImageUrl(image.path);
              }
              uploadImage(image.path);
            })
            .catch(err => {
              if (err && err.message && !err.message.toLowerCase().includes('cancel')) {
                console.error('[SignupScreen] Camera error', err);
                Toast.show({ type: 'error', text1: t.error, text2: t.failedTakePhoto });
              }
            });
        },
      },
      {
        text: t.chooseFromGallery,
        onPress: () => {
          ImageCropPicker.openPicker({
            width: 1200,
            height: 1200,
            cropping: true,
            includeBase64: false,
            mediaType: 'photo',
            cropperToolbarTitle: t.edit || 'Edit',
            hideBottomControls: false,
            compressImageQuality: 0.9,
          })
            .then(image => {
              if (isMountedRef.current) {
                setImageUrl(image.path);
              }
              uploadImage(image.path);
            })
            .catch(err => {
              if (err && err.message && !err.message.toLowerCase().includes('cancel')) {
                console.error('[SignupScreen] Picker error', err);
                Toast.show({ type: 'error', text1: t.error, text2: t.failedPickImage });
              }
            });
        },
      },
      { text: t.cancel, style: 'cancel' },
    ]);
  }, [t]);

  const uploadImage = useCallback(
    async (imageUri: string) => {
      try {
        setIsLoading(true);
        setLoadingMessage('Uploading...');

        const formData = new FormData();
        // On iOS the uri may need file:// prefix, but ImageCropPicker returns usable path on both platforms
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `upload_${Date.now()}.jpg`,
        } as any);

        const uploadUrl = `${env.API_BASE_URL.replace(/\/$/, '')}/chat/upload-media`;
console.log(uploadUrl, "uploadUrl");
        const response = await axios.post(uploadUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Accept: 'application/json',
          },
          onUploadProgress: (progressEvent) => {
            try {
              const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
              setLoadingMessage(`Uploading ${percent}%`);
            } catch (_) {}
          },
        });
        console.log(JSON.stringify(response), "response222222222222222222222222222");

        const serverUrl =
          response?.data?.fileUrl || response?.data?.data?.fileUrl || response?.data?.data || null;
console.log(JSON.stringify(serverUrl), "serverUrl33333333333333333333333");
        if (!serverUrl) {
          throw new Error('Invalid server response');
        }

        if (isMountedRef.current) {
          setPhoto(serverUrl);
          setImageUrl(serverUrl);
        }
      } catch (error) {
        console.error('[SignupScreen] Error uploading image', error);
        Toast.show({ type: 'error', text1: t.error, text2: t.failedUploadImage || 'Upload failed' });
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setLoadingMessage('');
        }
      }
    },
    [t],
  );

  const onOpenDatePicker = useCallback(() => setShowDatePicker(true), []);
  const toggleGenderDropdown = useCallback(() => {
    Keyboard.dismiss();
    setActiveField(false);
    setTimeout(() => setShowGenderDropdown((prev) => !prev), 80);
  }, []);

  return (
    <>
      <KeyboardAvoidingView
        behavior='padding'
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <GradientBackground>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableWithoutFeedback
                onPress={() => {
                  setActiveField(false);
                  Keyboard.dismiss();
                }}
              >
                <View style={[styles.content, { marginTop: dynamicMarginTop }]}>
                  <Image
                    source={hypedLogo}
                    style={styles.logo}
                  />
                  <View style={styles.formContainer}>
                    <View style={styles.userImg}>
                      {imageUrl ? (
                        <>
                          <Image source={{ uri: imageUrl + env.SAS_KEY}} style={styles.uploadedPhoto} />
                          <TouchableOpacity style={[styles.button, styles.uploadButton]} onPress={handlePhotoUpload}>
                            <Icon name="camera-flip-outline" size={30} color="#fff" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View>
                          <View style={styles.uploadPlaceholderWrapper}>
                            {isLoading && <ActivityIndicator size="small" color="#028BD3" />}
                          </View>
                          <TouchableOpacity onPress={handlePhotoUpload}>
                            <View style={[styles.uploadedPhoto, styles.uploadPlaceholder]} />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.button, styles.uploadButton]} onPress={handlePhotoUpload}>
                            <Icon name="camera-flip-outline" size={30} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <Text style={styles.formTitle}>{t.Profile}</Text>

                    <View style={styles.inputWrapper}>
                      <FormInput
                        placeholder={t.Username}
                        value={username}
                        onChangeText={setUsername}
                        containerStyle={styles.inputContainer}
                        style={styles.input}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <View style={styles.usernameInputContainer}>
                        <FormInput
                          placeholder={t.UniqueUsername}
                          value={uniqueUsername}
                          onChangeText={handleUsernameChange}
                          autoCapitalize="none"
                          autoCorrect={false}
                          containerStyle={styles.inputContainer}
                          style={[
                            styles.input,
                            isUsernameValid && styles.inputValid,
                            usernameError && styles.inputErrorBorder,
                          ]}
                        />
                        <View style={styles.usernameStatusIcon}>
                          {isUsernameLoading ? (
                            <ActivityIndicator size="small" color="#4fc6b2" />
                          ) : isUsernameValid ? (
                            <Icon name="check-circle" size={22} color="#4CAF50" />
                          ) : usernameError ? (
                            <Icon name="alert-circle" size={22} color="#FF5252" />
                          ) : null}
                        </View>
                      </View>
                      {usernameError ? (
                        <Text style={styles.usernameErrorText}>{usernameError}</Text>
                      ) : isUsernameValid ? (
                        <Text style={styles.usernameSuccessText}>{t.UsernameAvailable}</Text>
                      ) : null}
                      {usernameSuggestions.length > 0 && !uniqueUsername && (
                        <View style={styles.suggestionContainer}>
                          <View style={styles.suggestionHeader}>
                            <Icon name="lightbulb-outline" size={16} color="#4fc6b2" />
                            <Text style={styles.suggestionTitle}>
                              {t.TrySuggestions || 'Try these:'}
                            </Text>
                          </View>
                          <View style={styles.suggestionButtons}>
                            {usernameSuggestions.map((suggestion, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.suggestionChip}
                                onPress={() => selectSuggestion(suggestion)}
                                activeOpacity={0.7}
                              >
                                <Icon name="at" size={14} color="#4fc6b2" style={styles.suggestionChipIcon} />
                                <Text style={styles.suggestionChipText}>
                                  {suggestion}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputWrapper}>
                      <View style={styles.dateInputWrapper}>
                        <FormInput
                          placeholder="DD/MM/YYYY"
                          value={dateOfBirth}
                          onChangeText={(text) => {
                            const formatted = formatDOBInput(text);
                            setDateOfBirth(formatted);
                            setDateOfBirthError('');
                          }}
                          onBlur={() => {
                            if (dateOfBirth && !isValidDOB(dateOfBirth) && dateOfBirth.length === 10) {
                              setDateOfBirthError('Invalid date');
                            } else {
                              setDateOfBirthError('');
                            }
                          }}
                          maxLength={10}
                          keyboardType="number-pad"
                          containerStyle={styles.inputContainer}
                          style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        />
                        <TouchableOpacity style={styles.calendarButton} onPress={onOpenDatePicker}>
                          <Icon name="calendar" size={24} color="#6665A8" />
                        </TouchableOpacity>
                      </View>
                      {dateOfBirthError ? (
                        <Text style={styles.dateErrorText}>{dateOfBirthError}</Text>
                      ) : null}
                    </View>

                    <View style={styles.dropdownContainer}>
                      <TouchableOpacity
                        style={[styles.input, styles.dateInputContainer, showGenderDropdown && styles.inputActive]}
                        onPress={toggleGenderDropdown}
                      >
                        <Text
                          style={[styles.dateInputText, !selectedGender && styles.placeholderText]}
                        >
                          {selectedGender ? selectedGender.label : t.selectGenderLabel}
                        </Text>
                        <Icon name={showGenderDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
                      </TouchableOpacity>
                      {showGenderDropdown && (
                        <View style={styles.dropdownOptions}>
                          <FlatList
                            data={GENDER_OPTIONS}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={[
                                  styles.dropdownOption,
                                  selectedGender?.value === item.value && styles.dropdownOptionSelected,
                                ]}
                                onPress={() => {
                                  Keyboard.dismiss();
                                  setSelectedGender(item);
                                  setTimeout(() => setShowGenderDropdown(false), 80);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownOptionText,
                                    selectedGender?.value === item.value && styles.dropdownOptionTextSelected,
                                  ]}
                                >
                                  {item.label}
                                </Text>
                                {selectedGender?.value === item.value && (
                                  <Icon name="check" size={16} color="#4fc6b2" />
                                )}
                              </TouchableOpacity>
                            )}
                            scrollEnabled
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.inputWrapper}>
                      <FormInput
                        placeholder="Enter Referral Code (Optional)"
                        value={referredBy}
                        onChangeText={setReferredBy}
                        containerStyle={styles.inputContainer}
                        style={styles.input}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.button, styles.signup]}
                      onPress={handleSubmit}
                      disabled={isLoading}
                    >
                      <View style={styles.gradientButton}>
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.buttonText}>{t.Submit}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </ScrollView>
          </SafeAreaView>
        </GradientBackground>

        <DatePicker
          modal
          open={showDatePicker}
          date={parsedDOBForPicker}
          mode="date"
          onConfirm={(date: Date) => {
            setShowDatePicker(false);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            setDateOfBirth(`${day}/${month}/${year}`);
            setDateOfBirthError('');
          }}
          onCancel={() => setShowDatePicker(false)}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          theme="light"
        />
      </KeyboardAvoidingView>
      <View style={{ height: keyboardShown ? 0 : undefined, overflow: 'hidden' }}>
        <Footer />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, paddingBottom: 80 },
  logo: { width: width * 0.65, height: width * 0.2, resizeMode: 'contain' },
  formContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF', 
    borderRadius: 15,
    padding: 25,
    position: 'relative',
    marginTop: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  formTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', marginTop: 40 },
  inputWrapper: { marginBottom: 0, width:'100%', },
  inputContainer: { marginBottom: 20, width:'100%',},
  input: {
    borderWidth: 1 as number,
    borderColor: '#E0E0E0', 
    borderRadius: 8 as number,
    padding: 15,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F8F9FA',
  },
  inputActive: { borderColor: '#4fc6b2', borderWidth: 2, backgroundColor: '#FFFFFF' },
  inputValid: { borderColor: '#4CAF50', borderWidth: 1.5 },
  inputErrorBorder: { borderColor: '#FF5252', borderWidth: 1.5 },
  dateInputContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateInputText: { fontSize: 16, color: '#000000' },
  placeholderText: { color: '#999' },
  dateInputWrapper: { flexDirection: 'row', alignItems: 'center', },
  calendarButton: { padding: 10, marginLeft: -45, justifyContent: 'center', position: 'relative', top: -7 },
  dateErrorText: { color: 'red', fontSize: 12, marginTop: -12, marginBottom: 10 },
  button: { alignItems: 'center', marginTop: 10 },
  gradientButton: {
    width: '100%',
    borderRadius: 30,
    padding: 14,
    backgroundColor: '#6462AC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  uploadButton: {
    backgroundColor: '#6564ab',
    width: 45,
    height: 45,
    borderRadius: 100,
    position: 'absolute',
    bottom: -13,
    right: 5,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  userImg: {
    position: 'absolute',
    top: -50,
    width: 130,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  uploadedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#6564ab',
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65, 
  },
  uploadPlaceholder: { backgroundColor: '#E8E8E8' },
  uploadPlaceholderWrapper: { position: 'absolute', zIndex: 999, top: 30, left: 45 },
  dropdownContainer: {width:'100%', marginBottom:20},
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 8,
    maxHeight: 200,
    zIndex: 1001,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownOptionSelected: { backgroundColor: '#F8F9FA' },
  dropdownOptionText: { fontSize: 16, color: '#212121' },
  dropdownOptionTextSelected: { color: '#4fc6b2', fontWeight: '600' },
  signup: { marginTop: 10 },
  usernameInputContainer: { position: 'relative' },
  usernameStatusIcon: { position: 'absolute', right: 15, top: 15 },
  usernameErrorText: { color: '#FF5252', fontSize: 12, marginTop: 4, marginBottom: 10, marginLeft: 5 },
  usernameSuccessText: { color: '#4CAF50', fontSize: 12, marginTop: 4, marginBottom: 10, marginLeft: 5 },
  suggestionContainer: { marginTop: 10, marginBottom: 15 },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  suggestionTitle: { fontSize: 12, color: '#666', marginLeft: 6, fontWeight: '500' },
  suggestionButtons: { flexDirection: 'row', flexWrap: 'wrap' },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#4fc6b2',
  },
  suggestionChipIcon: { marginRight: 4 },
  suggestionChipText: { color: '#2A9D8F', fontSize: 13, fontWeight: '600' },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  datePickerPlaceholder: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  datePickerClose: { alignSelf: 'flex-end', padding: 8 },
  datePickerHint: { fontSize: 12, color: '#666', textAlign: 'center' },
});
