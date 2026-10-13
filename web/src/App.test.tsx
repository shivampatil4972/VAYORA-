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
    // Any signed-in page may ask for the payment terms.
    if (!match && key === 'GET /payment-terms') return json(terms);
    // The navigation asks for this on every signed-in page.
    if (!match && key === 'GET /notifications/unread-count') return json({ unread: 0 });
    if (!match) throw new Error(`unexpected request: ${key}`);
    return routes[match]();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const terms = {
  provider: 'MOCK',
  serviceFeeRate: 0.1,
  refundTiers: [
    { atLeastHoursBefore: 48, fareShare: 1 },
    { atLeastHoursBefore: 24, fareShare: 0.5 },
  ],
};

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
  fare: 1040,
  serviceFee: 104,
  total: 1144,
  driverId: 7,
  driverRating: 4.6667,
  driverRatingCount: 3,
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
  serviceFee: 52,
  total: 572,
  refunded: null,
  status: 'PENDING',
  boardingTime: '2026-11-02T01:30:00Z',
  createdAt: '2026-10-30T10:00:00Z',
  passengerRated: false,
  driverRated: false,
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
    expect(await within(results).findByRole('link', { name: 'Ravi Jadhav' })).toHaveAttribute('href', '/users/7');
    expect(within(results).getByText(/4\.7 out of 5 · 3 ratings/)).toBeInTheDocument();
    expect(within(results).getByText(/3 seats left/)).toBeInTheDocument();
    expect(within(results).getByText('₹1,144')).toBeInTheDocument();
    expect(within(results).getByText('₹1,040 fare + ₹104 service fee')).toBeInTheDocument();
    expect(await within(results).findByText(/Payments here are simulated/)).toBeInTheDocument();
    expect(within(results).getByText(/Driver approves each request/)).toBeInTheDocument();

    await userEvent.selectOptions(within(results).getByLabelText('Pay with'), 'Card');
    await userEvent.click(within(results).getByRole('button', { name: 'Request' }));

    expect(await screen.findByText(/Request sent/)).toHaveTextContent('₹572 is held (simulated payment)');
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      rideId: 12,
      fromSeq: 0,
      toSeq: 2,
      seats: 2,
      paymentMethod: 'CARD',
    });
    expect((post[1]!.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
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

  it('reuses one idempotency key when the same booking is tried again after a failure', async () => {
    signIn('PASSENGER');
    let attempts = 0;
    const fetchMock = serve({
      'GET /rides/search': () => json([candidate]),
      'POST /bookings': () =>
        attempts++ === 0 ? json({ detail: 'The payment was declined. Nothing was booked.' }, 402) : json(booking, 201),
    });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The payment was declined. Nothing was booked.');
    await userEvent.click(screen.getByRole('button', { name: 'Request' }));
    expect(await screen.findByText(/Request sent/)).toBeInTheDocument();

    const keys = fetchMock.mock.calls
      .filter(([, init]) => init?.method === 'POST')
      .map(([, init]) => (init!.headers as Record<string, string>)['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
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

describe('reporting and moderation', () => {
  const profile = {
    id: 7,
    fullName: 'Ravi Jadhav',
    role: 'DRIVER',
    memberSince: '2026-03-14T08:00:00Z',
    completedTrips: 12,
    averageStars: null,
    ratingCount: 0,
    reviews: [],
  };
  const report = {
    id: 4,
    reporterId: 1,
    reporterName: 'Asha Patil',
    reportedUserId: 7,
    reportedUserName: 'Ravi Jadhav',
    reportedUserStatus: 'ACTIVE',
    bookingId: 90,
    reason: 'UNSAFE_DRIVING',
    details: 'Overtook on a blind bend.',
    status: 'OPEN',
    outcome: null,
    resolutionNote: null,
    createdAt: '2026-10-30T10:00:00Z',
    resolvedAt: null,
  };

  it('lets a member report another, pointing to the emergency number first', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /users/7/profile': () => json(profile),
      'POST /reports': () => json({ id: 4 }, 201),
    });
    open('/users/7');

    await userEvent.click(await screen.findByRole('button', { name: 'Report Ravi Jadhav' }));
    expect(screen.getByText(/If you are in danger now, call 112/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('What happened?'), 'Unsafe driving');
    await userEvent.type(screen.getByLabelText(/Details/), 'Overtook on a blind bend.');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByText(/Your report has been sent/)).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      reportedUserId: 7,
      reason: 'UNSAFE_DRIVING',
      details: 'Overtook on a blind bend.',
    });
  });

  it("shows the server's reason when the member may not be reported", async () => {
    signIn('PASSENGER');
    serve({
      'GET /users/7/profile': () => json(profile),
      'POST /reports': () => json({ detail: 'You can only report someone you have booked or driven with' }, 403),
    });
    open('/users/7');

    await userEvent.click(await screen.findByRole('button', { name: 'Report Ravi Jadhav' }));
    await userEvent.selectOptions(screen.getByLabelText('What happened?'), 'Fraud');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You can only report someone you have booked or driven with');
  });

  it('offers no report button on your own profile or to an administrator', async () => {
    signIn('PASSENGER'); // signed-in id is 1
    serve({ 'GET /users/1/profile': () => json({ ...profile, id: 1, fullName: 'Asha Patil', role: 'PASSENGER' }) });
    open('/users/1');

    expect(await screen.findByRole('heading', { name: 'Asha Patil' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Report/ })).not.toBeInTheDocument();
  });

  it('lets an administrator warn with a note, and suspends only after confirming', async () => {
    signIn('ADMIN');
    const fetchMock = serve({
      'GET /admin/reports': () => json([report]),
      'POST /admin/reports/4/resolve': () => json({ ...report, status: 'RESOLVED' }),
    });
    open('/admin/reports');

    expect(await screen.findByText('Overtook on a blind bend.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Suspend member' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));

    await userEvent.type(screen.getByLabelText('Note for report #4'), 'Please keep to the speed limit.');
    await userEvent.click(screen.getByRole('button', { name: 'Warn member' }));

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({ outcome: 'WARN', note: 'Please keep to the speed limit.' });
  });

  it('shows the overview with real counts and a pointer to waiting reports', async () => {
    signIn('ADMIN');
    serve({
      'GET /admin/overview': () =>
        json({
          users: { ADMIN: 1, DRIVER: 4, PASSENGER: 9 },
          rides: { SCHEDULED: 3, COMPLETED: 2 },
          bookings: {},
          suspendedMembers: 1,
          openReports: 2,
        }),
    });
    open('/admin');

    expect(await screen.findByText('2 reports are waiting.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Suspended members: 1')).toBeInTheDocument();
    expect(screen.getByText('None yet.')).toBeInTheDocument(); // no bookings: said, not shown as zeroes
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Audit log' })).toBeInTheDocument();
  });

  it('lists members and can reinstate a suspended one', async () => {
    signIn('ADMIN');
    const member = { id: 7, fullName: 'Ravi Jadhav', email: 'ravi@example.test', role: 'DRIVER', memberSince: '2026-03-14T08:00:00Z' };
    const fetchMock = serve({
      'GET /admin/users': () => json([{ ...member, status: 'SUSPENDED' }, { ...member, id: 8, fullName: 'Meera Kulkarni', status: 'ACTIVE' }]),
      'POST /admin/users/7/reinstate': () => new Response(null, { status: 204 }),
    });
    open('/admin/users');

    await userEvent.click(await screen.findByRole('button', { name: 'Reinstate Ravi Jadhav' }));
    expect(fetchMock.mock.calls.some(([url, init]) => init?.method === 'POST' && String(url).endsWith('/admin/users/7/reinstate'))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Reinstate Meera Kulkarni' })).not.toBeInTheDocument();
  });

  it('shows the audit log', async () => {
    signIn('ADMIN');
    serve({
      'GET /admin/audit': () =>
        json([
          { id: 2, actorId: 1, actorName: 'Administrator', action: 'REPORT_SUSPEND', targetType: 'report', targetId: 4, detail: '{"reason": "FRAUD"}', createdAt: '2026-10-30T10:00:00Z' },
        ]),
    });
    open('/admin/audit');

    const row = (await screen.findByText('report suspend')).closest('tr')!;
    expect(within(row).getByText('report #4')).toBeInTheDocument();
    expect(within(row).getByText('{"reason": "FRAUD"}')).toBeInTheDocument();
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
    expect(screen.getByText('₹572 (₹520 fare + ₹52 service fee)')).toBeInTheDocument();
    // The refund policy is stated, from the server's own terms, before anything is cancelled.
    expect(await screen.findByText('48 hours or more before boarding: the whole fare back.')).toBeInTheDocument();
    expect(screen.getByText('24 to 48 hours before boarding: 50% of the fare back.')).toBeInTheDocument();
    expect(screen.getByText('Less than 24 hours before boarding: nothing back.')).toBeInTheDocument();
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
    expect(screen.queryByText('If you cancel')).not.toBeInTheDocument();
  });

  it('shows what came back on a cancelled booking', async () => {
    signIn('PASSENGER');
    serve({ 'GET /bookings': () => json([{ ...booking, status: 'CANCELLED', refunded: 260 }]) });
    open('/bookings');

    expect(await screen.findByText(/₹260 returned/)).toBeInTheDocument();
  });
});

describe('notifications', () => {
  const unread = {
    id: 'a1',
    type: 'BOOKING_CONFIRMED',
    message: 'The driver accepted your booking for 1 seat, Kolhapur to Pune.',
    bookingId: 90,
    createdAt: '2026-10-30T10:00:00Z',
    read: false,
  };
  const old = { ...unread, id: 'a0', message: 'Your trip from Kolhapur to Pune is complete.', read: true };

  it('shows how many are unread in the navigation', async () => {
    signIn('PASSENGER');
    serve({ 'GET /notifications/unread-count': () => json({ unread: 3 }) });
    open('/search');

    const link = await screen.findByRole('link', { name: /Notifications/ });
    expect(await within(link).findByText('3')).toBeInTheDocument();
    expect(within(link).getByText('unread')).toBeInTheDocument();
  });

  it('lists them, marks unread ones for screen readers, and can mark all as read', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /notifications/unread-count': () => json({ unread: 1 }),
      'GET /notifications': () => json([unread, old]),
      'POST /notifications/read-all': () => new Response(null, { status: 204 }),
    });
    open('/notifications');

    const first = (await screen.findByText(unread.message)).closest('li')!;
    expect(within(first).getByText('Unread:')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'Mark as read' })).toBeInTheDocument();
    const second = screen.getByText(old.message).closest('li')!;
    expect(within(second).queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(fetchMock.mock.calls.some(([url, init]) => init?.method === 'POST' && String(url).endsWith('/notifications/read-all'))).toBe(true);
  });

  it('says so when there are none', async () => {
    signIn('DRIVER');
    serve({ 'GET /notifications': () => json([]) });
    open('/notifications');

    expect(await screen.findByText('You have no notifications.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument();
  });
});

describe('ratings', () => {
  it('lets a passenger rate a completed trip, stars first', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /bookings': () => json([{ ...booking, status: 'COMPLETED' }]),
      'POST /bookings/90/rating': () => new Response(null, { status: 201 }),
    });
    open('/bookings');

    const send = await screen.findByRole('button', { name: 'Send rating' });
    expect(send).toBeDisabled(); // nothing can be sent without choosing stars
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    await userEvent.type(screen.getByLabelText(/Comment/), 'On time and careful.');
    await userEvent.click(send);

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(String(post[0])).toMatch(/\/bookings\/90\/rating$/);
    expect(JSON.parse(post[1]!.body as string)).toEqual({ stars: 4, comment: 'On time and careful.' });
  });

  it('asks for no rating on a trip already rated or not completed', async () => {
    signIn('PASSENGER');
    serve({
      'GET /bookings': () =>
        json([
          { ...booking, id: 91, status: 'COMPLETED', passengerRated: true },
          { ...booking, id: 92, status: 'CONFIRMED' },
        ]),
    });
    open('/bookings');

    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send rating' })).not.toBeInTheDocument();
  });

  it('shows a member profile, with a review rendered as plain text', async () => {
    signIn('PASSENGER');
    serve({
      'GET /users/7/profile': () =>
        json({
          id: 7,
          fullName: 'Ravi Jadhav',
          role: 'DRIVER',
          memberSince: '2026-03-14T08:00:00Z',
          completedTrips: 12,
          averageStars: 4.5,
          ratingCount: 2,
          reviews: [
            { stars: 5, comment: '<img src=x onerror=alert(1)> great', reviewerName: 'Meera', createdAt: '2026-10-01T08:00:00Z' },
          ],
        }),
    });
    open('/users/7');

    expect(await screen.findByRole('heading', { name: 'Ravi Jadhav' })).toBeInTheDocument();
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/4\.5 out of 5 · 2 ratings/)).toBeInTheDocument();
    expect(screen.getByText('<img src=x onerror=alert(1)> great')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('says so when a member has no ratings instead of showing a score', async () => {
    signIn('DRIVER');
    serve({
      'GET /users/1/profile': () =>
        json({
          id: 1,
          fullName: 'New Member',
          role: 'PASSENGER',
          memberSince: '2026-10-01T08:00:00Z',
          completedTrips: 0,
          averageStars: null,
          ratingCount: 0,
          reviews: [],
        }),
    });
    open('/users/1');

    expect(await screen.findByText('No ratings yet')).toBeInTheDocument();
    expect(screen.getByText('Nobody has written a review yet.')).toBeInTheDocument();
  });
});

describe('earnings (driver)', () => {
  it('lists payouts with their reason and a total, and says the money is simulated', async () => {
    signIn('DRIVER');
    const payout = {
      bookingId: 1,
      passengerName: 'Meera Kulkarni',
      fromStop: 'Kolhapur',
      toStop: 'Pune',
      provider: 'MOCK',
      createdAt: '2026-11-02T06:00:00Z',
    };
    serve({
      'GET /settlements': () =>
        json([
          { ...payout, amount: 520, reason: 'TRIP_COMPLETED' },
          { ...payout, bookingId: 2, amount: 260, reason: 'LATE_CANCELLATION' },
        ]),
    });
    open('/earnings');

    expect(await screen.findByText('₹780')).toBeInTheDocument();
    expect(screen.getByText('Trip completed')).toBeInTheDocument();
    expect(screen.getByText('Passenger cancelled late')).toBeInTheDocument();
    expect(await screen.findByText(/Payments here are simulated/)).toBeInTheDocument();
  });

  it('explains when nothing has been paid yet', async () => {
    signIn('DRIVER');
    serve({ 'GET /settlements': () => json([]) });
    open('/earnings');

    expect(await screen.findByText(/Nothing has been paid out yet/)).toBeInTheDocument();
  });
});
