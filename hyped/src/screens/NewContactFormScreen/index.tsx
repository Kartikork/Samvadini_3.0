/**
 * NewContactFormScreen
 * Add new contact – save to app DB and optionally to device contacts.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  BackHandler,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Contacts from 'react-native-contacts';
import { PermissionsAndroid } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppSelector } from '../../state/hooks';
import { getAppTranslations } from '../../translations';
import { COUNTRIES } from '../../components/shared/CountryPicker';
import { insertSyncContact } from '../../storage/sqllite/authentication/UsersContactsList';
import { syncContacts } from '../../utils/contacts';

const NewContactFormScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');

  const navigation = useNavigation<any>();
  const lang = useAppSelector(state => state.language.lang);
  const t = getAppTranslations(lang);

  const selectedCountry =
    COUNTRIES.find(c => c.dialCode === countryCode) ||
    COUNTRIES.find(c => c.dialCode === '+91')!;

  const handleSave = async () => {
    try {
      if (!firstName && !lastName) {
        Toast.show({
          type: 'error',
          text1: t?.NameRequired ?? 'Name required',
          text2: t?.nameRequiredHint ?? 'Please enter at least a first or last name.',
        });
        return;
      }
      if (!phoneNumber) {
        Toast.show({
          type: 'error',
          text1: t?.PhoneRequired ?? 'Phone required',
          text2: t?.phoneRequiredHint ?? 'Please enter a phone number.',
        });
        return;
      }

      const name = `${firstName} ${lastName}`.trim();
      const contact = {
        name,
        countryCode: countryCode || '+91',
        phoneNumber: phoneNumber.replace(/\D/g, '').slice(-10),
        parichayapatra: '',
        ekatma_chinha: '',
        uid: null,
        isRegistered: false,
        chatId: null,
        janma_tithi: null,
        linga: gender || null,
        upayogakarta_nama: email || null,
      };

      await insertSyncContact([contact]);

      let hasPermission = true;
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS,
          {
            title: t?.contactsPermissionTitle ?? 'Contacts Permission',
            message:
              t?.contactspermRequire ??
              'This app needs access to your contacts to save new contacts.',
            buttonPositive: 'OK',
          },
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (hasPermission) {
        const newContact: any = {
          givenName: firstName || name,
          familyName: lastName || '',
          phoneNumbers: [{ label: 'mobile', number: `${countryCode}${phoneNumber.replace(/\D/g, '')}` }],
        };
        if (email) {
          newContact.emailAddresses = [{ label: 'work', email }];
        }
        try {
          await Contacts.addContact(newContact);
          await syncContacts(300);
        } catch (err) {
          Toast.show({
            type: 'error',
            text1: t?.Phone ?? 'Phone Book',
            text2: t?.unableSave ?? 'Could not save to phone book.',
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: t?.PermissionDenied ?? 'Permission Denied',
          text2: t?.unableSave ?? 'Cannot save to phone book without permission.',
        });
      }

      Toast.show({
        type: 'success',  
        text1: t?.ContactAdded ?? 'Contact Added',
        text2: t?.contactSave ?? 'Contact saved successfully.',
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t?.Error ?? 'Error',
        text2: t?.failtoSave ?? 'Failed to save contact.',
      });
      console.error('Error saving contact:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>{t?.AddNewContact ?? 'Add new Contact'}</Text>

      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#808080"
          placeholder={t?.firstName ?? 'First Name'}
          value={firstName}
          onChangeText={setFirstName}
        />
      </View>
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#808080"
          placeholder={t?.lastName ?? 'Last Name'}
          value={lastName}
          onChangeText={setLastName}
        />
      </View>
      <View style={styles.inputGroup}>
        <View style={styles.countryPickerContainer}>
          <Text style={styles.selectedDisplay}>
            {selectedCountry.code} ({selectedCountry.dialCode})
          </Text>
          <Picker
            selectedValue={countryCode}
            style={styles.countryCodePicker}
            onValueChange={v => setCountryCode(v)}
          >
            {COUNTRIES.map(country => (
              <Picker.Item
                key={country.code}
                label={`${country.name} (${country.dialCode})`}
                value={country.dialCode}
              />
            ))}
          </Picker>
        </View>
        <TextInput
          style={styles.phoneNumberInput}
          placeholderTextColor="#808080"
          placeholder={t?.PhoneNumber ?? t?.Phonenumber ?? 'Phone Number'}
          value={phoneNumber}
          onChangeText={text =>
            setPhoneNumber(text.replace(/[^0-9]/g, '').slice(0, 10))
          }
          keyboardType="phone-pad"
          maxLength={10}
        />
      </View>
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#808080"
          placeholder={t?.email ?? 'Email'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      </View>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={category}
          onValueChange={setCategory}
          style={styles.picker}
          itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : undefined}
          dropdownIconColor="#666"
        >
          <Picker.Item label="Select Type" value="" />
          <Picker.Item label="Friends" value="Friends" />
          <Picker.Item label="Family" value="Family" />
          <Picker.Item label="Work" value="Work" />
          <Picker.Item label="Entertainment" value="Entertainment" />
          <Picker.Item label="Sports" value="Sports" />
          <Picker.Item label="Hobby" value="Hobby" />
          <Picker.Item label="Fan Base" value="Fan Base" />
          <Picker.Item label="Spiritual" value="Spiritual" />
          <Picker.Item label="Secretive" value="Secretive" />
          <Picker.Item label="Yoga" value="Yoga" />
          <Picker.Item label="Others" value="Others" />
        </Picker>
      </View>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={gender}
          onValueChange={setGender}
          style={styles.picker}
          dropdownIconColor="#666"
        >
          <Picker.Item label="Select Gender" value="" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>

      <TouchableOpacity onPress={handleSave}>
        <LinearGradient
          colors={['#6462AC', '#028BD3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>{t?.save ?? 'Save'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default NewContactFormScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  heading: {
    fontSize: 22,
    color: '#000',
    marginBottom: 10,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 5,
  },
  input: {
    paddingLeft: 10,
    flex: 1,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 15,
    padding: 18,
  },
  countryPickerContainer: {
    width: 140,
    marginRight: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 15,
    paddingLeft: 10,
  },
  selectedDisplay: {
    fontSize: 14,
    color: '#868585',
    paddingVertical: 15,
  },
  countryCodePicker: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    lineHeight: 30,
    minHeight: 50,
  },
  phoneNumberInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 15,
    lineHeight: 25,
    paddingVertical: 18,
    minHeight: 55,
    paddingLeft: 12,
  },
  saveButton: {
    marginTop: 15,
    borderRadius: 30,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e7e7e7',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    minHeight: 40,
    marginBottom: 20,
  },
  picker: {
    fontSize: 11,
    lineHeight: 25,
    color: '#959393',
  },
  pickerItemIOS: {
    fontSize: 14,
  },
});
