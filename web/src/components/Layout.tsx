import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';

import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { LANGUAGES, msg, useLanguage, useT, type Language } from '../lib/i18n';
import type { Role } from '../lib/types';
import { SosPanel } from './Sos';
import { Button } from './ui';

const links: Record<Role, { to: string; label: string }[]> = {
  PASSENGER: [
    { to: '/search', label: msg('Find a ride') },
    { to: '/bookings', label: msg('My bookings') },
    { to: '/payments', label: msg('Payments') },
    { to: '/passes', label: msg('Passes') },
  ],
  DRIVER: [
    { to: '/rides', label: msg('My rides') },
    { to: '/rides/new', label: msg('Publish a ride') },
    { to: '/vehicles', label: msg('My vehicles') },
    { to: '/earnings', label: msg('Earnings') },
    { to: '/record', label: msg('My record') },
  ],
  ADMIN: [
    { to: '/admin', label: msg('Overview') },
    { to: '/admin/reports', label: msg('Reports') },
    { to: '/admin/emergencies', label: msg('Emergencies') },
    { to: '/admin/users', label: msg('Members') },
    { to: '/admin/durability', label: msg('Booking durability') },
    { to: '/admin/audit', label: msg('Audit log') },
  ],
};

export const homeFor = (role: Role): string => links[role][0]?.to ?? '/';

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded px-1 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
    isActive ? 'font-semibold text-teal-800 underline underline-offset-4' : 'text-slate-600 hover:text-slate-900'
  }`;

function NotificationsLink() {
  const t = useT();
  // Checked once a minute while the tab is visible; react-query pauses it in the background.
  const unread = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api<{ unread: number }>('/notifications/unread-count'),
    refetchInterval: 60_000,
  });
  const count = unread.data?.unread ?? 0;
  return (
    <NavLink to="/notifications" className={navLink}>
      {t('Notifications')}
      {count > 0 && (
        <span className="ml-1 rounded-full bg-teal-700 px-1.5 py-0.5 text-xs font-semibold text-white">
          {count}
          <span className="sr-only"> {t('unread')}</span>
        </span>
      )}
    </NavLink>
  );
}

/** Each language is listed in its own script, so it can be found by someone who reads only that one. */
function LanguageSwitcher() {
  const t = useT();
  const { language, setLanguage } = useLanguage();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="sr-only">{t('Language')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        {LANGUAGES.map((option) => (
          <option key={option.code} value={option.code} lang={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Layout() {
  const t = useT();
  const { user, logout } = useAuth();
  const [emergency, setEmergency] = useState(false);
  const member = user && user.role !== 'ADMIN';
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        {t('Skip to content')}
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight text-teal-800" translate="no">
            {'JOURNEX'}
          </span>
          {user && (
            <nav aria-label={t('Main')} className="flex flex-wrap gap-x-4 gap-y-1">
              {links[user.role].map((link) => (
                <NavLink key={link.to} to={link.to} end className={navLink}>
                  {t(link.label)}
                </NavLink>
              ))}
              <NotificationsLink />
              <NavLink to="/account" className={navLink}>
                {t('My account')}
              </NavLink>
            </nav>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <LanguageSwitcher />
            {member && (
              <Button tone="danger" aria-expanded={emergency} onClick={() => setEmergency(true)}>
                {t('Emergency')}
              </Button>
            )}
            {user && (
              <>
                <span>{user.fullName}</span>
                <Button tone="secondary" onClick={logout}>
                  {t('Sign out')}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      {member && emergency && <SosPanel onClose={() => setEmergency(false)} />}
      <main id="main" className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

/** Lets a route render only for a signed-in user, and with `role` only for that role. */
export function RequireRole({ role }: { role?: Role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
