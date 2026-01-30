/**
 * AppBootstrap - Singleton
 * 
 * RESPONSIBILITY:
 * - Orchestrates the app initialization flow after auth
 * - Coordinates parallel initialization of services
 * - Manages the startup sequence
 * 
 * FLOW:
 * 1. Save auth token to Redux
 * 2. PARALLEL: User Profile API + Local DB setup
 * 3. PARALLEL: ChatManager.initialize() + CallManager.initialize()
 * 4. Socket connect
 * 5. Join Phoenix Channel
 * 6. App Ready
 */

import { store } from '../../state/store';
import { setAuthData, setUserProfile, setAppReady } from '../../state/authSlice';
import { userAPI } from '../../api';
import { SocketService } from '../SocketService';
import { ChatManager } from '../ChatManager';
import { CallManager } from '../CallManager';
import { env } from '../../config/env';

// SQLite Table Creation Imports
import { createChatListTable } from '../../storage/sqllite/chat/ChatListSchema';
import { createMessageInfoTable } from '../../storage/sqllite/chat/MessageInfoSchema';
import { createCategoryTables, createPIBTable } from '../../storage/sqllite/categoryData/CategoryDataSchema';
import { CallingCreateTable } from '../../storage/sqllite/calls/CallingSqlSchema';
import { usersCreateTables } from '../../storage/sqllite/authentication/UsersSchema';
import { userSettingCreateTables } from '../../storage/sqllite/authentication/UserSettingSchema';
import { contactListCreateTables } from '../../storage/sqllite/authentication/UsersContactsList';
import { createParticipantsTable } from '../../storage/sqllite/chat/Participants';
import { messageCreateTable } from '../../storage/sqllite/chat/ChatMessageSchema';
import { GroupmessageCreateTable } from '../../storage/sqllite/chat/GroupMessageSchema';
import { CreateStatusTable, CreateStatusVisibilityTable } from '../../storage/sqllite/chat/StatusSchema';
import { testAddColumn } from '../../storage/sqllite/alterTable';

export type BootstrapPhase = 
  | 'idle'
  | 'saving_auth'
  | 'loading_profile'
  | 'initializing_services'
  | 'connecting_socket'
  | 'joining_channel'
  | 'ready'
  | 'error';

interface BootstrapResult {
  success: boolean;
  error?: string;
}

class AppBootstrapClass {
  private static instance: AppBootstrapClass;
  private currentPhase: BootstrapPhase = 'idle';
  private isBootstrapping = false;

  private constructor() {
    if (AppBootstrapClass.instance) {
      return AppBootstrapClass.instance;
    }
    AppBootstrapClass.instance = this;
  }

  public static getInstance(): AppBootstrapClass {
    if (!AppBootstrapClass.instance) {
      AppBootstrapClass.instance = new AppBootstrapClass();
    }
    return AppBootstrapClass.instance;
  }

  /**
   * Get current bootstrap phase
   */
  public getPhase(): BootstrapPhase {
    return this.currentPhase;
  }

  /**
   * Bootstrap app after signup (new user)
   * Flow: Token → Profile API + DB Setup → Managers → Socket → Channel → Ready
   */
  public async bootstrapAfterSignup(
    token: string,
    uniqueId: string,
    isNewUser: boolean = true
  ): Promise<BootstrapResult> {
    if (this.isBootstrapping) {
      console.warn('[AppBootstrap] Already bootstrapping');
      return { success: false, error: 'Already bootstrapping' };
    }

    this.isBootstrapping = true;
    console.log('[AppBootstrap] Starting bootstrap flow (new user:', isNewUser, ')');

    try {
      // Phase 1: Save auth token to Redux
      this.setPhase('saving_auth');
      console.log('[AppBootstrap] Phase 1: Saving auth data...');
      store.dispatch(setAuthData({ token, uniqueId }));

      // Phase 2: PARALLEL - User Profile API + Local DB setup
      this.setPhase('loading_profile');
      console.log('[AppBootstrap] Phase 2: Loading profile + DB setup (parallel)...');
      
      const [dbResult] = await Promise.allSettled([
        this.setupLocalDB(isNewUser),
      ]);

      // Check DB result
      if (dbResult.status === 'rejected') {
        console.error('[AppBootstrap] DB setup failed:', dbResult.reason);
        // Continue anyway - DB can be set up later
      }

      // Phase 3: PARALLEL - Initialize ChatManager + CallManager
      this.setPhase('initializing_services');
      console.log('[AppBootstrap] Phase 3: Initializing managers (parallel)...');
      
      const [chatResult] = await Promise.allSettled([
        ChatManager.initialize(uniqueId),
        // CallManager.initialize(uniqueId),
      ]);

      if (chatResult.status === 'rejected') {
        console.error('[AppBootstrap] ChatManager init failed:', chatResult.reason);
      }

      // Phase 4: Connect Socket
      this.setPhase('connecting_socket');
      console.log('[AppBootstrap] Phase 4: Connecting socket...');
      
      await this.connectSocket(uniqueId);

      // Phase 5: Join Phoenix Channel
      this.setPhase('joining_channel');
      console.log('[AppBootstrap] Phase 5: Joining channel...');
      
      await this.joinUserChannel(uniqueId);

      // Phase 6: App Ready!
      this.setPhase('ready');
      console.log('[AppBootstrap] Phase 6: App Ready!');
      
      store.dispatch(setAppReady(true));

      return { success: true };

    } catch (error: any) {
      console.error('[AppBootstrap] Bootstrap failed:', error);
      this.setPhase('error');
      return { success: false, error: error?.message || 'Bootstrap failed' };
    } finally {
      this.isBootstrapping = false;
    }
  }

  /**
   * Bootstrap app after login (existing user)
   * Same flow but with initial sync to fetch existing data
   */
  public async bootstrapAfterLogin(
    token: string,
    uniqueId: string
  ): Promise<BootstrapResult> {
    return this.bootstrapAfterSignup(token, uniqueId, false);
  }

  /**
   * Fetch user profile from API
   */
  private async fetchUserProfile(): Promise<void> {
    try {
      const profile = await userAPI.getProfile();
      console.log('[AppBootstrap] Profile fetched:', profile);
      
      store.dispatch(setUserProfile({
        name: profile.praman_patrika,
        avatar: profile.parichayapatra,
        phone: profile.durasamparka_sankhya,
        email: profile.dootapatra,
        username: profile.upayogakarta_nama,
        status: profile.sthiti,
      }));
    } catch (error) {
      console.error('[AppBootstrap] Failed to fetch profile:', error);
      throw error;
    }
  }

  /**
   * Setup local database
   * Creates all SQLite tables in parallel for better performance
   */
  private async setupLocalDB(isNewUser: boolean): Promise<void> {
    console.log('[AppBootstrap] Setting up local DB...');
    
    try {
      // Create all SQLite tables in parallel
      // For new users: tables will be empty
      // For existing users: tables should already exist (this is idempotent)
      const tableCreationResults = await Promise.allSettled([
        createChatListTable(),
        createMessageInfoTable(),
        createCategoryTables(),
        CallingCreateTable(),
        usersCreateTables(),
        userSettingCreateTables(),
        contactListCreateTables(),
        createParticipantsTable(),
        messageCreateTable(),
        GroupmessageCreateTable(),
        createPIBTable(),
        CreateStatusTable(),
        CreateStatusVisibilityTable(),
        testAddColumn(),
      ]);

      // Log any failures (but don't throw - tables might already exist)
      const tableNames = [
        'ChatList', 'MessageInfo', 'Category', 'Calling', 'Users',
        'UserSetting', 'ContactList', 'Participants', 'Message',
        'GroupMessage', 'PIB', 'Status', 'StatusVisibility', 'AlterTable'
      ];

      tableCreationResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`[AppBootstrap] Table ${tableNames[index]} creation issue:`, result.reason);
        } else {
          console.log(`[AppBootstrap] Table ${tableNames[index]} ready`);
        }
      });

      if (!isNewUser) {
        // For existing users, trigger initial sync
        console.log('[AppBootstrap] Triggering initial sync for existing user...');
        // Sync will be handled by ChatManager during its initialization
      }

      console.log('[AppBootstrap] Local DB setup complete');
    } catch (error) {
      console.error('[AppBootstrap] Local DB setup error:', error);
      throw error;
    }
  }

  /**
   * Connect to socket server and join user channel
   */
  private async connectSocket(uniqueId: string): Promise<void> {
    try {
      // Connect to Phoenix socket with userId (will auto-join user:${userId} channel)
      await SocketService.connect(uniqueId);
      console.log('[AppBootstrap] Socket connected and channel joined');
    } catch (error) {
      console.warn('[AppBootstrap] Socket connection failed, will retry:', error);
      // Don't fail bootstrap - socket will reconnect automatically
    }
  }

  /**
   * Join user's Phoenix channel (already done in connectSocket)
   */
  private async joinUserChannel(uniqueId: string): Promise<void> {
    // Channel is already joined in connectSocket via SocketService.connect(userId)
    // This method is kept for compatibility but is a no-op
    if (SocketService.isConnected()) {
      console.log('[AppBootstrap] Channel already joined: user:' + uniqueId);
    } else {
      console.warn('[AppBootstrap] Socket not connected, channel will join on reconnect');
    }
  }

  /**
   * Set current phase and log
   */
  private setPhase(phase: BootstrapPhase): void {
    console.log(`[AppBootstrap] Phase: ${this.currentPhase} → ${phase}`);
    this.currentPhase = phase;
  }

  /**
   * Reset bootstrap state
   */
  public reset(): void {
    this.currentPhase = 'idle';
    this.isBootstrapping = false;
  }

  /**
   * Cleanup on logout
   */
  public async cleanup(): Promise<void> {
    console.log('[AppBootstrap] Cleaning up...');
    
    ChatManager.cleanup();
    CallManager.cleanup();
    SocketService.disconnect();
    
    this.reset();
    
    console.log('[AppBootstrap] Cleanup complete');
  }
}

export const AppBootstrap = AppBootstrapClass.getInstance();

