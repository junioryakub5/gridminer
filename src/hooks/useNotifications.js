import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useEffect } from 'react';

/* ── Notification IDs (must be stable integers) ── */
const N = {
  MINE_READY:    1001,
  MINE_SOON:     1002,
  WELCOME:       1003,
};

const isNative = () => Capacitor.isNativePlatform();

/* ─────────────────────────────────────────────────────────
   Permission — call once on app boot
───────────────────────────────────────────────────────── */
export async function initNotifications() {
  if (!isNative()) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────────────────────
   Mine reminders — schedule after every mine / on login
───────────────────────────────────────────────────────── */
export async function scheduleMineNotifications(lastMinedAt) {
  if (!isNative()) return;
  try {
    // Always cancel stale reminders first
    await LocalNotifications.cancel({
      notifications: [{ id: N.MINE_READY }, { id: N.MINE_SOON }],
    }).catch(() => {});

    if (!lastMinedAt) return;

    const minedAt  = new Date(lastMinedAt).getTime();
    const readyAt  = minedAt + 24 * 60 * 60 * 1000;          // +24 h
    const soonAt   = minedAt + 20 * 60 * 60 * 1000;          // +20 h (4 h warning)
    const now      = Date.now();

    if (readyAt <= now) return; // Mine is already available — nothing to schedule

    const toSchedule = [];

    // "Mine Ready" at exactly 24 h
    toSchedule.push({
      id:    N.MINE_READY,
      title: '⛏️ Mine Ready!',
      body:  'Your daily USDT mining reward is ready. Tap to collect now!',
      schedule: { at: new Date(readyAt), allowWhileIdle: true },
      sound: 'default',
      smallIcon: 'ic_stat_icon',
      iconColor: '#1a9e8f',
      extra: { route: '/dashboard' },
    });

    // "Mining Soon" at 20 h (only if still in the future)
    if (soonAt > now) {
      toSchedule.push({
        id:    N.MINE_SOON,
        smallIcon: 'ic_stat_icon',
        title: '⏰ Mining Soon!',
        body:  'Your mine unlocks in 4 hours. Come back and collect your reward!',
        schedule: { at: new Date(soonAt), allowWhileIdle: true },
        sound: null,
        iconColor: '#1a9e8f',
        extra: { route: '/dashboard' },
      });
    }

    await LocalNotifications.schedule({ notifications: toSchedule });
  } catch (err) {
    console.warn('[Notifications] scheduleMineNotifications:', err.message);
  }
}

export async function cancelMineNotifications() {
  if (!isNative()) return;
  await LocalNotifications.cancel({
    notifications: [{ id: N.MINE_READY }, { id: N.MINE_SOON }],
  }).catch(() => {});
}

/* ─────────────────────────────────────────────────────────
   Welcome — shown exactly once on first install
───────────────────────────────────────────────────────── */
export async function maybeShowWelcome() {
  if (!isNative()) return;
  if (localStorage.getItem('gm_welcome_shown')) return;
  localStorage.setItem('gm_welcome_shown', '1');
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id:    N.WELCOME,
        title: '👋 Welcome to Gridminer!',
        body:  'Start mining daily and earn real USDT rewards. Tap to get started!',
        schedule: { at: new Date(Date.now() + 4000) },
        sound: 'default',
        smallIcon: 'ic_stat_icon',
        iconColor: '#1a9e8f',
      }],
    });
  } catch (err) {
    console.warn('[Notifications] welcome:', err.message);
  }
}

/* ─────────────────────────────────────────────────────────
   Tap handler — navigate to the right screen when user
   taps a notification
───────────────────────────────────────────────────────── */
export function useNotificationTapListener(navigate) {
  useEffect(() => {
    if (!isNative()) return;

    let handle;
    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const route = event.notification?.extra?.route;
      if (route) navigate(route);
    }).then(h => { handle = h; }).catch(() => {});

    return () => { handle?.remove?.(); };
  }, [navigate]);
}
