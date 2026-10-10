// Times are shown in the corridor's time zone whatever the browser's is.
const ZONE = 'Asia/Kolkata';

const dateTime = new Intl.DateTimeFormat('en-IN', {
  timeZone: ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const time = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' });

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));
export const formatTime = (iso: string): string => time.format(new Date(iso));
export const formatRupees = (amount: number): string => rupees.format(amount);

/** Today's date in the corridor, as the yyyy-mm-dd a date input wants. */
export function todayInCorridor(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(now);
}
