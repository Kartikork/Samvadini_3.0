/**
 * API Endpoints
 * 
 * Centralized API endpoint definitions with typed request/response.
 */

import { api } from './axios.instance';

// ─────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────

// Auth Types - Field names match backend (Sanskrit/Hindi naming convention)
export interface SendOtpRequest {
  durasamparka_sankhya: string;         // phone number
  dootapatra?: string;                   // email
  ekakrit_passanketa?: number | string; // OTP (as number - backend stores as integer)
  desha_suchaka_koda: string;           // country dial code
  durasamparka_gopaniya?: boolean;      // hide phone number
  dhwani?: string;                       // language
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpRequest {
  durasamparka_sankhya: string;    // phone number
  dootapatra?: string;              // email
  ekakrit_passanketa: string;      // OTP
  desha_suchaka_koda: string;      // country dial code
}

export interface VerifyOtpResponse {
  message: string;
  token: string;
  isRegister: boolean;
  user: User;
  user_setting: UserSettings;
}

export interface UserSettings {
  is_register: boolean;
  upayogakarta_nama?: string;      // unique username
  praman_patrika?: string;          // display name
  parichayapatra?: string;          // profile photo URL
  janma_tithi?: string;             // date of birth
  linga?: string;                   // gender
  ekatma_chinha?: string;           // unique ID
  dhwani?: string | null;           // language
  durasamparka_gopaniya?: boolean;  // hide phone number
  durasamparka_sankhya?: string;    // phone number
  desha_suchaka_koda?: string;      // country dial code
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

// User Types - Field names match backend
export interface User {
  ekatma_chinha: string;            // unique ID
  durasamparka_sankhya: string;     // phone number
  dootapatra?: string;              // email
  upayogakarta_nama?: string;       // username
  praman_patrika?: string;          // display name
  parichayapatra?: string;          // avatar/profile photo
  desha_suchaka_koda?: string;     // country dial code
  dhwani?: string | null;          // language
  sthiti?: string;                  // status
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileRequest {
  uniqueId: string;           // User's unique ID
  name?: string;              // Display name (praman_patrika)
  imageUrl?: string;          // Profile photo URL
  dateOfBirth?: string;       // Date of birth
  gender?: string;            // Gender (male/female/other)
  aboutStatus?: string;       // Status message
  referredBy?: string;        // Referral code
  username?: string;          // Unique username
}

export interface UpdateProfileResponse {
  message: string;
  data: {
    user: User;
    user_settings: UserSettings;
  };
}

// Contact Types
export interface Contact {
  id: string;
  user: User;
  nickname?: string;
  isFavorite: boolean;
  isBlocked: boolean;
  createdAt: string;
}

export interface SyncContactsRequest {
  contacts: Array<{
    phone: string;
    name: string;
  }>;
}

export interface SyncContactsResponse {
  registeredContacts: Contact[];
  unregisteredPhones: string[];
}

// Chat Types
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  // Group specific
  name?: string;
  avatar?: string;
  admins?: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';
  content: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: Message;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  conversationId: string;
  type: Message['type'];
  content: string;
  mediaUrl?: string;
  replyToId?: string;
}

// Call Types
export interface CallSession {
  id: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'ongoing' | 'ended' | 'missed' | 'rejected';
  caller: User;
  receiver: User;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────

export const authAPI = {
  /**
   * Send OTP to phone or email
   */
  sendOtp: (data: SendOtpRequest) =>
    api.post<SendOtpResponse>('/send-otp', data),

  /**
   * Verify OTP and get tokens
   */
  verifyOtp: (data: VerifyOtpRequest) =>
    api.post<VerifyOtpResponse>('/verify-otp', data),

  /**
   * Refresh access token
   */
  refreshToken: (data: RefreshTokenRequest) =>
    api.post<RefreshTokenResponse>('/auth/refresh', data),

  /**
   * Logout user
   */
  logout: () => api.post<{ success: boolean }>('/auth/logout'),

  /**
   * Delete account
   */
  deleteAccount: () => api.delete<{ success: boolean }>('/auth/account'),
};

export const userAPI = {
  /**
   * Get current user profile
   */
  getProfile: () => api.get<User>('/user/profile'),

  /**
   * Update user profile (signup/profile setup)
   */
  updateProfile: (data: UpdateProfileRequest) =>
    api.post<UpdateProfileResponse>('/sign-up', data),

  /**
   * Upload avatar
   */
  uploadAvatar: (formData: FormData) =>
    api.post<{ avatarUrl: string }>('/user/avatar', formData),

  /**
   * Get user by ID
   */
  getUserById: (userId: string) => api.get<User>(`/user/${userId}`),

  /**
   * Search users
   */
  searchUsers: (query: string, params?: PaginationParams) =>
    api.get<PaginatedResponse<User>>(`/user/search?q=${encodeURIComponent(query)}`, {
      params,
    } as any),

  /**
   * Update push token
   */
  updatePushToken: (token: string) =>
    api.post<{ success: boolean }>('/user/push-token', { token }),
};

export const contactAPI = {
  /**
   * Get all contacts
   */
  getContacts: (params?: PaginationParams) =>
    api.get<PaginatedResponse<Contact>>('/contacts', { params } as any),

  /**
   * Sync contacts from phone
   */
  syncContacts: (data: SyncContactsRequest) =>
    api.post<SyncContactsResponse>('/contacts/sync', data),

  /**
   * Block a contact
   */
  blockContact: (userId: string) =>
    api.post<{ success: boolean }>(`/contacts/${userId}/block`),

  /**
   * Unblock a contact
   */
  unblockContact: (userId: string) =>
    api.delete<{ success: boolean }>(`/contacts/${userId}/block`),

  /**
   * Get blocked contacts
   */
  getBlockedContacts: () => api.get<Contact[]>('/contacts/blocked'),
};

export interface ClearChatRequest {
  samvada_chinha: string;
  uniqueId: string;
  type: 'Chat' | 'Group';
  isdelete: boolean;
}

export const chatAPI = {
  /**
   * Get all conversations
   */
  getConversations: (params?: PaginationParams) =>
    api.get<PaginatedResponse<Conversation>>('/conversations', { params } as any),

  /**
   * Get or create direct conversation
   */
  getOrCreateConversation: (userId: string) =>
    api.post<Conversation>('/conversations/direct', { userId }),

  /**
   * Get conversation by ID
   */
  getConversation: (conversationId: string) =>
    api.get<Conversation>(`/conversations/${conversationId}`),

  /**
   * Get messages in a conversation
   */
  getMessages: (conversationId: string, params?: PaginationParams) =>
    api.get<PaginatedResponse<Message>>(`/conversations/${conversationId}/messages`, {
      params,
    } as any),

  /**
   * Send a message
   */
  sendMessage: (data: SendMessageRequest) =>
    api.post<Message>('/messages', data),

  /**
   * Mark messages as read
   */
  markAsRead: (conversationId: string) =>
    api.post<{ success: boolean }>(`/conversations/${conversationId}/read`),

  /**
   * Delete a message
   */
  deleteMessage: (messageId: string) =>
    api.delete<{ success: boolean }>(`/messages/${messageId}`),

  /**
   * Upload media
   */
  uploadMedia: (formData: FormData) =>
    api.post<{ mediaUrl: string; thumbnailUrl?: string }>('/media/upload', formData),

  /**
   * Clear/Delete a single chat (API + marks for deletion)
   */
  clearSingleChat: (data: ClearChatRequest) =>
    api.post<{ success: boolean; message: string }>('/chat/clear-single-chat', data),

  /**
   * Send message (plaintext) - called before encryption
   */
  sendMessagePlaintext: (data: any) =>
    api.post<{ success: boolean }>('/chat/send-message', data),

  /**
   * Send encrypted message - called after encryption
   */
  sendEncryptedMessage: (data: any) =>
    api.post<{ success: boolean }>('/chat/send-message', data),

  /**
   * Register FCM token for push notifications
   */
  registerToken: (data: { ekatma_chinha: string; token: string }) =>
    api.post<{ message: string; status: 'success' }>('/chat/register-token', data),
};

export const groupAPI = {
  /**
   * Create a group
   */
  createGroup: (data: { name: string; participants: string[]; avatar?: string }) =>
    api.post<Conversation>('/groups', data),

  /**
   * Update group info
   */
  updateGroup: (groupId: string, data: { name?: string; avatar?: string }) =>
    api.patch<Conversation>(`/groups/${groupId}`, data),

  /**
   * Add participants to group
   */
  addParticipants: (groupId: string, userIds: string[]) =>
    api.post<Conversation>(`/groups/${groupId}/participants`, { userIds }),

  /**
   * Remove participant from group
   */
  removeParticipant: (groupId: string, userId: string) =>
    api.delete<Conversation>(`/groups/${groupId}/participants/${userId}`),

  /**
   * Leave group
   */
  leaveGroup: (groupId: string) =>
    api.post<{ success: boolean }>(`/groups/${groupId}/leave`),

  /**
   * Make user admin
   */
  makeAdmin: (groupId: string, userId: string) =>
    api.post<Conversation>(`/groups/${groupId}/admins/${userId}`),

  /**
   * Remove admin
   */
  removeAdmin: (groupId: string, userId: string) =>
    api.delete<Conversation>(`/groups/${groupId}/admins/${userId}`),
};

export const callAPI = {
  /**
   * Initiate a call
   */
  initiateCall: (data: { receiverId: string; type: 'audio' | 'video' }) =>
    api.post<CallSession>('/calls', data),

  /**
   * Get call history
   */
  getCallHistory: (params?: PaginationParams) =>
    api.get<PaginatedResponse<CallSession>>('/calls/history', { params } as any),

  /**
   * Get call by ID
   */
  getCall: (callId: string) => api.get<CallSession>(`/calls/${callId}`),
};

