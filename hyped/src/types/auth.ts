/**
 * Authentication Types
 * 
 * Type definitions for the auth flow
 */

export interface Country {
  name: string;
  code: string;
  dialCode: string;
}

export interface OtpState {
  digits: string[];
  isValid: boolean;
  isVerifying: boolean;
  error: string | null;
}

export interface LoginFormState {
  phoneNumber: string;
  email: string;
  countryCode: string;
  hidePhoneNumber: boolean;
  agreeToTerms: boolean;
}

export interface AuthUser {
  id: string;
  phoneNumber: string;
  email?: string;
  name?: string;
  photo?: string;
  isRegistered: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  isNewUser: boolean;
}

export type AuthStep = 'input' | 'otp' | 'loading';


