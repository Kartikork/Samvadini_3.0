/**
 * Checkbox Component
 * 
 * PERFORMANCE:
 * - Memoized to prevent re-renders
 * - Stable callback
 */

import React, { memo, useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

const Checkbox = memo(function Checkbox({
  checked,
  onChange,
  label,
  children,
  disabled = false,
  style,
}: CheckboxProps) {
  const handlePress = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [checked, onChange, disabled]);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      {(label || children) && (
        <View style={styles.labelContainer}>
          {label ? (
            <Text style={[styles.label, disabled && styles.labelDisabled]}>
              {label}
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxChecked: {
    backgroundColor: '#028BD3',
    borderColor: '#028BD3',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  labelContainer: {
    flex: 1,
    marginLeft: 10,
    paddingTop: 2,
  },
  label: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  labelDisabled: {
    color: '#999',
  },
});

export default Checkbox;






