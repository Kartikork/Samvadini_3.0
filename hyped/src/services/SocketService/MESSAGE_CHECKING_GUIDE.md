# How to Check for New Messages in Socket

This guide explains how to check if new messages are coming through the socket in your React Native app.

## Overview

The app uses **Phoenix Channels** for real-time messaging. The `SocketService` handles all socket connections and message events.

## Method 1: Listen for New Messages (Recommended)

The easiest way to check for new messages is to listen to the `new_message` event:

```typescript
import { SocketService } from '../services/SocketService';
import { useEffect } from 'react';

function MyComponent() {
  useEffect(() => {
    // Define handler for new messages
    const handleNewMessage = (payload: any) => {
      console.log('📨 New message received!', {
        chatId: payload?.samvada_chinha,
        sender: payload?.pathakah_chinha,
        messageType: payload?.sandesha_prakara,
        message: payload?.vishayah,
      });
      
      // Handle the new message here
      // e.g., update UI, save to database, show notification, etc.
    };

    // Register listener
    SocketService.on('new_message', handleNewMessage);

    // Cleanup: remove listener when component unmounts
    return () => {
      SocketService.off('new_message', handleNewMessage);
    };
  }, []);

  return <YourComponent />;
}
```

## Method 2: Check Message Status Programmatically

You can check the status of message reception at any time:

```typescript
import { SocketService } from '../services/SocketService';

// Check if messages are being received
const status = SocketService.checkNewMessageStatus();

console.log('Socket Status:', {
  isConnected: status.isConnected,
  hasReceivedMessages: status.hasReceivedMessages,
  messageCount: status.messageCount,
  lastMessageTime: status.lastMessageTime 
    ? new Date(status.lastMessageTime).toISOString() 
    : 'Never',
  timeSinceLastMessage: status.timeSinceLastMessage 
    ? `${Math.floor(status.timeSinceLastMessage / 1000)}s ago`
    : 'N/A',
  lastMessage: status.lastMessage,
});
```

## Method 3: Monitor Connection and Messages

Create a hook to monitor both connection status and incoming messages:

```typescript
import { useState, useEffect } from 'react';
import { SocketService } from '../services/SocketService';

export function useSocketMessageMonitor() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    // Check connection status periodically
    const checkStatus = () => {
      const status = SocketService.checkNewMessageStatus();
      setIsConnected(status.isConnected);
      setMessageCount(status.messageCount);
      if (status.lastMessage) {
        setLastMessage(status.lastMessage);
      }
    };

    // Check immediately
    checkStatus();

    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    // Listen for new messages
    const handleNewMessage = (payload: any) => {
      setLastMessage(payload);
      setMessageCount(prev => prev + 1);
      setIsConnected(true);
    };

    SocketService.on('new_message', handleNewMessage);

    return () => {
      clearInterval(interval);
      SocketService.off('new_message', handleNewMessage);
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    messageCount,
    hasNewMessages: messageCount > 0,
  };
}

// Usage in component:
function MyComponent() {
  const { isConnected, lastMessage, messageCount, hasNewMessages } = 
    useSocketMessageMonitor();

  return (
    <View>
      <Text>Connected: {isConnected ? 'Yes' : 'No'}</Text>
      <Text>Messages Received: {messageCount}</Text>
      {lastMessage && (
        <Text>Last Message: {lastMessage.vishayah}</Text>
      )}
    </View>
  );
}
```

## Method 4: Real-time Message Listener with Callback

For immediate handling when a message arrives:

```typescript
import { SocketService } from '../services/SocketService';

// In your component or service
useEffect(() => {
  const handleNewMessage = (payload: any) => {
    // Check if this is a message for the current chat
    const chatId = payload?.samvada_chinha;
    const senderId = payload?.pathakah_chinha;
    
    // Process the message
    if (chatId === currentChatId) {
      // Message is for current chat - update UI immediately
      updateChatMessages(payload);
    } else {
      // Message is for another chat - show notification
      showNotification(payload);
    }
  };

  SocketService.on('new_message', handleNewMessage);

  return () => {
    SocketService.off('new_message', handleNewMessage);
  };
}, [currentChatId]);
```

## Available Socket Events

You can listen to these events:

- `new_message` - New message received
- `chat_update` - Chat metadata updated
- `group_update` - Group chat updated
- `request_accepted` - Chat request accepted
- `message_updated` - Message status updated (read/delivered)
- `user_typing` - User typing indicator
- `status_change` - Chat status changed
- `socket_open` - Socket connection opened
- `socket_close` - Socket connection closed
- `socket_error` - Socket error occurred
- `connected` - Socket connected and channel joined

## Example: Complete Message Handler

```typescript
import { useEffect } from 'react';
import { SocketService } from '../services/SocketService';

function ChatScreen({ chatId }: { chatId: string }) {
  useEffect(() => {
    // Handler for new messages
    const handleNewMessage = (payload: any) => {
      // Check if message is for this chat
      if (payload?.samvada_chinha === chatId) {
        console.log('✅ New message for current chat:', payload);
        
        // Add message to local state
        // Save to database
        // Update UI
        // etc.
      } else {
        console.log('📬 New message for different chat:', payload?.samvada_chinha);
        // Show notification badge, etc.
      }
    };

    // Handler for chat updates
    const handleChatUpdate = (payload: any) => {
      if (payload?.samvada_chinha === chatId) {
        console.log('💬 Chat updated:', payload);
        // Refresh chat metadata
      }
    };

    // Register listeners
    SocketService.on('new_message', handleNewMessage);
    SocketService.on('chat_update', handleChatUpdate);

    // Cleanup
    return () => {
      SocketService.off('new_message', handleNewMessage);
      SocketService.off('chat_update', handleChatUpdate);
    };
  }, [chatId]);

  return <YourChatUI />;
}
```

## Debugging: Check if Socket is Receiving Messages

```typescript
import { SocketService } from '../services/SocketService';

// Check connection and message status
const debugSocket = () => {
  const status = SocketService.checkNewMessageStatus();
  
  console.log('🔍 Socket Debug Info:', {
    connected: status.isConnected,
    messagesReceived: status.messageCount,
    lastMessageTime: status.lastMessageTime 
      ? new Date(status.lastMessageTime).toLocaleString()
      : 'Never',
    secondsSinceLastMessage: status.timeSinceLastMessage 
      ? Math.floor(status.timeSinceLastMessage / 1000)
      : null,
    lastMessagePreview: status.lastMessage 
      ? {
          chatId: status.lastMessage.samvada_chinha,
          sender: status.lastMessage.pathakah_chinha,
          type: status.lastMessage.sandesha_prakara,
        }
      : null,
  });
};

// Call this function to debug
debugSocket();
```

## Important Notes

1. **Always cleanup listeners** - Use `useEffect` cleanup to remove listeners when components unmount
2. **Check connection status** - Use `SocketService.isConnected()` before assuming messages will arrive
3. **Message payload structure** - Messages use Sanskrit field names:
   - `samvada_chinha` = chatId
   - `pathakah_chinha` = senderId
   - `vishayah` = message content
   - `sandesha_prakara` = message type
   - `preritam_tithih` = timestamp

## Troubleshooting

**Problem: Not receiving messages**
- Check if socket is connected: `SocketService.isConnected()`
- Verify you're listening to the correct event: `SocketService.on('new_message', ...)`
- Check network connection
- Look at console logs for socket errors

**Problem: Messages arriving but not handled**
- Ensure your handler function is registered: `SocketService.on('new_message', handler)`
- Check that handler is not removed prematurely
- Verify handler function is not throwing errors (check console)

**Problem: Multiple handlers firing**
- Make sure you're cleaning up old handlers with `SocketService.off()`
- Check if multiple components are registering the same handler


