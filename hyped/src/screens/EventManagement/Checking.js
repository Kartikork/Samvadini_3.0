import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Alert,
  Dimensions,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  ScrollView,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
} from 'react-native-svg';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import VoiceToText from '../../helper/VoiceToText';
import {languages} from '../../helper/Helper';
import CustomText from '../../components/CustomText';
import LinearGradient from 'react-native-linear-gradient';

const audioRecorderPlayer = new AudioRecorderPlayer();
const {width: windowWidth, height: windowHeight} = Dimensions.get('window');

export default function Checking({
  onTranscription,
  lang = 'en',
  isActive = true,
  iconColor,
  showLanguageSelectionButton = true,
  enableModal = false,
  onKeyboardToggle,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [voiceTranslatedText, setVoiceTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(lang || 'en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [waveAnimations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);
  const micPulseAnimation = useRef(new Animated.Value(1)).current;
  const micBackgroundAnimation = useRef(new Animated.Value(0)).current;
  const recordingPathRef = useRef(null);

  useEffect(() => {
    if (!isActive && isRecording) {
      stopRecording();
    }
    if (!isActive && showKeyboard) {
      setShowKeyboard(false);
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      // Cleanup animation on unmount
      stopMicPulseAnimation();
    };
  }, []);

  const startWaveAnimation = () => {
    const animations = waveAnimations.map((anim, index) => {
      return Animated.sequence([
        Animated.delay(index * 400),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]);
    });
    Animated.parallel(animations).start();
  };

  const startMicPulseAnimation = () => {
    // Start scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(micPulseAnimation, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(micPulseAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Start background pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(micBackgroundAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(micBackgroundAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const stopMicPulseAnimation = () => {
    micPulseAnimation.stopAnimation();
    micBackgroundAnimation.stopAnimation();

    Animated.parallel([
      Animated.timing(micPulseAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(micBackgroundAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startRecording = async (source = 'inline') => {
    setVoiceTranslatedText('');
    if (!isActive) {
      console.log('Start recording blocked: Field is not active');
      return;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Microphone permission required');
        return;
      }

      const path = `${RNFS.DocumentDirectoryPath}/${Date.now()}.mp3`;
      recordingPathRef.current = path;
      setIsRecording(true);

      // Start microphone pulse animation
      startMicPulseAnimation();

      // Only show modal if enableModal is true and source is 'modal'
      if (enableModal && source === 'modal') {
        startWaveAnimation();
        setShowRecordingModal(true);
      }

      await audioRecorderPlayer.startRecorder(path);
    } catch (error) {
      console.error('Recording start error:', error);
      setIsRecording(false);
      setShowRecordingModal(false);
      stopMicPulseAnimation();
    }
  };

  const stopRecording = async () => {
    if (!isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      await audioRecorderPlayer.stopRecorder();
      setIsRecording(false);

      // Stop microphone pulse animation
      stopMicPulseAnimation();

      const audioBuffer = await RNFS.readFile(
        recordingPathRef.current,
        'base64',
      );
      const response = await VoiceToText(audioBuffer, selectedLanguage);

      if (response) {
        const cleanedText = response.transcription.replace(/[।.]/g, '');
        setVoiceTranslatedText(cleanedText);
        // If not in modal mode or modal is not enabled, directly call onTranscription
        if (!showRecordingModal || !enableModal) {
          onTranscription(cleanedText);
        }
      }
    } catch (error) {
      console.error('Recording stop error:', error);
    } finally {
      recordingPathRef.current = null;
    }
  };

  const toggleKeyboard = () => {
    if (!isActive) {
      return;
    }
    setShowKeyboard(prev => {
      console.log('Toggling keyboard:', !prev);
      return !prev;
    });
  };

  const handleMicPress = () => {
    if (isActive) {
      if (isRecording) {
        stopRecording();
      } else {
        setShowKeyboard(false); // Close virtual keyboard if open
        // Use modal only if enableModal is true
        if (enableModal) {
          startRecording('modal');
        } else {
          startRecording('inline');
        }
      }
    }
  };

  const handleKeyboardPress = () => {
    if (isActive) {
      if (onKeyboardToggle) {
        onKeyboardToggle();
      } else {
        toggleKeyboard();
      }
    }
  };

  const handleClose = () => {
    stopRecording();
    setShowRecordingModal(false);
    setVoiceTranslatedText('');
  };

  const handleSubmit = () => {
    if (voiceTranslatedText) {
      onTranscription(voiceTranslatedText);
      setVoiceTranslatedText('');
      setShowRecordingModal(false);
    }
  };

  const handleLanguageSelect = languageId => {
    setSelectedLanguage(languageId);
    setShowLanguageModal(false);
  };

  return (
    <>
      <View
        style={{
          position: 'absolute',
          flexDirection: 'row',
          right: '10',
          alignItems: 'center',
        }}>
        <TouchableOpacity onPress={handleKeyboardPress}>
          <Icon2
            name="keyboard-outline"
            size={26}
            color={isActive ? iconColor || '#555' : '#999'}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.micButton} onPress={handleMicPress}>
          {/* Background pulse effect when recording */}
          {isRecording && (
            <Animated.View
              style={[
                styles.micPulseBackground,
                {
                  opacity: micBackgroundAnimation,
                  transform: [
                    {
                      scale: micBackgroundAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          <Animated.View style={{transform: [{scale: micPulseAnimation}]}}>
            {isActive && !isRecording ? (
              <Svg height="24" width="24" viewBox="0 0 24 24">
                <Defs>
                  <SvgLinearGradient
                    id="micGradient"
                    x1="1"
                    y1="1"
                    x2=""
                    y2="0">
                    <Stop offset="30%" stopColor="#41b1b2" />
                    <Stop offset="100%" stopColor="#1e90ff" />
                  </SvgLinearGradient>
                </Defs>
                <Path
                  d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3s-3 1.34-3 3v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V22h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"
                  fill="url(#micGradient)"
                />
              </Svg>
            ) : (
              <Icon
                name={isRecording ? 'mic' : 'mic-none'}
                size={24}
                color={isActive ? (isRecording ? '#ff4444' : '#999') : '#999'}
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Voice Recording Modal - Only show if enableModal is true */}
      {enableModal && (
        <Modal
          visible={showRecordingModal}
          transparent={true}
          animationType="fade">
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.recordingModalContainer}>
                  {showLanguageSelectionButton && (
                    <TouchableOpacity
                      onPress={() => setShowLanguageModal(true)}
                      style={styles.languageSelector}>
                      <CustomText style={styles.languageSelectorText}>
                        {languages.find(l => l.id === selectedLanguage)?.name ||
                          'English'}
                      </CustomText>
                      <Icon2 name="chevron-down" size={18} color="#000" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}>
                    <Icon name="close" size={24} color="#555555" />
                  </TouchableOpacity>

                  <View style={styles.micContainer}>
                    {isRecording &&
                      waveAnimations.map((anim, index) => (
                        <Animated.View
                          key={index}
                          style={[
                            styles.wave,
                            {
                              transform: [
                                {
                                  scale: anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 2],
                                  }),
                                },
                              ],
                              opacity: anim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.8, 0.4, 0],
                              }),
                            },
                          ]}
                        />
                      ))}
                    <TouchableOpacity
                      style={styles.micIconWrapper}
                      onPress={
                        isRecording
                          ? stopRecording
                          : () => startRecording('modal')
                      }>
                      <Icon2 name="microphone" size={50} color="#01d5f5" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={
                      isRecording
                        ? stopRecording
                        : () => startRecording('modal')
                    }>
                    <CustomText style={styles.recordingStatus}>
                      {isRecording ? 'Tap to stop' : 'Tap to start'}
                    </CustomText>
                  </TouchableOpacity>

                  <CustomText style={styles.recordingText}>
                    {isRecording ? 'Listening...' : voiceTranslatedText}
                  </CustomText>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => Clipboard.setString(voiceTranslatedText)}>
                      <Icon name="content-copy" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSubmit}>
                      <LinearGradient
                        style={styles.submitButton}
                        colors={['#6462AC', '#028BD3']}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}>
                        <Icon name="check" size={22} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Language Selection Modal - Only show if enableModal is true */}
      {enableModal && (
        <Modal
          visible={showLanguageModal}
          transparent={true}
          animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <CustomText style={styles.modalTitle}>Select Language</CustomText>
              <ScrollView style={styles.languageList}>
                {languages.map(language => (
                  <TouchableOpacity
                    key={language.id}
                    style={[
                      styles.languageItem,
                      selectedLanguage === language.id &&
                        styles.selectedLanguageItem,
                    ]}
                    onPress={() => handleLanguageSelect(language.id)}>
                    <CustomText
                      style={[
                        styles.languageName,
                        selectedLanguage === language.id &&
                          styles.selectedLanguageText,
                      ]}>
                      {language.name}
                    </CustomText>
                    <CustomText
                      style={[
                        styles.englishName,
                        selectedLanguage === language.id &&
                          styles.selectedEnglishName,
                      ]}>
                      {language.englishName}
                    </CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <LinearGradient
                  style={styles.closeModalButton}
                  colors={['#6462AC', '#028BD3']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}>
                  <CustomText style={styles.closeButtonText}>Close</CustomText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 29,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0080ff',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  micButton: {
    padding: 8,
    borderColor: '#0080ff',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  micPulseBackground: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    backgroundColor: '#ff444420',
    borderRadius: 20,
    marginTop: -20,
    marginLeft: -20,
  },
  micGradient: {
    borderRadius: 20,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardContainer: {
    position: 'absolute',
    right: 15,
    top: 50,
    zIndex: 999999,
  },
  keyboardContainerStyle: {
    width: windowHeight * 0.33,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingModalContainer: {
    backgroundColor: '#fff',
    width: windowWidth * 0.8,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  languageSelector: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  languageSelectorText: {
    color: '#000',
    fontWeight: '600',
    marginRight: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  micContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: windowWidth * 0.35,
    height: windowWidth * 0.35,
    backgroundColor: 'transparent',
  },
  micIconWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 15,
    elevation: 5,
  },
  wave: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(1, 213, 245, 0.2)',
    alignSelf: 'center',
  },
  recordingStatus: {
    color: '#01d5f5',
    fontSize: 16,
    fontWeight: '600',
    // marginBottom: 10,
  },
  recordingText: {
    marginVertical: 15,
    width: '100%',
    color: '#0080ff',
    fontSize: 14,
    textAlign: 'center',
    minHeight: 40,
  },
  actionButtons: {
    flexDirection: 'row',
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  copyButton: {
    backgroundColor: '#999',
    padding: 8,
    borderRadius: 10,
  },
  submitButton: {
    borderRadius: 10,
    padding: 8,
  },

  // Language modal styles
  modalContent: {
    width: windowWidth * 0.8,
    maxHeight: windowHeight * 0.7,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  languageList: {
    maxHeight: windowHeight * 0.5,
  },
  languageItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedLanguageItem: {
    backgroundColor: '#f0f9ff',
  },
  languageName: {
    fontSize: 18,
    marginBottom: 2,
    color: '#333',
  },
  selectedLanguageText: {
    color: '#01d5f5',
    fontWeight: '600',
  },
  englishName: {
    fontSize: 14,
    color: '#666',
  },
  selectedEnglishName: {
    color: '#0080ff',
  },
  closeModalButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
