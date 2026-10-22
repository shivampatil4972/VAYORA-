import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

import { msg, useT } from '../lib/i18n';
import { translateServerMessage } from '../lib/serverMessages';
import type { BookingStatus, RideStatus } from '../lib/types';

// Fields as iOS draws them: rounded, quiet until touched, a soft glow of the tint when focused.
const control =
  'mt-1.5 block w-full rounded-xl border border-slate-200 bg-surface px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15 ' +
  'aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-600/15';

interface FieldShell {
  label: string;
  error?: string;
  hint?: string;
}

function useFieldIds(error?: string, hint?: string) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return { id, describedBy };
}

function FieldFrame({ id, label, error, hint, children }: FieldShell & { id: string; children: ReactNode }) {
  // Validation messages come from the schemas in English; this is where they are translated.
  const t = useT();
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-600">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] leading-snug text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 animate-fade-in text-[13px] font-medium text-red-700">
          {t(error)}
        </p>
      )}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, FieldShell & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, error, hint, ...input }, ref) {
    const { id, describedBy } = useFieldIds(error, hint);
    return (
      <FieldFrame id={id} label={label} error={error} hint={hint}>
        <input ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={control} {...input} />
      </FieldFrame>
    );
  },
);

export const SelectField = forwardRef<HTMLSelectElement, FieldShell & SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ label, error, hint, children, ...select }, ref) {
    const { id, describedBy } = useFieldIds(error, hint);
    return (
      <FieldFrame id={id} label={label} error={error} hint={hint}>
        <select ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={`select-ios ${control}`} {...select}>
          {children}
        </select>
      </FieldFrame>
    );
  },
);

type Tone = 'primary' | 'secondary' | 'danger';

const tones: Record<Tone, string> = {
  primary: 'bg-accent text-white shadow-md shadow-accent/25 hover:bg-accent-strong',
  secondary: 'bg-slate-100 text-slate-900 ring-1 ring-inset ring-slate-900/[0.06] hover:bg-slate-200',
  danger: 'bg-danger text-white shadow-md shadow-danger/25 hover:bg-danger-strong',
};

/** A capsule that gives under the finger, as iOS buttons do. */
export function Button({ tone = 'primary', className = '', ...button }: { tone?: Tone } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={
        `inline-flex select-none items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ` +
        `transition-[transform,background-color,box-shadow,opacity] duration-150 ease-settle active:scale-[0.96] ` +
        `focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/30 ` +
        `disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none ${tones[tone]} ${className}`
      }
      {...button}
    />
  );
}

/** A button for actions that cannot be undone: the first press asks, the second acts. */
export function ConfirmButton({ label, confirmLabel, onConfirm, disabled, tone = 'danger' }: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  tone?: Tone;
}) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button tone="secondary" disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex animate-pop-in gap-2" role="group" aria-label={label}>
      <Button
        tone={tone}
        disabled={disabled}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button tone="secondary" onClick={() => setAsking(false)}>
        {t('Keep it')}
      </Button>
    </span>
  );
}

const noticeIcons = {
  // An exclamation in a circle, a tick in a circle, an "i" in a circle.
  error: 'M12 8v5m0 3.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  success: 'm8.5 12.5 2.5 2.5 5-5.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  info: 'M12 11v5m0-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};

export function Notice({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const t = useT();
  // An error is often the server's own words: shown translated when the tables know them,
  // with any numbers kept, and as they came when not.
  const content = tone === 'error' && typeof children === 'string' ? translateServerMessage(children, t) : children;
  const style = {
    error: 'bg-red-50 text-red-800 ring-red-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    info: 'bg-slate-100/80 text-slate-700 ring-slate-900/[0.05]',
  }[tone];
  // Errors interrupt a screen reader; everything else waits its turn.
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex animate-pop-in items-start gap-2.5 rounded-2xl px-4 py-3 text-sm leading-relaxed ring-1 ring-inset ${style}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={noticeIcons[tone]} />
      </svg>
      <span className="min-w-0 flex-1">{content}</span>
    </p>
  );
}

/** The three states every list has before it has rows. */
export function QueryState({ isPending, error, isEmpty, empty, onRetry }: {
  isPending: boolean;
  error: Error | null;
  isEmpty: boolean;
  empty: string;
  onRetry: () => void;
}) {
  const t = useT();
  if (isPending) {
    // Shapes of the rows to come while they load; the words are for screen readers.
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">{t('Loading…')}</span>
        <div aria-hidden="true" className="skeleton h-20" />
        <div aria-hidden="true" className="skeleton h-20 opacity-70" />
        <div aria-hidden="true" className="skeleton h-20 opacity-40" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-3">
        <Notice tone="error">{error.message}</Notice>
        <Button tone="secondary" onClick={onRetry}>
          {t('Try again')}
        </Button>
      </div>
    );
  }
  if (isEmpty) return <Notice tone="info">{empty}</Notice>;
  return null;
}

const statusLabel: Record<BookingStatus | RideStatus, [string, string]> = {
  PENDING: [msg('Waiting for the driver'), 'bg-amber-100 text-amber-900'],
  CONFIRMED: [msg('Confirmed'), 'bg-emerald-100 text-emerald-900'],
  REJECTED: [msg('Declined by the driver'), 'bg-slate-100 text-slate-700'],
  CANCELLED: [msg('Cancelled'), 'bg-slate-100 text-slate-700'],
  COMPLETED: [msg('Completed'), 'bg-teal-100 text-teal-900'],
  NO_SHOW: [msg('Did not board'), 'bg-red-100 text-red-900'],
  SCHEDULED: [msg('Scheduled'), 'bg-sky-100 text-sky-900'],
  IN_PROGRESS: [msg('On the road'), 'bg-amber-100 text-amber-900'],
};

/** What a status is called, to pass through `t`. */
export const statusText = (status: BookingStatus | RideStatus): string => statusLabel[status][0];

export function StatusBadge({ status }: { status: BookingStatus | RideStatus }) {
  const t = useT();
  const [label, style] = statusLabel[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {t(label)}
    </span>
  );
}

/** A screen: a large title, as in iOS, and its sections arriving one after another. */
export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="stagger space-y-6">
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[34px]">{title}</h1>
      {children}
    </section>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-slate-900/[0.04] transition-shadow duration-300 hover:shadow-float sm:p-5">
      {children}
    </div>
  );
}
