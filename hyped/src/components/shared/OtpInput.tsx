/**
 * OtpInput Component
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - React.memo with custom comparison
 * - useCallback for all handlers
 * - Refs for focus management (no state re-renders)
 * - Optimized TextInput with fixed layout
 * - getItemLayout equivalent via fixed dimensions
 */

import React, { memo, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useOtpInput } from '../../hooks';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
}

export interface OtpInputRef {
  reset: () => void;
  focus: () => void;
}

const OtpInput = forwardRef<OtpInputRef, OtpInputProps>(function OtpInput(
  { length = 4, onComplete, error = false, success = false, disabled = false },
  ref
) {
  const {
    otp,
    inputRefs,
    focusedIndex,
    handleChange,
    handleKeyPress,
    handleFocus,
    handleBlur,
    reset,
    focusFirst,
  } = useOtpInput({ length, onComplete });

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    reset: () => {
      reset();
      Keyboard.dismiss();
    },
    focus: focusFirst,
  }), [reset, focusFirst]);

  const getInputStyle = useCallback((index: number) => {
    const baseStyle = [styles.input];
    
    if (focusedIndex === index) {
      baseStyle.push(styles.inputFocused);
    }
    if (error) {
      baseStyle.push(styles.inputError);
    }
    if (success) {
      baseStyle.push(styles.inputSuccess);
    }
    
    return baseStyle;
  }, [focusedIndex, error, success]);

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={el => (inputRefs.current[index] = el)}
          style={getInputStyle(index)}
          value={otp[index] || ''}
          onChangeText={value => handleChange(value, index)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          selectTextOnFocus
          editable={!disabled}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 20,
  },
  input: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 12,
    backgroundColor: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  inputFocused: {
    borderColor: '#028BD3',
    backgroundColor: '#F8FCFF',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  inputSuccess: {
    borderColor: '#00C853',
  },
});

export default memo(OtpInput);

