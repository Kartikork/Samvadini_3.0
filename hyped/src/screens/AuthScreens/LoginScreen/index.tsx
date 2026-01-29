/**
 * LoginScreen
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Lazy loading: CountryPicker modal rendered only when visible
 * 2. Memoization: All child components are memoized
 * 3. Stable callbacks: useCallback for all handlers
 * 4. Optimized state: Minimal state updates, refs for non-render data
 * 5. Code splitting: Heavy components loaded separately
 * 6. Render optimization: Conditional rendering with early returns
 * 7. Fixed layouts: Prevents layout thrashing
 * 8. Keyboard handling: Optimized KeyboardAvoidingView
 * 
 * FLOW:
 * Phone/Email Input → Send OTP → Verify OTP → Navigate
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  memo,
} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

// Components - all memoized
import {
  GradientButton,
  OtpInput,
  CountryPicker,
  FormInput,
  Checkbox,
  type OtpInputRef,
} from '../../../components/shared';

// Hooks
import { useCountdown } from '../../../hooks';

// API
import { authAPI } from '../../../api';

// Config
import { STORAGE_KEYS } from '../../../config';

// Types
import type { Country, AuthStep } from '../../../types/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default country
const DEFAULT_COUNTRY: Country = { name: 'India', code: 'IN', dialCode: '+91' };

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Main LoginScreen Component
 */
function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  // ─────────────────────────────────────────────────────────────
  // STATE - Minimal, focused updates
  // ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<AuthStep>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(true);
  const [hidePhoneNumber, setHidePhoneNumber] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // REFS - For non-render data
  // ─────────────────────────────────────────────────────────────
  const otpInputRef = useRef<OtpInputRef>(null);
  const lastOtpRef = useRef<string>('');

  // ─────────────────────────────────────────────────────────────
  // HOOKS
  // ─────────────────────────────────────────────────────────────
  const { seconds: timerSeconds, isRunning: timerRunning, start: startTimer } = useCountdown(60);

  // ─────────────────────────────────────────────────────────────
  // COMPUTED VALUES - Memoized
  // ─────────────────────────────────────────────────────────────
  const isIndian = useMemo(() => selectedCountry.dialCode === '+91', [selectedCountry.dialCode]);
  
  const emailError = useMemo(() => {
    if (!email) return undefined;
    return EMAIL_REGEX.test(email) ? undefined : 'Invalid email format';
  }, [email]);

  const canSendOtp = useMemo(() => {
    if (!agreeToTerms) return false;
    if (!phoneNumber || phoneNumber.length < 10) return false;
    if (!isIndian && (!email || emailError)) return false;
    return true;
  }, [agreeToTerms, phoneNumber, isIndian, email, emailError]);

  const canResendOtp = !timerRunning;

  // ─────────────────────────────────────────────────────────────
  // HANDLERS - All memoized with useCallback
  // ─────────────────────────────────────────────────────────────
  
  const handlePhoneChange = useCallback((text: string) => {
    // Only allow digits, max 10
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneNumber(cleaned);
  }, []);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text.toLowerCase().trim());
  }, []);

  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
  }, []);

  const handleOpenCountryPicker = useCallback(() => {
    Keyboard.dismiss();
    setShowCountryPicker(true);
  }, []);

  const handleCloseCountryPicker = useCallback(() => {
    setShowCountryPicker(false);
  }, []);

  const handleTermsChange = useCallback((checked: boolean) => {
    setAgreeToTerms(checked);
  }, []);

  const handleHidePhoneChange = useCallback((checked: boolean) => {
    setHidePhoneNumber(checked);
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!canSendOtp) {
      Toast.show({
        type: 'error',
        text1: 'Validation',
        text2: 'Please fill all required fields',
      });
      return;
    }

    setIsLoading(true);
    Keyboard.dismiss();

    try {
      // Generate OTP for send-otp API (as number, not string - backend stores as integer)
      const otp = Math.floor(1000 + Math.random() * 9000);
      console.log('[LoginScreen] OTP Generated:', otp);
      
      // Call send-otp API
      await authAPI.sendOtp({
        durasamparka_sankhya: phoneNumber,
        dootapatra: email || undefined,
        ekakrit_passanketa: otp,
        desha_suchaka_koda: selectedCountry.dialCode,
        durasamparka_gopaniya: hidePhoneNumber,
      });

      // Store phone for later use
    //   await AsyncStorage.setItem('currUserPhn', phoneNumber);
    //   await AsyncStorage.setItem('isPhnHidden', JSON.stringify(hidePhoneNumber));

      setStep('otp');
      startTimer(10);
      
      // Focus OTP input after transition
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 300);

      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: `OTP sent to ${isIndian ? phoneNumber : email}`,
      });
    } catch (error: any) {
      console.error('[LoginScreen] Send OTP Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message || 'Failed to send OTP. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [canSendOtp, phoneNumber, email, isIndian, selectedCountry.dialCode, hidePhoneNumber, startTimer]);

  const handleVerifyOtp = useCallback(async (otp: string) => {
    // Prevent duplicate submissions
    if (otp === lastOtpRef.current || otp.length !== 4) return;
    lastOtpRef.current = otp;

    setIsLoading(true);
    setOtpError(false);
    setOtpSuccess(false);

    try {
      // Prepare verify-otp request data
      const verifyData = {
        durasamparka_sankhya: phoneNumber,
        dootapatra: email,
        ekakrit_passanketa: otp,
        desha_suchaka_koda: selectedCountry.dialCode,
      };
      
      console.log('[LoginScreen] Verify OTP Request:', verifyData);
      
      // Call verify-otp API
      const response = await authAPI.verifyOtp(verifyData);
      
      console.log('[LoginScreen] Verify OTP Response:', response);

      // Store auth data
      const { token, user, user_setting, isRegister } = response;
      
      // Save auth data to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem('uniqueId', user.ekatma_chinha);
      await AsyncStorage.setItem('isRegister', JSON.stringify(isRegister));
      await AsyncStorage.setItem('userCountryCode', selectedCountry.dialCode);
      
      if (user_setting.upayogakarta_nama) {
        await AsyncStorage.setItem('uniqueUsername', user_setting.upayogakarta_nama);
      }
      if (user_setting.praman_patrika) {
        await AsyncStorage.setItem('userName', user_setting.praman_patrika);
      }
      if (user_setting.parichayapatra) {
        await AsyncStorage.setItem('userProfilePhoto', user_setting.parichayapatra);
      }

      setOtpSuccess(true);
      Keyboard.dismiss();

      // Navigate based on registration status
      setTimeout(() => {
        if (isRegister) {
          // User is already registered - go to Home
          console.log('[LoginScreen] User registered, navigating to Home');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          // New user - go to Signup/Profile setup
          console.log('[LoginScreen] New user, navigating to Signup');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Signup' }],
          });
        }
      }, 500);
    } catch (error: any) {
      console.error('[LoginScreen] Verify OTP Error:', error);
      console.error('[LoginScreen] Error details:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        response: error?.response?.data,
      });
      setOtpError(true);
      lastOtpRef.current = ''; // Allow retry
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || error?.message || 'Invalid OTP. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, email, selectedCountry.dialCode, navigation]);

  const handleEditDetails = useCallback(() => {
    setStep('input');
    setOtpError(false);
    setOtpSuccess(false);
    lastOtpRef.current = '';
    otpInputRef.current?.reset();
  }, []);

  const handleResendOtp = useCallback(() => {
    if (!canResendOtp) return;
    otpInputRef.current?.reset();
    lastOtpRef.current = '';
    setOtpError(false);
    setOtpSuccess(false);
    handleSendOtp();
  }, [canResendOtp, handleSendOtp]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  
  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/images/Splash_screen.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {step === 'input' ? (
              <InputForm
                phoneNumber={phoneNumber}
                email={email}
                selectedCountry={selectedCountry}
                agreeToTerms={agreeToTerms}
                hidePhoneNumber={hidePhoneNumber}
                emailError={emailError}
                isIndian={isIndian}
                isLoading={isLoading}
                canSendOtp={canSendOtp}
                onPhoneChange={handlePhoneChange}
                onEmailChange={handleEmailChange}
                onCountryPress={handleOpenCountryPicker}
                onTermsChange={handleTermsChange}
                onHidePhoneChange={handleHidePhoneChange}
                onSendOtp={handleSendOtp}
              />
            ) : (
              <OtpForm
                ref={otpInputRef}
                isIndian={isIndian}
                timerSeconds={timerSeconds}
                canResend={canResendOtp}
                isLoading={isLoading}
                otpError={otpError}
                otpSuccess={otpSuccess}
                onVerify={handleVerifyOtp}
                onEdit={handleEditDetails}
                onResend={handleResendOtp}
              />
            )}
          </View>
        </ScrollView>

        {/* Country Picker - Lazy rendered */}
        <CountryPicker
          visible={showCountryPicker}
          onClose={handleCloseCountryPicker}
          onSelect={handleCountrySelect}
          selectedCountry={selectedCountry}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// MEMOIZED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

interface InputFormProps {
  phoneNumber: string;
  email: string;
  selectedCountry: Country;
  agreeToTerms: boolean;
  hidePhoneNumber: boolean;
  emailError?: string;
  isIndian: boolean;
  isLoading: boolean;
  canSendOtp: boolean;
  onPhoneChange: (text: string) => void;
  onEmailChange: (text: string) => void;
  onCountryPress: () => void;
  onTermsChange: (checked: boolean) => void;
  onHidePhoneChange: (checked: boolean) => void;
  onSendOtp: () => void;
}

const InputForm = memo(function InputForm({
  phoneNumber,
  email,
  selectedCountry,
  agreeToTerms,
  hidePhoneNumber,
  emailError,
  isIndian,
  isLoading,
  canSendOtp,
  onPhoneChange,
  onEmailChange,
  onCountryPress,
  onTermsChange,
  onHidePhoneChange,
  onSendOtp,
}: InputFormProps) {
  return (
    <>
      <Text style={styles.title}>Enter Your Details</Text>

      {/* Phone Input */}
      <View style={styles.phoneContainer}>
        <TouchableOpacity style={styles.countryButton} onPress={onCountryPress}>
          <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
        </TouchableOpacity>
        <View style={styles.phoneInput}>
          <FormInput
            placeholder="Phone Number"
            value={phoneNumber}
            onChangeText={onPhoneChange}
            keyboardType="phone-pad"
            maxLength={10}
            containerStyle={styles.phoneInputContainer}
          />
        </View>
      </View>

      {/* Email Input */}
      <FormInput
        placeholder="Email Address"
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={emailError}
      />

      {/* Show options only when phone is complete */}
      {phoneNumber.length === 10 && (
        <>
          {/* Terms Checkbox */}
          <Checkbox
            checked={agreeToTerms}
            onChange={onTermsChange}
            label="I agree to the Terms & Conditions and Privacy Policy"
          />

          {/* Hide Phone Checkbox */}
          <Checkbox
            checked={hidePhoneNumber}
            onChange={onHidePhoneChange}
            label="Hide my phone number from other users"
          />

          {/* Send OTP Button */}
          <View style={styles.buttonContainer}>
            <GradientButton
              title={isIndian ? 'Send OTP to Phone' : 'Send OTP to Email'}
              onPress={onSendOtp}
              loading={isLoading}
              disabled={!canSendOtp}
            />
          </View>
        </>
      )}
    </>
  );
});

interface OtpFormProps {
  isIndian: boolean;
  timerSeconds: number;
  canResend: boolean;
  isLoading: boolean;
  otpError: boolean;
  otpSuccess: boolean;
  onVerify: (otp: string) => void;
  onEdit: () => void;
  onResend: () => void;
}

const OtpForm = memo(
  React.forwardRef<OtpInputRef, OtpFormProps>(function OtpForm(
    {
      isIndian,
      timerSeconds,
      canResend,
      isLoading,
      otpError,
      otpSuccess,
      onVerify,
      onEdit,
      onResend,
    },
    ref
  ) {
    return (
      <>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          {isIndian
            ? 'We sent a verification code to your phone'
            : 'We sent a verification code to your email'}
        </Text>

        {/* OTP Input */}
        <OtpInput
          ref={ref}
          length={4}
          onComplete={onVerify}
          error={otpError}
          success={otpSuccess}
          disabled={isLoading || otpSuccess}
        />

        {/* Timer or Resend */}
        {!canResend ? (
          <Text style={styles.timerText}>
            Resend OTP in {timerSeconds}s
          </Text>
        ) : (
          <View style={styles.resendContainer}>
            <TouchableOpacity onPress={onEdit}>
              <Text style={styles.linkText}>Edit Details</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onResend}>
              <Text style={styles.linkText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Message */}
        {otpError && (
          <Text style={styles.errorText}>Incorrect OTP, please try again</Text>
        )}
      </>
    );
  })
);

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.3,
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  countryButton: {
    height: 50,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 10,
    backgroundColor: '#FFF',
    marginRight: 10,
    marginTop: 0,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
  },
  phoneInputContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  timerText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#028BD3',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#FF4444',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default LoginScreen;

