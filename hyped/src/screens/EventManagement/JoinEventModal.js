import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
// import Checking from './Checking';
import { env } from '../../config/env';

const JoinEventModal = ({ visible, onClose, eventId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    company: '',
    designation: '',
    role: 'Participant',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const { uniqueId, photo } = useAppSelector(state => state.auth);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Mobile number must be 10 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        eventId,
        uniqueId,
        photo,
        ...formData,
      };

      const response = await axios.post(
        `${env.Market_Place_API_URL}event/join-request`,
        payload,
        { headers: { 'Content-Type': 'application/json' } },
      );

      if (response.status === 200 || response.status === 201) {
        onSuccess('Successfully joined the event!');
        onClose();
      }
    } catch (error) {
      console.error('Error joining event:', error);
      setErrors({
        submit: error.response?.data?.message || 'Failed to join event',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.modalTitle}>Join Event</Text>
              <TouchableOpacity onPress={onClose}>
                <Icon name="close" size={24} color="#212121" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Name"
                value={formData.name}
                onChangeText={text => handleInputChange('name', text)}
                onFocus={() => setActiveField('name')}
                useMultilingualKeyboard={false}
              />
              {/* <Checking
                onTranscription={text => handleInputChange('name', text)}
                isActive={activeField === 'name'}
              /> */}
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email"
                value={formData.email}
                onChangeText={text => handleInputChange('email', text)}
                keyboardType="email-address"
                onFocus={() => setActiveField('email')}
                useMultilingualKeyboard={false}
              />
              {/* <Checking
                onTranscription={text => handleInputChange('email', text)}
                isActive={activeField === 'email'}
              /> */}
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text
                style={[styles.input, errors.mobileNumber && styles.inputError]}
                placeholder="Mobile Number"
                value={formData.mobileNumber}
                onChangeText={text => handleInputChange('mobileNumber', text)}
                keyboardType="phone-pad"
                onFocus={() => setActiveField('mobileNumber')}
                useMultilingualKeyboard={false}
              />
              {/* <Checking
                onTranscription={text =>
                  handleInputChange('mobileNumber', text)
                }
                isActive={activeField === 'mobileNumber'}
              /> */}
              {errors.mobileNumber && (
                <Text style={styles.errorText}>
                  {errors.mobileNumber}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text
                style={styles.input}
                placeholder="Company"
                value={formData.company}
                onChangeText={text => handleInputChange('company', text)}
                onFocus={() => setActiveField('company')}
                useMultilingualKeyboard={false}
              />
              {/* <Checking
                onTranscription={text => handleInputChange('company', text)}
                isActive={activeField === 'company'}
              /> */}
            </View>

            <View style={styles.inputContainer}>
              <Text
                style={styles.input}
                placeholder="Designation"
                value={formData.designation}
                onChangeText={text => handleInputChange('designation', text)}
                onFocus={() => setActiveField('designation')}
                useMultilingualKeyboard={false}
              />
              {/* <Checking
                onTranscription={text => handleInputChange('designation', text)}
                isActive={activeField === 'designation'}
              /> */}
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => handleInputChange('role', 'Speaker')}>
                <Icon
                  name={
                    formData.role === 'Speaker' ? 'checkbox' : 'square-outline'
                  }
                  size={24}
                  color={formData.role === 'Speaker' ? '#41d1b2' : '#757575'}
                />
                <Text style={styles.checkboxText}>Speaker</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => handleInputChange('role', 'Participant')}>
                <Icon
                  name={
                    formData.role === 'Participant'
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={24}
                  color={
                    formData.role === 'Participant' ? '#41d1b2' : '#757575'
                  }
                />
                <Text style={styles.checkboxText}>Participant</Text>
              </TouchableOpacity>
            </View>

            {errors.submit && (
              <Text style={styles.errorText}>{errors.submit}</Text>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={styles.submitButton}>
                <LinearGradient
                  colors={['#6462AC', '#028BD3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradient}>
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Submitting...' : 'Submit'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#212121',
    paddingRight: 80, // Add space for the checking component
  },
  inputError: {
    borderColor: '#FF6F61',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  checkboxText: {
    fontSize: 14,
    color: '#212121',
    marginLeft: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6F61',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#212121',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

export default JoinEventModal;
