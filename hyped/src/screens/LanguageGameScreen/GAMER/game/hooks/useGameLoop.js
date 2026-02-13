/**
 * useGameLoop Hook
 * Manages game loop with proper cleanup and FPS control
 */

import { useEffect, useRef } from 'react';
import { GAME_CONFIG } from '../constants/gameConfig';

const useGameLoop = (callback, isRunning = true, targetFPS = GAME_CONFIG.GENERAL.FPS_TARGET) => {
  const requestRef = useRef();
  const previousTimeRef = useRef();
  const frameTimeRef = useRef(1000 / targetFPS);

  useEffect(() => {
    if (!isRunning) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      return;
    }

    const animate = (time) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;

        // Only update if enough time has passed (FPS throttling)
        if (deltaTime >= frameTimeRef.current) {
          callback(deltaTime);
          previousTimeRef.current = time;
        }
      } else {
        previousTimeRef.current = time;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, callback, targetFPS]);

  const pause = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  const resume = () => {
    previousTimeRef.current = undefined;
    requestRef.current = requestAnimationFrame((time) => {
      previousTimeRef.current = time;
    });
  };

  return { pause, resume };
};

export default useGameLoop;
