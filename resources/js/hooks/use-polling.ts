import { useEffect, useRef } from 'react';

export function usePolling(
    callback: () => void | Promise<void>,
    intervalMs: number,
    enabled: boolean,
): void {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let timerId: number | null = null;

        const tick = () => {
            if (document.visibilityState === 'visible') {
                void savedCallback.current();
            }
        };

        const startTimer = () => {
            if (timerId !== null) {
                window.clearInterval(timerId);
            }
            timerId = window.setInterval(tick, intervalMs);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void savedCallback.current();
                startTimer();
            } else if (timerId !== null) {
                window.clearInterval(timerId);
                timerId = null;
            }
        };

        if (document.visibilityState === 'visible') {
            startTimer();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (timerId !== null) {
                window.clearInterval(timerId);
            }
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [intervalMs, enabled]);
}
