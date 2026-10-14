import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { Button, Card, ConfirmButton, Notice, Page, QueryState, SelectField, TextField } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { msg, useT } from '../lib/i18n';
import type { Chattiness, EmergencyContact, Gender, MyProfile } from '../lib/types';

const PHONE = /^\+?[0-9]{10,15}$/;
const PHONE_ERROR = msg('Enter 10 to 15 digits, with or without a + in front');
const MAX_CONTACTS = 3;

type YesNo = '' | 'yes' | 'no';

const toYesNo = (value: boolean | null): YesNo => (value === null ? '' : value ? 'yes' : 'no');
const fromYesNo = (value: YesNo): boolean | null => (value === '' ? null : value === 'yes');

interface Draft {
  phone: string;
  bio: string;
  birthYear: string;
  gender: Gender | '';
  smoking: YesNo;
  pets: YesNo;
  music: YesNo;
  chattiness: Chattiness | '';
}

const draftOf = (profile: MyProfile): Draft => ({
  phone: profile.phone ?? '',
  bio: profile.bio ?? '',
  birthYear: profile.birthYear === null ? '' : String(profile.birthYear),
  gender: profile.gender ?? '',
  smoking: toYesNo(profile.smoking),
  pets: toYesNo(profile.pets),
  music: toYesNo(profile.music),
  chattiness: profile.chattiness ?? '',
});

function ProfileForm({ profile }: { profile: MyProfile }) {
  const t = useT();
  const id = useId();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => draftOf(profile));
  const [phoneError, setPhoneError] = useState<string>();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = useMutation({
    mutationFn: () =>
      api<MyProfile>('/me/profile', {
        method: 'PUT',
        body: {
          phone: draft.phone.trim(),
          bio: draft.bio,
          birthYear: draft.birthYear === '' ? null : Number(draft.birthYear),
          gender: draft.gender || null,
          smoking: fromYesNo(draft.smoking),
          pets: fromYesNo(draft.pets),
          music: fromYesNo(draft.music),
          chattiness: draft.chattiness || null,
        },
      }),
    onSuccess: (saved) => queryClient.setQueryData(['me', 'profile'], saved),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const phone = draft.phone.trim();
    const bad = phone !== '' && !PHONE.test(phone);
    setPhoneError(bad ? PHONE_ERROR : undefined);
    if (!bad) save.mutate();
  }

  const yesNo = (
    <>
      <option value="">{t('Not said')}</option>
      <option value="yes">{t('Fine with me')}</option>
      <option value="no">{t('No, please')}</option>
    </>
  );

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      {save.error && <Notice tone="error">{save.error.message}</Notice>}
      {save.isSuccess && <Notice tone="success">{t('Your profile is saved.')}</Notice>}
      <TextField
        label={t('Phone number')}
        type="tel"
        autoComplete="tel"
        value={draft.phone}
        error={phoneError}
        hint={t('Never shown to other members. Changing it means confirming it again.')}
        onChange={(event) => set('phone', event.target.value)}
      />
      <div>
        <label htmlFor={`${id}-bio`} className="block text-sm font-medium text-slate-700">
          {t('About you')}
        </label>
        <textarea
          id={`${id}-bio`}
          rows={3}
          maxLength={500}
          value={draft.bio}
          onChange={(event) => set('bio', event.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('Year of birth')}
          type="number"
          min={1900}
          max={2100}
          value={draft.birthYear}
          hint={t('Other members see only your approximate age.')}
          onChange={(event) => set('birthYear', event.target.value)}
        />
        <SelectField label={t('Gender')} value={draft.gender} hint={t('Not shown on your profile. Choosing Woman lets you offer and book women-only rides; nobody checks it.')} onChange={(event) => set('gender', event.target.value as Gender | '')}>
          <option value="">{t('Not said')}</option>
          <option value="FEMALE">{t('Woman')}</option>
          <option value="MALE">{t('Man')}</option>
          <option value="OTHER">{t('Other')}</option>
        </SelectField>
        <SelectField label={t('Smoking in the car')} value={draft.smoking} onChange={(event) => set('smoking', event.target.value as YesNo)}>
          {yesNo}
        </SelectField>
        <SelectField label={t('Pets in the car')} value={draft.pets} onChange={(event) => set('pets', event.target.value as YesNo)}>
          {yesNo}
        </SelectField>
        <SelectField label={t('Music on the way')} value={draft.music} onChange={(event) => set('music', event.target.value as YesNo)}>
          {yesNo}
        </SelectField>
        <SelectField label={t('Conversation')} value={draft.chattiness} onChange={(event) => set('chattiness', event.target.value as Chattiness | '')}>
          <option value="">{t('Not said')}</option>
          <option value="QUIET">{t('I prefer a quiet ride')}</option>
          <option value="MODERATE">{t('Some conversation is nice')}</option>
          <option value="TALKATIVE">{t('I like to talk')}</option>
        </SelectField>
      </div>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? t('Saving…') : t('Save profile')}
      </Button>
    </form>
  );
}

/** One address to confirm: ask for a code, then type it in. */
function Confirm({ channel, label, address, confirmed }: { channel: 'email' | 'phone'; label: string; address: string | null; confirmed: boolean }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const request = useMutation({ mutationFn: () => api<void>(`/me/verification/${channel}/request`, { method: 'POST' }) });
  const confirm = useMutation({
    mutationFn: () => api<void>(`/me/verification/${channel}/confirm`, { method: 'POST', body: { code } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'profile'] }),
  });
  // A different address starts again from nothing.
  useEffect(() => {
    setCode('');
    request.reset();
    confirm.reset();
    // Only when the address changes: the mutations are new objects on every render.
  }, [address]);

  return (
    <div className="space-y-2 border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <p className="text-sm">
        <span className="font-medium">{label}</span> <span className="text-slate-600">{address ?? t('None given')}</span>{' '}
        {address && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${confirmed ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
            {confirmed ? t('Confirmed') : t('Not confirmed')}
          </span>
        )}
      </p>
      {address && !confirmed && (
        <>
          {(request.error ?? confirm.error) && <Notice tone="error">{(request.error ?? confirm.error)!.message}</Notice>}
          {!request.isSuccess && (
            <Button tone="secondary" disabled={request.isPending} onClick={() => request.mutate()}>
              {request.isPending ? t('Sending…') : t('Send me a code')}
            </Button>
          )}
          {request.isSuccess && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (/^[0-9]{6}$/.test(code)) confirm.mutate();
              }}
            >
              <TextField
                label={t('6-digit code')}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
              <Button type="submit" disabled={code.length !== 6 || confirm.isPending}>
                {t('Confirm')}
              </Button>
            </form>
          )}
          {request.isSuccess && (
            <p className="text-sm text-slate-600">
              {t('This project sends no real email or SMS. The code was only written to the simulated outbox, which an administrator can read.')}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Contacts() {
  const t = useT();
  const queryClient = useQueryClient();
  const contacts = useQuery({ queryKey: ['me', 'contacts'], queryFn: () => api<EmergencyContact[]>('/me/emergency-contacts') });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['me', 'contacts'] });
  const add = useMutation({
    mutationFn: () => api<EmergencyContact>('/me/emergency-contacts', { method: 'POST', body: { name, phone: phone.trim(), relation } }),
    onSuccess: () => {
      setName('');
      setPhone('');
      setRelation('');
      return refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/me/emergency-contacts/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  const full = (contacts.data?.length ?? 0) >= MAX_CONTACTS;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {t('The people the emergency button is meant to tell. Text messages are simulated in this project, so today they would NOT be messaged.')}
      </p>
      <QueryState
        isPending={contacts.isPending}
        error={contacts.error}
        isEmpty={contacts.data?.length === 0}
        empty={t('You have no emergency contacts yet.')}
        onRetry={() => void contacts.refetch()}
      />
      {remove.error && <Notice tone="error">{remove.error.message}</Notice>}
      {contacts.data && contacts.data.length > 0 && (
        <ul className="divide-y divide-slate-100 text-sm">
          {contacts.data.map((contact) => (
            <li key={contact.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{contact.name}</span> <span className="text-slate-600">{contact.phone}</span>
                {contact.relation && <span className="text-slate-500"> · {contact.relation}</span>}
              </span>
              <ConfirmButton
                label={t('Remove {name}', { name: contact.name })}
                confirmLabel={t('Yes, remove')}
                disabled={remove.isPending}
                onConfirm={() => remove.mutate(contact.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-slate-600">{t('You can have at most {n} emergency contacts.', { n: MAX_CONTACTS })}</p>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const bad = !PHONE.test(phone.trim());
            setPhoneError(bad ? PHONE_ERROR : undefined);
            if (!bad && name.trim()) add.mutate();
          }}
        >
          {add.error && (
            <div className="sm:col-span-3">
              <Notice tone="error">{add.error.message}</Notice>
            </div>
          )}
          <TextField label={t('Their name')} value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
          <TextField label={t('Their phone number')} type="tel" value={phone} error={phoneError} onChange={(event) => setPhone(event.target.value)} />
          <TextField label={t('Who they are to you (optional)')} value={relation} maxLength={50} onChange={(event) => setRelation(event.target.value)} />
          <div className="sm:col-span-3">
            <Button type="submit" disabled={!name.trim() || add.isPending}>
              {t('Add contact')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Whether copies of notifications go by email and SMS. In-app ones are always kept. */
function NotificationChoices({ emailConfirmed, phoneConfirmed }: { emailConfirmed: boolean; phoneConfirmed: boolean }) {
  const t = useT();
  const queryClient = useQueryClient();
  const choices = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api<{ email: boolean; sms: boolean }>('/notifications/preferences'),
  });
  const save = useMutation({
    mutationFn: (next: { email: boolean; sms: boolean }) => api<{ email: boolean; sms: boolean }>('/notifications/preferences', { method: 'PUT', body: next }),
    onSuccess: (saved) => queryClient.setQueryData(['notification-preferences'], saved),
  });
  if (!choices.data) {
    return <QueryState isPending={choices.isPending} error={choices.error} isEmpty={false} empty="" onRetry={() => void choices.refetch()} />;
  }
  const current = choices.data;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        {t('You always see notifications here. You can also have a copy sent to a confirmed email address or phone. In this project no email or SMS is really sent: copies go to the simulated outbox.')}
      </p>
      {save.error && <Notice tone="error">{save.error.message}</Notice>}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={current.email} disabled={save.isPending} onChange={(event) => save.mutate({ ...current, email: event.target.checked })} />
        {t('Email me a copy')}
      </label>
      {current.email && !emailConfirmed && <p className="text-amber-800">{t('Confirm your email address above, or no copy can be sent.')}</p>}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={current.sms} disabled={save.isPending} onChange={(event) => save.mutate({ ...current, sms: event.target.checked })} />
        {t('Text me a copy')}
      </label>
      {current.sms && !phoneConfirmed && <p className="text-amber-800">{t('Confirm your phone number above, or no copy can be sent.')}</p>}
    </div>
  );
}

export function AccountPage() {
  const t = useT();
  const { user } = useAuth();
  const profile = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api<MyProfile>('/me/profile') });
  const mine = profile.data;

  return (
    <Page title={t('My account')}>
      <QueryState isPending={profile.isPending} error={profile.error} isEmpty={false} empty="" onRetry={() => void profile.refetch()} />
      {mine && (
        <>
          <section aria-label={t('Profile')} className="space-y-3">
            <h2 className="text-lg font-semibold">{t('Profile')}</h2>
            <Card>
              <ProfileForm profile={mine} />
            </Card>
          </section>
          <section aria-label={t('Email and phone')} className="space-y-3">
            <h2 className="text-lg font-semibold">{t('Email and phone')}</h2>
            <Card>
              <div className="space-y-4">
                <Confirm channel="email" label={t('Email')} address={mine.email} confirmed={mine.emailVerified} />
                <Confirm channel="phone" label={t('Phone')} address={mine.phone} confirmed={mine.phoneVerified} />
              </div>
            </Card>
          </section>
          <section aria-label={t('Notifications')} className="space-y-3">
            <h2 className="text-lg font-semibold">{t('Notifications')}</h2>
            <Card>
              <NotificationChoices emailConfirmed={mine.emailVerified} phoneConfirmed={mine.phoneVerified} />
            </Card>
          </section>
          {user?.role !== 'ADMIN' && (
            <section aria-label={t('Emergency contacts')} className="space-y-3">
              <h2 className="text-lg font-semibold">{t('Emergency contacts')}</h2>
              <Card>
                <Contacts />
              </Card>
            </section>
          )}
        </>
      )}
    </Page>
  );
}
