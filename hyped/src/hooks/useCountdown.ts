/**
 * useCountdown Hook
 * 
 * Reusable countdown timer for OTP resend
 * Automatically cleans up interval on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCountdownReturn {
  seconds: number;
  isRunning: boolean;
  start: (initialSeconds?: number) => void;
  reset: () => void;
  stop: () => void;
}

export function useCountdown(initialSeconds: number = 60): UseCountdownReturn {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Run countdown
  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds > 0]);

  const start = useCallback((customSeconds?: number) => {
    setSeconds(customSeconds ?? initialSeconds);
    setIsRunning(true);
  }, [initialSeconds]);

  const reset = useCallback(() => {
    setSeconds(0);
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return { seconds, isRunning, start, reset, stop };
}

export default useCountdown;




