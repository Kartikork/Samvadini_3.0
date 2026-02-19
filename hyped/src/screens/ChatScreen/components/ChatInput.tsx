import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SocketService } from '../../../services/SocketService';
import { OutgoingMessageManager } from '../../../services/OutgoingMessageManager';
import { GroupChatManager } from '../../../services/GroupChatManager';
import { useAppSelector } from '../../../state/hooks';
import PickerModal from '../../../components/EmojiGifStickerPicker/PickerModal';
import ActionButtons from './ActionButtons';
import ReplyPreview from './ReplyPreview';
import LinearGradient from 'react-native-linear-gradient';


interface ChatInputProps {
  chatId: string;
  onMessageSent?: () => void;
  replyMessage?: any;
  onCancelReply?: () => void;
  isGroup?: boolean; // If true, use GroupChatManager instead of OutgoingMessageManager
}

const ChatInput: React.FC<ChatInputProps> = ({
  chatId,
  onMessageSent,
  replyMessage,
  onCancelReply,
  isGroup = false,
}) => {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const currentUserId = useAppSelector(state => state.auth.uniqueId);
  const inputRef = useRef<TextInput>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerHeight, setPickerHeight] = useState(0);
  const [showActions, setShowActions] = useState(false);
console.log("chatId==========>", chatId);

  /**
   * Handle text change
   * Emits typing indicator (debounced)
   */
  const handleTextChange = (newText: string) => {
    setText(newText);

    if (newText.length > 0 && !isTypingRef.current && currentUserId) {
      isTypingRef.current = true;
      SocketService.sendTypingStatus(chatId, currentUserId);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Schedule typing stop after 3s
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current && currentUserId) {
          isTypingRef.current = false;
          SocketService.sendTypingStatus(chatId, currentUserId);
        }
      }, 3000);
    } else if (newText.length === 0 && isTypingRef.current && currentUserId) {
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      SocketService.sendTypingStatus(chatId, currentUserId);
    }
  };

  /**
   * Handle send message using OutgoingMessageManager
   */
  const handleSend = useCallback(async () => {
    // console.log('Sending message:',isSending , currentUserId  );

    if (!text.trim() || isSending || !currentUserId) return;

    const messageText = text.trim();
    setText('');
    setIsSending(true);

    // Stop typing indicator
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      SocketService.sendTypingStatus(chatId, currentUserId);
    }

    try {
      console.log('Sending message:', chatId, isSending, currentUserId, 'isGroup:', isGroup);
      
      if (isGroup) {
        // Use GroupChatManager for group messages
        await GroupChatManager.sendGroupMessage(
          chatId,
          messageText,
          'text',
          {
            replyMessage: replyMessage ? {
              refrenceId: replyMessage.refrenceId,
              pathakah_chinha: replyMessage.pathakah_chinha,
              vishayah: replyMessage.vishayah,
              sandesha_prakara: replyMessage.sandesha_prakara,
              ukti: replyMessage.ukti || '',
            } : undefined,
          }
        );
      } else {
        // Use OutgoingMessageManager for 1-to-1 messages
        await OutgoingMessageManager.sendTextMessage(chatId, messageText, {
          replyMessage,
        });
      }

      // Message sent successfully - trigger refresh in ChatScreen
      // Give DB a moment to ensure message is committed
      setTimeout(() => {
        onMessageSent?.();
      }, 10);
      onCancelReply?.();
    } catch (error) {
      console.error('[ChatInput] Send error:', error);
      // Restore text on error
      setText(messageText);
    } finally {
      setIsSending(false);
    }
  }, [text, chatId, isSending, currentUserId, isGroup, onMessageSent, replyMessage, onCancelReply]);

  /**
   * Handle media attachment
   */
  const handleAttachment = () => {
    // Toggle attachment action sheet
    Keyboard.dismiss();
    setShowActions(prev => !prev);
  };

  /**
   * Handle emoji picker
   */
  const handleEmojiPicker = () => {
    // Dismiss keyboard and open picker sized like keyboard
    Keyboard.dismiss();
    const defaultPickerHeight = Math.min(Math.floor(Dimensions.get('window').height * 0.45), 360);
    setPickerHeight(defaultPickerHeight);
    setPickerVisible(true);
  };

  const handleEmojiSelected = (emoji: string) => {
    // Append emoji to input and focus input
    setText((t) => `${t}${emoji}`);
    // Close picker then focus input so user can continue typing
    setPickerVisible(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleGifSelected = async (gif: any) => {
    // gif is an object { id, url, thumb }
    try {
      await OutgoingMessageManager.sendMediaMessage(chatId, gif.url, 'gif');
      // notify parent to refresh
      setTimeout(() => onMessageSent?.(), 10);
    } catch (e) {
      console.error('[ChatInput] send gif error', e);
    }
  };

  const handleStickerSelected = async (sticker: any) => {
    try {
      await OutgoingMessageManager.sendMediaMessage(chatId, sticker.url, 'sticker');
      setTimeout(() => onMessageSent?.(), 10);
    } catch (e) {
      console.error('[ChatInput] send sticker error', e);
    }
  };

  /**
   * Handle voice recording
   */
  const handleVoiceRecord = () => {
    // TODO: Implement voice recording
    console.log('[ChatInput] Voice record pressed');
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isTypingRef.current && currentUserId) {
        SocketService.sendTypingStatus(chatId, currentUserId);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, currentUserId]);

  const canSend = text.trim().length > 0 && !isSending;
  const hasText = text.trim().length > 0;

  // Derive reply preview content
  const replyTitle =
    replyMessage &&
    (replyMessage.is_outgoing ||
      replyMessage.pathakah_chinha === currentUserId)
      ? 'You'
      : replyMessage?.ukti || replyMessage?.senderName || '';

  let replySnippet = '';
  if (replyMessage) {
    if (replyMessage.vishayah) {
      replySnippet = replyMessage.vishayah;
    } else if (
      replyMessage.sandesha_prakara &&
      replyMessage.sandesha_prakara !== 'text'
    ) {
      replySnippet =
        replyMessage.sandesha_prakara === 'image'
          ? 'Photo'
          : replyMessage.sandesha_prakara === 'video'
          ? 'Video'
          : 'Media';
    }
  }

  return (
   <View style={[styles.container, { paddingBottom: 8 + insets.bottom }]}>
  {replyMessage && (
    <ReplyPreview
      title={replyTitle || 'Replying to'}
      message={replySnippet || 'Tap message to reply'}
      onClose={onCancelReply || (() => {})}
    />
  )}
  <View style={styles.inputRow}>
  <View style={styles.inputWrapper}>
    {/* Emoji */}
    <TouchableOpacity
      style={styles.innerIcon}
      onPress={handleEmojiPicker}
      disabled={isSending}
    >
      <Icon name="smile-o" size={22} color="#2222222" />
    </TouchableOpacity>

    {/* Text Input */}
    <TextInput
      ref={inputRef}
      style={styles.input}
      placeholder="Type a message..."
      placeholderTextColor="#2222222"
      value={text}
      onChangeText={handleTextChange}
      multiline
      maxLength={4096}
      editable={!isSending}
    />

    {/* Plus */}
    <TouchableOpacity
      style={styles.innerIcon}
      onPress={handleAttachment}
      disabled={isSending}
    >
      <MaterialIcons name="add" size={22} color="#2222222" />
    </TouchableOpacity>
  </View>

  {/* Send / Mic Button */}
  <TouchableOpacity
    style={[
      styles.actionButton,
      hasText && styles.actionButtonActive,
    ]}
    onPress={hasText ? handleSend : handleVoiceRecord}
    disabled={hasText ? !canSend : isSending}
  >
    {isSending ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : hasText ? (
      <MaterialIcons name="send" size={20} color="#FFFFFF" />
    ) : (
      <MaterialIcons name="mic" size={20} color="#222222" />
    )}
  </TouchableOpacity>

</View>

  {showActions && (
    <ActionButtons
      chatId={chatId}
      isGroup={isGroup}
      onClose={() => setShowActions(false)}
    />
  )}
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 8,
    paddingVertical: 8,
    // backgroundColor: '#FFFFFF',
    // borderTopWidth: 1,
    // borderTopColor: '#E5E5E5',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputWrapper: {
 flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#ffffff',
  borderRadius: 24,
  paddingHorizontal: 8,
  paddingVertical: 6,
  marginRight: 8,
  },
  innerIcon: {
  padding: 6,
},
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 120,
  },
  input: {
    flex: 1,
  fontSize: 15,
  maxHeight: 120,
  paddingHorizontal: 6,
  paddingVertical: 6,
  color: '#000',
  },
  actionButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: '#ffffff',
  justifyContent: 'center',
  alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#007AFF',
  },
});

export default React.memo(ChatInput);
