import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { api } from '../lib/api';
import type { MemberReport } from '../lib/types';
import { Button, Notice, SelectField } from './ui';

/** Lets a member report another to the administrators. The server decides who may. */
export function ReportMember({ userId, name }: { userId: number; name: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<MemberReport['reason'] | ''>('');
  const [details, setDetails] = useState('');
  const file = useMutation({
    mutationFn: () => api<{ id: number }>('/reports', { method: 'POST', body: { reportedUserId: userId, reason, details } }),
  });

  if (file.isSuccess) {
    return <Notice tone="success">Your report has been sent to the administrators. They will not tell {name} who filed it.</Notice>;
  }
  if (!open) {
    return (
      <Button tone="secondary" onClick={() => setOpen(true)}>
        Report {name}
      </Button>
    );
  }
  return (
    <form
      className="space-y-3 rounded-md border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (reason) file.mutate();
      }}
    >
      {file.error && <Notice tone="error">{file.error.message}</Notice>}
      <SelectField label="What happened?" value={reason} onChange={(event) => setReason(event.target.value as MemberReport['reason'])}>
        <option value="" disabled>
          Choose one
        </option>
        <option value="UNSAFE_DRIVING">Unsafe driving</option>
        <option value="HARASSMENT">Harassment</option>
        <option value="NO_SHOW">Did not turn up</option>
        <option value="FRAUD">Fraud</option>
        <option value="OTHER">Something else</option>
      </SelectField>
      <div>
        <label htmlFor={`${id}-details`} className="block text-sm font-medium text-slate-700">
          Details (optional)
        </label>
        <textarea
          id={`${id}-details`}
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40"
        />
      </div>
      <p className="text-sm text-slate-600">
        If you are in danger now, call 112. A report here is read by an administrator later, not straight away.
      </p>
      <div className="flex gap-2">
        <Button type="submit" tone="danger" disabled={!reason || file.isPending}>
          {file.isPending ? 'Sending…' : 'Send report'}
        </Button>
        <Button tone="secondary" onClick={() => setOpen(false)}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
