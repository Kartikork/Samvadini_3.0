/**
 * useAppState Hook
 * Handles app state changes (background/foreground)
 * Automatically pauses/resumes games when app is backgrounded
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const useAppState = (onActive, onBackground) => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        if (onActive) {
          onActive();
        }
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App has gone to the background
        if (onBackground) {
          onBackground();
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [onActive, onBackground]);

  return appState.current;
};

/**
 * useGamePause Hook
 * Combines useAppState with automatic pause/resume for games
 */
export const useGamePause = (pauseGame, resumeGame) => {
  const isPausedRef = useRef(false);

  useAppState(
    () => {
      // App became active
      if (isPausedRef.current && resumeGame) {
        resumeGame();
        isPausedRef.current = false;
      }
    },
    () => {
      // App went to background
      if (!isPausedRef.current && pauseGame) {
        pauseGame();
        isPausedRef.current = true;
      }
    }
  );

  return isPausedRef;
};

export default useAppState;
