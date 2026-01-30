/**
 * SignupScreen
 * 
 * Profile setup screen for new users after OTP verification.
 * Collects: Name, Profile Photo, Date of Birth, Gender, Username
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { GradientButton, FormInput } from '../../../components/shared';

// API
import { userAPI } from '../../../api';

// Redux
import { useAppSelector } from '../../../state/hooks';

// Services
import { AppBootstrap } from '../../../services/AppBootstrap';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  // Get auth data from Redux
  const { token, uniqueId } = useAppSelector(state => state.auth);

  // Form state
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Validation
  const isFormValid = name.trim().length >= 2;

  const handleNameChange = useCallback((text: string) => {
    setName(text);
  }, []);

  const handleDateChange = useCallback((text: string) => {
    // Format: DD/MM/YYYY
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }
    setDateOfBirth(formatted);
  }, []);

  const handleGenderSelect = useCallback((value: string) => {
    setGender(gender === value ? null : value);
  }, [gender]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      Toast.show({
        type: 'error',
        text1: 'Validation',
        text2: 'Please enter your name (at least 2 characters)',
      });
      return;
    }

    if (!uniqueId || !token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Session expired. Please login again.',
      });
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      return;
    }

    setIsLoading(true);
    Keyboard.dismiss();

    try {
      // Step 1: Update profile API
      setLoadingMessage('Saving profile...');
      console.log('[SignupScreen] Step 1: Updating profile...');
      
      const response = await userAPI.updateProfile({
        uniqueId,
        name: name.trim(),
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
      });

      console.log('[SignupScreen] Profile updated:', response);

      // Step 2: Bootstrap the app (orchestrated flow)
      setLoadingMessage('Setting up app...');
      console.log('[SignupScreen] Step 2: Starting app bootstrap...');
      
      /**
       * AppBootstrap Flow:
       * 1. Save auth token to Redux ✓ (already done in LoginScreen)
       * 2. PARALLEL: User Profile API + Local DB setup
       * 3. PARALLEL: ChatManager.initialize() + CallManager.initialize()
       * 4. Socket connect
       * 5. Join Phoenix Channel (chat:user:id)
       * 6. App Ready
       */
      const bootstrapResult = await AppBootstrap.bootstrapAfterSignup(
        token,
        uniqueId,
        true // isNewUser
      );

      if (!bootstrapResult.success) {
        console.warn('[SignupScreen] Bootstrap warning:', bootstrapResult.error);
        // Continue anyway - app can recover
      }

      console.log('[SignupScreen] Bootstrap complete, navigating to Home');

      // Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (error: any) {
      console.error('[SignupScreen] Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message || 'Failed to setup. Please try again.',
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [isFormValid, name, dateOfBirth, gender, navigation, token, uniqueId]);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Tell us a bit about yourself to get started
            </Text>
          </View>

          {/* Profile Photo Placeholder */}
          <TouchableOpacity style={styles.photoContainer}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoText}>Add Photo</Text>
            </View>
          </TouchableOpacity>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Name Input */}
            <FormInput
              placeholder="Your Name *"
              value={name}
              onChangeText={handleNameChange}
              autoCapitalize="words"
              maxLength={50}
            />

            {/* Date of Birth Input */}
            <FormInput
              placeholder="Date of Birth (DD/MM/YYYY)"
              value={dateOfBirth}
              onChangeText={handleDateChange}
              keyboardType="number-pad"
              maxLength={10}
            />

            {/* Gender Selection */}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderOption,
                    gender === option.value && styles.genderOptionSelected,
                  ]}
                  onPress={() => handleGenderSelect(option.value)}>
                  <Text
                    style={[
                      styles.genderText,
                      gender === option.value && styles.genderTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit Button */}
            <View style={styles.buttonContainer}>
              <GradientButton
                title="Get Started"
                onPress={handleSubmit}
                loading={isLoading}
                disabled={!isFormValid}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#028BD3',
    borderStyle: 'dashed',
  },
  photoIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  photoText: {
    fontSize: 12,
    color: '#666',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: '#028BD3',
    backgroundColor: '#E8F4FC',
  },
  genderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#028BD3',
  },
  buttonContainer: {
    marginTop: 24,
  },
});

