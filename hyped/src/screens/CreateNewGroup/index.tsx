import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import ImageCropPicker from 'react-native-image-crop-picker';
import BottomNavigation from '../../components/BottomNavigation';
import GroupSettingsToggle from './components/GroupSettingsToggle';
import { axiosConn } from '../../storage/helper/Config';
import { insertSingleChat } from '../../storage/sqllite/chat/ChatListSchema';
import { generateKeys } from '../../helper/Encryption';
import { getAppTranslations } from '../../translations';
import { useAppSelector } from '../../state/hooks';
import {
  getContacts,
  filterContacts,
  filterContactsByDemographics,
  separateContacts,
} from '../../utils/contacts';
import { getImageUrlWithSas } from '../../config/env';
import { activeChatActions } from '../../state/activeChatSlice';

interface AgeGroup {
  min: string;
  max: string;
}

interface RegisteredContact {
  uniqueId: string;
  name: string;
  phoneNumber: string | number;
  image?: { uri: string } | null;
}

export default function CreateNewGroup() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const lang = useAppSelector(state => state.language.lang);
  const currentUserId = useAppSelector(state => state.auth.uniqueId);
  const t = getAppTranslations(lang);

  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<RegisteredContact[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupType, setGroupType] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>({ min: '10', max: '40' });
  const [gender, setGender] = useState('All');
  const [privacy, setPrivacy] = useState('');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // 1: Settings, 2: Contacts

  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsSetupLoading, setContactsSetupLoading] = useState(false);

  const getTranslation = useCallback(
    (key: string, fallback?: string) =>
      ((t as any)?.[key] as string) || fallback || '',
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (currentStep === 2) {
          setCurrentStep(1);
          return true;
        }
        const state = navigation.getState();
        const currentRoute = state.routes[state.index]?.name;
        if (currentRoute === 'Dashboard') {
          Alert.alert(
            'Exit App',
            'Are you sure you want to exit?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'YES', onPress: () => BackHandler.exitApp() },
            ],
          );
          return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          }),
        );
        return true;
      };
      const sub = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => sub.remove();
    }, [navigation, currentStep]),
  );

  const handleContactsError = useCallback(() => {
    Alert.alert(
      getTranslation('Error', 'Error'),
      getTranslation('FailedToFetchContacts', 'Failed to fetch contacts'),
    );
  }, [getTranslation]);

  const loadContacts = useCallback(async () => {
    try {
      setContactsLoading(true);
      const list = await getContacts();
      setContacts(list || []);
      setContactsError(null);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContactsError('Failed to fetch contacts');
      handleContactsError();
    } finally {
      setContactsLoading(false);
    }
  }, [handleContactsError]);

  useEffect(() => {
    const setup = async () => {
      setContactsSetupLoading(true);
      await loadContacts();
      setContactsSetupLoading(false);
    };
    setup();
  }, [loadContacts]);

  const contactsOptions = useMemo(
    () => ({
      filterRegistered: true,
      includeImageObject: true,
    }),
    [],
  );

  const registeredContacts: RegisteredContact[] = useMemo(() => {
    const { contactsOnSamvadini } = separateContacts(contacts || []);
    return (contactsOnSamvadini || []).map((c: any) => ({
      uniqueId: c.ekatma_chinha,
      name: c.praman_patrika || '',
      phoneNumber: c.durasamparka_sankhya,
      image: c.parichayapatra
        ? { uri: getImageUrlWithSas(c.parichayapatra) || '' }
        : null,
    }));
  }, [contacts, contactsOptions]);

  const filteredContacts = useMemo(() => {
    let baseList = filterContacts(
      registeredContacts as any[],
      searchQuery,
      currentUserId,
    );

    const normalizedGender =
      gender && typeof gender === 'string'
        ? ['all', 'any'].includes(gender.toLowerCase().trim())
          ? null
          : gender
        : null;

    if ((ageGroup.min && ageGroup.max) || normalizedGender) {
      baseList = filterContactsByDemographics(baseList as any[], {
        vayahMin: ageGroup.min ? Number(ageGroup.min) : undefined,
        vayahMax: ageGroup.max ? Number(ageGroup.max) : undefined,
        gender: normalizedGender || undefined,
      });
    }

    return baseList as RegisteredContact[];
  }, [registeredContacts, searchQuery, currentUserId, ageGroup, gender]);

  const handleContactSelect = useCallback(
    (contactId: string) => {
      setSelectedContacts(prev => {
        const exists = prev.find(c => c.uniqueId === contactId);
        if (exists) {
          return prev.filter(c => c.uniqueId !== contactId);
        }
        const newContact = filteredContacts.find(c => c.uniqueId === contactId);
        return newContact ? [...prev, newContact] : prev;
      });
    },
    [filteredContacts],
  );

  const handleUserIconUpload = () => {
    Alert.alert(
      getTranslation('choosePhoto', 'Choose Photo'),
      getTranslation('selectPhoto', 'Select a photo'),
      [
        {
          text: getTranslation('takePhoto', 'Take Photo'),
          onPress: () => {
            ImageCropPicker.openCamera({
              width: 1200,
              height: 1200,
              cropping: true,
              cropperToolbarTitle: getTranslation('edit', 'Edit'),
              cropperCircleOverlay: false,
              freeStyleCropEnabled: true,
              mediaType: 'photo',
              aspectRatio: null as any,
              hideBottomControls: true,
              enableRotationGesture: true,
              showCropGuidelines: true,
            })
              .then(image => {
                setImageUrl(image.path);
                uploadImage(image.path);
              })
              .catch(error => {
                if (!error?.message?.includes('cancel')) {
                  console.error('Error taking photo:', error);
                  Alert.alert(
                    getTranslation('error', 'Error'),
                    getTranslation('failedTakePhoto', 'Failed to take photo'),
                  );
                }
              });
          },
        },
        {
          text: getTranslation('chooseFromGallery', 'Choose from gallery'),
          onPress: () => {
            ImageCropPicker.openPicker({
              width: 1200,
              height: 1200,
              cropping: true,
              cropperToolbarTitle: getTranslation('edit', 'Edit'),
              cropperCircleOverlay: false,
              freeStyleCropEnabled: true,
              mediaType: 'photo',
              aspectRatio: null as any,
              hideBottomControls: true,
              enableRotationGesture: true,
              showCropGuidelines: true,
            })
              .then(image => {
                setImageUrl(image.path);
                uploadImage(image.path);
              })
              .catch(error => {
                if (!error?.message?.includes('cancel')) {
                  console.error('Error picking image:', error);
                  Alert.alert(
                    getTranslation('error', 'Error'),
                    getTranslation(
                      'failedPickImage',
                      'Failed to pick image',
                    ),
                  );
                }
              });
          },
        },
        {
          text: getTranslation('cancel', 'Cancel'),
          style: 'cancel',
        },
      ],
    );
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', {
        // @ts-ignore - React Native FormData file type
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile-photo.jpg',
      });

      const response = await axiosConn('post', 'chat/upload-media', formData, {
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json',
      });

      const fileUrl = (response as any)?.data?.fileUrl;
      if (!fileUrl) {
        throw new Error('Invalid server response');
      }
      setPhoto(fileUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(
        getTranslation('error', 'Error'),
        getTranslation('failedUploadImage', 'Failed to upload image'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateSettings = () => {
    if (!groupName.trim()) {
      Alert.alert(
        'Missing Info',
        getTranslation('GroupNameCannotBeEmpty', 'Group name is required'),
      );
      return false;
    }

    if (!groupType) {
      Alert.alert('Missing Info', 'Please select a group type');
      return false;
    }

    if (!gender) {
      Alert.alert('Missing Info', 'Please select gender');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateSettings()) {
      setCurrentStep(2);
      setSearchQuery('');
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    setSelectedContacts([]);
  };

  const handleSubmit = async () => {
    const privacyKeys = await generateKeys(1);
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (selectedContacts.length < 1) {
        throw new Error(
          getTranslation(
            'PleaseSelectAtLeastOneContact',
            'Select at least one contact',
          ),
        );
      }

      const uniqueId = await AsyncStorage.getItem('uniqueId');
      if (!uniqueId) {
        throw new Error(
          getTranslation('UserIdNotFound', 'User ID not found'),
        );
      }

      const postData = {
        pathakah_chinha: uniqueId,
        samvada_nama: groupName,
        prakara: 'Group',
        bhagavah: selectedContacts.map(c => c.uniqueId),
        samuha_chitram: photo,
        vargah: groupType || 'Other',
        vayah_min: ageGroup.min ? Number(ageGroup.min) : null,
        vayah_max: ageGroup.max ? Number(ageGroup.max) : null,
        linga: gender || 'Any',
        guptata: privacy || 'Private',
        privacy_keys: privacyKeys,
        timeStamp: new Date().toISOString(),
      };

      const response = await axiosConn(
        'post',
        'chat/add-new-chat-request',
        postData,
      );

      if (response.status === 201 || response.status === 200) {
        const chatData = (response as any).data.data;
        const localdata = await insertSingleChat(chatData, false, uniqueId);

        dispatch(
          activeChatActions.setActiveChat({
            chatId: chatData._id,
            username: groupName,
            avatar: photo ?? null,
            isGroup: true,
          }),
        );

        navigation.navigate('GroupChat', {
          chatId: chatData._id,
          groupName: groupName,
        });

        const notificationPromises = selectedContacts.map(contact =>
          axiosConn('post', 'chat/send-notification', {
            ekatma_chinha: contact.uniqueId,
            phone_no: groupName,
            title: groupName,
            body: `Request to Join Group: ${groupName}`,
            datatype: 'text',
            message_id: '1',
            chatId: localdata.samvada_chinha_id,
          }).catch(err => {
            console.warn(`Failed to notify ${contact.name}`, err);
            return null;
          }),
        );
        await Promise.all(notificationPromises);
      }
    } catch (error) {
      console.error('Group creation error:', error);
      Alert.alert(
        getTranslation('Error', 'Error'),
        getTranslation('PleaseTryAgainLater', 'Please try again later.'),
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView>
          <View style={styles.container}>
            {currentStep === 1 ? (
              <>
                <View style={styles.image}>
                  <View
                    style={{
                      position: 'relative',
                      maxWidth: 100,
                      justifyContent: 'center',
                    }}
                  >
                    <Image
                      source={
                        imageUrl
                          ? { uri: imageUrl }
                          : { uri: imageUrl }
                      }
                      style={styles.userIcon}
                    />
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={handleUserIconUpload}
                      accessibilityLabel={getTranslation(
                        'UploadGroupIcon',
                        'Upload group icon',
                      )}
                    >
                      <Icon name="camera-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.centergrouptitle}>
                  <View style={styles.grouptitle}>
                    <TextInput
                      key={Object.keys(t || {}).length}
                      placeholder={getTranslation('GroupName', 'Group Name')}
                      value={groupName}
                      onChangeText={setGroupName}
                      style={styles.groupname}
                      accessibilityLabel={getTranslation(
                        'GroupName',
                        'Group Name',
                      )}
                      placeholderTextColor="#666"
                    />
                    {groupName.length > 0 && (
                      <TouchableOpacity
                        style={styles.closeIcon}
                        onPress={() => setGroupName('')}
                      >
                        <Icon
                          name="close-circle"
                          size={22}
                          color="#cb0707ff"
                          style={{ marginLeft: 5 }}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={{ marginTop: 20 }} />

                {isLoading && (
                  <ActivityIndicator size="large" color="#0000ff" />
                )}

                <GroupSettingsToggle
                  expanded={true}
                  onToggle={() => {}}
                  groupType={groupType}
                  setGroupType={setGroupType}
                  privacy={privacy}
                  setPrivacy={setPrivacy}
                  ageGroup={ageGroup}
                  setAgeGroup={setAgeGroup}
                  gender={gender}
                  setGender={setGender}
                  getTranslation={getTranslation}
                />
              </>
            ) : (
              <>
                <View style={styles.stepIndicator}>
                  <Text style={styles.stepText}>
                    {selectedContacts.length}{' '}
                    {getTranslation('Contacts', 'Contacts')}{' '}
                    {getTranslation('Selected', 'Selected')}
                  </Text>
                </View>

                <View style={styles.searchContainer}>
                  <Icon
                    name="magnify"
                    size={20}
                    color="#666"
                    style={styles.searchIcon}
                  />
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <TextInput
                      placeholder={
                        getTranslation('contactSearch') || 'Search contacts...'
                      }
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      style={[styles.searchInput, { flex: 1 }]}
                      clearButtonMode="while-editing"
                      placeholderTextColor="#666"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon
                          name="close-circle"
                          size={20}
                          color="#999"
                          style={{ marginLeft: 5 }}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <Text style={styles.sectionHeader}>
                  {getTranslation('RegisteredContacts', 'Registered Contacts')}{' '}
                  ({filteredContacts.length})
                </Text>

                {contactsSetupLoading || contactsLoading ? (
                  <ActivityIndicator size="large" color="#0000ff" />
                ) : (
                  <FlatList
                    data={filteredContacts}
                    keyExtractor={item => item.uniqueId}
                    renderItem={({ item }) => {
                      const selected = selectedContacts.some(
                        c => c.uniqueId === item.uniqueId,
                      );
                      return (
                        <TouchableOpacity
                          style={[
                            styles.contact,
                            selected && styles.selectedContact,
                          ]}
                          onPress={() => handleContactSelect(item.uniqueId)}
                          accessibilityLabel={`${getTranslation(
                            'SelectContact',
                            'Select contact',
                          )} ${item.name}`}
                        >
                          {item.image && item.image.uri ? (
                            <View>
                              <Image
                                source={{ uri: item.image.uri }}
                                style={styles.contactImage}
                              />
                              {selected && (
                                <Icon
                                  name="check-circle"
                                  size={20}
                                  color="#0080ff"
                                  style={styles.checkIcon}
                                />
                              )}
                            </View>
                          ) : (
                            <View>
                              <Text style={styles.avatarText}>
                                {item.name ? item.name[0] : '?'}
                              </Text>
                              {selected && (
                                <Icon
                                  name="check-circle"
                                  size={20}
                                  color="#0080ff"
                                  style={styles.checkIcon}
                                />
                              )}
                            </View>
                          )}
                          <View>
                            <Text style={styles.contactName}>
                              {item.name.length > 24
                                ? `${item.name.slice(0, 24)}...`
                                : item.name}
                            </Text>
                            <Text style={styles.lastMessage}>
                              {item.phoneNumber}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    onEndReachedThreshold={0.5}
                  />
                )}
              </>
            )}
          </View>
        </ScrollView>

        {currentStep === 1 ? (
          <TouchableOpacity
            onPress={handleNext}
            style={styles.createGroupContainer}
          >
            <LinearGradient
              colors={['#6462AC', '#028BD3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createGroup}
            >
              <Icon name="arrow-right" size={30} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || selectedContacts.length === 0}
            style={[
              styles.createGroupContainer,
              (isSubmitting || selectedContacts.length === 0) &&
                styles.disabledButton,
            ]}
            accessibilityLabel={getTranslation('CreateGroup', 'Create Group')}
          >
            <LinearGradient
              colors={
                isSubmitting || selectedContacts.length === 0
                  ? ['#ccc', '#999']
                  : ['#6462AC', '#028BD3']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createGroup}
            >
              <Icon name="check-circle" size={30} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <BottomNavigation navigation={navigation} activeScreen="CreateNewGroup" />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
    paddingBottom: 80,
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    backgroundColor: '#999',
    width: 40,
    height: 40,
    borderRadius: 20,
    textAlign: 'center',
    lineHeight: 40,
    marginRight: 10,
  },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: '#EDF1F7',
    paddingVertical: 7,
    marginVertical: 10,
    height: 40,
    width: '100%',
    fontSize: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  closeIcon: {
    position: 'absolute',
    right: 10,
    top: 14,
  },
  groupname: {
    width: '100%',
    height: 50,
    fontSize: 16,
    color: '#000',
    textAlign: 'left',
    paddingHorizontal: 10,
    paddingRight: 35,
  },
  grouptitle: {
    borderWidth: 1,
    borderColor: '#EDF1F7',
    borderRadius: 8,
    marginHorizontal: 10,
    flex: 1,
  },
  centergrouptitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    marginVertical: 10,
    color: '#333',
  },
  contact: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 999,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#000',
  },
  selectedContact: {
    backgroundColor: '#f0faff',
  },
  createGroupContainer: {
    position: 'absolute',
    right: 10,
    // bottom: hp('13'),
    borderRadius: 8,
  },
  createGroup: {
    borderRadius: 8,
    padding: 10,
    width: 60,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    position: 'absolute',
    right: -10,
    top: 50,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0080ff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  contactImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  image: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  checkIcon: {
    position: 'absolute',
    left: 28,
    top: 22,
  },
  contactName: {
    fontSize: 18,
    color: '#333',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  sectionHeader: {
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  stepIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stepText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});

