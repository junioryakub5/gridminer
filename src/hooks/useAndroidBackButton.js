import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Root pages where pressing back should exit the app instead of
 * navigating further back in the browser history stack.
 */
const ROOT_PATHS = ['/', '/dashboard', '/login', '/register'];

/**
 * Hook that intercepts the Android system back button for Capacitor apps.
 *
 * Behaviour:
 *  - On a non-root page  → navigates back in React Router history
 *  - On a root page      → first press shows "Press back again to exit" toast,
 *                          second press within 2 s exits the app cleanly
 *
 * Only activates on native Android; does nothing on web/iOS.
 *
 * @param {Function} showToast  - showToast(message, duration) from AppContext
 */
export function useAndroidBackButton(showToast) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const exitPending = useRef(false);
  const toastTimer  = useRef(null);

  useEffect(() => {
    // Only hook into native Android
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
      const isRoot = ROOT_PATHS.includes(location.pathname);

      if (!isRoot && canGoBack) {
        // Navigate back through React Router history
        navigate(-1);
        return;
      }

      // On a root page — double-back-to-exit behaviour
      if (exitPending.current) {
        clearTimeout(toastTimer.current);
        App.exitApp();
        return;
      }

      exitPending.current = true;
      showToast('Press back again to exit');

      // Reset after 2 seconds
      toastTimer.current = setTimeout(() => {
        exitPending.current = false;
      }, 2000);
    });

    return () => {
      listenerPromise.then(h => h.remove());
      clearTimeout(toastTimer.current);
    };
  // Re-register whenever the route changes so isRoot is always fresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
