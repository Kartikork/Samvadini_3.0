/**
 * RingtoneService - Singleton
 * 
 * RESPONSIBILITIES:
 * - Manage ringtone playback for incoming calls
 * - Handle audio routing (speaker/earpiece)
 * - Control vibration patterns
 * - Manage proximity sensor during calls
 * 
 * USAGE:
 * - Start ringtone when incoming call received
 * - Stop ringtone when call accepted/rejected/timeout/cancelled
 */

import InCallManager from 'react-native-incall-manager';
import { Platform } from 'react-native';

class RingtoneServiceClass {
  private isRinging = false;
  private isInCall = false;

  /**
   * Start ringtone for incoming call
   * @param callType - 'audio' or 'video'
   */
  async startRingtone(callType: 'audio' | 'video'): Promise<void> {
    if (this.isRinging) {
      console.log('[RingtoneService] ⚠️ Ringtone already playing, skipping');
      return;
    }
    
    try {
      console.log('[RingtoneService] 🔔 Starting ringtone for', callType, 'call');
      
      // Start InCallManager for incoming call
      // This handles audio routing, proximity sensor, and system integration
      await InCallManager.start({
        media: callType, // 'audio' or 'video'
        auto: false, // Don't auto-enable speaker for incoming calls
        ringback: '', // No ringback tone for incoming calls
      });
      
      // Start ringtone with vibration
      // '_DEFAULT_' uses the phone's default system ringtone
      // For custom ringtone, place file in android/app/src/main/res/raw/ and reference by name (e.g., 'my_ringtone')
      InCallManager.startRingtone(
        '_DEFAULT_',            // ringtone: phone's default system ringtone
        [1000, 500, 1000, 500], // vibrate_pattern: vibrate for 1s, pause 0.5s, repeat
        'default',              // ios_category: AVAudioSessionCategory for iOS
        30                      // seconds: max duration (will loop until stopped)
      ); 
      
      this.isRinging = true;
      console.log('[RingtoneService] ✅ Ringtone started successfully');
    } catch (error) {
      console.error('[RingtoneService] ❌ Failed to start ringtone:', error);
    }
  }

  /**
   * Stop ringtone playback
   */
  async stopRingtone(): Promise<void> {
    if (!this.isRinging) {
      console.log('[RingtoneService] ℹ️ No ringtone playing, skipping stop');
      return;
    }
    
    try {
      console.log('[RingtoneService] 🔕 Stopping ringtone');
      InCallManager.stopRingtone();
      this.isRinging = false;
      console.log('[RingtoneService] ✅ Ringtone stopped successfully');
    } catch (error) {
      console.error('[RingtoneService] ❌ Failed to stop ringtone:', error);
    }
  }

  /**
   * Start in-call audio management (call accepted)
   * Sets up audio routing, proximity sensor, etc.
   */
  async startInCallAudio(callType: 'audio' | 'video'): Promise<void> {
    if (this.isInCall) {
      console.log('[RingtoneService] ⚠️ In-call audio already active');
      return;
    }

    try {
      console.log('[RingtoneService] 📞 Starting in-call audio management');
      
      // Stop ringtone first if playing
      await this.stopRingtone();
      
      // Start InCallManager for active call
      await InCallManager.start({
        media: callType,
        auto: true, // Auto-manage audio routing during call
        ringback: '', // No ringback during active call
      });

      // For video calls, enable speaker by default
      if (callType === 'video') {
        InCallManager.setForceSpeakerphoneOn(true);
      }

      this.isInCall = true;
      console.log('[RingtoneService] ✅ In-call audio management started');
    } catch (error) {
      console.error('[RingtoneService] ❌ Failed to start in-call audio:', error);
    }
  }

  /**
   * Stop in-call audio management (call ended)
   */
  async stopInCallAudio(): Promise<void> {
    if (!this.isInCall && !this.isRinging) {
      console.log('[RingtoneService] ℹ️ No active audio management, skipping stop');
      return;
    }

    try {
      console.log('[RingtoneService] 🔚 Stopping in-call audio management');
      
      // Stop ringtone if still playing
      if (this.isRinging) {
        InCallManager.stopRingtone();
        this.isRinging = false;
      }

      // Stop InCallManager
      InCallManager.stop();
      
      this.isInCall = false;
      console.log('[RingtoneService] ✅ In-call audio management stopped');
    } catch (error) {
      console.error('[RingtoneService] ❌ Failed to stop in-call audio:', error);
    }
  }

  /**
   * Toggle speaker on/off during call
   */
  async setSpeaker(enabled: boolean): Promise<void> {
    try {
      console.log('[RingtoneService] 🔊 Setting speaker:', enabled ? 'ON' : 'OFF');
      InCallManager.setForceSpeakerphoneOn(enabled);
    } catch (error) {
      console.error('[RingtoneService] ❌ Failed to set speaker:', error);
      throw error;
    }
  }

  /**
   * Play busy tone when call is rejected/busy
   */
  async playBusyTone(): Promise<void> {
    try {
      console.log('[RingtoneService] 📞 Playing busy tone');
      // Stop current call session with busy tone
      InCallManager.stop({ busytone: '_DTMF_' });
    } catch (error) {
      console.error('[RingtoneService] ❌ Failed to play busy tone:', error);
    }
  }

  /**
   * Get current ringtone state
   */
  isRingtoneActive(): boolean {
    return this.isRinging;
  }

  /**
   * Get current in-call state
   */
  isInCallActive(): boolean {
    return this.isInCall;
  }

  /**
   * Force cleanup (for service restart/app cleanup)
   */
  async forceCleanup(): Promise<void> {
    console.log('[RingtoneService] 🧹 Force cleanup');
    try {
      if (this.isRinging) {
        InCallManager.stopRingtone();
      }
      InCallManager.stop();
      this.isRinging = false;
      this.isInCall = false;
    } catch (error) {
      console.error('[RingtoneService] ❌ Error during force cleanup:', error);
    }
  }
}

export const RingtoneService = new RingtoneServiceClass();
