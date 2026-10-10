import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../lib/auth';
import type { Role } from '../lib/types';
import { Button } from './ui';

const links: Record<Role, { to: string; label: string }[]> = {
  PASSENGER: [
    { to: '/search', label: 'Find a ride' },
    { to: '/bookings', label: 'My bookings' },
  ],
  DRIVER: [
    { to: '/rides', label: 'My rides' },
    { to: '/rides/new', label: 'Publish a ride' },
    { to: '/vehicles', label: 'My vehicles' },
    { to: '/earnings', label: 'Earnings' },
  ],
  ADMIN: [{ to: '/admin/durability', label: 'Booking durability' }],
};

export const homeFor = (role: Role): string => links[role][0]?.to ?? '/';

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight text-teal-800">JOURNEX</span>
          {user && (
            <nav aria-label="Main" className="flex flex-wrap gap-x-4 gap-y-1">
              {links[user.role].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  className={({ isActive }) =>
                    `rounded px-1 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                      isActive ? 'font-semibold text-teal-800 underline underline-offset-4' : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          )}
          {user && (
            <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
              <span>{user.fullName}</span>
              <Button tone="secondary" onClick={logout}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>
      <main id="main" className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

/** Lets a route render only for a signed-in user with the given role. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
