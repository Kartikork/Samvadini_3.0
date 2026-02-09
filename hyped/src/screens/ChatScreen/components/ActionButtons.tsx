import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';


interface ActionButtonsProps {
  onClose: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onClose }) => {
  const navigation = useNavigation<any>();

  const handleSimpleAction = (label: string) => {
    // Placeholder for future media/location/contact handling
    // Keeps current integration focused on opening the section
    console.log(`[ActionButtons] ${label} pressed`);
    onClose();
  };

  const handleEventsPress = () => {
    // This route already exists in Dashboard navigation
    try {
      // @ts-ignore – route is defined in app navigator
      navigation.navigate('DailyPlanner');
    } catch (e) {
      console.warn('[ActionButtons] Failed to navigate to DailyPlanner', e);
    } finally {
      onClose();
    }
  };
  const handleLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        console.log('Location:', position.coords);
        onClose();
      },
      error => console.warn(error),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };
  
  const handleCamera = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      console.warn(result.errorMessage);
      return;
    }

    console.log('Camera asset:', result.assets);
    onClose();
  };

  const handleGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      console.warn(result.errorMessage);
      return;
    }

    console.log('Gallery asset:', result.assets);
    onClose();
  };

  return (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleSimpleAction('Location')}
      >
        <View style={styles.actionButtonone}>
          <Ionicons name="location-outline" size={24} color="#ffffff" />
        </View>
        <Text style={styles.actionButtonText}>Location</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleCamera}>
        <View style={styles.actionButtontwo}>
          <Ionicons name="camera-outline" size={24} color="#ffffff" />
        </View>
        <Text style={styles.actionButtonText}>Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleDocuments}>
        <View style={styles.actionButtonthree}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={24}
            color="#ffffff"
          />
        </View>
        <Text style={styles.actionButtonText}>Documents</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleGallery}>  
        <View style={styles.actionButtonfour}>
          <Ionicons name="image-outline" size={24} color="#ffffff" />
        </View>
        <Text style={styles.actionButtonText}>Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleSimpleAction('Contact')}
      >
        <View style={styles.actionButtonSix}>
          <Ionicons name="person-add-outline" size={24} color="#ffffff" />
        </View>
        <Text style={styles.actionButtonText}>Contact</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleSimpleAction('Audio')}
      >
        <View style={styles.actionButtonSeven}>
          <Ionicons name="headset-outline" size={24} color="#ffffff" />
        </View>
        <Text style={styles.actionButtonText}>Audio</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleEventsPress}
      >
        <View style={styles.actionButtonNine}>
          <Ionicons name="calendar-outline" size={24} color="#ffffff" />
        </View>
        <Text style={styles.actionButtonText}>Events</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtonsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
    marginTop: 4,
  },
  actionButton: {
    alignItems: 'center',
    marginVertical: 10,
    width: '30%',
  },
  actionButtonone: {
    backgroundColor: '#9d8cff',
    borderRadius: 10,
    padding: 8,
  },
  actionButtontwo: {
    backgroundColor: '#93ff81',
    borderRadius: 10,
    padding: 8,
  },
  actionButtonthree: {
    backgroundColor: '#ffe478',
    borderRadius: 10,
    padding: 8,
  },
  actionButtonfour: {
    backgroundColor: '#ff73ea',
    borderRadius: 10,
    padding: 8,
  },
  actionButtonSix: {
    backgroundColor: '#ff5f5f',
    borderRadius: 10,
    padding: 8,
  },
  actionButtonSeven: {
    backgroundColor: '#5fa7ff',
    borderRadius: 10,
    padding: 8,
  },
  actionButtonNine: {
    backgroundColor: '#5fe4ff',
    borderRadius: 10,
    padding: 8,
  },
  actionButtonText: {
    color: '#075E54',
    fontSize: 12,
    marginTop: 5,
  },
});

export default ActionButtons;

