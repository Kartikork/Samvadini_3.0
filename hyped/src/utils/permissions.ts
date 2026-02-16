import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

const ANDROID_API_LEVEL_33 = 33;

function getAndroidApiLevel(): number {
  if (Platform.OS !== 'android') return 0;
  const v = Platform.Version;
  return typeof v === 'number' ? v : Number(v) || 0;
}

export const requestMicrophonePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/** Request photo library / gallery permission. On Android 13+ uses READ_MEDIA_IMAGES; otherwise READ_EXTERNAL_STORAGE. */
export const requestPhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const apiLevel = getAndroidApiLevel();
  const permission =
    apiLevel >= ANDROID_API_LEVEL_33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/** Check then request; returns true only if permission is granted. */
export const ensureCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (granted) return true;
  return requestCameraPermission();
};

/** Check then request; returns true only if permission is granted. */
export const ensurePhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const apiLevel = getAndroidApiLevel();
  const permission =
    apiLevel >= ANDROID_API_LEVEL_33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const granted = await PermissionsAndroid.check(permission);
  if (granted) return true;
  return requestPhotoLibraryPermission();
};
/** Request storage/document access. Android ≤32: READ_EXTERNAL_STORAGE; Android 13+: READ_MEDIA_IMAGES so user is asked. */
export const requestDocumentPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const apiLevel = getAndroidApiLevel();
  const permission =
    apiLevel >= ANDROID_API_LEVEL_33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/** Check then request document access; asks for permission on all Android versions. */
export const ensureDocumentPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const apiLevel = getAndroidApiLevel();
  const permission =
    apiLevel >= ANDROID_API_LEVEL_33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const granted = await PermissionsAndroid.check(permission);
  if (granted) return true;
  return requestDocumentPermission();
};

/** Check then request; returns true only if microphone permission is granted. */
export const ensureAudioPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (granted) return true;
  return requestMicrophonePermission();
};

/** Request fine location permission. */
const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/** Check then request; returns true only if location permission is granted. */
export const ensureLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  if (granted) return true;
  return requestLocationPermission();
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
