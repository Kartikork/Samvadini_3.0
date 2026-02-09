/**
 * ChatHeader Component
 *
 * Header for chat screens (1-to-1 and group).
 * Reads username/avatar directly from Redux (activeChat). Fallback from DB when needed.
 */

import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getImageUrlWithSas } from '../../config/env';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAppSelector } from '../../state/hooks';
import { useChatById } from '../../screens/ChatListScreen/hooks/useChatListData';
import type { RootStackParamList } from '../../navigation/MainNavigator';

export interface ChatHeaderProps {
  /** Chat ID fallback when Redux not yet populated (e.g. deep link) */
  chatId?: string;
  /** Show audio call button */
  showCallButton?: boolean;
  /** Show video call button */
  showVideoButton?: boolean;
  /** Callback when audio call is pressed */
  onCallPress?: () => void;
  /** Callback when video call is pressed */
  onVideoPress?: () => void;
  /** Callback when menu (dots) is pressed */
  onMenuPress?: () => void;
}

const ChatHeader = memo<ChatHeaderProps>(function ChatHeader({
  chatId: chatIdProp,
  showCallButton = true,
  showVideoButton = true,
  onCallPress,
  onVideoPress,
  onMenuPress,
}) {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();

  // Chat ID from Redux (primary) or route params (fallback when opened from deep link)
  const activeChat = useAppSelector((state) => state.activeChat);
  const chatId = activeChat.chatId ?? chatIdProp ?? (route.params as { chatId?: string })?.chatId ?? '';

  // Fallback: fetch from DB when opened from elsewhere (e.g. deep link)
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

  const avatarSource = useMemo((): ImageSourcePropType | null => {
    const url = getImageUrlWithSas(avatarUrl ?? undefined);
    return url ? { uri: url } : null;
  }, [avatarUrl]);

  const avatarIcon = useMemo(() => {
    return isGroup ? 'account-group' : 'account';
  }, [isGroup]);

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Left: Back + Avatar + Title */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-left" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name={avatarIcon} size={28} color="#999" />
              </View>
            )}
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {title || 'Unknown'}
          </Text>
        </View>

        {/* Right: Call, Video, Menu */}
        <View style={styles.rightSection}>
          {showCallButton && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onCallPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="phone-outline" size={24} color="#000000" />
            </TouchableOpacity>
          )}
          {showVideoButton && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onVideoPress}
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
    </SafeAreaView>
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
    height: 40,
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
    flex: 1,
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
