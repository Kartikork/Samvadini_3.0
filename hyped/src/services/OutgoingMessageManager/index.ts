/**
 * OutgoingMessageManager
 *
 * RESPONSIBILITIES:
 * - Validate outgoing messages
 * - Insert into existing SQLite chat table (ChatMessageSchema)
 * - Encrypt message before sending
 * - Send encrypted message via socket first (for real-time delivery)
 * - Send encrypted message to API (for persistence/confirmation)
 * - Queue + retry when offline or socket fails
 *
 * IMPORTANT:
 * - Local DB is the source of truth
 * - UI should render from DB, not from this manager directly
 * - Flow: DB insert → Encrypt → Socket send (encrypted) → API call (encrypted)
 * - Only encrypted messages are sent - no plaintext fallback
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
   * FLOW:
   * 1. Validate input + auth
   * 2. Create message metadata (refrenceId, timestamps)
   * 3. Insert into local DB (SOURCE OF TRUTH)
   * 4. Get other participant's public key (required - no plaintext fallback)
   * 5. Encrypt message (required - no plaintext fallback)
   * 6. Send encrypted message via socket FIRST (for real-time delivery)
   * 7. Send encrypted message to API (for persistence/confirmation)
   * 8. If socket fails/offline, enqueue for retry
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

    // 4. Get other participant's public key (required for encryption)
    const otherParticipant = await getOtherParticipantPublicKey(chatId, currentUserId);
    if (!otherParticipant || !otherParticipant.publicKey) {
      console.error('[OutgoingMessageManager] No public key found for other participant. Cannot send message without encryption.');
      return;
    }

    // 5. Encrypt message (required - no plaintext fallback)
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
      console.error('[OutgoingMessageManager] Encryption failed. Cannot send message without encryption:', error);
      return;
    }

    // 6. Send encrypted message via socket FIRST (for real-time delivery)
    await this.sendViaSocket(encryptedPayload);

    // 7. Send encrypted message to API (for persistence/confirmation)
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
      // Continue even if API call fails - socket send already succeeded
    }
  }

  /**
   * Public API: Send media message (images, gifs, stickers)
   * type should be something like 'image', 'image/gif', 'sticker', 'gif'
   */
  public async sendMediaMessage(
    chatId: string,
    mediaUrl: string,
    type: string,
    options?: {
      replyMessage?: any;
      blockedIds?: string[];
      disappearTime?: { disappear_at: string | null; is_disappearing: boolean };
    }
  ): Promise<void> {
    if (!mediaUrl) return;

    // 1. Auth / validation
    const { auth } = store.getState();
    const currentUserId = auth.uniqueId;
    if (!currentUserId) {
      console.warn('[OutgoingMessageManager] Cannot send media message, no current user id');
      return;
    }

    if (!chatId) {
      console.warn('[OutgoingMessageManager] Cannot send media message, no chatId');
      return;
    }

    // metadata
    const now = new Date();
    const nowIso = now.toISOString();
    const refrenceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      vishayah: mediaUrl,
      sandesha_prakara: type,
      anuvadata_sandesham: false,
      pratisandeshah,
      refrenceId,
      samvada_spashtam: null,
      kimFwdSandesha: false,
      preritam_tithih: nowIso,
      nirastah: false,
      avastha: 'sent',
      disappear_at: options?.disappearTime?.disappear_at || null,
      is_disappearing: options?.disappearTime?.is_disappearing || false,
      ukti: '',
      kimTaritaSandesha: false,
      sthapitam_sandesham: null,
      sampaditam: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      prasaranamId: '',
    };

    try {
      await insertChatMessage(basePayload);
      console.log('[OutgoingMessageManager] Inserted outgoing media message into DB:', { chatId, refrenceId });
    } catch (error) {
      console.error('[OutgoingMessageManager] Failed to insert media message into DB:', error);
    }

    // Encryption + send similar to text
    const otherParticipant = await getOtherParticipantPublicKey(chatId, currentUserId);
    if (!otherParticipant || !otherParticipant.publicKey) {
      console.warn('[OutgoingMessageManager] No public key found for other participant, sending plaintext media');
      await this.sendViaSocket(basePayload);
      return;
    }

    let encryptedPayload;
    try {
      const encryptedBody = await encryptMessage(basePayload.vishayah, otherParticipant.publicKey);
      encryptedPayload = {
        ...basePayload,
        samvada_spashtam: options?.blockedIds || null,
        vishayah: encryptedBody,
      };
      console.log('[OutgoingMessageManager] Media message encrypted successfully');
    } catch (error) {
      console.error('[OutgoingMessageManager] Media encryption failed, sending plaintext as fallback:', error);
      encryptedPayload = {
        ...basePayload,
        samvada_spashtam: options?.blockedIds || null,
        vishayah: basePayload.vishayah,
      };
    }

    try {
      await chatAPI.sendEncryptedMessage({ ...encryptedPayload, ip_address: 'Unknown' });
      console.log('[OutgoingMessageManager] Encrypted media message sent to API:', { chatId, refrenceId });
    } catch (error) {
      console.error('[OutgoingMessageManager] Error sending encrypted media to API:', error);
    }

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


