/**
 * OutgoingMessageManager
 *
 * RESPONSIBILITIES:
 * - Validate outgoing messages
 * - Insert into existing SQLite chat table (ChatMessageSchema)
 * - Call chat/send-message API with plaintext first
 * - Encrypt message before sending via socket
 * - Queue + retry when offline or socket fails
 *
 * IMPORTANT:
 * - Local DB is the source of truth
 * - UI should render from DB, not from this manager directly
 * - Flow: DB insert → API call (plaintext) → Encrypt → Socket send
 */

import { SocketService } from '../SocketService';
import { insertChatMessage } from '../../storage/sqllite/chat/ChatMessageSchema';
import { store } from '../../state/store';
import { chatAPI } from '../../api/endpoints';
import { getOtherParticipantPublicKey } from '../../storage/sqllite/chat/Participants';
import { encryptMessage } from '../../helper/Encryption';

interface PendingMessage {
  payload: any;
  attempts: number;
  lastTriedAt: number;
}

class OutgoingMessageManagerClass {
  private static instance: OutgoingMessageManagerClass;

  private pendingQueue: PendingMessage[] = [];
  private isFlushing = false;

  private constructor() {
    if (OutgoingMessageManagerClass.instance) {
      return OutgoingMessageManagerClass.instance;
    }

    OutgoingMessageManagerClass.instance = this;

    // When socket connects, try to flush pending messages
    SocketService.on('connected', () => {
      this.flushQueue().catch(err =>
        console.error('[OutgoingMessageManager] flushQueue on connect error:', err),
      );
    });
  }

  public static getInstance(): OutgoingMessageManagerClass {
    if (!OutgoingMessageManagerClass.instance) {
      OutgoingMessageManagerClass.instance = new OutgoingMessageManagerClass();
    }
    return OutgoingMessageManagerClass.instance;
  }

  /**
   * Public API: Send a text message
   *
   * FLOW (matching old SendMessageApi.js):
   * 1. Validate input + auth
   * 2. Create message metadata (refrenceId, timestamps) - matching old chatScreen.js payload
   * 3. Insert into local DB (SOURCE OF TRUTH)
   * 4. Call chat/send-message API with plaintext
   * 5. Get other participant's public key
   * 6. Encrypt message
   * 7. Send encrypted message via socket
   * 8. If fails/offline, enqueue for retry
   */
  public async sendTextMessage(
    chatId: string,
    text: string,
    options?: {
      replyMessage?: any;
      blockedIds?: string[];
      disappearTime?: { disappear_at: string | null; is_disappearing: boolean };
    }
  ): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    // 1. Auth / validation
    const { auth } = store.getState();
    const currentUserId = auth.uniqueId;
    if (!currentUserId) {
      console.warn('[OutgoingMessageManager] Cannot send message, no current user id');
      return;
    }

    if (!chatId) {
      console.warn('[OutgoingMessageManager] Cannot send message, no chatId');
      return;
    }

    // 2. Create metadata - matching old chatScreen.js payload structure (lines 2216-2239)
    const now = new Date();
    const nowIso = now.toISOString();
    const refrenceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if text is URL
    const urlPattern = /^(https?:\/\/|www\.)/i;
    const isURL = urlPattern.test(trimmed);

    // Disappear time (default: not disappearing)
    const disappearTime = options?.disappearTime || {
      disappear_at: null,
      is_disappearing: false,
    };

    // Blocked IDs (default: empty array)
    const blockedIds = options?.blockedIds || [];
    const samvada_spashtam = blockedIds.length > 0 && blockedIds.includes(currentUserId)
      ? blockedIds
      : null;

    // Reply message (pratisandeshah)
    const pratisandeshah = options?.replyMessage
      ? JSON.stringify({
          lastRefrenceId: options.replyMessage.refrenceId,
          lastSenderId: options.replyMessage.pathakah_chinha,
          lastType: options.replyMessage.sandesha_prakara,
          lastContent: options.replyMessage.vishayah,
          lastUkti: options.replyMessage.ukti || '',
        })
      : '';

    const basePayload = {
      samvada_chinha: chatId,
      pathakah_chinha: currentUserId,
      vishayah: trimmed,
      sandesha_prakara: isURL ? 'link' : 'text',
      anuvadata_sandesham: false,
      pratisandeshah,
      refrenceId,
      samvada_spashtam,
      kimFwdSandesha: false,
      preritam_tithih: nowIso,
      nirastah: false,
      avastha: 'sent',
      disappear_at: disappearTime.disappear_at,
      is_disappearing: disappearTime.is_disappearing,
      ukti: '',
      kimTaritaSandesha: false,
      sthapitam_sandesham: null,
      sampaditam: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      prasaranamId: '',
    };

    try {
      // 3. Insert into local DB first (source of truth)
      await insertChatMessage(basePayload);
      console.log('[OutgoingMessageManager] Inserted outgoing message into DB:', {
        chatId,
        refrenceId,
      });
    } catch (error) {
      console.error('[OutgoingMessageManager] Failed to insert message into DB:', error);
      // Even if DB insert fails, we can still try sending, but UI might not show it correctly
    }

    // 4. Call chat/send-message API with plaintext (matching old SendMessageApi.js line 47-48)
    // try {
    //   await chatAPI.sendMessagePlaintext(basePayload);
    //   console.log('[OutgoingMessageManager] Plaintext message sent to API:', {
    //     chatId,
    //     refrenceId,
    //   });
    // } catch (error) {
    //   console.error('[OutgoingMessageManager] Error calling chat/send-message API:', error);
    //   // Continue even if API call fails - encryption and socket send can still proceed
    // }

    // 5. Get other participant's public key
    const otherParticipant = await getOtherParticipantPublicKey(chatId, currentUserId);
    if (!otherParticipant || !otherParticipant.publicKey) {
      console.warn('[OutgoingMessageManager] No public key found for other participant, sending plaintext');
      // Send plaintext if no encryption key available
      await this.sendViaSocket(basePayload);
      return;
    }

    // 6. Encrypt message (matching old SendMessageApi.js line 54)
    let encryptedPayload;
    try {
      const encryptedBody = await encryptMessage(basePayload.vishayah, otherParticipant.publicKey);
      encryptedPayload = {
        ...basePayload,
        samvada_spashtam: blockedIds,
        vishayah: encryptedBody,
      };
      console.log('[OutgoingMessageManager] Message encrypted successfully');
    } catch (error) {
      console.error('[OutgoingMessageManager] Encryption failed, sending plaintext as fallback:', error);
      encryptedPayload = {
        ...basePayload,
        samvada_spashtam: blockedIds,
        vishayah: basePayload.vishayah, // Keep original
      };
    }

    // 7. Send encrypted message to API (matching old SendMessageApi.js sendToApi - line 151)
    try {
      // Add IP address if available (optional - can be added later with NetworkInfo)
      const encryptedPayloadWithIP = {
        ...encryptedPayload,
        ip_address: 'Unknown', // TODO: Get actual IP using NetworkInfo if needed
      };
      
      await chatAPI.sendEncryptedMessage(encryptedPayloadWithIP);
      console.log('[OutgoingMessageManager] Encrypted message sent to API:', {
        chatId,
        refrenceId,
      });
    } catch (error) {
      console.error('[OutgoingMessageManager] Error sending encrypted message to API:', error);
      // Continue even if API call fails - socket send can still proceed
    }

    // 8. Send encrypted message via socket
    await this.sendViaSocket(encryptedPayload);
  }

  /**
   * Send message via socket (with retry logic)
   */
  private async sendViaSocket(payload: any): Promise<void> {
    if (SocketService.isConnected()) {
      try {
        await SocketService.sendMessage(payload);
        console.log('[OutgoingMessageManager] Message sent via socket:', {
          chatId: payload.samvada_chinha,
          refrenceId: payload.refrenceId,
        });
      } catch (error) {
        console.error('[OutgoingMessageManager] Socket send failed, enqueuing:', error);
        this.enqueue(payload);
      }
    } else {
      console.log('[OutgoingMessageManager] Socket not connected, enqueuing message');
      this.enqueue(payload);
    }
  }

  /**
   * Enqueue a message for later retry
   */
  private enqueue(payload: any): void {
    this.pendingQueue.push({
      payload,
      attempts: 0,
      lastTriedAt: Date.now(),
    });
  }

  /**
   * Flush pending messages when possible
   */
  public async flushQueue(): Promise<void> {
    if (this.isFlushing) return;
    if (!SocketService.isConnected()) return;
    if (this.pendingQueue.length === 0) return;

    this.isFlushing = true;
    console.log('[OutgoingMessageManager] Flushing pending queue:', this.pendingQueue.length);

    const stillPending: PendingMessage[] = [];

    for (const item of this.pendingQueue) {
      try {
        await SocketService.sendMessage(item.payload);
        console.log('[OutgoingMessageManager] Retried message sent:', {
          chatId: item.payload?.samvada_chinha,
          refrenceId: item.payload?.refrenceId,
        });
      } catch (error) {
        console.error('[OutgoingMessageManager] Retry failed for message:', {
          chatId: item.payload?.samvada_chinha,
          refrenceId: item.payload?.refrenceId,
          error,
        });

        const attempts = item.attempts + 1;
        if (attempts < 3) {
          stillPending.push({
            payload: item.payload,
            attempts,
            lastTriedAt: Date.now(),
          });
        } else {
          console.error('[OutgoingMessageManager] Dropping message after max retries:', {
            chatId: item.payload?.samvada_chinha,
            refrenceId: item.payload?.refrenceId,
          });
        }
      }
    }

    this.pendingQueue = stillPending;
    this.isFlushing = false;
  }
}

export const OutgoingMessageManager = OutgoingMessageManagerClass.getInstance();


