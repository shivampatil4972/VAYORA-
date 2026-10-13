import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Card, ConfirmButton, Notice, Page, QueryState, TextField } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { AdminOverview, AuditEntry, Member, MemberReport, ReportOutcome } from '../lib/types';

const reasonLabel: Record<MemberReport['reason'], string> = {
  UNSAFE_DRIVING: 'Unsafe driving',
  HARASSMENT: 'Harassment',
  NO_SHOW: 'Did not turn up',
  FRAUD: 'Fraud',
  OTHER: 'Something else',
};

function Counts({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  return (
    <Card>
      <h2 className="text-sm font-medium text-slate-500">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">None yet.</p>
      ) : (
        <dl className="mt-2 space-y-1 text-sm">
          {entries.map(([name, count]) => (
            <div key={name} className="flex justify-between gap-4">
              <dt className="text-slate-600">{name.replace(/_/g, ' ').toLowerCase()}</dt>
              <dd className="font-medium">{count}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

export function OverviewPage() {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api<AdminOverview>('/admin/overview') });
  return (
    <Page title="Overview">
      <QueryState isPending={overview.isPending} error={overview.error} isEmpty={false} empty="" onRetry={() => void overview.refetch()} />
      {overview.data && (
        <>
          {overview.data.openReports > 0 && (
            <Notice tone="info">
              {overview.data.openReports} {overview.data.openReports === 1 ? 'report is' : 'reports are'} waiting.{' '}
              <Link to="/admin/reports" className="font-medium underline">
                Open the queue
              </Link>
            </Notice>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Counts title="Members by role" counts={overview.data.users} />
            <Counts title="Rides by status" counts={overview.data.rides} />
            <Counts title="Bookings by status" counts={overview.data.bookings} />
          </div>
          <p className="text-sm text-slate-600">Suspended members: {overview.data.suspendedMembers}</p>
        </>
      )}
    </Page>
  );
}

export function ReportsPage() {
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => api<MemberReport[]>('/admin/reports?status=OPEN') });
  const [notes, setNotes] = useState<Record<number, string>>({});
  const resolve = useMutation({
    mutationFn: ({ id, outcome }: { id: number; outcome: ReportOutcome }) =>
      api<MemberReport>(`/admin/reports/${id}/resolve`, { method: 'POST', body: { outcome, note: notes[id] ?? '' } }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  return (
    <Page title="Reports">
      {resolve.error && <Notice tone="error">{resolve.error.message}</Notice>}
      <QueryState
        isPending={reports.isPending}
        error={reports.error}
        isEmpty={reports.data?.length === 0}
        empty="No reports are waiting."
        onRetry={() => void reports.refetch()}
      />
      {reports.data?.map((report) => (
        <Card key={report.id}>
          <p className="font-medium">
            {reasonLabel[report.reason]}: {report.reporterName} about{' '}
            <Link to={`/users/${report.reportedUserId}`} className="text-teal-800 underline">
              {report.reportedUserName}
            </Link>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Filed {formatDateTime(report.createdAt)}
            {report.bookingId !== null && ` · booking #${report.bookingId}`}
          </p>
          {/* Rendered as text: this is whatever the reporter typed. */}
          {report.details && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{report.details}</p>}
          <div className="mt-3 space-y-3">
            <TextField
              label={`Note for report #${report.id}`}
              hint="Kept with the report. Sent to the member if you warn them."
              maxLength={1000}
              value={notes[report.id] ?? ''}
              onChange={(event) => setNotes({ ...notes, [report.id]: event.target.value })}
            />
            <div className="flex flex-wrap gap-2">
              <Button tone="secondary" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: report.id, outcome: 'DISMISS' })}>
                Dismiss
              </Button>
              <Button disabled={resolve.isPending} onClick={() => resolve.mutate({ id: report.id, outcome: 'WARN' })}>
                Warn member
              </Button>
              <ConfirmButton
                label="Suspend member"
                confirmLabel={`Yes, suspend ${report.reportedUserName}`}
                disabled={resolve.isPending}
                onConfirm={() => resolve.mutate({ id: report.id, outcome: 'SUSPEND' })}
              />
            </div>
          </div>
        </Card>
      ))}
    </Page>
  );
}

export function MembersPage() {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const members = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => api<Member[]>(`/admin/users?${new URLSearchParams({ q: search })}`),
  });
  const reinstate = useMutation({
    mutationFn: (id: number) => api<void>(`/admin/users/${id}/reinstate`, { method: 'POST' }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  return (
    <Page title="Members">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(typed);
        }}
      >
        <div className="min-w-64 flex-1">
          <TextField label="Name or email" value={typed} onChange={(event) => setTyped(event.target.value)} />
        </div>
        <Button type="submit">Search</Button>
      </form>
      {reinstate.error && <Notice tone="error">{reinstate.error.message}</Notice>}
      <QueryState
        isPending={members.isPending}
        error={members.error}
        isEmpty={members.data?.length === 0}
        empty="No member matches."
        onRetry={() => void members.refetch()}
      />
      {members.data && members.data.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Members, newest first</caption>
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Name</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Email</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Role</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Joined</th>
                  <th scope="col" className="py-2 font-medium">Standing</th>
                </tr>
              </thead>
              <tbody>
                {members.data.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4">{member.fullName}</td>
                    <td className="py-2 pr-4">{member.email}</td>
                    <td className="py-2 pr-4">{member.role.toLowerCase()}</td>
                    <td className="py-2 pr-4">{formatDateTime(member.memberSince)}</td>
                    <td className="py-2">
                      {member.status === 'SUSPENDED' ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-red-800">Suspended</span>
                          <Button tone="secondary" disabled={reinstate.isPending} onClick={() => reinstate.mutate(member.id)}>
                            Reinstate {member.fullName}
                          </Button>
                        </span>
                      ) : (
                        'Active'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}

export function AuditPage() {
  const entries = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => api<AuditEntry[]>('/admin/audit') });
  return (
    <Page title="Audit log">
      <p className="text-sm text-slate-600">Every administrative action, newest first. Entries cannot be edited or removed.</p>
      <QueryState
        isPending={entries.isPending}
        error={entries.error}
        isEmpty={entries.data?.length === 0}
        empty="No administrative action has been recorded."
        onRetry={() => void entries.refetch()}
      />
      {entries.data && entries.data.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Administrative actions</caption>
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">When</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Who</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Action</th>
                  <th scope="col" className="py-2 pr-4 font-medium">On</th>
                  <th scope="col" className="py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.data.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="py-2 pr-4">{formatDateTime(entry.createdAt)}</td>
                    <td className="py-2 pr-4">{entry.actorName}</td>
                    <td className="py-2 pr-4">{entry.action.replace(/_/g, ' ').toLowerCase()}</td>
                    <td className="py-2 pr-4">{entry.targetType ? `${entry.targetType} #${entry.targetId}` : ''}</td>
                    <td className="py-2 font-mono text-xs text-slate-600">{entry.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}
