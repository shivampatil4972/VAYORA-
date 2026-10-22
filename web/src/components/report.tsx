import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { api } from '../lib/api';
import { msg, useT } from '../lib/i18n';
import type { MemberReport } from '../lib/types';
import { Button, Notice, SelectField } from './ui';

/** What a report can be about, in the words shown to members and administrators alike. */
export const reportReasons: Record<MemberReport['reason'], string> = {
  UNSAFE_DRIVING: msg('Unsafe driving'),
  HARASSMENT: msg('Harassment'),
  NO_SHOW: msg('Did not turn up'),
  FRAUD: msg('Fraud'),
  OTHER: msg('Something else'),
};

/** Lets a member report another to the administrators. The server decides who may. */
export function ReportMember({ userId, name }: { userId: number; name: string }) {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<MemberReport['reason'] | ''>('');
  const [details, setDetails] = useState('');
  const file = useMutation({
    mutationFn: () => api<{ id: number }>('/reports', { method: 'POST', body: { reportedUserId: userId, reason, details } }),
  });

  if (file.isSuccess) {
    return (
      <Notice tone="success">
        {t('Your report has been sent to the administrators. They will not tell {name} who filed it.', { name })}
      </Notice>
    );
  }
  if (!open) {
    return (
      <Button tone="secondary" onClick={() => setOpen(true)}>
        {t('Report {name}', { name })}
      </Button>
    );
  }
  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200 bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (reason) file.mutate();
      }}
    >
      {file.error && <Notice tone="error">{file.error.message}</Notice>}
      <SelectField label={t('What happened?')} value={reason} onChange={(event) => setReason(event.target.value as MemberReport['reason'])}>
        <option value="" disabled>
          {t('Choose one')}
        </option>
        {(Object.keys(reportReasons) as MemberReport['reason'][]).map((key) => (
          <option key={key} value={key}>
            {t(reportReasons[key])}
          </option>
        ))}
      </SelectField>
      <div>
        <label htmlFor={`${id}-details`} className="block text-sm font-medium text-slate-700">
          {t('Details (optional)')}
        </label>
        <textarea
          id={`${id}-details`}
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-surface px-3.5 py-2.5 text-[15px] shadow-sm focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15"
        />
      </div>
      <p className="text-sm text-slate-600">
        {t('If you are in danger now, call 112. A report here is read by an administrator later, not straight away.')}
      </p>
      <div className="flex gap-2">
        <Button type="submit" tone="danger" disabled={!reason || file.isPending}>
          {file.isPending ? t('Sending…') : t('Send report')}
        </Button>
        <Button tone="secondary" onClick={() => setOpen(false)}>
          {t('Never mind')}
        </Button>
      </div>
    </form>
  );
}
