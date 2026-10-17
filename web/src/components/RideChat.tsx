import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { useAuth } from '../lib/auth';
import { formatTime } from '../lib/format';
import { msg, useT } from '../lib/i18n';
import { useRideChannel, type RealtimeError } from '../lib/realtime';
import type { RideStatus } from '../lib/types';
import { RouteMap } from './RouteMap';
import { Button, Notice } from './ui';

const MAX_LENGTH = 500;
// A position is sent at most this often, well inside what the gateway accepts.
const POSITION_INTERVAL_MS = 5000;
// GeolocationPositionError.PERMISSION_DENIED. The other two codes (no fix, too slow) pass:
// the watch keeps running, so a moment without signal must not end sharing.
const PERMISSION_DENIED = 1;

const problems: Record<RealtimeError, string> = {
  invalid: msg('That message cannot be sent. Check it is not empty or too long.'),
  not_joined: msg('The connection was lost. Close the chat and open it again.'),
  not_a_member: msg('You are no longer on this ride.'),
  rate_limited: msg('You are sending messages too quickly. Wait a moment.'),
  not_the_driver: msg('Only the driver can share a position.'),
  ride_not_in_progress: msg('A position can only be shared while the ride is under way.'),
  server_error: msg('That could not be sent. Try again.'),
  unreachable: msg('The chat service cannot be reached. Try again.'),
};

/** The driver's side of live position: on only while they ask for it. */
function SharePosition({ send }: { send: (lat: number, lon: number) => Promise<{ ok: boolean; error?: RealtimeError }> }) {
  const t = useT();
  const [sharing, setSharing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [lost, setLost] = useState(false);
  const lastSent = useRef(0);

  useEffect(() => {
    setLost(false);
    if (!sharing) return;
    if (!('geolocation' in navigator)) {
      setProblem(msg('This device cannot report its position.'));
      setSharing(false);
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        setLost(false);
        if (Date.now() - lastSent.current < POSITION_INTERVAL_MS) return;
        lastSent.current = Date.now();
        void send(position.coords.latitude, position.coords.longitude).then((sent) => {
          if (!sent.ok && sent.error && sent.error !== 'rate_limited') {
            setProblem(problems[sent.error]);
            setSharing(false);
          }
        });
      },
      (error) => {
        if (error.code !== PERMISSION_DENIED) {
          setLost(true);
          return;
        }
        setProblem(msg('Your position is not available. Check that location access is allowed.'));
        setSharing(false);
      },
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing, send]);

  return (
    <div className="space-y-2">
      {problem && <Notice tone="error">{t(problem)}</Notice>}
      {sharing && lost && <Notice tone="info">{t('Your position cannot be found just now. Sharing stays on and carries on once it is found.')}</Notice>}
      <Button
        tone="secondary"
        aria-pressed={sharing}
        onClick={() => {
          setProblem(null);
          setSharing(!sharing);
        }}
      >
        {sharing ? t('Stop sharing my position') : t('Share my position with passengers')}
      </Button>
      {sharing && <p className="text-sm text-slate-600">{t('Passengers on this ride can see where you are until you stop or the ride ends.')}</p>}
    </div>
  );
}

/**
 * Chat between everyone on a ride, and the driver's position while it is under way.
 *
 * @param rideStatus the ride's status as the page knows it now. The chat learns the status
 *                   only when it joins, so a driver who opened it before starting the ride
 *                   would otherwise never be offered position sharing.
 */
export function RideChat({ rideId, rideStatus }: { rideId: number; rideStatus?: RideStatus }) {
  const t = useT();
  const { user } = useAuth();
  const inputId = useId();
  const channel = useRideChannel(rideId);
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (channel.phase === 'connecting') return <Notice tone="info">{t('Connecting…')}</Notice>;
  if (channel.phase === 'refused') return <Notice tone="info">{t('The chat is only for the driver and passengers booked on this ride.')}</Notice>;
  if (channel.phase === 'unavailable') return <Notice tone="error">{t('The chat service cannot be reached. Try again.')}</Notice>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (text.trim() === '') return;
    setSending(true);
    setProblem(null);
    const sent = await channel.send(text);
    setSending(false);
    if (sent.ok) setText('');
    else setProblem(problems[sent.error]);
  };

  return (
    <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-3">
      {channel.role === 'DRIVER' && (rideStatus ?? channel.rideStatus) === 'IN_PROGRESS' && <SharePosition send={channel.sendPosition} />}

      {channel.position && channel.role === 'PASSENGER' && (
        <div className="space-y-2">
          <p className="text-sm text-slate-700" role="status">
            {t("The driver's position at {time}", { time: formatTime(channel.position.at) })}
          </p>
          <RouteMap
            points={[{ lat: channel.position.lat, lon: channel.position.lon, label: t('The driver'), emphasis: true }]}
            describe={t("Map showing the driver's last known position")}
          />
        </div>
      )}

      {/* Rendered as text: a message is whatever someone typed. Screen readers announce new ones. */}
      <ol aria-live="polite" aria-label={t('Messages')} className="max-h-64 space-y-2 overflow-y-auto">
        {channel.messages.length === 0 && <li className="text-sm text-slate-500">{t('No messages yet.')}</li>}
        {channel.messages.map((message) => (
          <li key={message.id} className="text-sm">
            <span className="font-medium">{message.senderId === user?.id ? t('You') : message.senderName}</span>{' '}
            <span className="text-slate-500">{formatTime(message.sentAt)}</span>
            <p className="whitespace-pre-wrap text-slate-800">{message.text}</p>
          </li>
        ))}
      </ol>

      {problem && <Notice tone="error">{t(problem)}</Notice>}
      <form onSubmit={(event) => void submit(event)} className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {t('Message everyone on this ride')}
          </label>
          <input
            id={inputId}
            value={text}
            maxLength={MAX_LENGTH}
            onChange={(event) => setText(event.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40"
          />
        </div>
        <Button type="submit" disabled={sending || text.trim() === ''}>
          {sending ? t('Sending…') : t('Send')}
        </Button>
      </form>
    </div>
  );
}
