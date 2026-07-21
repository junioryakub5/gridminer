import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useEffect } from 'react';

/* ── Notification IDs (must be stable integers) ── */
const N = {
  MINE_READY:    1001,
  MINE_SOON:     1002,
  WELCOME:       1003,
  TX_BASE:       2000, // 2000 + index for transaction status change notifications
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
    await LocalNotifications.cancel({
      notifications: [{ id: N.MINE_READY }, { id: N.MINE_SOON }],
    }).catch(() => {});

    if (!lastMinedAt) return;

    const minedAt  = new Date(lastMinedAt).getTime();
    const readyAt  = minedAt + 24 * 60 * 60 * 1000;
    const soonAt   = minedAt + 20 * 60 * 60 * 1000;
    const now      = Date.now();

    if (readyAt <= now) return;

    const toSchedule = [];

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

    if (soonAt > now) {
      toSchedule.push({
        id:    N.MINE_SOON,
        title: '⏰ Mining Soon!',
        body:  'Your mine unlocks in 4 hours. Come back and collect your reward!',
        schedule: { at: new Date(soonAt), allowWhileIdle: true },
        sound: null,
        smallIcon: 'ic_stat_icon',
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
   Transaction status change notifications
   Call this every time transactions are loaded — it
   compares against the last-known statuses stored in
   localStorage and fires a notification for any change.
───────────────────────────────────────────────────────── */
const STORAGE_KEY = 'gm_tx_statuses';

function buildTxNotification(tx, idx) {
  const id = N.TX_BASE + (idx % 500); // keep IDs in a safe range
  const isUpgrade    = tx.type === 'upgrades';
  const isWithdrawal = tx.type === 'withdrawals';

  if (tx.status === 'completed') {
    if (isUpgrade) {
      return {
        id,
        title: '🎉 Upgrade Approved!',
        body:  'Your account upgrade has been activated. Start earning more today!',
        extra: { route: '/dashboard' },
      };
    }
    if (isWithdrawal) {
      return {
        id,
        title: '✅ Withdrawal Processed!',
        body:  `Your withdrawal has been approved and is on its way. Check your history.`,
        extra: { route: '/history' },
      };
    }
  }

  if (tx.status === 'failed') {
    if (isUpgrade) {
      return {
        id,
        title: '⚠️ Upgrade Rejected',
        body:  'Your upgrade request was not approved. Please check payment details or contact support.',
        extra: { route: '/history' },
      };
    }
    if (isWithdrawal) {
      return {
        id,
        title: '❌ Withdrawal Rejected',
        body:  'Your withdrawal request was rejected. Please contact support for assistance.',
        extra: { route: '/history' },
      };
    }
  }

  return null;
}

export async function checkAndNotifyStatusChanges(transactions) {
  if (!isNative() || !transactions?.length) return;

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const toSchedule = [];
    const newStored  = { ...stored };

    transactions.forEach((tx, idx) => {
      const prev = stored[tx.id];
      newStored[tx.id] = tx.status;

      // Only notify when transitioning from 'pending' → 'completed' or 'failed'
      if (prev === 'pending' && (tx.status === 'completed' || tx.status === 'failed')) {
        const notif = buildTxNotification(tx, idx);
        if (notif) {
          toSchedule.push({
            ...notif,
            schedule: { at: new Date(Date.now() + 800 + idx * 400) }, // slight stagger
            sound: 'default',
            smallIcon: 'ic_stat_icon',
            iconColor: tx.status === 'completed' ? '#1a9e8f' : '#ef4444',
          });
        }
      }
    });

    // Persist updated statuses
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStored));

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch (err) {
    console.warn('[Notifications] checkAndNotifyStatusChanges:', err.message);
  }
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
