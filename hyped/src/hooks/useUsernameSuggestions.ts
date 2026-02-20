import { useCallback, useEffect, useRef, useState } from 'react';
import { axiosConn } from '../storage/helper/Config';

type UseUsernameSuggestionsResult = {
  uniqueUsername: string;
  setUniqueUsername: (v: string) => void;
  usernameSuggestions: string[];
  isUsernameLoading: boolean;
  usernameError: string;
  isUsernameValid: boolean;
  handleUsernameChange: (text: string) => void;
  selectSuggestion: (s: string) => void;
  fetchUsernameSuggestions: (name: string) => Promise<void>;
  checkUsernameAvailability: (usernameToCheck: string) => Promise<void>;
  clearSuggestions: () => void;
};

const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;

function validateUsernameFormat(u: string): string | null {
  if (!u || u.length < 3) return 'Username must be at least 3 characters';
  if (!USERNAME_REGEX.test(u)) return 'Only letters, numbers, dots, and underscores allowed';
  if (/^[._]|[._]$/.test(u)) return 'Cannot start or end with dot or underscore';
  if (/[._]{2,}/.test(u)) return 'Cannot have consecutive dots or underscores';
  return null;
}

export function useUsernameSuggestions(initial = ''): UseUsernameSuggestionsResult {
  const [uniqueUsername, setUniqueUsername] = useState(initial);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [isUsernameLoading, setIsUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(false);

  const usernameCheckTimeout = useRef<number | null>(null);
  const suggestionTimer = useRef<number | null>(null);

  const fetchUsernameSuggestions = useCallback(async (name: string) => {
    if (!name || name.length < 2) {
      setUsernameSuggestions([]);
      return;
    }

    try {
      setIsUsernameLoading(true);
      const res = await axiosConn('post', 'username/suggestions', { name });
      if (res.status === 200 && res.data?.success) {
        setUsernameSuggestions(res.data.suggestions || []);
      } else {
        setUsernameSuggestions([]);
      }
    } catch (err) {
      // swallow errors and clear suggestions
      setUsernameSuggestions([]);
    } finally {
      setIsUsernameLoading(false);
    }
  }, []);

  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    const formatErr = validateUsernameFormat(usernameToCheck);
    if (formatErr) {
      setUsernameError(formatErr);
      setIsUsernameValid(false);
      return;
    }

    try {
      setIsUsernameLoading(true);
      const res = await axiosConn('post', 'username/check', { username: usernameToCheck });
      if (res.status === 200 && res.data?.success) {
        if (res.data.available) {
          setUsernameError('');
          setIsUsernameValid(true);
        } else {
          setUsernameError('Username is already taken');
          setIsUsernameValid(false);
        }
      } else {
        setUsernameError('Unable to verify username');
        setIsUsernameValid(false);
      }
    } catch (err) {
      setUsernameError('Unable to verify username');
      setIsUsernameValid(false);
    } finally {
      setIsUsernameLoading(false);
    }
  }, []);

  const handleUsernameChange = useCallback(
    (text: string) => {
      const cleaned = text.toLowerCase().replace(/\s/g, '');
      setUniqueUsername(cleaned);
      setIsUsernameValid(false);
      setUsernameError('');

      // debounce availability check (500ms)
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
      if (cleaned.length >= 3) {
        // @ts-ignore - window.setTimeout returns number in RN
        usernameCheckTimeout.current = setTimeout(() => {
          checkUsernameAvailability(cleaned);
        }, 500) as unknown as number;
      }

      // debounce suggestions (800ms)
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
      if (cleaned.length >= 2) {
        // @ts-ignore
        suggestionTimer.current = setTimeout(() => {
          fetchUsernameSuggestions(cleaned);
        }, 800) as unknown as number;
      } else {
        setUsernameSuggestions([]);
      }
    },
    [checkUsernameAvailability, fetchUsernameSuggestions],
  );

  const selectSuggestion = useCallback((s: string) => {
    setUniqueUsername(s);
    setUsernameError('');
    setIsUsernameValid(true);
    setUsernameSuggestions([]);
  }, []);

  const clearSuggestions = useCallback(() => {
    setUsernameSuggestions([]);
  }, []);

  useEffect(() => {
    return () => {
      if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
      if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    };
  }, []);

  return {
    uniqueUsername,
    setUniqueUsername,
    usernameSuggestions,
    isUsernameLoading,
    usernameError,
    isUsernameValid,
    handleUsernameChange,
    selectSuggestion,
    fetchUsernameSuggestions,
    checkUsernameAvailability,
    clearSuggestions,
  };
}

