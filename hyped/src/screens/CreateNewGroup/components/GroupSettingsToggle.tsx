import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
// Slider from community package (native); TS types may be missing locally
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Slider = require('@react-native-community/slider').default as React.ComponentType<any>;

interface AgeGroup {
  min: string;
  max: string;
}

interface Props {
  expanded: boolean;
  onToggle: () => void;
  groupType: string;
  setGroupType: (value: string) => void;
  privacy: string;
  setPrivacy: (value: string) => void;
  ageGroup: AgeGroup;
  setAgeGroup: (value: AgeGroup) => void;
  gender: string;
  setGender: (value: string) => void;
  getTranslation: (key: string, fallback?: string) => string;
}

const GroupSettingsToggle: React.FC<Props> = ({
  expanded,
  groupType,
  setGroupType,
  privacy,
  setPrivacy,
  ageGroup,
  setAgeGroup,
  gender,
  setGender,
  getTranslation,
}) => {
  const groupTypes = [
    { key: '', label: getTranslation('SelectType', 'Select Type') },
    { key: 'Friends', label: getTranslation('Friends', 'Friends') },
    { key: 'Family', label: getTranslation('Family', 'Family') },
    { key: 'Work', label: getTranslation('Work', 'Work') },
    { key: 'Hobby', label: getTranslation('Hobby', 'Hobby') },
    { key: 'Other', label: getTranslation('Others', 'Others') },
  ];

  const privacyOptions = [
    { key: '', label: getTranslation('Select', 'Select') },
    { key: 'Private', label: getTranslation('Private', 'Private') },
    { key: 'Public', label: getTranslation('Public', 'Public') },
  ];

  const genderOptions = [
    { key: 'All', label: getTranslation('All', 'All') },
    { key: 'Male', label: getTranslation('Male', 'Male') },
    { key: 'Female', label: getTranslation('Female', 'Female') },
    { key: 'Other', label: getTranslation('Other', 'Other') },
  ];

  const maxAgeValue =
    ageGroup.max && !Number.isNaN(Number(ageGroup.max))
      ? Number(ageGroup.max)
      : 40;

  if (!expanded) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        {getTranslation('GroupSettings', 'Group Settings')}
      </Text>

      {/* Group Type + Privacy row */}
      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.smallLabel}>
            {getTranslation('GroupType', 'Group Type')}
          </Text>
          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={groupType}
              style={styles.pickerNative}
              mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
              onValueChange={value => setGroupType(value)}
            >
              {groupTypes.map(option => (
                <Picker.Item
                  key={option.key}
                  label={option.label}
                  value={option.key}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.column}>
          <Text style={styles.smallLabel}>
            {getTranslation('Privacy', 'Privacy')}
          </Text>
          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={privacy}
              style={styles.pickerNative}
              mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
              onValueChange={value => setPrivacy(value)}
            >
              {privacyOptions.map(option => (
                <Picker.Item
                  key={option.key}
                  label={option.label}
                  value={option.key}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Age Group */}
      <Text style={styles.label}>
        {getTranslation('AgeGroup', 'Age Group')}
      </Text>
      <Text style={styles.ageRangeText}>
        {getTranslation('AgeRangeLabel', 'Age Range')}: 10 -{' '}
        {ageGroup.max || '__'} {getTranslation('years', 'years')}
      </Text>
      <View style={styles.sliderRow}>
        <Slider
          style={{ width: '100%', height: 30 }}
          minimumValue={10}
          maximumValue={80}
          step={1}
          minimumTrackTintColor="#028BD3"
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor="#028BD3"
          value={maxAgeValue}
          onValueChange={(value: number) =>
            setAgeGroup({
              min: '10',
              max: String(Math.round(value)),
            })
          }
        />
      </View>

      {/* Gender */}
      <Text style={styles.label}>
        {getTranslation('Gender', 'Gender')}
      </Text>
      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={gender}
          style={styles.pickerNative}
          mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
          onValueChange={value => setGender(value)}
        >
          {genderOptions.map(option => (
            <Picker.Item
              key={option.key}
              label={option.label}
              value={option.key}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};

export default GroupSettingsToggle;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 6,
    color: '#333',
  },
  smallLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    color: '#555',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CED4DA',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#028BD3',
    borderColor: '#028BD3',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#000',
  },
  ageSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#555',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#EDF1F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: '#000',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownIcon: {
    position: 'absolute',
    right: 12,
    top: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: '#999',
  },
  picker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  pickerNative: {
    width: '100%',
    color: '#000',
  },
  ageRangeText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  sliderRow: {
    marginBottom: 16,
    marginTop: 4,
  },
});

