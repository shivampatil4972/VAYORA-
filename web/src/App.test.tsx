import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppRoutes } from './App';
import { AuthProvider } from './lib/auth';
import type { Booking, Candidate, Role, Session } from './lib/types';

function signIn(role: Role) {
  const session: Session = {
    accessToken: 'token',
    expiresInSeconds: 3600,
    user: { id: 1, email: 'user@example.test', fullName: 'Asha Patil', role },
  };
  sessionStorage.setItem('journex.session', JSON.stringify(session));
}

function open(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

/** Answers each request from the first route whose "METHOD /path" prefix matches. */
function serve(routes: Record<string, () => Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${new URL(url).pathname.replace('/api/v1', '')}`;
    const match = Object.keys(routes).find((route) => key.startsWith(route));
    if (!match) throw new Error(`unexpected request: ${key}`);
    return routes[match]();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const candidate: Candidate = {
  rideId: 12,
  driverName: 'Ravi Jadhav',
  instantBooking: false,
  fromSeq: 0,
  toSeq: 2,
  fromStop: 'Kolhapur',
  toStop: 'Pune',
  boardingTime: '2026-11-02T01:30:00Z',
  arrivalTime: '2026-11-02T06:00:00Z',
  pricePerSeat: 520,
  seatsAvailable: 3,
};

const booking: Booking = {
  id: 90,
  rideId: 12,
  passengerId: 1,
  passengerName: 'Asha Patil',
  fromSeq: 0,
  toSeq: 2,
  fromStop: 'Kolhapur',
  toStop: 'Pune',
  seats: 1,
  price: 520,
  status: 'PENDING',
  boardingTime: '2026-11-02T01:30:00Z',
  createdAt: '2026-10-30T10:00:00Z',
};

describe('access', () => {
  it('sends a signed-out visitor to sign in', async () => {
    open('/bookings');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it("keeps a passenger out of the driver's pages and shows only passenger navigation", async () => {
    signIn('PASSENGER');
    open('/rides/new');

    expect(await screen.findByRole('heading', { name: 'Find a ride' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'My bookings' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Publish a ride' })).not.toBeInTheDocument();
  });

  it("keeps a driver out of the passenger's pages", async () => {
    signIn('DRIVER');
    serve({ 'GET /rides/mine': () => json([]) });
    open('/search');

    expect(await screen.findByRole('heading', { name: 'My rides' })).toBeInTheDocument();
    expect(await screen.findByText('You have not published a ride yet.')).toBeInTheDocument();
  });

  it('signs out and returns to sign in', async () => {
    signIn('PASSENGER');
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(sessionStorage.getItem('journex.session')).toBeNull();
  });
});

describe('signing in', () => {
  it('shows field errors without calling the server', async () => {
    const fetchMock = serve({});
    open('/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's reason when the credentials are wrong", async () => {
    serve({ 'POST /auth/login': () => json({ detail: 'Invalid email or password' }, 401) });
    open('/login');

    await userEvent.type(await screen.findByLabelText('Email'), 'asha@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('finding and booking a ride', () => {
  it('searches, shows the total for the party, and requests the booking', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /rides/search': () => json([candidate]),
      'POST /bookings': () => json(booking, 201),
    });
    open('/search');

    await userEvent.clear(await screen.findByLabelText('Seats'));
    await userEvent.type(screen.getByLabelText('Seats'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    const results = await screen.findByRole('region', { name: 'Search results' });
    expect(await within(results).findByText(/Ravi Jadhav/)).toHaveTextContent('3 seats left');
    expect(within(results).getByText('₹1,040')).toBeInTheDocument(); // 520 x 2
    expect(within(results).getByText(/Driver approves each request/)).toBeInTheDocument();

    await userEvent.click(within(results).getByRole('button', { name: 'Request' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Request sent');
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({ rideId: 12, fromSeq: 0, toSeq: 2, seats: 2 });
  });

  it('says so when nothing matches, and offers a retry when the search fails', async () => {
    signIn('PASSENGER');
    let attempts = 0;
    serve({
      'GET /rides/search': () => (attempts++ === 0 ? json({ detail: 'Service unavailable' }, 503) : json([])),
    });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/No rides match/)).toBeInTheDocument();
  });

  it('shows why a booking failed and leaves the results in place', async () => {
    signIn('PASSENGER');
    serve({
      'GET /rides/search': () => json([candidate]),
      'POST /bookings': () => json({ detail: 'Not enough seats left on that part of the ride' }, 409),
    });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Request' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Not enough seats left');
    expect(screen.getByRole('button', { name: 'Request' })).toBeInTheDocument();
  });
});

describe('booking durability (administrator)', () => {
  const score = {
    bookingId: 3,
    rideId: 2,
    passengerName: 'Meera Kulkarni',
    fromStop: 'Kolhapur',
    toStop: 'Pune',
    boardingTime: '2026-11-02T01:30:00Z',
    survivalProbability: 0.8107,
    modelVersion: 'h1-cox',
    scoredAt: '2026-10-30T10:00:00Z',
  };

  it('shows each estimate as a percentage with its model and a warning about what it is', async () => {
    signIn('ADMIN');
    serve({ 'GET /admin/hazard/scores': () => json([score]) });
    open('/admin/durability');

    const row = (await screen.findByText('Meera Kulkarni')).closest('tr')!;
    expect(within(row).getByText('81%')).toBeInTheDocument();
    expect(within(row).getByText('h1-cox')).toBeInTheDocument();
    expect(screen.getByText(/trained on\s+simulated data only/)).toBeInTheDocument();
    expect(screen.getByText(/must\s+not be used to decline, penalise or price anyone/)).toBeInTheDocument();
  });

  it('reports what a scoring run did, including bookings the model could not score', async () => {
    signIn('ADMIN');
    serve({
      'GET /admin/hazard/scores': () => json([]),
      'POST /admin/hazard/score': () => json({ scored: 2, alreadyScored: 5, failed: 1, skippedRun: false }),
    });
    open('/admin/durability');

    expect(await screen.findByText('No confirmed booking has been scored yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Score bookings now' }));

    expect(await screen.findByText('2 scored, 5 already scored today, 1 could not be scored.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The model service did not answer');
  });

  it('is closed to drivers and passengers', async () => {
    signIn('DRIVER');
    serve({ 'GET /rides/mine': () => json([]) });
    open('/admin/durability');

    expect(await screen.findByRole('heading', { name: 'My rides' })).toBeInTheDocument();
    expect(screen.queryByText('Booking durability')).not.toBeInTheDocument();
  });
});

describe('my bookings', () => {
  it('cancels only after a second, explicit confirmation', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /bookings': () => json([booking]),
      'POST /bookings/90/cancel': () => json({ ...booking, status: 'CANCELLED' }),
    });
    open('/bookings');

    expect(await screen.findByText('Waiting for the driver')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel it' }));
    expect(fetchMock.mock.calls.some(([url, init]) => init?.method === 'POST' && String(url).endsWith('/bookings/90/cancel'))).toBe(true);
  });

  it('offers no cancel button on a booking that is already over', async () => {
    signIn('PASSENGER');
    serve({ 'GET /bookings': () => json([{ ...booking, status: 'COMPLETED' }]) });
    open('/bookings');

    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });
});
