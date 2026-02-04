/**
 * ChatInput - Message input component
 * 
 * Features:
 * - Text input
 * - Media attachment
 * - Typing indicator emission
 * - Send button
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SocketService } from '../../../services/SocketService';
import { OutgoingMessageManager } from '../../../services/OutgoingMessageManager';
import { useAppSelector } from '../../../state/hooks';

interface ChatInputProps {
  chatId: string;
  onMessageSent?: () => void; // Callback after message is sent successfully
}

const ChatInput: React.FC<ChatInputProps> = ({ chatId, onMessageSent }) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const currentUserId = useAppSelector(state => state.auth.uniqueId);
  const inputRef = useRef<TextInput>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <View style={styles.container}>
      {/* Attachment button */}
      <TouchableOpacity
        style={styles.attachButton}
        onPress={handleAttachment}
        disabled={isSending}
      >
        <Text style={styles.attachIcon}>📎</Text>
      </TouchableOpacity>

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

      {/* Send button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          canSend && styles.sendButtonActive,
        ]}
        onPress={handleSend}
        disabled={!canSend}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.sendIcon}>➤</Text>
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
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachIcon: {
    fontSize: 24,
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
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
});

export default React.memo(ChatInput);

