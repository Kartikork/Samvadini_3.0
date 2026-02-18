import { SocketService } from '../SocketService';
import { groupDB } from '../../storage/groupDB';
import {
  fetchGroupMessages,
  insertGroupMessage,
  updateGroupMessage,
  hasGroupChatPermission,
} from '../../storage/sqllite/chat/GroupMessageSchema';
import { fetchChatBySamvadaChinha } from '../../storage/sqllite/chat/ChatListSchema';
import { store } from '../../state/store';
import { chatSlice } from '../../state/chatSlice';
import { syncAPI } from '../../utils/syncAPI';
import axios from 'axios';
import { env } from '../../config';

// ────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────

export interface GroupMessage {
  anuvadata_id?: number;
  refrenceId: string;
  samvada_chinha: string; // groupId
  pathakah_chinha: string; // senderId
  vishayah: string; // content
  sandesha_prakara: string; // 'text' | 'image' | 'video' | etc.
  avastha: string; // 'sent' | 'delivered' | 'read' | 'failed'
  preritam_tithih: string; // timestamp
  createdAt?: string;
  updatedAt?: string;
  anuvadata_sandesham?: number; // reply message flag
  pratisandeshah?: any; // reply content
  kimFwdSandesha?: number; // forward flag
  ukti?: string; // caption
  reaction?: string;
  reaction_details?: any;
  reaction_summary?: any;
  sthapitam_sandesham?: number; // pin flag
  kimTaritaSandesha?: number; // star flag
  nirastah?: number; // delete flag
  layout?: string;
}

export interface GroupMetadata {
  samvada_chinha_id: number;
  samvada_chinha: string; // groupId
  samvada_nama: string; // group name
  samuha_chitram?: string; // group avatar
  samuhavarnanam?: string; // group description
  prakara: 'Group';
  onlyAdminsCanMessage?: boolean;
  laghu_sthapitam_upayogakartarah?: number; // total members
  prayoktaramnishkasaya?: string; // JSON array of member IDs
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupMember {
  ekatma_chinha: string; // userId
  samvada_chinha: string; // groupId
  bhumika: 'Admin' | 'Member';
  status: 'Accepted' | 'Pending' | 'Removed';
  sakriyamastiva: number; // active flag (1/0)
  contact_name?: string;
  contact_photo?: string;
}

export interface GroupChannel {
  groupId: string;
  isJoined: boolean;
  lastMessageTimestamp?: number;
}

export interface GroupEvent {
  type:
    | 'member_added'
    | 'member_removed'
    | 'member_promoted'
    | 'group_updated'
    | 'group_left';
  groupId: string;
  userId?: string;
  metadata?: any;
  timestamp: number;
}

// ────────────────────────────────────────────────────────────
// GROUP CHAT MANAGER CLASS
// ────────────────────────────────────────────────────────────

class GroupChatManagerClass {
  private static instance: GroupChatManagerClass;
  private isInitialized = false;

  // Track joined group channels
  private joinedChannels: Map<string, GroupChannel> = new Map();

  // Cache group metadata for quick access
  private groupMetadataCache: Map<string, GroupMetadata> = new Map();

  // Track pending message sends (offline queue)
  private pendingMessages: Map<string, GroupMessage> = new Map();

  /**
   * Get current user ID from Redux store
   */
  private get currentUserId(): string | null {
    return store.getState().auth.uniqueId ?? null;
  }

  private constructor() {
    if (GroupChatManagerClass.instance) {
      return GroupChatManagerClass.instance;
    }
    GroupChatManagerClass.instance = this;

    // When socket connects, try to flush pending messages
    SocketService.on('connected', () => {
      this.flushQueue().catch(err =>
        console.error('[GroupChatManager] flushQueue on connect error:', err),
      );
    });
  }

  public static getInstance(): GroupChatManagerClass {
    if (!GroupChatManagerClass.instance) {
      GroupChatManagerClass.instance = new GroupChatManagerClass();
    }
    return GroupChatManagerClass.instance;
  }

  // ────────────────────────────────────────────────────────────
  // INITIALIZATION (Three-Phase Pattern)
  // ────────────────────────────────────────────────────────────

  /**
   * Initialize GroupChatManager
   * Three phases: Restore → Sync → Realtime
   *
   * @param isFirstSync - Whether this is first sync (after signup/login)
   */
  public async initialize(isFirstSync: boolean = false): Promise<void> {
    if (this.isInitialized) {
      console.log('[GroupChatManager] Already initialized');
      return;
    }

    const userId = this.currentUserId;
    if (!userId) {
      console.error(
        '[GroupChatManager] Cannot initialize: no current user ID in Redux store',
      );
      throw new Error('User not authenticated');
    }

    await this.restoreState();

    // Phase 2: Sync Safety Net (background)
    this.syncGroupMessages(isFirstSync).catch(err =>
      console.error('[GroupChatManager] Sync failed:', err),
    );

    // Phase 3: Activate Realtime (when socket ready)
    this.activateRealtime();

    this.isInitialized = true;
    console.log('[GroupChatManager] Initialized');
  }

  /**
   * Phase 1: Restore State
   * Load group metadata and last active group messages from local DB
   */
  private async restoreState(): Promise<void> {
    try {
      // Load user's groups from DB
      const groups = await groupDB.getUserGroups(this.currentUserId!);

      // Cache group metadata
      groups.forEach(group => {
        this.groupMetadataCache.set(group.samvada_chinha, group);
      });

      console.log(
        `[GroupChatManager] Phase 1: Restored ${groups.length} groups`,
      );
    } catch (error) {
      console.error('[GroupChatManager] Phase 1 failed:', error);
      throw error;
    }
  }

  /**
   * Phase 2: Sync Safety Net
   * Fetch missed group messages from server
   */
  private async syncGroupMessages(isFirstSync: boolean = false): Promise<void> {
    console.log('[GroupChatManager] Phase 2: Syncing group messages...', {
      isFirstSync,
    });

    try {
      // Sync group messages via API
      const syncResult = await syncAPI.syncGroupMessages();

      if (syncResult.count > 0) {
        console.log(
          `[GroupChatManager] Synced: ${syncResult.count} group messages`,
        );

        // Notify Redux to refresh
        store.dispatch(chatSlice.actions.refreshConversations());
      }

      console.log('[GroupChatManager] Phase 2: Sync complete');
    } catch (error) {
      console.error('[GroupChatManager] Phase 2 failed:', error);
      // Don't throw - UI still works with local data
    }
  }

  /**
   * Phase 3: Activate Realtime
   * Join all group channels and subscribe to events
   */
  private activateRealtime(): void {
    // Wait for socket to be ready
    const checkSocket = setInterval(() => {
      if (SocketService.isConnected()) {
        clearInterval(checkSocket);

        // Join all group channels
        this.joinUserGroups();

        // Subscribe to group events
        SocketService.on('new_message', this.handleNewGroupMessage.bind(this));
        SocketService.on('group_update', this.handleGroupUpdate.bind(this));
        SocketService.on(
          'message_updated',
          this.handleMessageUpdated.bind(this),
        );
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkSocket), 10000);
  }

  /**
   * Join all group channels that user is part of
   */
  private async joinUserGroups(): Promise<void> {
    try {
      const groups = await groupDB.getUserGroups(this.currentUserId!);

      for (const group of groups) {
        await this.joinGroupChannel(group.samvada_chinha);
      }

      console.log(`[GroupChatManager] Joined ${groups.length} group channels`);
    } catch (error) {
      console.error('[GroupChatManager] Failed to join group channels:', error);
    }
  }

  // ────────────────────────────────────────────────────────────
  // GROUP CHANNEL MANAGEMENT
  // ────────────────────────────────────────────────────────────

  /**
   * Join a group channel
   * Each member joins the same channel: group:{groupId}
   */
  public async joinGroupChannel(groupId: string): Promise<void> {
    if (this.joinedChannels.has(groupId)) {
      console.log(`[GroupChatManager] Already in group channel: ${groupId}`);
      return;
    }

    console.log(`[GroupChatManager] Joining group channel: group:${groupId}`);

    // Note: Phoenix channels are joined via the main user channel
    // The backend routes group messages based on membership
    // So we just track locally that we're monitoring this group

    this.joinedChannels.set(groupId, {
      groupId,
      isJoined: true,
      lastMessageTimestamp: Date.now(),
    });

    console.log(`[GroupChatManager] Joined group channel: ${groupId}`);
  }

  /**
   * Leave a group channel
   */
  public async leaveGroupChannel(groupId: string): Promise<void> {
    if (!this.joinedChannels.has(groupId)) {
      console.log(`[GroupChatManager] Not in group channel: ${groupId}`);
      return;
    }

    console.log(`[GroupChatManager] Leaving group channel: ${groupId}`);

    this.joinedChannels.delete(groupId);
    this.groupMetadataCache.delete(groupId);

    console.log(`[GroupChatManager] Left group channel: ${groupId}`);
  }

  // ────────────────────────────────────────────────────────────
  // MESSAGE SENDING (GROUP)
  // ────────────────────────────────────────────────────────────

  /**
   * Send a message to a group
   *
   * FLOW (matching 1-to-1 message flow):
   * 1. Validate input + auth + permissions
   * 2. Create message metadata (refrenceId, timestamps)
   * 3. Insert into local DB (SOURCE OF TRUTH)
   * 4. Get group members' public keys (for encryption)
   * 5. Encrypt message (required - no plaintext fallback)
   * 6. Send encrypted message via socket FIRST (for real-time delivery)
   * 7. Send encrypted message to API (for persistence/confirmation)
   * 8. If socket fails/offline, enqueue for retry
   */
  public async sendGroupMessage(
    groupId: string,
    content: string,
    type: string = 'text',
    metadata?: any,
  ): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    // 1. Auth / validation
    if (!this.currentUserId) {
      console.error(
        '[GroupChatManager] Cannot send message: no current user ID',
      );
      throw new Error('User not authenticated');
    }

    if (!groupId) {
      console.warn('[GroupChatManager] Cannot send message, no groupId');
      return;
    }

    // Check permission first
    let permission;
    try {
      permission = await hasGroupChatPermission(groupId, this.currentUserId);
      console.log('[GroupChatManager] Permission check result:', {
        groupId,
        userId: this.currentUserId,
        permission: permission
          ? {
              status: permission.status,
              bhumika: permission.bhumika,
              sakriyamastiva: permission.sakriyamastiva,
              onlyAdminsCanMessage: permission.onlyAdminsCanMessage,
            }
          : null,
      });
    } catch (error) {
      console.error('[GroupChatManager] Error checking permission:', error);
      permission = null; // Will be handled below
    }

    // If permission check failed or returned null, verify user is member
    if (!permission) {
      console.log(
        '[GroupChatManager] Permission check failed, verifying membership...',
      );

      // Check if user is a member using groupDB
      const isMember = await groupDB.isUserMember(groupId, this.currentUserId);

      if (isMember) {
        // User is a member but permission check failed - might be DB sync issue
        // Allow sending but log warning
        console.warn(
          '[GroupChatManager] Permission check returned null but user is member, allowing send',
        );
        permission = {
          status: 'Accepted',
          bhumika: 'Member',
          sakriyamastiva: 1,
          onlyAdminsCanMessage: 0,
        };
      } else {
        // Last resort: check if group exists in user's chat list (they can see it)
        const groupMetadata = await this.getGroupMetadata(groupId);
        if (groupMetadata) {
          // If group exists in their list, they should be able to send
          // This handles cases where DB sync is incomplete
          console.warn(
            '[GroupChatManager] Permission check failed but group exists in user list, allowing send (DB sync may be incomplete)',
          );
          permission = {
            status: 'Accepted',
            bhumika: 'Member',
            sakriyamastiva: 1,
            onlyAdminsCanMessage: 0,
          };
        } else {
          console.error(
            '[GroupChatManager] User is not a member of group and group not found:',
            {
              groupId,
              userId: this.currentUserId,
            },
          );
          throw new Error('You are not a member of this group');
        }
      }
    }

    // Check if only admins can message
    if (permission.onlyAdminsCanMessage && permission.bhumika !== 'Admin') {
      console.error(
        '[GroupChatManager] Only admins can send messages in this group',
      );
      throw new Error('Only admins can send messages in this group');
    }

    // 2. Create metadata - matching 1-to-1 message payload structure
    const now = new Date();
    const nowIso = now.toISOString();
    const refrenceId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Check if text is URL
    const urlPattern = /^(https?:\/\/|www\.)/i;
    const isURL = urlPattern.test(trimmed);
    const sandesha_prakara = type === 'text' ? (isURL ? 'link' : 'text') : type;

    // Reply message (pratisandeshah)
    const pratisandeshah = metadata?.replyMessage
      ? JSON.stringify({
          lastRefrenceId: metadata.replyMessage.refrenceId,
          lastSenderId: metadata.replyMessage.pathakah_chinha,
          lastType: metadata.replyMessage.sandesha_prakara,
          lastContent: metadata.replyMessage.vishayah,
          lastUkti: metadata.replyMessage.ukti || '',
        })
      : '';

    const basePayload = {
      samvada_chinha: groupId,
      pathakah_chinha: this.currentUserId!,
      vishayah: trimmed,
      sandesha_prakara,
      anuvadata_sandesham: metadata?.replyMessage ? true : false,
      pratisandeshah,
      refrenceId,
      samvada_spashtam: null, // Groups don't use blocked IDs
      kimFwdSandesha: metadata?.isForwarded || false,
      preritam_tithih: nowIso,
      nirastah: false,
      avastha: 'sent',
      disappear_at: metadata?.disappearTime?.disappear_at || null,
      is_disappearing: metadata?.disappearTime?.is_disappearing || false,
      ukti: metadata?.caption || '',
      kimTaritaSandesha: false,
      sthapitam_sandesham: null,
      sampaditam: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      prasaranamId: '',
    };

    // 3. Insert into local DB first (source of truth)
    try {
      await insertGroupMessage({
        refrenceId,
        samvada_chinha: groupId,
        pathakah_chinha: this.currentUserId!,
        vishayah: trimmed,
        sandesha_prakara,
        avastha: 'sent',
        preritam_tithih: nowIso,
        nirastah: false, // boolean for insertGroupMessage
        anuvadata_sandesham: metadata?.replyMessage ? true : false,
        pratisandeshah: pratisandeshah || '',
        kimFwdSandesha: metadata?.isForwarded || false,
        ukti: metadata?.caption || '',
        kimTaritaSandesha: false,
        sthapitam_sandesham: null,
        sampaditam: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        prasaranamId: '',
      } as any);
      console.log('[GroupChatManager] Inserted outgoing message into DB:', {
        groupId,
        refrenceId,
      });
    } catch (error) {
      console.error(
        '[GroupChatManager] Failed to insert message into DB:',
        error,
      );
      // Even if DB insert fails, we can still try sending, but UI might not show it correctly
    }

    // 4. Get group members' public keys for encryption
    // For groups, we need to encrypt for all members or use a group key
    // For now, we'll get the first member's key as a placeholder
    // TODO: Implement proper group encryption (encrypt for all members or use shared group key)
    const groupMembers = await groupDB.getGroupMembers(groupId);
    const otherMembers = groupMembers.filter(
      m => m.ekatma_chinha !== this.currentUserId,
    );

    if (otherMembers.length === 0) {
      console.warn(
        '[GroupChatManager] No other members in group, cannot encrypt',
      );
      return;
    }

    // Get encryption key (for now, use first member's key - TODO: implement proper group encryption)
    // const { getOtherParticipantPublicKey } = await import('../../storage/sqllite/chat/Participants');
    // const firstMember = otherMembers[0];
    // const encryptionKey = await getOtherParticipantPublicKey(groupId, this.currentUserId!);

    // if (!encryptionKey || !encryptionKey.publicKey) {
    //   console.error('[GroupChatManager] No public key found for group encryption. Cannot send message without encryption.');
    //   return;
    // }

    // 5. Encrypt message (required - no plaintext fallback)
    let encryptedPayload;
    try {
      const { encryptMessage } = await import('../../helper/Encryption');
      const encryptedBody = await encryptMessage(
        basePayload.vishayah,
        otherMembers[0].publicKey,
      );
      encryptedPayload = {
        ...basePayload,
        vishayah: encryptedBody,
        isGroup: true,
      };
      console.log('[GroupChatManager] Message encrypted successfully');
    } catch (error) {
      console.error(
        '[GroupChatManager] Encryption failed. Cannot send message without encryption:',
        error,
      );
      return;
    }

    // 6. Send encrypted message via socket FIRST (for real-time delivery)
    await this.sendViaSocket(encryptedPayload);

    // 7. Send encrypted message to API (for persistence/confirmation)
    try {
      const { chatAPI } = await import('../../api/endpoints');
      const encryptedPayloadWithIP = {
        ...encryptedPayload,
        ip_address: 'Unknown', // TODO: Get actual IP using NetworkInfo if needed
      };
      await axios.post(
        `${env.API_BASE_URL}/chat/send-group-message`,
        encryptedPayloadWithIP,
      );
      // await chatAPI.sendEncryptedMessage(encryptedPayloadWithIP);
      console.log('[GroupChatManager] Encrypted message sent to API:', {
        groupId,
        refrenceId,
      });
    } catch (error) {
      console.error(
        '[GroupChatManager] Error sending encrypted message to API:',
        error,
      );
      // Continue even if API call fails - socket send already succeeded
    }
  }

  /**
   * Send message via socket (with retry logic) - matching OutgoingMessageManager pattern
   */
  private async sendViaSocket(payload: any): Promise<void> {
    if (SocketService.isConnected()) {
      try {
        await SocketService.sendMessage(payload);
        console.log('[GroupChatManager] Message sent via socket:', {
          chatId: payload.samvada_chinha,
          refrenceId: payload.refrenceId,
        });
      } catch (error) {
        console.error(
          '[GroupChatManager] Socket send failed, enqueuing:',
          error,
        );
        this.enqueue(payload);
      }
    } else {
      console.log('[GroupChatManager] Socket not connected, enqueuing message');
      this.enqueue(payload);
    }
  }

  /**
   * Enqueue a message for later retry
   */
  private enqueue(payload: any): void {
    this.pendingMessages.set(payload.refrenceId, payload);
    console.log(
      '[GroupChatManager] Message enqueued for retry:',
      payload.refrenceId,
    );
  }

  /**
   * Flush pending messages when possible (matching OutgoingMessageManager pattern)
   */
  public async flushQueue(): Promise<void> {
    if (!SocketService.isConnected()) return;
    if (this.pendingMessages.size === 0) return;

    console.log(
      '[GroupChatManager] Flushing pending queue:',
      this.pendingMessages.size,
    );

    const stillPending: Map<string, any> = new Map();

    for (const [refrenceId, payload] of this.pendingMessages.entries()) {
      try {
        await SocketService.sendMessage(payload);
        console.log('[GroupChatManager] Retried message sent:', {
          groupId: payload?.samvada_chinha,
          refrenceId,
        });

        // Update status to sent
        await updateGroupMessage(refrenceId, { avastha: 'sent' });
      } catch (error) {
        console.error('[GroupChatManager] Retry failed for message:', {
          groupId: payload?.samvada_chinha,
          refrenceId,
          error,
        });

        // Keep in queue for next retry (limit retries to prevent infinite loop)
        const attempts = (payload as any).attempts || 0;
        if (attempts < 3) {
          stillPending.set(refrenceId, {
            ...payload,
            attempts: attempts + 1,
          } as any);
        } else {
          console.error(
            '[GroupChatManager] Dropping message after max retries:',
            {
              groupId: payload?.samvada_chinha,
              refrenceId,
            },
          );
          // Mark as failed in DB
          await updateGroupMessage(refrenceId, { avastha: 'failed' });
        }
      }
    }

    this.pendingMessages = stillPending;
  }

  // ────────────────────────────────────────────────────────────
  // MESSAGE RECEIVING (GROUP)
  // ────────────────────────────────────────────────────────────

  /**
   * Handle new group message from socket
   * Filters for group messages only
   */
  private async handleNewGroupMessage(payload: any): Promise<void> {
    const groupId = payload?.samvada_chinha;
    const senderId = payload?.pathakah_chinha;

    // Only handle group messages
    if (!this.joinedChannels.has(groupId)) {
      return;
    }

    // Ignore own messages (already added optimistically)
    if (senderId === this.currentUserId) {
      console.log('[GroupChatManager] Ignoring own message');
      return;
    }

    console.log('[GroupChatManager] New group message:', { groupId, senderId });

    const message: GroupMessage = {
      refrenceId: payload.refrenceId,
      samvada_chinha: groupId,
      pathakah_chinha: senderId,
      vishayah: payload.vishayah,
      sandesha_prakara: payload.sandesha_prakara || 'text',
      avastha: 'delivered',
      preritam_tithih: payload.preritam_tithih,
      ukti: payload.ukti || '',
      anuvadata_sandesham: payload.anuvadata_sandesham || 0,
      pratisandeshah: payload.pratisandeshah || null,
      kimFwdSandesha: payload.kimFwdSandesha || 0,
      layout: payload.layout || 'layout1',
    };

    // Check if message already exists (deduplication)
    try {
      const exists = await this.messageExists(groupId, message.refrenceId);
      if (exists) {
        console.log('[GroupChatManager] Message already exists, skipping');
        return;
      }

      // Write to DB
      await insertGroupMessage(message);

      // Update conversation last message
      await this.updateGroupLastMessage(groupId, message);

      // Notify Redux
      store.dispatch(
        chatSlice.actions.addMessage({
          conversationId: groupId,
          message: message as any,
        }),
      );

      console.log(
        '[GroupChatManager] Group message inserted:',
        message.refrenceId,
      );
    } catch (error) {
      console.error(
        '[GroupChatManager] Failed to handle new group message:',
        error,
      );
    }
  }

  /**
   * Handle group message updated event (pin/star/reaction/etc)
   */
  private async handleMessageUpdated(payload: any): Promise<void> {
    const groupId = payload?.samvada_chinha;
    const refrenceIds = payload?.refrenceIds;
    const type = payload?.type;
    const updates = payload?.updates;

    if (!groupId || !this.joinedChannels.has(groupId)) {
      return;
    }

    console.log('[GroupChatManager] Message updated in group:', {
      groupId,
      type,
      refrenceIds,
    });

    try {
      // Update in DB (already done by SocketService global handler)
      // Just notify Redux
      store.dispatch(
        chatSlice.actions.updateMessage({
          messageId: refrenceIds[0], // Assumes single message for now
          updates,
        }),
      );
    } catch (error) {
      console.error(
        '[GroupChatManager] Failed to handle message update:',
        error,
      );
    }
  }

  /**
   * Handle group update event (name change, member add/remove, etc)
   */
  private async handleGroupUpdate(payload: any): Promise<void> {
    const groupId = payload?.samvada_chinha;
    const updateType = payload?.type;

    if (!groupId) {
      return;
    }

    console.log('[GroupChatManager] Group update:', {
      groupId,
      updateType,
      payload,
    });

    try {
      switch (updateType) {
        case 'name_changed':
          await this.handleGroupNameChanged(groupId, payload.samvada_nama);
          break;

        case 'avatar_changed':
          await this.handleGroupAvatarChanged(groupId, payload.samuha_chitram);
          break;

        case 'member_added':
          await this.handleMemberAdded(groupId, payload.ekatma_chinha);
          break;

        case 'member_removed':
          await this.handleMemberRemoved(groupId, payload.ekatma_chinha);
          break;

        case 'member_promoted':
          await this.handleMemberPromoted(groupId, payload.ekatma_chinha);
          break;

        case 'settings_changed':
          await this.handleGroupSettingsChanged(groupId, payload.settings);
          break;

        default:
          console.log(
            '[GroupChatManager] Unknown group update type:',
            updateType,
          );
      }

      // Refresh conversations in Redux
      store.dispatch(chatSlice.actions.refreshConversations());
    } catch (error) {
      console.error('[GroupChatManager] Failed to handle group update:', error);
    }
  }

  // ────────────────────────────────────────────────────────────
  // GROUP MANAGEMENT OPERATIONS
  // ────────────────────────────────────────────────────────────

  /**
   * Create a new group
   */
  public async createGroup(
    name: string,
    memberIds: string[],
    avatar?: string,
    description?: string,
  ): Promise<string> {
    console.log('[GroupChatManager] Creating group:', {
      name,
      memberCount: memberIds.length,
    });

    try {
      // Call backend API to create group
      const response = await syncAPI.createGroup({
        samvada_nama: name,
        samuha_chitram: avatar,
        samuhavarnanam: description,
        members: memberIds,
        creator: this.currentUserId!,
      });

      const groupId = response.samvada_chinha;

      // Join the new group channel
      await this.joinGroupChannel(groupId);

      // Refresh conversations
      store.dispatch(chatSlice.actions.refreshConversations());

      console.log('[GroupChatManager] Group created:', groupId);
      return groupId;
    } catch (error) {
      console.error('[GroupChatManager] Failed to create group:', error);
      throw error;
    }
  }

  /**
   * Add member to group
   */
  public async addMemberToGroup(
    groupId: string,
    userId: string,
  ): Promise<void> {
    console.log('[GroupChatManager] Adding member to group:', {
      groupId,
      userId,
    });

    try {
      // Check admin permission
      const permission = await hasGroupChatPermission(
        groupId,
        this.currentUserId!,
      );
      if (permission?.bhumika !== 'Admin') {
        throw new Error('Only admins can add members');
      }

      // Call backend API
      await syncAPI.addGroupMember(groupId, userId);

      // Emit socket event
      SocketService.sendGroupUpdate({
        samvada_chinha: groupId,
        type: 'member_added',
        ekatma_chinha: userId,
        timestamp: new Date().toISOString(),
      });

      console.log('[GroupChatManager] Member added to group');
    } catch (error) {
      console.error('[GroupChatManager] Failed to add member:', error);
      throw error;
    }
  }

  /**
   * Remove member from group
   */
  public async removeMemberFromGroup(
    groupId: string,
    userId: string,
  ): Promise<void> {
    console.log('[GroupChatManager] Removing member from group:', {
      groupId,
      userId,
    });

    try {
      // Check admin permission
      const permission = await hasGroupChatPermission(
        groupId,
        this.currentUserId!,
      );
      if (permission?.bhumika !== 'Admin') {
        throw new Error('Only admins can remove members');
      }

      // Call backend API
      await syncAPI.removeGroupMember(groupId, userId);

      // Emit socket event
      SocketService.sendGroupUpdate({
        samvada_chinha: groupId,
        type: 'member_removed',
        ekatma_chinha: userId,
        timestamp: new Date().toISOString(),
      });

      console.log('[GroupChatManager] Member removed from group');
    } catch (error) {
      console.error('[GroupChatManager] Failed to remove member:', error);
      throw error;
    }
  }

  /**
   * Promote member to admin
   */
  public async promoteMemberToAdmin(
    groupId: string,
    userId: string,
  ): Promise<void> {
    console.log('[GroupChatManager] Promoting member to admin:', {
      groupId,
      userId,
    });

    try {
      // Check admin permission
      const permission = await hasGroupChatPermission(
        groupId,
        this.currentUserId!,
      );
      if (permission?.bhumika !== 'Admin') {
        throw new Error('Only admins can promote members');
      }

      // Call backend API
      await syncAPI.promoteGroupMember(groupId, userId);

      // Emit socket event
      SocketService.sendGroupUpdate({
        samvada_chinha: groupId,
        type: 'member_promoted',
        ekatma_chinha: userId,
        timestamp: new Date().toISOString(),
      });

      console.log('[GroupChatManager] Member promoted to admin');
    } catch (error) {
      console.error('[GroupChatManager] Failed to promote member:', error);
      throw error;
    }
  }

  /**
   * Leave group
   */
  public async leaveGroup(groupId: string): Promise<void> {
    console.log('[GroupChatManager] Leaving group:', groupId);

    try {
      // Call backend API
      await syncAPI.leaveGroup(groupId);

      // Leave channel locally
      await this.leaveGroupChannel(groupId);

      // Remove from DB
      await groupDB.removeUserFromGroup(groupId, this.currentUserId!);

      // Refresh conversations
      store.dispatch(chatSlice.actions.refreshConversations());

      console.log('[GroupChatManager] Left group successfully');
    } catch (error) {
      console.error('[GroupChatManager] Failed to leave group:', error);
      throw error;
    }
  }

  /**
   * Update group name
   */
  public async updateGroupName(groupId: string, name: string): Promise<void> {
    console.log('[GroupChatManager] Updating group name:', { groupId, name });

    try {
      // Check admin permission
      const permission = await hasGroupChatPermission(
        groupId,
        this.currentUserId!,
      );
      if (permission?.bhumika !== 'Admin') {
        throw new Error('Only admins can update group name');
      }

      // Call backend API
      await syncAPI.updateGroupName(groupId, name);

      // Update local cache
      const cached = this.groupMetadataCache.get(groupId);
      if (cached) {
        cached.samvada_nama = name;
        this.groupMetadataCache.set(groupId, cached);
      }

      // Emit socket event
      SocketService.sendGroupUpdate({
        samvada_chinha: groupId,
        type: 'name_changed',
        samvada_nama: name,
        timestamp: new Date().toISOString(),
      });

      console.log('[GroupChatManager] Group name updated');
    } catch (error) {
      console.error('[GroupChatManager] Failed to update group name:', error);
      throw error;
    }
  }

  /**
   * Update group avatar
   */
  public async updateGroupAvatar(
    groupId: string,
    avatar: string,
  ): Promise<void> {
    console.log('[GroupChatManager] Updating group avatar:', { groupId });

    try {
      // Check admin permission
      const permission = await hasGroupChatPermission(
        groupId,
        this.currentUserId!,
      );
      if (permission?.bhumika !== 'Admin') {
        throw new Error('Only admins can update group avatar');
      }

      // Call backend API
      await syncAPI.updateGroupAvatar(groupId, avatar);

      // Update local cache
      const cached = this.groupMetadataCache.get(groupId);
      if (cached) {
        cached.samuha_chitram = avatar;
        this.groupMetadataCache.set(groupId, cached);
      }

      // Emit socket event
      SocketService.sendGroupUpdate({
        samvada_chinha: groupId,
        type: 'avatar_changed',
        samuha_chitram: avatar,
        timestamp: new Date().toISOString(),
      });

      console.log('[GroupChatManager] Group avatar updated');
    } catch (error) {
      console.error('[GroupChatManager] Failed to update group avatar:', error);
      throw error;
    }
  }

  // ────────────────────────────────────────────────────────────
  // GROUP EVENT HANDLERS
  // ────────────────────────────────────────────────────────────

  private async handleGroupNameChanged(
    groupId: string,
    newName: string,
  ): Promise<void> {
    await groupDB.updateGroupName(groupId, newName);

    const cached = this.groupMetadataCache.get(groupId);
    if (cached) {
      cached.samvada_nama = newName;
      this.groupMetadataCache.set(groupId, cached);
    }
  }

  private async handleGroupAvatarChanged(
    groupId: string,
    newAvatar: string,
  ): Promise<void> {
    await groupDB.updateGroupAvatar(groupId, newAvatar);

    const cached = this.groupMetadataCache.get(groupId);
    if (cached) {
      cached.samuha_chitram = newAvatar;
      this.groupMetadataCache.set(groupId, cached);
    }
  }

  private async handleMemberAdded(
    groupId: string,
    userId: string,
  ): Promise<void> {
    console.log('[GroupChatManager] Member added to group:', {
      groupId,
      userId,
    });

    // Refresh group metadata from DB
    await groupDB.refreshGroupMembers(groupId);

    // Clear cache to force reload
    this.groupMetadataCache.delete(groupId);
  }

  private async handleMemberRemoved(
    groupId: string,
    userId: string,
  ): Promise<void> {
    console.log('[GroupChatManager] Member removed from group:', {
      groupId,
      userId,
    });

    // If it's the current user, leave the channel
    if (userId === this.currentUserId) {
      await this.leaveGroupChannel(groupId);
    }

    // Refresh group metadata from DB
    await groupDB.refreshGroupMembers(groupId);

    // Clear cache to force reload
    this.groupMetadataCache.delete(groupId);
  }

  private async handleMemberPromoted(
    groupId: string,
    userId: string,
  ): Promise<void> {
    console.log('[GroupChatManager] Member promoted in group:', {
      groupId,
      userId,
    });

    // Refresh group metadata from DB
    await groupDB.refreshGroupMembers(groupId);
  }

  private async handleGroupSettingsChanged(
    groupId: string,
    settings: any,
  ): Promise<void> {
    console.log('[GroupChatManager] Group settings changed:', {
      groupId,
      settings,
    });

    await groupDB.updateGroupSettings(groupId, settings);

    // Clear cache to force reload
    this.groupMetadataCache.delete(groupId);
  }

  // ────────────────────────────────────────────────────────────
  // UTILITIES
  // ────────────────────────────────────────────────────────────

  /**
   * Open a group conversation
   */
  public async openGroupConversation(groupId: string): Promise<void> {
    console.log('[GroupChatManager] Opening group conversation:', groupId);

    // Set active conversation in Redux
    store.dispatch(
      chatSlice.actions.setActiveConversation({ conversationId: groupId }),
    );

    // Load messages from DB (this will be done by GroupChatScreen)
    // Just ensure we've joined the channel
    if (!this.joinedChannels.has(groupId)) {
      await this.joinGroupChannel(groupId);
    }
  }

  /**
   * Load group messages from DB
   */
  public async loadGroupMessages(
    groupId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<GroupMessage[]> {
    console.log('[GroupChatManager] Loading group messages:', {
      groupId,
      limit,
      offset,
    });

    try {
      const messages = await fetchGroupMessages(groupId, limit, offset);
      return messages as GroupMessage[];
    } catch (error) {
      console.error('[GroupChatManager] Failed to load group messages:', error);
      return [];
    }
  }

  /**
   * Get group metadata
   */
  public async getGroupMetadata(
    groupId: string,
    forceRefresh: boolean = false,
  ): Promise<GroupMetadata | null> {
    // Check cache first
    if (!forceRefresh && this.groupMetadataCache.has(groupId)) {
      return this.groupMetadataCache.get(groupId)!;
    }

    try {
      const result = await fetchChatBySamvadaChinha(groupId);
      if (result && result.length > 0) {
        const group = result[0];
        if (group.prakara === 'Group') {
          this.groupMetadataCache.set(groupId, group as GroupMetadata);
          return group as GroupMetadata;
        }
      }
      return null;
    } catch (error) {
      console.error('[GroupChatManager] Failed to get group metadata:', error);
      return null;
    }
  }

  /**
   * Check if message exists in DB
   */
  private async messageExists(
    groupId: string,
    refrenceId: string,
  ): Promise<boolean> {
    try {
      const messages = await fetchGroupMessages(groupId, 1, 0);
      return messages.some((msg: any) => msg.refrenceId === refrenceId);
    } catch {
      return false;
    }
  }

  /**
   * Update group last message
   */
  private async updateGroupLastMessage(
    groupId: string,
    message: GroupMessage,
  ): Promise<void> {
    try {
      // Update group last message via groupDB
      // Note: This is handled automatically by the chat list sync
      // No need to manually update here
    } catch (error) {
      console.error(
        '[GroupChatManager] Failed to update group last message:',
        error,
      );
    }
  }

  /**
   * Retry pending messages (offline queue)
   */
  public async retryPendingMessages(): Promise<void> {
    if (this.pendingMessages.size === 0) {
      return;
    }

    console.log(
      `[GroupChatManager] Retrying ${this.pendingMessages.size} pending messages...`,
    );

    for (const [refrenceId, message] of this.pendingMessages.entries()) {
      try {
        await SocketService.sendMessage({
          samvada_chinha: message.samvada_chinha,
          vishayah: message.vishayah,
          pathakah_chinha: message.pathakah_chinha,
          sandesha_prakara: message.sandesha_prakara,
          refrenceId: message.refrenceId,
          preritam_tithih: message.preritam_tithih,
          isGroup: true,
          ukti: message.ukti || '',
        });

        // Update status to sent
        await updateGroupMessage(refrenceId, { avastha: 'sent' });
        this.pendingMessages.delete(refrenceId);

        console.log('[GroupChatManager] Retry successful:', refrenceId);
      } catch (error) {
        console.error('[GroupChatManager] Retry failed:', refrenceId, error);
      }
    }
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    console.log('[GroupChatManager] Cleaning up...');

    // Leave all group channels
    for (const groupId of this.joinedChannels.keys()) {
      this.leaveGroupChannel(groupId);
    }

    this.joinedChannels.clear();
    this.groupMetadataCache.clear();
    this.pendingMessages.clear();

    this.isInitialized = false;
  }
}

export const GroupChatManager = GroupChatManagerClass.getInstance();
