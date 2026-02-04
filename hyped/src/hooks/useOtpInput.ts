/**
 * useOtpInput Hook
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Refs instead of state for focus management (no re-renders)
 * - Memoized handlers
 * - Debounced auto-submit
 * - Cleanup on unmount
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { TextInput } from 'react-native';

interface UseOtpInputOptions {
  length?: number;
  onComplete?: (otp: string) => void;
  autoSubmitDelay?: number;
}

interface UseOtpInputReturn {
  otp: string[];
  setOtp: React.Dispatch<React.SetStateAction<string[]>>;
  inputRefs: React.MutableRefObject<(TextInput | null)[]>;
  focusedIndex: number;
  isComplete: boolean;
  handleChange: (value: string, index: number) => void;
  handleKeyPress: (key: string, index: number) => void;
  handleFocus: (index: number) => void;
  handleBlur: () => void;
  reset: () => void;
  focusFirst: () => void;
}

export function useOtpInput({
  length = 4,
  onComplete,
  autoSubmitDelay = 100,
}: UseOtpInputOptions = {}): UseOtpInputReturn {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const autoSubmitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSubmittedOtp = useRef<string>('');

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimer.current) {
        clearTimeout(autoSubmitTimer.current);
      }
    };
  }, []);

  const isComplete = otp.every(digit => digit !== '');
  const otpString = otp.join('');

  // Auto-submit when complete
  useEffect(() => {
    if (isComplete && onComplete && otpString !== lastSubmittedOtp.current) {
      if (autoSubmitTimer.current) {
        clearTimeout(autoSubmitTimer.current);
      }
      autoSubmitTimer.current = setTimeout(() => {
        lastSubmittedOtp.current = otpString;
        onComplete(otpString);
      }, autoSubmitDelay);
    }
  }, [isComplete, otpString, onComplete, autoSubmitDelay]);

  const handleChange = useCallback((value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '');
    
    if (digit.length <= 1) {
      setOtp(prev => {
        const newOtp = [...prev];
        newOtp[index] = digit;
        return newOtp;
      });

      // Move to next input if digit entered
      if (digit && index < length - 1) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 10);
      }
    }
  }, [length]);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace') {
      setOtp(prev => {
        const newOtp = [...prev];
        
        if (newOtp[index]) {
          // Clear current digit
          newOtp[index] = '';
        } else if (index > 0) {
          // Move to previous and clear
          newOtp[index - 1] = '';
          setTimeout(() => {
            inputRefs.current[index - 1]?.focus();
          }, 10);
        }
        
        return newOtp;
      });
    }
  }, []);

  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  const reset = useCallback(() => {
    setOtp(Array(length).fill(''));
    setFocusedIndex(-1);
    lastSubmittedOtp.current = '';
  }, [length]);

  const focusFirst = useCallback(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  return {
    otp,
    setOtp,
    inputRefs,
    focusedIndex,
    isComplete,
    handleChange,
    handleKeyPress,
    handleFocus,
    handleBlur,
    reset,
    focusFirst,
  };
}

export default useOtpInput;

