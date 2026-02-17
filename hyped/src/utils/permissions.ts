import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';
import Geolocation from 'react-native-geolocation-service';

const ANDROID_API_LEVEL_33 = 33;

function getAndroidApiLevel(): number {
  if (Platform.OS !== 'android') return 0;
  const v = Platform.Version;
  return typeof v === 'number' ? v : Number(v) || 0;
}

export const requestMicrophonePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: Permission is requested automatically when accessing microphone
  return true;
};

export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: Permission is requested automatically when accessing camera
  return true;
};

/** Request photo library / gallery permission. On Android 13+ uses READ_MEDIA_IMAGES; otherwise READ_EXTERNAL_STORAGE. */
export const requestPhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const apiLevel = getAndroidApiLevel();
    const permission =
      apiLevel >= ANDROID_API_LEVEL_33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: Permission is requested automatically when accessing photo library
  return true;
};

/** Request contacts permission for both Android and iOS */
export const requestContactsPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    // iOS
    const permission = await Contacts.requestPermission();
    return permission === 'authorized';
  }
};

/** Check then request; returns true only if permission is granted. */
export const ensureCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (granted) return true;
    return requestCameraPermission();
  }
  // iOS: Permission is requested automatically when accessing camera
  return true;
};

/** Check then request; returns true only if permission is granted. */
export const ensurePhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const apiLevel = getAndroidApiLevel();
    const permission =
      apiLevel >= ANDROID_API_LEVEL_33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const granted = await PermissionsAndroid.check(permission);
    if (granted) return true;
    return requestPhotoLibraryPermission();
  }
  // iOS: Permission is requested automatically when accessing photo library
  return true;
};

/** Request storage/document access. Android ≤32: READ_EXTERNAL_STORAGE; Android 13+: READ_MEDIA_IMAGES so user is asked. */
export const requestDocumentPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const apiLevel = getAndroidApiLevel();
    const permission =
      apiLevel >= ANDROID_API_LEVEL_33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: Permission is requested automatically when accessing documents
  return true;
};

/** Check then request document access; asks for permission on all Android versions. */
export const ensureDocumentPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const apiLevel = getAndroidApiLevel();
    const permission =
      apiLevel >= ANDROID_API_LEVEL_33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const granted = await PermissionsAndroid.check(permission);
    if (granted) return true;
    return requestDocumentPermission();
  }
  // iOS: Permission is requested automatically when accessing documents
  return true;
};

/** Check then request; returns true only if microphone permission is granted. */
export const ensureAudioPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (granted) return true;
    return requestMicrophonePermission();
  }
  // iOS: Permission is requested automatically when accessing microphone
  return true;
};

/** Request fine location permission for both Android and iOS */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    // iOS: Request location permission using geolocation service
    try {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    } catch (error) {
      console.warn('[Permissions] Location permission error:', error);
      return false;
    }
  }
};

/** Check then request; returns true only if location permission is granted. */
export const ensureLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (granted) return true;
    return requestLocationPermission();
  } else {
    // iOS: Check and request if needed
    return requestLocationPermission();
  }
};

/** Check contacts permission status */
export const checkContactsPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
  } else {
    const permission = await Contacts.checkPermission();
    return permission === 'authorized';
  }
};

/** Ensure contacts permission is granted */
export const ensureContactsPermission = async (): Promise<boolean> => {
  const hasPermission = await checkContactsPermission();
  if (hasPermission) return true;
  return requestContactsPermission();
};

/** Show permission denied alert with CTA to open app permission settings. */
export function showPermissionDeniedWithSettings(
  title: string,
  message: string,
  openSettingsLabel: string = 'Open Settings'
): void {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: openSettingsLabel, onPress: () => Linking.openSettings() },
  ]);
}
