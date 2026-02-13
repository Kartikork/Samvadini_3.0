import React, { memo, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getImageUrlWithSas } from '../../config/env';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAppSelector } from '../../state/hooks';
import { useChatById } from '../../screens/ChatListScreen/hooks/useChatListData';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { CallManager } from '../../services/CallManager';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export interface ChatHeaderProps {
  chatId?: string;
  showCallButton?: boolean;
  showVideoButton?: boolean;
  onCallPress?: () => void;
  onVideoPress?: () => void;
  onMenuPress?: () => void;
}

const ChatHeader = memo<ChatHeaderProps>(function ChatHeader({
  chatId: chatIdProp,
  showCallButton = true,
  showVideoButton = true,

  onMenuPress,
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();

  const activeChat = useAppSelector(state => state.activeChat);
  const chatId =
    activeChat.chatId ??
    chatIdProp ??
    (route.params as { chatId?: string })?.chatId ??
    '';
  const chatFromDb = useChatById(chatId);

  const title = useMemo(() => {
    if (activeChat.chatId === chatId) return activeChat.username;
    return chatFromDb?.contact_name ?? chatFromDb?.samvada_nama ?? 'Unknown';
  }, [activeChat.chatId, activeChat.username, chatId, chatFromDb]);

  const avatarUrl = useMemo(() => {
    if (activeChat.chatId === chatId) return activeChat.avatar;
    return chatFromDb?.contact_photo ?? chatFromDb?.samuha_chitram ?? null;
  }, [activeChat.chatId, activeChat.avatar, chatId, chatFromDb]);

  const isGroup = useMemo(() => {
    if (activeChat.chatId === chatId) return activeChat.isGroup;
    return chatFromDb?.prakara === 'Group';
  }, [activeChat.chatId, activeChat.isGroup, chatId, chatFromDb]);

  const receiverId = useMemo(() => {
    if (isGroup) return null;
    return chatFromDb?.contact_uniqueId || null;
  }, [isGroup, chatFromDb]);

  const avatarSource = useMemo((): ImageSourcePropType | null => {
    const url = getImageUrlWithSas(avatarUrl ?? undefined);
    return url ? { uri: url } : null;
  }, [avatarUrl]);

  const avatarIcon = useMemo(() => {
    return isGroup ? 'account-group' : 'account';
  }, [isGroup]);

  const handleCallPress = useCallback(async () => {
    if (!receiverId) {
      Alert.alert('Cannot call', 'Receiver information not available');
      return;
    }

    if (isGroup) {
      Alert.alert('Group calls', 'Group calls are not supported yet');
      return;
    }

    try {
      console.log('[ChatHeader] Initiating audio call', { receiverId, title });
      const callId = await CallManager.initiateCall(receiverId, title, 'audio');

      if (callId) {
        // Navigate to CallScreen
        navigation.navigate('Call', {
          callId,
          peerId: receiverId,
          isVideo: false,
        });
      } else {
        Alert.alert(
          'Call failed',
          'Failed to initiate call. Please try again.',
        );
      }
    } catch (error) {
      console.error('[ChatHeader] Call initiation failed:', error);
      Alert.alert('Call failed', 'Failed to initiate call. Please try again.');
    }
  }, [receiverId, isGroup, title, navigation]);

  const handleVideoPress = useCallback(async () => {
    if (!receiverId) {
      Alert.alert('Cannot call', 'Receiver information not available');
      return;
    }

    if (isGroup) {
      Alert.alert('Group calls', 'Group calls are not supported yet');
      return;
    }

    try {
      console.log('[ChatHeader] Initiating video call', { receiverId, title });
      const callId = await CallManager.initiateCall(receiverId, title, 'video');

      if (callId) {
        // Navigate to CallScreen
        navigation.navigate('Call', {
          callId,
          peerId: receiverId,
          isVideo: true,
        });
      } else {
        Alert.alert(
          'Call failed',
          'Failed to initiate video call. Please try again.',
        );
      }
    } catch (error) {
      console.error('[ChatHeader] Video call initiation failed:', error);
      Alert.alert(
        'Call failed',
        'Failed to initiate video call. Please try again.',
      );
    }
  }, [receiverId, isGroup, title, navigation]);

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        {/* Left: Back + Avatar + Title */}
        <View style={styles.leftSection}>
          <View style={styles.avatarContainer}>
            {avatarSource ? (
              <Image
                source={avatarSource}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name={avatarIcon} size={28} color="#999" />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              navigation.navigate('ChatProfile');
            }}
          >
            <Text style={styles.title} numberOfLines={1}>
              {title || 'Unknown'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right: Call, Video, Menu */}
        <View style={styles.rightSection}>
          {showCallButton && !isGroup && receiverId && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleCallPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="phone-outline" size={24} color="#000000" />
            </TouchableOpacity>
          )}
          {showVideoButton && !isGroup && receiverId && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleVideoPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="video-outline" size={24} color="#000000" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="dots-vertical" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

ChatHeader.displayName = 'ChatHeader';

export { ChatHeader };

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default ChatHeader;
