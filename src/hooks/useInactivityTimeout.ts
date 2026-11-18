import { useEffect, useRef, useCallback } from 'react';

export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 consecutive minutes of inactivity
export const LAST_ACTIVITY_KEY = 'dmstask_last_activity_timestamp';

interface InactivityTimeoutOptions {
  isAuthenticated: boolean;
  onTimeout: () => Promise<void> | void;
  timeoutMs?: number;
}

/**
 * Custom hook to monitor genuine manual user interaction in ChatTask.
 * Automatically expires the session after 15 consecutive minutes of inactivity.
 *
 * Rules:
 * 1. Reset timer ONLY on genuine manual DOM interaction (mouse, keyboard, touch, scroll).
 * 2. Background API calls, automatic polling, and Socket.IO events NEVER reset the timer.
 * 3. Coordinates check on mousemove to ignore synthetic cursor events.
 * 4. Cross-tab synchronization via localStorage and storage events.
 * 5. Handles device sleep/tab backgrounding via visibilitychange and periodic checks.
 */
export function useInactivityTimeout({
  isAuthenticated,
  onTimeout,
  timeoutMs = INACTIVITY_TIMEOUT_MS,
}: InactivityTimeoutOptions) {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isExpiringRef = useRef(false);
  const lastRecordedRef = useRef<number>(Date.now());
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });

  // Safe timeout execution (guarantees execution only once per expiration cycle)
  const triggerTimeout = useCallback(async () => {
    if (isExpiringRef.current) return;
    isExpiringRef.current = true;
    try {
      await onTimeout();
    } finally {
      isExpiringRef.current = false;
    }
  }, [onTimeout]);

  // Check elapsed time against stored activity timestamp
  const checkElapsed = useCallback(() => {
    if (!isAuthenticated || isExpiringRef.current) return;

    let lastActivity = lastRecordedRef.current;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          lastActivity = Math.max(lastActivity, parsed);
        }
      }
    }

    const elapsed = Date.now() - lastActivity;
    if (elapsed >= timeoutMs) {
      triggerTimeout();
    } else {
      // Reschedule timeout for remaining duration
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      const remaining = Math.max(1000, timeoutMs - elapsed);
      timeoutIdRef.current = setTimeout(checkElapsed, remaining);
    }
  }, [isAuthenticated, timeoutMs, triggerTimeout]);

  // Record genuine manual interaction (throttled to at most once per 1 second for optimal performance)
  const recordActivity = useCallback(() => {
    if (!isAuthenticated || isExpiringRef.current) return;
    const now = Date.now();
    if (now - lastRecordedRef.current < 1000) return; // 1s throttle

    lastRecordedRef.current = now;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    }

    // Reset scheduled timeout
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    timeoutIdRef.current = setTimeout(checkElapsed, timeoutMs);
  }, [isAuthenticated, timeoutMs, checkElapsed]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      return;
    }

    isExpiringRef.current = false;

    // Check if previously stored session was already expired before mount
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LAST_ACTIVITY_KEY) : null;
    const initialTime = stored ? parseInt(stored, 10) : Date.now();
    if (stored && !isNaN(initialTime) && initialTime > 0) {
      const elapsed = Date.now() - initialTime;
      if (elapsed >= timeoutMs) {
        triggerTimeout();
        return;
      }
      lastRecordedRef.current = initialTime;
    } else {
      lastRecordedRef.current = Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_ACTIVITY_KEY, lastRecordedRef.current.toString());
      }
    }

    // Genuine manual interaction DOM event listeners
    const onMouseDown = () => recordActivity();
    const onKeyDown = () => recordActivity();
    const onTouchStart = () => recordActivity();
    const onWheel = () => recordActivity();
    const onMouseMove = (e: MouseEvent) => {
      // Guard against synthetic mousemove when cursor position hasn't changed
      if (e.clientX === lastMousePosRef.current.x && e.clientY === lastMousePosRef.current.y) {
        return;
      }
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      recordActivity();
    };

    // Tab visibility & focus changes (e.g. computer woke up from sleep or user switched back to tab)
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkElapsed();
      }
    };

    // Cross-tab synchronization via storage events
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime)) {
          lastRecordedRef.current = Math.max(lastRecordedRef.current, remoteTime);
          if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
          const remaining = Math.max(1000, timeoutMs - (Date.now() - lastRecordedRef.current));
          timeoutIdRef.current = setTimeout(checkElapsed, remaining);
        }
      }
      if (e.key === 'dms_token' && !e.newValue) {
        // Logged out in another tab
        triggerTimeout();
      }
    };

    const eventOptions: AddEventListenerOptions = { passive: true, capture: true };
    window.addEventListener('mousedown', onMouseDown, eventOptions);
    window.addEventListener('mousemove', onMouseMove, eventOptions);
    window.addEventListener('keydown', onKeyDown, eventOptions);
    window.addEventListener('touchstart', onTouchStart, eventOptions);
    window.addEventListener('wheel', onWheel, eventOptions);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    // Initial timeout scheduling
    const initialRemaining = Math.max(1000, timeoutMs - (Date.now() - lastRecordedRef.current));
    timeoutIdRef.current = setTimeout(checkElapsed, initialRemaining);

    // Periodic heartbeat check every 15 seconds (detects system sleep, tab suspension)
    intervalIdRef.current = setInterval(checkElapsed, 15000);

    return () => {
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('touchstart', onTouchStart, true);
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);

      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, [isAuthenticated, timeoutMs, recordActivity, checkElapsed, triggerTimeout]);
}
