/**
 * useSound Hook
 * Simplifies sound management in functional components
 */

import { useEffect, useRef, useState } from 'react';
import { createSoundManager } from '../utils/soundManager';

const useSound = () => {
  const soundManagerRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Initialize sound manager
    soundManagerRef.current = createSoundManager();

    // Cleanup on unmount
    return () => {
      if (soundManagerRef.current) {
        soundManagerRef.current.cleanup();
      }
    };
  }, []);

  const loadSound = async (key, source, isMusic = false) => {
    if (soundManagerRef.current) {
      try {
        await soundManagerRef.current.loadSound(key, source, isMusic);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  };

  const play = (key, loop = false) => {
    if (soundManagerRef.current) {
      return soundManagerRef.current.play(key, loop);
    }
    return false;
  };

  const stop = (key) => {
    if (soundManagerRef.current) {
      return soundManagerRef.current.stop(key);
    }
    return false;
  };

  const pause = (key) => {
    if (soundManagerRef.current) {
      return soundManagerRef.current.pause(key);
    }
    return false;
  };

  const resume = (key) => {
    if (soundManagerRef.current) {
      return soundManagerRef.current.resume(key);
    }
    return false;
  };

  const toggleMute = () => {
    if (soundManagerRef.current) {
      const newMutedState = soundManagerRef.current.toggleMute();
      setIsMuted(newMutedState);
      return newMutedState;
    }
    return false;
  };

  const setMutedState = (muted) => {
    if (soundManagerRef.current) {
      soundManagerRef.current.setMuted(muted);
      setIsMuted(muted);
    }
  };

  return {
    loadSound,
    play,
    stop,
    pause,
    resume,
    toggleMute,
    setMuted: setMutedState,
    isMuted
  };
};

export default useSound;
