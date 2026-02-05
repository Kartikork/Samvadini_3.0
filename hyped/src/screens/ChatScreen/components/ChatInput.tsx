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
import { useAppSelector } from '../../../state/hooks';
import PickerModal from '../../../components/EmojiGifStickerPicker/PickerModal';

interface ChatInputProps {
  chatId: string;
  onMessageSent?: () => void; // Callback after message is sent successfully
}

const ChatInput: React.FC<ChatInputProps> = ({ chatId, onMessageSent }) => {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const currentUserId = useAppSelector(state => state.auth.uniqueId);
  const inputRef = useRef<TextInput>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerHeight, setPickerHeight] = useState(0);

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
      console.log('Sending message:', chatId, isSending, currentUserId);
      await OutgoingMessageManager.sendTextMessage(chatId, messageText);
      
      // Message sent successfully - trigger refresh in ChatScreen
      // Give DB a moment to ensure message is committed
      setTimeout(() => {
        onMessageSent?.();
      }, 10);
    } catch (error) {
      console.error('[ChatInput] Send error:', error);
      // Restore text on error
      setText(messageText);
    } finally {
      setIsSending(false);
    }
  }, [text, chatId, isSending, currentUserId, onMessageSent]);

  /**
   * Handle media attachment
   */
  const handleAttachment = () => {
    // TODO: Implement media picker
    console.log('[ChatInput] Attachment button pressed');
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

  return (
    <View style={[styles.container, { paddingBottom: 8 + insets.bottom + (pickerVisible ? pickerHeight : 0) }]}>
      {/* Emoji picker button (left side) */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleEmojiPicker}
        disabled={isSending}
      >
        <Icon name="smile-o" size={24} color="#666666" />
      </TouchableOpacity>

      <PickerModal
        visible={pickerVisible}
        height={pickerHeight}
        onClose={() => { setPickerVisible(false); setPickerHeight(0); }}
        onSelectEmoji={handleEmojiSelected}
        onSelectGif={handleGifSelected}
        onSelectSticker={handleStickerSelected}
        inputText={text}
      />

      {/* Text input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999999"
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={4096}
          editable={!isSending}
        />
      </View>

      {/* Attachment button (+ icon) */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleAttachment}
        disabled={isSending}
      >
        <MaterialIcons name="add" size={24} color="#666666" />
      </TouchableOpacity>

      {/* Conditional button: Send (when text) or Mic (when no text) */}
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
          <MaterialIcons name="mic" size={20} color="#666666" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
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
    fontSize: 16,
    color: '#000000',
    maxHeight: 100,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  actionButtonActive: {
    backgroundColor: '#007AFF',
  },
});

export default React.memo(ChatInput);

