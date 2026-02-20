/**
 * MessageHandler - Handles incoming socket messages
 * 
 * RESPONSIBILITIES:
 * - Decrypt incoming socket messages
 * - Save incoming socket messages to database
 * - Update chat list when new messages arrive
 * - Handle message deduplication
 * - Performance timing and logging
 */

import { insertChatMessage } from '../../storage/sqllite/chat/ChatMessageSchema';
import { getLastMessage } from '../../storage/sqllite/chat/ChatMessageSchema';
import { insertGroupMessage } from '../../storage/sqllite/chat/GroupMessageSchema';
import { fetchGroupMessages } from '../../storage/sqllite/chat/GroupMessageSchema';
import { decryptMessage } from '../../helper/Encryption';
import { getEncryptionKey } from '../../storage/sqllite/chat/Participants';
import { fetchChatBySamvadaChinha } from '../../storage/sqllite/chat/ChatListSchema';

export interface IncomingMessagePayload {
  samvada_chinha: string; // chatId
  pathakah_chinha: string; // senderId
  vishayah?: string; // message content
  sandesha_prakara?: string; // message type (text, image, etc.)
  refrenceId: string; // message reference ID
  preritam_tithih?: string; // timestamp
  anuvadata_sandesham?: boolean;
  avastha?: string; // status (sent, delivered, read)
  ukti?: string;
  pratisandeshah?: any;
  kimFwdSandesha?: boolean;
  nirastah?: boolean;
  samvada_spashtam?: boolean;
  is_disappearing?: boolean;
  disappear_at?: string;
  prasaranamId?: string;
  reaction?: string;
  reaction_by?: string;
  reaction_updated_at?: string;
  reaction_details?: any;
  reaction_summary?: any;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Performance timing interface
 */
export interface MessageProcessingTiming {
  totalTime: number; // Total time from socket receive to completion
  decryptionTime: number; // Time to decrypt message
  dbInsertTime: number; // Time to insert into database
  deduplicationTime: number; // Time to check for duplicates
  encryptionKeyFetchTime: number; // Time to fetch encryption key
}

/**
 * Handle incoming new message from socket
 * Decrypts, saves message to database and returns success status with timing
 */
export async function handleIncomingMessage(
  payload: any,
  socketReceiveTime?: number
): Promise<{ success: boolean; timing?: MessageProcessingTiming }> {
  const startTime = socketReceiveTime || Date.now();
  const timing: MessageProcessingTiming = {
    totalTime: 0,
    decryptionTime: 0,
    dbInsertTime: 0,
    deduplicationTime: 0,
    encryptionKeyFetchTime: 0,
  };

  try {
    console.log('[MessageHandler] 📥 Processing incoming message:', {
      chatId: payload?.samvada_chinha,
      sender: payload?.pathakah_chinha,
      refrenceId: payload?.refrenceId,
      type: payload?.sandesha_prakara,
      socketReceiveTime: socketReceiveTime ? new Date(socketReceiveTime).toISOString() : 'N/A',
    });

    // Handle different payload structures (socket might send different field names)
    const chatId = payload.samvada_chinha || payload.chatId;
    const senderId = payload.pathakah_chinha || payload.sender || payload.pathakah_chinha;
    const refrenceId = payload.refrenceId || payload.referenceId || payload.id || `${Date.now()}_${Math.random()}`;
    const messageType = payload.sandesha_prakara || payload.messageType || payload.sandesha_prakara || 'text';
    const messageContent = payload.vishayah || payload.content || payload.message || '';

    // Validate required fields
    if (!chatId || !senderId || !refrenceId) {
      console.error('[MessageHandler] ❌ Missing required fields:', {
        chatId,
        senderId,
        refrenceId,
        payloadKeys: Object.keys(payload || {}),
      });
      return { success: false };
    }

    // Check if this is a group chat
    const isGroupChat = payload.isGroup || payload.isGroupChat || false;
    let isGroup = isGroupChat;
    
    // If not explicitly marked, check by fetching chat metadata
    if (!isGroup) {
      try {
        const chatMetadata = await fetchChatBySamvadaChinha(chatId);
        if (chatMetadata && chatMetadata.length > 0) {
          isGroup = chatMetadata[0].prakara === 'Group';
        }
      } catch (error) {
        console.warn('[MessageHandler] Could not check chat type, assuming 1-to-1:', error);
      }
    }

    // Check if message already exists (deduplication)
    const dedupStartTime = Date.now();
    try {
      if (isGroup) {
        // For groups, check the latest group message
        // fetchGroupMessages(samvada_chinha, uniqueId, limit, offset)
        const { store } = await import('../../state/store');
        const currentUserId = store.getState().auth.uniqueId;
        if (currentUserId) {
          const groupMessages = await fetchGroupMessages(chatId, currentUserId, 1, 0);
          timing.deduplicationTime = Date.now() - dedupStartTime;
          
          if (groupMessages && groupMessages.length > 0 && groupMessages[0].refrenceId === refrenceId) {
            console.log('[MessageHandler] ⚠️ Group message already exists, skipping:', refrenceId);
            return { success: false, timing }; // Message already saved
          }
        } else {
          timing.deduplicationTime = Date.now() - dedupStartTime;
          console.warn('[MessageHandler] No current user ID for group message deduplication');
        }
      } else {
        // For 1-to-1, use existing check
        const lastMessage = await getLastMessage(chatId);
        timing.deduplicationTime = Date.now() - dedupStartTime;
        
        if (lastMessage && lastMessage.refrenceId === refrenceId) {
          console.log('[MessageHandler] ⚠️ Message already exists, skipping:', refrenceId);
          return { success: false, timing }; // Message already saved
        }
      }
    } catch (error) {
      timing.deduplicationTime = Date.now() - dedupStartTime;
      console.warn('[MessageHandler] Could not check for duplicate, proceeding:', error);
    }

    // Prepare message data for database
    // Note: preritam_tithih is critical for chat list ordering
    const now = new Date().toISOString();
    const preritam_tithih = payload.preritam_tithih || payload.timestamp || payload.createdAt || now;
    const formattedTimestamp = typeof preritam_tithih === 'string' 
      ? preritam_tithih 
      : new Date(preritam_tithih).toISOString();

    // ─────────────────────────────────────────────────────────────
    // DECRYPTION (if needed)
    // ─────────────────────────────────────────────────────────────
    let decryptedContent = messageContent;
    const encryptedTypes = ["text", "link", "sos", "location"];
    const needsDecryption = encryptedTypes.includes(messageType);

    if (needsDecryption && messageContent) {
      const decryptStartTime = Date.now();
      try {
        // Fetch encryption key
        const keyFetchStartTime = Date.now();
        const self = await getEncryptionKey();
        timing.encryptionKeyFetchTime = Date.now() - keyFetchStartTime;

        if (self?.privateKey) {
          decryptedContent = await decryptMessage(messageContent, self.privateKey);
          timing.decryptionTime = Date.now() - decryptStartTime;
          console.log('[MessageHandler] 🔓 Message decrypted:', {
            type: messageType,
            decryptionTime: `${timing.decryptionTime}ms`,
            keyFetchTime: `${timing.encryptionKeyFetchTime}ms`,
          });
        } else {
          console.warn('[MessageHandler] ⚠️ No private key found, message may be encrypted');
          timing.decryptionTime = Date.now() - decryptStartTime;
        }
      } catch (error) {
        timing.decryptionTime = Date.now() - decryptStartTime;
        console.error('[MessageHandler] ❌ Decryption failed:', error);
        // Continue with encrypted content - might be a non-encrypted message
        decryptedContent = messageContent;
      }
    } else {
      console.log('[MessageHandler] ℹ️ Message does not need decryption:', {
        type: messageType,
        isEncryptedType: encryptedTypes.includes(messageType),
      });
    }

    const messageData = {
      samvada_chinha: chatId,
      refrenceId: refrenceId,
      pathakah_chinha: senderId,
      vishayah: decryptedContent, // Use decrypted content
      sandesha_prakara: messageType,
      anuvadata_sandesham: payload.anuvadata_sandesham || false,
      avastha: payload.avastha || 'sent',
      ukti: payload.ukti || '',
      samvada_spashtam: payload.samvada_spashtam || false,
      kimTaritaSandesha: false,
      nirastah: payload.nirastah || false,
      sthapitam_sandesham: null,
      preritam_tithih: formattedTimestamp, // Critical for chat list ordering
      pratisandeshah: payload.pratisandeshah || '',
      kimFwdSandesha: payload.kimFwdSandesha || false,
      sampaditam: false,
      is_disappearing: payload.is_disappearing || false,
      disappear_at: payload.disappear_at ? new Date(payload.disappear_at) : null,
      prasaranamId: payload.prasaranamId || '',
      reaction: payload.reaction,
      reaction_by: payload.reaction_by,
      reaction_updated_at: payload.reaction_updated_at,
      reaction_details: payload.reaction_details,
      reaction_summary: payload.reaction_summary,
      createdAt: payload.createdAt || now,
      updatedAt: payload.updatedAt || now,
    };

    // ─────────────────────────────────────────────────────────────
    // DATABASE INSERT
    // ─────────────────────────────────────────────────────────────
    const dbInsertStartTime = Date.now();
    
    if (isGroup) {
      // Insert into group messages table
      await insertGroupMessage({
        ...messageData,
        nirastah: messageData.nirastah ? 1 : 0, // Convert boolean to number for group messages
        kimFwdSandesha: messageData.kimFwdSandesha ? 1 : 0,
        anuvadata_sandesham: messageData.anuvadata_sandesham ? 1 : 0,
        kimTaritaSandesha: messageData.kimTaritaSandesha ? 1 : 0,
        sampaditam: messageData.sampaditam ? 1 : 0,
        sthapitam_sandesham: messageData.sthapitam_sandesham ? 1 : 0,
      });
      console.log('[MessageHandler] ✅ Group message inserted into group table');
    } else {
      // Insert into 1-to-1 messages table
      await insertChatMessage(messageData);
      console.log('[MessageHandler] ✅ 1-to-1 message inserted into chat table');
    }
    
    timing.dbInsertTime = Date.now() - dbInsertStartTime;

    // Calculate total time
    timing.totalTime = Date.now() - startTime;

    // ─────────────────────────────────────────────────────────────
    // PERFORMANCE LOGGING
    // ─────────────────────────────────────────────────────────────
    console.log('[MessageHandler] ⏱️ Performance Metrics:', {
      chatId: chatId,
      refrenceId: refrenceId,
      totalTime: `${timing.totalTime}ms`,
      breakdown: {
        deduplication: `${timing.deduplicationTime}ms`,
        encryptionKeyFetch: `${timing.encryptionKeyFetchTime}ms`,
        decryption: `${timing.decryptionTime}ms`,
        dbInsert: `${timing.dbInsertTime}ms`,
      },
      percentages: {
        deduplication: `${((timing.deduplicationTime / timing.totalTime) * 100).toFixed(1)}%`,
        encryptionKeyFetch: `${((timing.encryptionKeyFetchTime / timing.totalTime) * 100).toFixed(1)}%`,
        decryption: `${((timing.decryptionTime / timing.totalTime) * 100).toFixed(1)}%`,
        dbInsert: `${((timing.dbInsertTime / timing.totalTime) * 100).toFixed(1)}%`,
      },
    });

    console.log('[MessageHandler] ✅ Message processed successfully:', {
      chatId: chatId,
      refrenceId: refrenceId,
      timestamp: formattedTimestamp,
      totalProcessingTime: `${timing.totalTime}ms`,
    });

    return { success: true, timing };
  } catch (error) {
    timing.totalTime = Date.now() - startTime;
    console.error('[MessageHandler] ❌ Error handling incoming message:', {
      error,
      timing: {
        totalTime: `${timing.totalTime}ms`,
        breakdown: timing,
      },
    });
    return { success: false, timing };
  }
}

