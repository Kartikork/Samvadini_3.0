/**
 * Sound Manager Utility
 * Centralized sound handling with proper cleanup and memory management
 */

import Sound from 'react-native-sound';
import { GAME_CONFIG } from '../constants/gameConfig';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

class SoundManager {
  constructor() {
    this.sounds = {};
    this.isMuted = false;
    this.musicVolume = GAME_CONFIG.GENERAL.BACKGROUND_MUSIC_VOLUME;
    this.sfxVolume = GAME_CONFIG.GENERAL.SFX_VOLUME;
  }

  /**
   * Load a sound file
   * @param {string} key - Unique identifier for the sound
   * @param {object} source - Sound file require()
   * @param {boolean} isMusic - Whether this is background music
   * @returns {Promise} Resolves when sound is loaded
   */
  loadSound(key, source, isMusic = false) {
    return new Promise((resolve, reject) => {
      // Don't reload if already loaded
      if (this.sounds[key]) {
        resolve(this.sounds[key]);
        return;
      }

      const sound = new Sound(source, error => {
        if (error) {
          reject(error);
          return;
        }

        this.sounds[key] = {
          sound,
          isMusic,
          isPlaying: false
        };

        // Set initial volume
        const volume = isMusic ? this.musicVolume : this.sfxVolume;
        sound.setVolume(this.isMuted ? 0 : volume);

        resolve(this.sounds[key]);
      });
    });
  }

  /**
   * Play a sound
   * @param {string} key - Sound identifier
   * @param {boolean} loop - Whether to loop the sound
   * @returns {boolean} Success status
   */
  play(key, loop = false) {
    const soundObj = this.sounds[key];
    if (!soundObj) return false;

    const { sound } = soundObj;

    // Set looping
    sound.setNumberOfLoops(loop ? -1 : 0);

    // Play the sound
    sound.play(success => {
      if (success) {
        soundObj.isPlaying = false;
        if (!loop) {
          sound.reset(); // Reset for replay
        }
      }
    });

    soundObj.isPlaying = true;
    return true;
  }

  /**
   * Stop a sound
   * @param {string} key - Sound identifier
   * @returns {boolean} Success status
   */
  stop(key) {
    const soundObj = this.sounds[key];
    if (!soundObj) return false;

    soundObj.sound.stop(() => {
      soundObj.sound.reset();
      soundObj.isPlaying = false;
    });

    return true;
  }

  /**
   * Pause a sound
   * @param {string} key - Sound identifier
   * @returns {boolean} Success status
   */
  pause(key) {
    const soundObj = this.sounds[key];
    if (!soundObj) return false;

    soundObj.sound.pause();
    soundObj.isPlaying = false;
    return true;
  }

  /**
   * Resume a paused sound
   * @param {string} key - Sound identifier
   * @returns {boolean} Success status
   */
  resume(key) {
    const soundObj = this.sounds[key];
    if (!soundObj || soundObj.isPlaying) return false;

    soundObj.sound.play();
    soundObj.isPlaying = true;
    return true;
  }

  /**
   * Toggle mute for all sounds
   * @returns {boolean} New muted state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;

    Object.values(this.sounds).forEach(({ sound, isMusic }) => {
      const volume = this.isMuted ? 0 : (isMusic ? this.musicVolume : this.sfxVolume);
      sound.setVolume(volume);
    });

    return this.isMuted;
  }

  /**
   * Set mute state
   * @param {boolean} muted - Mute state
   */
  setMuted(muted) {
    this.isMuted = muted;

    Object.values(this.sounds).forEach(({ sound, isMusic }) => {
      const volume = this.isMuted ? 0 : (isMusic ? this.musicVolume : this.sfxVolume);
      sound.setVolume(volume);
    });
  }

  /**
   * Get current mute state
   * @returns {boolean} Is muted
   */
  getMuted() {
    return this.isMuted;
  }

  /**
   * Set music volume
   * @param {number} volume - Volume level (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    Object.values(this.sounds).forEach(({ sound, isMusic }) => {
      if (isMusic && !this.isMuted) {
        sound.setVolume(this.musicVolume);
      }
    });
  }

  /**
   * Set SFX volume
   * @param {number} volume - Volume level (0-1)
   */
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));

    Object.values(this.sounds).forEach(({ sound, isMusic }) => {
      if (!isMusic && !this.isMuted) {
        sound.setVolume(this.sfxVolume);
      }
    });
  }

  /**
   * Stop all sounds
   */
  stopAll() {
    Object.keys(this.sounds).forEach(key => {
      this.stop(key);
    });
  }

  /**
   * Pause all sounds
   */
  pauseAll() {
    Object.keys(this.sounds).forEach(key => {
      this.pause(key);
    });
  }

  /**
   * Resume all previously playing sounds
   */
  resumeAll() {
    Object.values(this.sounds).forEach(({ sound, isPlaying }) => {
      if (isPlaying) {
        sound.play();
      }
    });
  }

  /**
   * Release a specific sound from memory
   * @param {string} key - Sound identifier
   */
  release(key) {
    const soundObj = this.sounds[key];
    if (!soundObj) return;

    soundObj.sound.stop();
    soundObj.sound.release();
    delete this.sounds[key];
  }

  /**
   * Release all sounds from memory
   * IMPORTANT: Call this when component unmounts
   */
  releaseAll() {
    Object.keys(this.sounds).forEach(key => {
      this.release(key);
    });
    this.sounds = {};
  }

  /**
   * Check if a sound is currently playing
   * @param {string} key - Sound identifier
   * @returns {boolean} Is playing
   */
  isPlaying(key) {
    const soundObj = this.sounds[key];
    return soundObj ? soundObj.isPlaying : false;
  }

  /**
   * Get all loaded sound keys
   * @returns {array} Array of sound keys
   */
  getLoadedSounds() {
    return Object.keys(this.sounds);
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;

/**
 * Helper function to create a sound manager instance for a component
 * This ensures proper cleanup when component unmounts
 * @returns {object} Sound manager methods
 */
export const createSoundManager = () => {
  const localSounds = [];

  return {
    loadSound: async (key, source, isMusic = false) => {
      await soundManager.loadSound(key, source, isMusic);
      localSounds.push(key);
    },

    play: (key, loop = false) => soundManager.play(key, loop),
    stop: (key) => soundManager.stop(key),
    pause: (key) => soundManager.pause(key),
    resume: (key) => soundManager.resume(key),
    toggleMute: () => soundManager.toggleMute(),
    setMuted: (muted) => soundManager.setMuted(muted),
    getMuted: () => soundManager.getMuted(),

    // Cleanup only this component's sounds
    cleanup: () => {
      localSounds.forEach(key => soundManager.release(key));
      localSounds.length = 0;
    }
  };
};
