import { msg, type Translate } from './i18n';
import type { NotificationText, TextValue } from './types';

// Every template core-api's notifications can carry, exactly as it writes them. A core-api
// test (NotificationTemplatesTest) fails if the server uses one that is not listed here,
// and the translation test fails if one listed here has no Hindi or Marathi.
const TEMPLATES = new Set([
  msg('{passenger} booked {seats}.'),
  msg('{passenger} asked for {seats}.'),
  msg('The driver accepted your booking for {seats}.'),
  msg('The driver did not answer your request for {seats} in time, so it has been closed. Everything you paid has been returned.'),
  msg("{passenger}'s request for {seats} was closed because it was not answered in time."),
  msg('{passenger} cancelled {seats}.'),
  msg('The driver did not accept your request for {seats}. Everything you paid has been returned.'),
  msg('{n} seat, {from} to {to}'),
  msg('{n} seats, {from} to {to}'),
  msg('The driver reported that you did not board for {seats}. Nothing is refunded for a missed ride.'),
  msg('Your trip from {from} to {to} is complete. You can rate your driver in My bookings.'),
  msg('The driver cancelled the ride you booked for {seats}. Everything you paid has been returned. {more}'),
  msg('No other ride with seats leaves near that time.'),
  msg('No other ride with seats leaves near that time. Buses listed by JOURNEX staff (check with the operator before travelling): {buses}.'),
  msg('Other rides that could take you: {rides}. Search again to book one.'),
  msg('{time} from {stop} with {driver}'),
  msg('{time} {operator}, Rs {fare}'),
  msg('A passenger says a trip marked completed did not happen. See disputed trips.'),
  msg('How was your trip with {driver}? You can still rate it.'),
  msg('How was {passenger} as a passenger? You can still rate the trip.'),
  msg('An administrator reviewed a report about you.'),
  msg('An administrator reviewed a report about you: {note}'),
  msg('{name} pressed the emergency button. Open the emergency queue.'),
]);

const known = (text: NotificationText): boolean =>
  TEMPLATES.has(text.template) &&
  Object.values(text.values).every((value) =>
    typeof value === 'string' ? true : Array.isArray(value) ? value.every(known) : known(value),
  );

function render(t: Translate, text: NotificationText): string {
  const values = Object.fromEntries(
    Object.entries(text.values).map(([name, value]) => [name, show(t, name, value)]),
  );
  return t(text.template, values);
}

// Only town names among the plain values are translated. A person's name, an operator, a
// time or an administrator's note is shown as written, even if it happens to match a word.
const TOWNS = new Set(['from', 'to', 'stop']);

function show(t: Translate, name: string, value: TextValue): string {
  if (typeof value === 'string') return TOWNS.has(name) ? t(value) : value;
  if (Array.isArray(value)) return value.map((item) => render(t, item)).join('; ');
  return render(t, value);
}

/**
 * A notification in the reader's language, or null when it must be shown as the server's
 * English: written before templates existed, or using one this version does not know.
 */
export function translatedNotification(t: Translate, text: NotificationText | null | undefined): string | null {
  return text && known(text) ? render(t, text) : null;
}
