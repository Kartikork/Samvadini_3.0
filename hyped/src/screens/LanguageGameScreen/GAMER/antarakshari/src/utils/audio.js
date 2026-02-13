// client/src/utils/audio.js
import AudioRecorderPlayer from 'react-native-audio-recorder-player'; // Corrected package name
import { Platform } from 'react-native';
import { request, PERMISSIONS } from 'react-native-permissions';
import Sound from 'react-native-sound';
import RNFS from 'react-native-fs'; // Import react-native-fs for proper path management
import { Buffer } from 'buffer'; // Required for base64 handling in React Native

// Polyfill Buffer for React Native if it's not already
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

const audioRecorderPlayer = new AudioRecorderPlayer();

export const requestAudioPermissions = async () => {
  let allPermissionsGranted = true;

  if (Platform.OS === 'android') {
    // For Android, when saving to app-specific cache (RNFS.CachesDirectoryPath),
    // only the RECORD_AUDIO permission is typically required.
    // WRITE_EXTERNAL_STORAGE and READ_EXTERNAL_STORAGE are not needed for this.
    const micGranted = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
    if (micGranted !== 'granted') {
      console.error('Android RECORD_AUDIO permission denied.');
      allPermissionsGranted = false;
    }
    return allPermissionsGranted;

  } else if (Platform.OS === 'ios') {
    // For iOS, only the MICROPHONE permission is needed for recording.
    const granted = await request(PERMISSIONS.IOS.MICROPHONE);
    if (granted !== 'granted') {
      console.error('iOS Microphone permission denied');
      allPermissionsGranted = false;
    }
    return allPermissionsGranted;
  }
  return false; // Should not reach here
};

export const startRecording = async () => {
  try {
    // Determine the path for recording based on the platform.
    // Using RNFS.DocumentDirectoryPath for iOS and RNFS.CachesDirectoryPath for Android
    // ensures you're writing to app-specific, private storage locations.
    // These do NOT require explicit WRITE_EXTERNAL_STORAGE permissions on Android 10+
    // and are generally more reliable.
    const path = Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/antakshari_audio.m4a`, // iOS typically records to M4A
      android: `${RNFS.CachesDirectoryPath}/antakshari_audio.mp4`, // Android often uses MP4 or 3GP
    });

    console.log('Attempting to record to path:', path);

    // Ensure the directory for the file exists.
    // RNFS.DocumentDirectoryPath and RNFS.CachesDirectoryPath usually exist,
    // but this adds an extra layer of robustness.
    const directory = path.substring(0, path.lastIndexOf('/'));
    if (!(await RNFS.exists(directory))) {
      await RNFS.mkdir(directory);
      console.log('Created recording directory:', directory);
    }

    const result = await audioRecorderPlayer.startRecorder(path);
    audioRecorderPlayer.addRecordBackListener((e) => {
      // You can get audio levels or time here for UI updates
      // e.g., for showing a waveform or a timer.
      // console.log('Recording data:', e.currentPosition, e.currentDevice, e.currentMetering);
    });
    console.log('Recording started:', result);
    return result; // result contains the URI of the recorded file
  } catch (error) {
    console.error('Failed to start recording:', error);
    return null;
  }
};

export const stopRecording = async () => {
  try {
    const result = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener(); // Important to clean up listeners
    console.log('Recording stopped:', result);
    return result; // result contains URI of the recorded file
  } catch (error) {
    console.error('Failed to stop recording:', error);
    return null;
  }
};

export const playAudio = async (audioPath, onEndCallback) => {
  try {
    if (!audioPath) {
      console.warn('No audio path provided for playback.');
      return;
    }

    // For base64 audio received from the server, you'll need to write it to a temporary file
    // before `react-native-sound` can play it.
    let playablePath = audioPath;
    if (audioPath.startsWith('data:')) {
      // Assuming it's a base64 string
      const base64Data = audioPath.split(',')[1];
      const tempFileName = `temp_playback_${Date.now()}.mp3`; // Or .m4a based on content
      playablePath = `${RNFS.CachesDirectoryPath}/${tempFileName}`;

      await RNFS.writeFile(playablePath, base64Data, 'base64');
      console.log('Base64 audio written to temp file:', playablePath);
    }

    const sound = new Sound(playablePath, '', (error) => {
      if (error) {
        console.error('Failed to load the sound:', error);
        // Clean up temp file if it was created for base64
        if (audioPath.startsWith('data:')) RNFS.unlink(playablePath).catch(err => console.error('Error deleting temp file:', err));
        return;
      }
      // loaded successfully
      console.log('Duration in seconds: ' + sound.getDuration() + ' | Number of channels: ' + sound.getNumberOfChannels());

      sound.play((success) => {
        if (success) {
          console.log('Successfully finished playing');
        } else {
          console.log('Playback failed due to audio decoding errors');
        }
        sound.release(); // Release the sound object after playing
        // Clean up temp file if it was created for base64
        if (audioPath.startsWith('data:')) RNFS.unlink(playablePath).catch(err => console.error('Error deleting temp file:', err));
        if (onEndCallback) onEndCallback();
      });
    });
  } catch (error) {
    console.error('Error playing audio:', error);
  }
};

// Function to convert audio file to base64
// client/src/utils/audio.js

export const audioFileToBase64 = async (filePath) => {
  try {
    let cleanPath = filePath;

    // Clean up the path for Android
    if (Platform.OS === 'android' && cleanPath.startsWith('file://')) {
      cleanPath = cleanPath.replace('file://', '');
    }

    // Ensure RNFS.readFile is used to read the local file
    const base64 = await RNFS.readFile(cleanPath, 'base64');
    
    // Determine MIME type based on platform/file extension for consistency
    const mimeType = Platform.select({
      ios: 'audio/m4a',
      android: 'audio/mp4', 
    });
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting audio to base64:', error);
    return null;
  }
};