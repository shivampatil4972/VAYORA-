import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Notice } from './ui';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';

interface PushSettings {
  publicKey: string | null;
  subscribed: boolean;
}

const supported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;

/** The server's base64url key as the bytes a push subscription asks for. */
function keyBytes(base64url: string): Uint8Array {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function thisBrowsersSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  return registration ? registration.pushManager.getSubscription() : null;
}

/** Turns push notifications on or off in this browser. Others the member uses are untouched. */
export function PushChoice() {
  const t = useT();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['me', 'push'], queryFn: () => api<PushSettings>('/me/push') });
  const here = useQuery({ queryKey: ['me', 'push', 'here'], queryFn: thisBrowsersSubscription, enabled: supported() });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['me', 'push'] });

  const turnOn = useMutation({
    mutationFn: async () => {
      if ((await Notification.requestPermission()) !== 'granted') {
        throw new Error(t('Notifications are blocked for this site in your browser settings.'));
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(settings.data!.publicKey!),
      });
      await api<void>('/me/push-subscriptions', { method: 'POST', body: subscription.toJSON() });
    },
    onSettled: refresh,
  });
  const turnOff = useMutation({
    mutationFn: async () => {
      const subscription = await thisBrowsersSubscription();
      if (subscription) {
        await api<void>(`/me/push-subscriptions?${new URLSearchParams({ endpoint: subscription.endpoint })}`, { method: 'DELETE' });
        await subscription.unsubscribe();
      }
    },
    onSettled: refresh,
  });

  if (!supported()) return <p className="text-slate-600">{t('This browser cannot receive push notifications.')}</p>;
  if (!settings.data) return null;
  if (!settings.data.publicKey) return <p className="text-slate-600">{t('Push notifications are not set up on this server.')}</p>;

  const on = Boolean(here.data);
  return (
    <div className="space-y-2">
      <p>{on ? t('Push notifications are on in this browser.') : t('Push notifications are off in this browser.')}</p>
      <Button tone="secondary" disabled={turnOn.isPending || turnOff.isPending} onClick={() => (on ? turnOff.mutate() : turnOn.mutate())}>
        {on ? t('Turn off in this browser') : t('Turn on in this browser')}
      </Button>
      <p className="text-slate-500">{t('A push shows the notification in English, as email and SMS copies do.')}</p>
      {(turnOn.error ?? turnOff.error) && <Notice tone="error">{(turnOn.error ?? turnOff.error)!.message}</Notice>}
    </div>
  );
}
