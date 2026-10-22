import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';

import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { LANGUAGES, msg, useLanguage, useT, type Language } from '../lib/i18n';
import type { Role } from '../lib/types';
import { initialsOf } from './photo';
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
    { to: '/admin/rides', label: msg('Rides') },
    { to: '/admin/bookings', label: msg('Bookings') },
    { to: '/admin/buses', label: msg('Bus services') },
    { to: '/admin/stopovers', label: msg('Rest stops and chargers') },
    { to: '/admin/supply-gaps', label: msg('Unmet demand') },
    { to: '/admin/durability', label: msg('Booking durability') },
    { to: '/admin/what-if', label: msg('What if') },
    { to: '/admin/audit', label: msg('Audit log') },
  ],
};

export const homeFor = (role: Role): string => links[role][0]?.to ?? '/';

// Sections as iOS-style pills: the current one tinted, the rest quiet until hovered.
const navLink = ({ isActive }: { isActive: boolean }) =>
  `inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ` +
  `focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/30 ${
    isActive ? 'bg-teal-600/[0.12] font-semibold text-teal-800' : 'text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900'
  }`;

/** The JOURNEX mark: a route between two towns. */
function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-8 w-8 flex-none drop-shadow-sm">
      <defs>
        <linearGradient id="journex-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#journex-mark)" />
      <path d="M9 22c3-9 11-3 14-12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="9" cy="22" r="2.6" fill="#fff" />
      <circle cx="23" cy="10" r="2.6" fill="#fff" />
    </svg>
  );
}

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
        <span key={count} className="ml-1.5 inline-flex min-w-[1.25rem] animate-badge-pop items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold leading-5 text-white">
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
    <label className="flex items-center text-sm text-slate-600">
      <span className="sr-only">{t('Language')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="select-ios rounded-full border-0 bg-slate-900/[0.05] py-1.5 pl-3 text-sm font-medium text-slate-800 hover:bg-slate-900/[0.09] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/30"
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
  const location = useLocation();
  const member = user && user.role !== 'ADMIN';
  return (
    <div className="min-h-screen bg-canvas text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-float"
      >
        {t('Skip to content')}
      </a>
      <header className="glass sticky top-0 z-40 border-b border-slate-900/[0.07] print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <span className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-slate-900" translate="no">
            <Logo />
            {'JOURNEX'}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <LanguageSwitcher />
            {member && (
              <Button tone="danger" aria-expanded={emergency} onClick={() => setEmergency(true)}>
                {t('Emergency')}
              </Button>
            )}
            {user && (
              <>
                <span className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 sm:pr-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-xs font-bold text-white shadow-sm"
                  >
                    {initialsOf(user.fullName)}
                  </span>
                  <span className="hidden font-medium text-slate-800 sm:inline">{user.fullName}</span>
                </span>
                <Button tone="secondary" onClick={logout}>
                  {t('Sign out')}
                </Button>
              </>
            )}
          </div>
          {user && (
            <nav
              aria-label={t('Main')}
              className="no-scrollbar -mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-4 pb-1 sm:-mx-1 sm:w-[calc(100%+0.5rem)] sm:px-1"
            >
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
        </div>
      </header>
      {member && emergency && <SosPanel onClose={() => setEmergency(false)} />}
      {/* Keyed by the path, so each screen arrives with the page transition. */}
      <main id="main" key={location.pathname} className="mx-auto max-w-5xl animate-page-in px-4 pb-20 pt-6 sm:px-6 sm:pt-10 print:p-0">
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
