import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

import { msg, useT } from '../lib/i18n';
import type { BookingStatus, RideStatus } from '../lib/types';

const control =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm ' +
  'focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 aria-[invalid=true]:border-red-600';

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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
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
        <select ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={control} {...select}>
          {children}
        </select>
      </FieldFrame>
    );
  },
);

type Tone = 'primary' | 'secondary' | 'danger';

const tones: Record<Tone, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  danger: 'bg-red-700 text-white hover:bg-red-800',
};

export function Button({ tone = 'primary', className = '', ...button }: { tone?: Tone } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={
        `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ` +
        `focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ` +
        `disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`
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
    <span className="inline-flex gap-2" role="group" aria-label={label}>
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

export function Notice({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const style = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone];
  // Errors interrupt a screen reader; everything else waits its turn.
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-4 py-3 text-sm ${style}`}>
      {children}
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
  if (isPending) return <Notice tone="info">{t('Loading…')}</Notice>;
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
  REJECTED: [msg('Declined by the driver'), 'bg-slate-200 text-slate-800'],
  CANCELLED: [msg('Cancelled'), 'bg-slate-200 text-slate-800'],
  COMPLETED: [msg('Completed'), 'bg-teal-100 text-teal-900'],
  NO_SHOW: [msg('Did not board'), 'bg-red-100 text-red-900'],
  SCHEDULED: [msg('Scheduled'), 'bg-sky-100 text-sky-900'],
  IN_PROGRESS: [msg('On the road'), 'bg-amber-100 text-amber-900'],
};

export function StatusBadge({ status }: { status: BookingStatus | RideStatus }) {
  const t = useT();
  const [label, style] = statusLabel[status];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{t(label)}</span>;
}

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {children}
    </section>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">{children}</div>;
}
