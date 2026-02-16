import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  VirtualizedList,
  Image,
  Share,
  Linking,
  Platform,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import {
  getContacts,
  filterContacts,
  separateContacts,
  syncContacts,
} from '../../utils/contacts';
import { getImageUrlWithSas } from '../../config/env';
import { getAppTranslations } from '../../translations';
import { useAppSelector } from '../../state/hooks';
import { SearchBar as ChatListSearchBar } from '../ChatListScreen/components/SearchBar';
import useHardwareBackHandler from '../../helper/UseHardwareBackHandler';
import {
  createSelfChat,
  createNewChat,
} from '../../helper/ChatInitiateHelper.js';
const SearchBarWrapper = ({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) => {
  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <ChatListSearchBar
      value={value}
      onChangeText={onChangeText}
      onClear={handleClear}
      placeholder={placeholder}
    />
  );
};

const ContactDesignScreen = () => {
  const navigation = useNavigation();
  useHardwareBackHandler('ChatList');
  const lang = useAppSelector(state => state.language.lang);
  const uniqueId = useAppSelector(state => state.auth.uniqueId);
  const t = getAppTranslations(lang);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [isButtonDisabled, setButtonDisabled] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const list = await getContacts();
      setContacts(list || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load contacts.',
      });
    }
  }, [
    uniqueId,
    navigation,
    isButtonDisabled,
    setButtonDisabled,
    setGlobalLoading,
  ]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncContacts(300, loadContacts);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Contacts synced successfully!',
      });
    } catch (error) {
      console.error('Error syncing contacts:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to sync contacts',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [loadContacts]);

  const filteredContacts = useMemo(
    () => filterContacts(contacts || [], searchQuery, uniqueId ?? undefined),
    [contacts, searchQuery, uniqueId],
  );

  const { contactsOnSamvadini, contactsToInvite } = useMemo(
    () => separateContacts(filteredContacts || []),
    [filteredContacts],
  );

  const handleInviteShare = useCallback(async () => {
    try {
      const defaultMessage =
        "Dear Friend, you're invited to join me on Made in India - Hyped Samvadini, a super global app for secure and multilingual communication.\n\nDiscover amazing features and connect with friends.\n\nDownload now -- Android: https://hyped.aicte-india.org/ad.html\n\niOS: https://hyped.aicte-india.org/ios.html";

      const message = (t as any)?.shareInviteMessage || defaultMessage;

      await Share.share({
        title: (t as any)?.InviteSamvadini || 'Invite to Hyped',
        message,
      });
    } catch (error) {
      console.error('Error sharing invite:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Unable to open share options right now.',
      });
    }
  }, [t]);

  const renderContactOnSamvadini = useCallback((contact: any) => {
    return (
      <ContactCard
        key={contact.ekatma_chinha || contact.durasamparka_sankhya}
        contact={contact}
        uniqueId={uniqueId}
        navigation={navigation}
        isButtonDisabled={isButtonDisabled}
        setButtonDisabled={setButtonDisabled}
        setGlobalLoading={setGlobalLoading}
      />
    );
  }, []);

  const renderContactToInvite = useCallback(
    (contact: any) => {
      const displayName = (contact.praman_patrika || '')
        .replace(/\n/g, '')
        .trim();

      return (
        <View style={styles.inviteItem}>
          <Text style={styles.inviteName}>
            {contact.praman_patrika?.length > 15
              ? contact.praman_patrika.substring(0, 15) + '...'
              : contact.praman_patrika}
          </Text>
          <View style={styles.inviteActions}>
            <TouchableOpacity
              style={[
                styles.inviteButtonContainer,
                contact?.nimantrana_prasthitah === 1 &&
                  styles.sentButtonContainer,
              ]}
              onPress={async () => {
                try {
                  const defaultMessage =
                    "Dear Friend, you're invited to join me on Made in India - Hyped Samvadini, a super global app for secure and multilingual communication.\n\nDiscover amazing features and connect with friends.\n\nDownload now -- Android: https://hyped.aicte-india.org/ad.html\n\niOS: https://hyped.aicte-india.org/ios.html";
                  const message =
                    (t as any)?.shareInviteMessage || defaultMessage;
                  const separator = Platform.OS === 'ios' ? '&' : '?';
                  const smsUrl = `sms:${
                    contact.durasamparka_sankhya
                  }${separator}body=${encodeURIComponent(message)}`;

                  const canOpen = await Linking.canOpenURL(smsUrl);
                  if (!canOpen) {
                    throw new Error('SMS composer not available');
                  }

                  await Linking.openURL(smsUrl);
                } catch (error) {
                  console.error('Error opening SMS composer:', error);
                  Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: `Unable to compose SMS for ${displayName}`,
                  });
                }
              }}
            >
              <Text
                style={[
                  styles.inviteButtonText,
                  contact?.nimantrana_prasthitah === 1 && styles.sentButtonText,
                ]}
              >
                {contact?.nimantrana_prasthitah === 1
                  ? (t as any)?.sent || 'Sent'
                  : (t as any)?.Invite || 'Invite'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [t],
  );

  const shareHeaderButton = useMemo(
    () => (
      <TouchableOpacity
        style={styles.shareHeaderButton}
        onPress={handleInviteShare}
      >
        <Text style={styles.shareHeaderButtonText}>Invite Via Link</Text>
      </TouchableOpacity>
    ),
    [handleInviteShare],
  );

  return (
    <View style={styles.mainContainer}>
      <View style={styles.container}>
        <View style={{ marginVertical: 10 }}>
          <SearchBarWrapper
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t.contactSearch}
          />
        </View>

        <VirtualizedList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
          ListHeaderComponent={() => (
            <>
              {searchQuery === '' && (
                <View style={styles.actionButtons}>
                  <ActionButton
                    iconName="person-add-outline"
                    text={t.AddContact}
                    onPress={() =>
                      (navigation as any).navigate('NewContactForm')
                    }
                  />
                  <ActionButton
                    iconName="people-outline"
                    text={t.newGroup}
                    onPress={() => (navigation as any).navigate('CreateNewGroup')}
                  />
                  <ActionButton
                    iconName="time-outline"
                    text={t.GenerateNewTemporaryID}
                    onPress={() => (navigation as any).navigate('PrivateRoom')}
                  />
                  <ActionButton
                    iconName="megaphone-outline"
                    text={t.AddEmergencyContact}
                    onPress={() =>
                      (navigation as any).navigate('EmergencyContactScreen')
                    }
                  />
                </View>
              )}
              <ContactSection
                title={t.contactsOnSamvadini}
                contacts={contactsOnSamvadini || []}
                renderContact={renderContactOnSamvadini}
                isSyncing={isSyncing}
                showSyncButton={true}
                handleSync={handleSync}
              />
              <ContactSection
                title={t.inviteToSamvadini}
                contacts={contactsToInvite || []}
                renderContact={renderContactToInvite}
                isSyncing={isSyncing}
                showSyncButton={false}
                headerRight={shareHeaderButton}
              />
            </>
          )}
          data={[]}
          renderItem={() => null}
          getItem={(data, index) => data[index]}
          getItemCount={data => data.length}
        />
      </View>
    </View>
  );
};

const ActionButton = ({
  iconName,
  text,
  onPress,
}: {
  iconName: string;
  text: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={styles.iconContainer}>
      <Ionicons name={iconName as any} size={24} color="#fff" />
    </View>
    <Text style={styles.actionText}>{text}</Text>
  </TouchableOpacity>
);

const ContactSection = ({
  title,
  contacts,
  renderContact,
  isSyncing,
  showSyncButton,
  handleSync,
  headerRight,
}: {
  title: string;
  contacts: any[];
  renderContact: (contact: any) => React.ReactElement | null;
  isSyncing: boolean;
  showSyncButton: boolean;
  handleSync?: () => void;
  headerRight?: React.ReactNode;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionTitle}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Text>{title}</Text>
        {showSyncButton ? (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={isSyncing}
          >
            <Icon
              name="sync"
              size={24}
              color="#4fc6b2"
              style={styles.syncIcon}
            />
          </TouchableOpacity>
        ) : (
          headerRight || null
        )}
      </View>
    </View>

    <VirtualizedList
      data={contacts || []}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      getItem={(data, index) => data[index]}
      getItemCount={data => data.length}
      keyExtractor={(item, index) =>
        (item.ekatma_chinha as string) ||
        item.durasamparka_sankhya ||
        index.toString()
      }
      renderItem={({ item }) => renderContact(item)}
    />
  </View>
);

const ContactCard = memo(
  ({
    contact,
    uniqueId,
    navigation,
    isButtonDisabled,
    setButtonDisabled,
    setGlobalLoading,
  }: {
    contact: any;
    uniqueId: any;
    navigation: any;
    isButtonDisabled: boolean;
    setButtonDisabled: (v: boolean) => void;
    setGlobalLoading: (v: boolean) => void;
  }) => {
    const photoUrl = getImageUrlWithSas(contact?.parichayapatra || undefined);
    const name = contact?.praman_patrika || '';
    const initial = name ? name[0] : '?';

    const handleChatPress = useCallback(
    async (user: any) => {
        if (isButtonDisabled) return;
        setButtonDisabled(true);
        setGlobalLoading(true);
        try {
          let data;
          if (!user.chatId) {
            if (uniqueId === user.ekatma_chinha) {
              data = await createSelfChat(user);
            } else {
              data = await createNewChat(uniqueId, user.ekatma_chinha);
            }
          } else {
            data = user.chatId;
          }

          if (uniqueId === user.ekatma_chinha) {
            navigation.navigate('BroadcastChatScreen', data);
          } else {
            navigation.navigate('Chat', data);
          }
        } catch (error) {
          console.error('Error handling chat request:', error);
        } finally {
          setButtonDisabled(false);
          setGlobalLoading(false);
        }
      },
      [
        isButtonDisabled,
        navigation,
        uniqueId,
        setButtonDisabled,
        setGlobalLoading,
      ],
    );

    return (
      <View style={styles.contactItem}>
        <View style={styles.contactAvatar}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => handleChatPress(contact)}>
          <View style={[styles.contactInfo, { marginLeft: 7 }]}>
            <Text style={styles.contactName} numberOfLines={1}>
              {name?.length > 22 ? name.slice(0, 22) + '...' : name}
            </Text>
            <Text style={styles.contactNumber}>
              {contact.durasamparka_sankhya}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  },
);

ContactCard.displayName = 'ContactCard';

export default ContactDesignScreen;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  actionButtons: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0b89d0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#F6F6F6',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    flex: 1,
  },
  contactAvatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  contactNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  inviteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
  },
  inviteName: {
    fontSize: 16,
    color: '#000',
  },
  inviteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteButtonContainer: {
    backgroundColor: 'rgba(138, 62, 62, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555',
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: undefined as any,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sentButtonContainer: {
    backgroundColor: '#FFFFFF',
  },
  inviteButtonText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
  sentButtonText: {
    color: '#2093ee',
  },
  syncIcon: {
    opacity: 0.8,
  },
  syncButton: {
    padding: 5,
  },
  shareHeaderButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0b89d0',
    backgroundColor: 'rgba(11, 137, 208, 0.12)',
  },
  shareHeaderButtonText: {
    color: '#0b89d0',
    fontSize: 12,
    fontWeight: '600',
  },
});
