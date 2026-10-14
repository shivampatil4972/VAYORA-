import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    // And the bookings page for how long a driver has to answer.
    // And the search and publish pages, for whether women-only rides apply.
    if (!match && key === 'GET /me/profile') return json({ gender: null });
    if (!match && key === 'GET /booking-terms') return json({ answerWithinMinutes: 720, closesMinutesBeforeBoarding: 120 });
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
  pickupDistanceM: 1992,
  dropoffDistanceM: 0,
  driverConfirmed: false,
  maxTwoInBack: false,
  womenOnly: false,
  vehicle: 'Maruti Ertiga',
  comfort: null,
  luggage: null,
  electric: false,
};

const rideWithRoute = {
  id: 12,
  driverId: 7,
  driverName: 'Ravi Jadhav',
  vehicleId: 3,
  departureTime: '2026-11-02T01:30:00Z',
  seatsOffered: 3,
  instantBooking: false,
  status: 'SCHEDULED',
  stops: [
    { seq: 0, name: 'Kolhapur', lat: 16.705, lon: 74.2433, departureTime: '2026-11-02T01:30:00Z' },
    { seq: 1, name: 'Satara', lat: 17.6805, lon: 74.0183, departureTime: '2026-11-02T03:40:00Z' },
    { seq: 2, name: 'Pune', lat: 18.5204, lon: 73.8567, departureTime: '2026-11-02T06:00:00Z' },
  ],
  segments: [],
  distanceKm: 235.9,
  durationMinutes: 203,
  routeSource: 'OSRM',
  path: [
    [16.705, 74.2433],
    [17.2, 74.2],
    [17.6805, 74.0183],
    [18.5204, 73.8567],
  ],
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
    expect(await screen.findByText(/No rides have a stop near both ends/)).toBeInTheDocument();
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

describe('maps, routes and location search', () => {
  const searchUrls = (fetchMock: ReturnType<typeof serve>) =>
    fetchMock.mock.calls.map(([url]) => new URL(String(url))).filter((url) => url.pathname.endsWith('/rides/search'));

  it('searches from the town centres, and re-searches when the order is changed', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({ 'GET /rides/search': () => json([candidate]) });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));
    expect(await screen.findByText(/Pickup 2\.0 km from your start · drop-off 0 m from your destination/)).toBeInTheDocument();
    const first = searchUrls(fetchMock)[0].searchParams;
    expect([first.get('originLat'), first.get('originLon')]).toEqual(['16.705', '74.2433']);
    expect([first.get('destLat'), first.get('destLon')]).toEqual(['18.5204', '73.8567']);
    expect(first.get('sort')).toBe('TIME');

    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'Nearest pickup');
    await screen.findByText(/Pickup 2\.0 km/);
    const urls = searchUrls(fetchMock);
    expect(urls[urls.length - 1].searchParams.get('sort')).toBe('PROXIMITY');
  });

  it('uses a point chosen on the map in place of the town centre, and can go back', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({ 'GET /rides/search': () => json([]) });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Choose exact points on a map' }));
    await userEvent.click(screen.getByRole('button', { name: 'click the map' }));
    expect(screen.getByText(/a point you chose \(17\.3070, 74\.1900\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await screen.findByText(/No rides have a stop near both ends/);
    const sent = searchUrls(fetchMock)[0].searchParams;
    expect([sent.get('originLat'), sent.get('originLon')]).toEqual(['17.307', '74.19']);
    expect(sent.get('destLat')).toBe('18.5204'); // the destination is still the town

    await userEvent.click(screen.getByRole('button', { name: 'Use the centre of Kolhapur instead' }));
    expect(screen.getByText('Start: the centre of Kolhapur')).toBeInTheDocument();
  });

  it('shows the route of a result, with where to board, on request', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /rides/search': () => json([candidate]),
      'GET /rides/12': () => json(rideWithRoute),
    });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await screen.findByRole('button', { name: 'Show route' });
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/rides/12'))).toBe(false); // not until asked
    await userEvent.click(screen.getByRole('button', { name: 'Show route' }));

    expect(await screen.findByText('Board here: Kolhapur')).toBeInTheDocument();
    expect(screen.getByText('Get off here: Pune')).toBeInTheDocument();
    expect(screen.getByTestId('route')).toHaveAttribute('data-points', '4');
    expect(screen.getByText(/The whole ride is 235\.9 km by road\./)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Map of the ride through Kolhapur, Satara, Pune' })).toBeInTheDocument();
  });

  it('does not call a straight-line estimate a road distance', async () => {
    signIn('PASSENGER');
    serve({
      'GET /bookings': () => json([{ ...booking, status: 'CONFIRMED' }]),
      'GET /rides/12': () => json({ ...rideWithRoute, routeSource: 'STRAIGHT_LINE', distanceKm: 204.1 }),
    });
    open('/bookings');

    await userEvent.click(await screen.findByRole('button', { name: 'Show meeting point' }));

    expect(await screen.findByText(/about 204\.1 km in a straight line; the road distance is not available/)).toBeInTheDocument();
    expect(screen.getByText(/Board at Kolhapur, leaving/)).toBeInTheDocument();
  });

  it('lets a driver work out the route, take the suggested prices, and move a meeting point', async () => {
    signIn('DRIVER');
    const fetchMock = serve({
      'GET /vehicles': () => json([{ id: 3, make: 'Maruti', model: 'Ertiga', year: 2022, colour: 'Silver', seats: 7 }]),
      'POST /rides/route-preview': () =>
        json({
          distanceKm: 230,
          durationMinutes: 191,
          source: 'OSRM',
          legs: [{ distanceKm: 230, durationMinutes: 191, suggestedPrice: 460 }],
          path: [
            [16.705, 74.2433],
            [18.5204, 73.8567],
          ],
        }),
    });
    open('/rides/new');

    await userEvent.click(await screen.findByRole('button', { name: 'Work out the route' }));
    expect(await screen.findByText('230 km by road, about 3 h 11 min of driving.')).toBeInTheDocument();
    expect(screen.getByText(/Kolhapur to Pune: 230 km, 3 h 11 min, suggested ₹460 a seat/)).toBeInTheDocument();
    const asked = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/rides/route-preview'))!;
    expect(JSON.parse(asked[1]!.body as string)).toEqual({
      stops: [
        { lat: 16.705, lon: 74.2433 },
        { lat: 18.5204, lon: 73.8567 },
      ],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Use the suggested prices and times' }));
    expect(screen.getByLabelText('Price to Pune (₹)')).toHaveValue(460);
    expect(screen.getByLabelText('Minutes from Kolhapur to Pune')).toHaveValue(191);

    // Moving a pin invalidates the route that was shown.
    await userEvent.click(screen.getByRole('button', { name: 'click the map' }));
    expect(screen.queryByText(/230 km by road/)).not.toBeInTheDocument();
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

describe('my account', () => {
  const mine = {
    email: 'user@example.test',
    emailVerified: false,
    phone: null,
    phoneVerified: false,
    bio: null,
    birthYear: null,
    gender: null,
    smoking: null,
    pets: null,
    music: null,
    chattiness: null,
  };
  const bodyOf = (fetchMock: ReturnType<typeof serve>, method: string, path: string) => {
    const call = fetchMock.mock.calls.find(([url, init]) => init?.method === method && String(url).endsWith(path));
    return JSON.parse(String(call?.[1]?.body ?? 'null'));
  };

  it('saves the whole profile, sending what was not said as nothing', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /me/profile': () => json(mine),
      'GET /me/emergency-contacts': () => json([]),
      'PUT /me/profile': () => json({ ...mine, phone: '+919800000001', smoking: false, chattiness: 'QUIET' }),
    });
    open('/account');

    await userEvent.type(await screen.findByLabelText('Phone number'), '+919800000001');
    await userEvent.selectOptions(screen.getByLabelText('Smoking in the car'), 'No, please');
    await userEvent.selectOptions(screen.getByLabelText('Conversation'), 'I prefer a quiet ride');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Your profile is saved.')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'PUT', '/me/profile')).toEqual({
      phone: '+919800000001',
      bio: '',
      birthYear: null,
      gender: null,
      smoking: false,
      pets: null,
      music: null,
      chattiness: 'QUIET',
    });
    // The saved number can now be confirmed.
    expect(within(screen.getByRole('region', { name: 'Email and phone' })).getByText('+919800000001')).toBeInTheDocument();
  });

  it('refuses a phone number that is not one without asking the server', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({ 'GET /me/profile': () => json(mine), 'GET /me/emergency-contacts': () => json([]) });
    open('/account');

    await userEvent.type(await screen.findByLabelText('Phone number'), '12345');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Enter 10 to 15 digits, with or without a + in front')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('confirms an email with a code and says plainly that no real email was sent', async () => {
    signIn('PASSENGER');
    let confirmed = false;
    const fetchMock = serve({
      'GET /me/profile': () => json({ ...mine, emailVerified: confirmed }),
      'GET /me/emergency-contacts': () => json([]),
      'POST /me/verification/email/request': () => new Response(null, { status: 204 }),
      'POST /me/verification/email/confirm': () => {
        confirmed = true;
        return new Response(null, { status: 204 });
      },
    });
    open('/account');

    const section = within(await screen.findByRole('region', { name: 'Email and phone' }));
    expect(section.getByText('Not confirmed')).toBeInTheDocument();
    expect(section.getByText('None given')).toBeInTheDocument(); // no phone: nothing to confirm
    await userEvent.click(section.getByRole('button', { name: 'Send me a code' }));

    expect(await section.findByText(/sends no real email or SMS/)).toBeInTheDocument();
    const confirm = section.getByRole('button', { name: 'Confirm' });
    await userEvent.type(section.getByLabelText('6-digit code'), '12a3');
    expect(confirm).toBeDisabled(); // letters are dropped and three digits are not a code
    await userEvent.type(section.getByLabelText('6-digit code'), '456');
    await userEvent.click(confirm);

    expect(await section.findByText('Confirmed')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'POST', '/me/verification/email/confirm')).toEqual({ code: '123456' });
  });

  it("shows the server's reason when a code is wrong", async () => {
    signIn('PASSENGER');
    serve({
      'GET /me/profile': () => json(mine),
      'GET /me/emergency-contacts': () => json([]),
      'POST /me/verification/email/request': () => new Response(null, { status: 204 }),
      'POST /me/verification/email/confirm': () => json({ detail: 'That code is not right' }, 400),
    });
    open('/account');

    await userEvent.click(await screen.findByRole('button', { name: 'Send me a code' }));
    await userEvent.type(await screen.findByLabelText('6-digit code'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not right');
  });

  it('adds and removes emergency contacts, and stops offering more at three', async () => {
    signIn('DRIVER');
    let contacts: { id: number; name: string; phone: string; relation: string | null }[] = [
      { id: 1, name: 'Meera Patil', phone: '+919800000001', relation: 'Mother' },
      { id: 2, name: 'Sunil Patil', phone: '+919800000002', relation: null },
    ];
    const fetchMock = serve({
      'GET /me/profile': () => json(mine),
      'GET /me/emergency-contacts': () => json(contacts),
      'POST /me/emergency-contacts': () => {
        contacts = [...contacts, { id: 3, name: 'Neha', phone: '9800000003', relation: null }];
        return json(contacts[2], 201);
      },
      'DELETE /me/emergency-contacts/1': () => {
        contacts = contacts.filter((contact) => contact.id !== 1);
        return new Response(null, { status: 204 });
      },
    });
    open('/account');

    const section = within(await screen.findByRole('region', { name: 'Emergency contacts' }));
    expect(section.getByText(/they would NOT be messaged/)).toBeInTheDocument();
    await userEvent.type(await section.findByLabelText('Their name'), 'Neha');
    await userEvent.type(section.getByLabelText('Their phone number'), '98');
    await userEvent.click(section.getByRole('button', { name: 'Add contact' }));
    expect(await section.findByText('Enter 10 to 15 digits, with or without a + in front')).toBeInTheDocument();
    await userEvent.type(section.getByLabelText('Their phone number'), '00000003');
    await userEvent.click(section.getByRole('button', { name: 'Add contact' }));

    expect(await section.findByText('You can have at most 3 emergency contacts.')).toBeInTheDocument();
    expect(section.queryByLabelText('Their name')).not.toBeInTheDocument();
    expect(bodyOf(fetchMock, 'POST', '/me/emergency-contacts')).toEqual({ name: 'Neha', phone: '9800000003', relation: '' });

    await userEvent.click(section.getByRole('button', { name: 'Remove Meera Patil' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false); // asks first
    await userEvent.click(section.getByRole('button', { name: 'Yes, remove' }));
    expect(await section.findByLabelText('Their name')).toBeInTheDocument();
    expect(section.queryByText('Meera Patil')).not.toBeInTheDocument();
  });

  it('offers an administrator no emergency contacts and no emergency button', async () => {
    signIn('ADMIN');
    serve({ 'GET /me/profile': () => json(mine) });
    open('/account');

    expect(await screen.findByRole('region', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Emergency contacts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Emergency' })).not.toBeInTheDocument();
  });
});

describe('the emergency button', () => {
  const raised = { alertId: 5, contactsTold: 2, reallySent: false, emergencyNumber: '112' };

  it('puts calling 112 first and says that the contacts were not messaged', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({ 'GET /bookings': () => json([]), 'POST /sos': () => json(raised, 201) });
    open('/bookings');

    await userEvent.click(await screen.findByRole('button', { name: 'Emergency' }));
    const panel = within(screen.getByRole('region', { name: 'Emergency' }));
    expect(panel.getByText('If you are in danger, call 112 now.')).toBeInTheDocument();
    expect(panel.getByRole('link', { name: 'Call 112' })).toHaveAttribute('href', 'tel:112');
    expect(panel.getByText(/they are not an emergency service/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false); // opening sends nothing

    await userEvent.click(panel.getByRole('button', { name: 'Send an alert' }));

    expect(await panel.findByText(/your emergency contacts were NOT messaged/)).toBeInTheDocument();
    expect(panel.getByText('Your alert is recorded and the administrators can see it.')).toBeInTheDocument();
    expect(panel.getByRole('link', { name: 'Call 112' })).toBeInTheDocument(); // still there afterwards
    expect(panel.queryByRole('button', { name: 'Send an alert' })).not.toBeInTheDocument();
    await userEvent.click(panel.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: 'Emergency' })).not.toBeInTheDocument();
  });

  it('sends the position when the device gives one, and still sends when it refuses', async () => {
    signIn('DRIVER');
    const fetchMock = serve({ 'GET /rides/mine': () => json([]), 'POST /sos': () => json(raised, 201) });
    let allow = true;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: (found: unknown) => void, refused: () => void) =>
          allow ? ok({ coords: { latitude: 16.705, longitude: 74.2433 } }) : refused(),
      },
    });
    try {
      open('/rides');
      await userEvent.click(await screen.findByRole('button', { name: 'Emergency' }));
      await userEvent.click(screen.getByRole('button', { name: 'Send an alert' }));
      await screen.findByText(/were NOT messaged/);
      await userEvent.click(screen.getByRole('button', { name: 'Close' }));

      allow = false;
      await userEvent.click(screen.getByRole('button', { name: 'Emergency' }));
      await userEvent.click(screen.getByRole('button', { name: 'Send an alert' }));
      await screen.findByText(/were NOT messaged/);

      const bodies = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(String(init?.body)));
      expect(bodies).toEqual([{ lat: 16.705, lon: 74.2433 }, {}]);
    } finally {
      Reflect.deleteProperty(navigator, 'geolocation');
    }
  });

  it("shows the server's reason if the alert could not be recorded, with 112 still on screen", async () => {
    signIn('PASSENGER');
    serve({ 'GET /bookings': () => json([]), 'POST /sos': () => json({ detail: 'Service unavailable' }, 503) });
    open('/bookings');

    await userEvent.click(await screen.findByRole('button', { name: 'Emergency' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send an alert' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    expect(screen.getByRole('link', { name: 'Call 112' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send an alert' })).toBeEnabled();
  });
});

describe('emergencies (administrator)', () => {
  const alert = {
    id: 5,
    userId: 7,
    userName: 'Asha Patil',
    userPhone: '+919800000009',
    rideId: null,
    lat: 16.705,
    lon: 74.2433,
    contactsTold: 2,
    sender: 'MOCK',
    status: 'OPEN',
    createdAt: '2026-11-02T06:00:00Z',
  };

  it('shows who, where and that nobody was messaged, and takes an alert off the queue', async () => {
    signIn('ADMIN');
    let waiting = [alert];
    serve({
      'GET /admin/sos': () => json(waiting),
      'POST /admin/sos/5/acknowledge': () => {
        waiting = [];
        return new Response(null, { status: 204 });
      },
      'GET /admin/mock-outbox': () =>
        json([{ channel: 'EMAIL', to: 'user@example.test', text: 'Your JOURNEX verification code is 123456.', at: '2026-11-02T06:00:00Z' }]),
    });
    open('/admin/emergencies');

    expect(await screen.findByRole('link', { name: 'Asha Patil' })).toHaveAttribute('href', '/users/7');
    expect(screen.getByText('Phone: +919800000009')).toBeInTheDocument();
    expect(screen.getByText('Position given: 16.70500, 74.24330')).toBeInTheDocument();
    expect(screen.getByText('2 emergency contacts on file. They were NOT messaged: the sender is simulated.')).toBeInTheDocument();
    const outbox = within(screen.getByRole('region', { name: 'Simulated outbox' }));
    expect(await outbox.findByText('Your JOURNEX verification code is 123456.')).toBeInTheDocument();
    expect(outbox.getByText(/None of these was sent to anyone/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));

    expect(await screen.findByText('No emergency is waiting.')).toBeInTheDocument();
  });

  it('is closed to members', async () => {
    signIn('PASSENGER');
    serve({});
    open('/admin/emergencies');

    expect(await screen.findByRole('heading', { name: 'Find a ride' })).toBeInTheDocument();
  });
});

describe('what a profile says about a member', () => {
  const profile = {
    id: 7,
    fullName: 'Ravi Jadhav',
    role: 'DRIVER',
    memberSince: '2026-01-05T00:00:00Z',
    completedTrips: 4,
    averageStars: null,
    ratingCount: 0,
    reviews: [],
    emailVerified: true,
    phoneVerified: false,
    bio: 'Drive to Pune every Friday.',
    age: 34,
    smoking: false,
    pets: null,
    music: true,
    chattiness: 'TALKATIVE',
  };

  it('shows only what they said, and never claims an identity check', async () => {
    signIn('PASSENGER');
    serve({ 'GET /users/7/profile': () => json(profile) });
    open('/users/7');

    const about = within(await screen.findByRole('list', { name: 'About this member' }));
    expect(about.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'About 34 years old',
      'Email confirmed',
      'No smoking',
      'Likes music on the way',
      'Likes to talk',
    ]);
    expect(screen.getByText('Drive to Pune every Friday.')).toBeInTheDocument();
    expect(screen.getByText('JOURNEX has not checked any identity documents.')).toBeInTheDocument();
  });

  it('treats what the server left out as not said', async () => {
    signIn('PASSENGER');
    serve({
      'GET /users/7/profile': () =>
        json({ id: 7, fullName: 'Ravi Jadhav', role: 'DRIVER', memberSince: '2026-01-05T00:00:00Z', completedTrips: 4, averageStars: null, ratingCount: 0, reviews: [] }),
    });
    open('/users/7');

    await screen.findByText('JOURNEX has not checked any identity documents.');
    expect(within(screen.getByRole('list', { name: 'About this member' })).queryAllByRole('listitem')).toEqual([]);
  });
});

describe('search filters', () => {
  const searches = (fetchMock: ReturnType<typeof serve>) =>
    fetchMock.mock.calls
      .map(([url]) => new URL(String(url)))
      .filter((url) => url.pathname.endsWith('/rides/search'))
      .map((url) => Object.fromEntries(url.searchParams));

  it('sends nothing extra until a filter is set, then only the ones that are', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({ 'GET /rides/search': () => json([{ ...candidate, driverConfirmed: true }]) });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));
    expect(await screen.findByText(/Contact confirmed/)).toBeInTheDocument();
    expect(Object.keys(searches(fetchMock)[0]).sort()).toEqual(['date', 'destLat', 'destLon', 'originLat', 'originLon', 'seats', 'sort']);

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const filters = within(screen.getByRole('group', { name: 'Show only rides that' }));
    await userEvent.selectOptions(filters.getByLabelText('Leave in the'), 'Afternoon, 12 to 5');
    await userEvent.type(filters.getByLabelText('Cost at most, per seat (₹)'), '600');
    await userEvent.click(filters.getByLabelText('Confirm instantly'));
    await userEvent.click(filters.getByLabelText('Have a driver who said no smoking'));
    // Nothing is searched again until Search is pressed.
    expect(searches(fetchMock)).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(searches(fetchMock)).toHaveLength(2));
    expect(searches(fetchMock)[1]).toMatchObject({ earliestHour: '12', latestHour: '17', maxPrice: '600', instantOnly: 'true', smokeFree: 'true' });
    expect(searches(fetchMock)[1]).not.toHaveProperty('confirmedDriver');
    expect(searches(fetchMock)[1]).not.toHaveProperty('petsWelcome');
  });

  it('sends one bound for morning and evening, and keeps the filters when the order changes', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({ 'GET /rides/search': () => json([candidate]) });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    await userEvent.selectOptions(screen.getByLabelText('Leave in the'), 'Evening, from 5');
    await userEvent.click(screen.getByLabelText('Have a driver with a confirmed email or phone'));
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await userEvent.selectOptions(await screen.findByLabelText('Sort by'), 'Lowest price');

    await waitFor(() => expect(searches(fetchMock)).toHaveLength(2));
    for (const sent of searches(fetchMock)) {
      expect(sent).toMatchObject({ earliestHour: '17', confirmedDriver: 'true' });
      expect(sent).not.toHaveProperty('latestHour');
    }
    expect(searches(fetchMock)[1].sort).toBe('PRICE');
    expect(screen.queryByText(/Contact confirmed/)).not.toBeInTheDocument(); // this driver has confirmed nothing
  });

  it('says the filters may be why nothing was found', async () => {
    signIn('PASSENGER');
    serve({ 'GET /rides/search': () => json([]) });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));
    expect(await screen.findByText(/Try another date or other points/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByLabelText('Have a driver who said pets are welcome'));
    expect(screen.getByText(/leave out drivers who have not said either way/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(/Try fewer filters/)).toBeInTheDocument();
  });
});

describe('ride notes, return rides and weekly repeats', () => {
  it('says how many rides a return and weekly repeats will publish', async () => {
    signIn('DRIVER');
    serve({ 'GET /vehicles': () => json([{ id: 3, make: 'Maruti', model: 'Ertiga', year: 2022, colour: 'Silver', seats: 7 }]) });
    open('/rides/new');

    const repeat = await screen.findByLabelText('Repeat every week');
    expect(screen.queryByText(/This will publish/)).not.toBeInTheDocument(); // one ride needs no warning
    await userEvent.selectOptions(repeat, 'For 2 more weeks');
    expect(await screen.findByText('This will publish 3 rides.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Return ride leaving at (optional)'), { target: { value: '2030-01-01T18:00' } });
    expect(await screen.findByRole('status')).toHaveTextContent('This will publish 6 rides.');
    expect(screen.getByLabelText('I promise at most two passengers on the back seat')).not.toBeChecked();
    expect(screen.getByLabelText('Notes for passengers (optional)')).toHaveValue('');
  });

  it('shows the back-seat promise on a result and the driver\'s notes with the route, as text', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /rides/search': () => json([{ ...candidate, maxTwoInBack: true }]),
      'GET /rides/12': () => json({ ...rideWithRoute, notes: 'Two bags each. <b>No</b> smoking.', maxTwoInBack: true, seriesSize: 1 }),
    });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByLabelText('Promise at most two in the back'));
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(/At most two in the back/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('maxTwoInBack=true'))).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Show route' }));
    expect(await screen.findByText('From the driver:')).toBeInTheDocument();
    expect(screen.getByText('Two bags each. <b>No</b> smoking.')).toBeInTheDocument(); // the tag is shown, not obeyed
  });
});

describe('my vehicles', () => {
  const plain = {
    id: 3, make: 'Maruti', model: 'Ertiga', year: 2022, colour: 'Silver', seats: 7,
    comfort: null, luggage: null, electric: false, batteryKwh: null, consumptionKwhPer100Km: null, estimatedRangeKm: null,
  };
  const ev = {
    id: 4, make: 'Tata', model: 'Nexon EV', year: null, colour: null, seats: 5,
    comfort: 'PREMIUM', luggage: 'MEDIUM', electric: true, batteryKwh: 40.5, consumptionKwhPer100Km: 15, estimatedRangeKm: 270,
  };

  it('adds an electric vehicle with what the driver says about it', async () => {
    signIn('DRIVER');
    let owned: unknown[] = [plain];
    const fetchMock = serve({
      'GET /vehicles': () => json(owned),
      'POST /vehicles': () => {
        owned = [plain, ev];
        return json(ev, 201);
      },
    });
    open('/vehicles');

    expect(await screen.findByText('Maruti Ertiga')).toBeInTheDocument();
    expect(screen.queryByText(/on a full charge/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Battery (kWh, optional)')).not.toBeInTheDocument(); // only for an electric vehicle

    await userEvent.type(screen.getByLabelText('Make'), 'Tata');
    await userEvent.type(screen.getByLabelText('Model'), 'Nexon EV');
    await userEvent.selectOptions(screen.getByLabelText('Comfort (optional)'), 'Premium');
    await userEvent.selectOptions(screen.getByLabelText('Luggage per passenger (optional)'), 'A medium bag each');
    await userEvent.click(screen.getByLabelText('This vehicle is electric'));
    await userEvent.type(screen.getByLabelText('Battery (kWh, optional)'), '40.5');
    await userEvent.type(screen.getByLabelText('Consumption (kWh per 100 km, optional)'), '15');
    await userEvent.click(screen.getByRole('button', { name: 'Add vehicle' }));

    expect(await screen.findByText('Premium · A medium bag each · Electric')).toBeInTheDocument();
    expect(screen.getByText('About 270 km on a full charge, from the figures you gave. Not a measured range.')).toBeInTheDocument();
    const sent = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(sent?.[1]?.body))).toEqual({
      make: 'Tata', model: 'Nexon EV', year: null, colour: null, seats: 5,
      comfort: 'PREMIUM', luggage: 'MEDIUM', electric: true, batteryKwh: 40.5, consumptionKwhPer100Km: 15,
    });
  });

  it('refuses an impossible battery without asking the server', async () => {
    signIn('DRIVER');
    const fetchMock = serve({ 'GET /vehicles': () => json([]) });
    open('/vehicles');

    await userEvent.type(await screen.findByLabelText('Make'), 'Tata');
    await userEvent.type(screen.getByLabelText('Model'), 'Nexon EV');
    await userEvent.click(screen.getByLabelText('This vehicle is electric'));
    await userEvent.type(screen.getByLabelText('Battery (kWh, optional)'), '900');
    await userEvent.click(screen.getByRole('button', { name: 'Add vehicle' }));

    expect(await screen.findByText('Between 1 and 300 kWh')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('tells a passenger what car a result is', async () => {
    signIn('PASSENGER');
    serve({ 'GET /rides/search': () => json([{ ...candidate, vehicle: 'Tata Nexon EV', comfort: 'COMFORT', luggage: 'SMALL', electric: true }]) });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));

    expect(await screen.findByText('Tata Nexon EV · Comfortable · A small bag each · Electric')).toBeInTheDocument();
  });
});

describe('holding seats', () => {
  const placed = { rideId: 12, fromSeq: 0, toSeq: 2, seats: 2, expiresAt: '2026-11-01T10:05:00Z' };

  it('holds the seats searched for, says it is not a booking, and forgets the hold once booked', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /rides/search': () => json([candidate]),
      'POST /holds': () => json(placed, 201),
      'POST /bookings': () => json(booking, 201),
    });
    open('/search');

    await userEvent.clear(await screen.findByLabelText('Seats'));
    await userEvent.type(screen.getByLabelText('Seats'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Hold while I decide' }));

    expect(await screen.findByText(/Held for you until .*This is not a booking/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hold while I decide' })).not.toBeInTheDocument();
    const sent = fetchMock.mock.calls.find(([url, init]) => init?.method === 'POST' && String(url).endsWith('/holds'));
    expect(JSON.parse(String(sent?.[1]?.body))).toEqual({ rideId: 12, fromSeq: 0, toSeq: 2, seats: 2 });

    await userEvent.click(screen.getByRole('button', { name: 'Request' }));
    await waitFor(() => expect(screen.queryByText(/Held for you until/)).not.toBeInTheDocument());
  });

  it("shows the server's reason on the result when the seats cannot be held, and can still book", async () => {
    signIn('PASSENGER');
    serve({
      'GET /rides/search': () => json([candidate]),
      'POST /holds': () => json({ detail: 'Seats cannot be held right now. You can still book.' }, 503),
    });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Hold while I decide' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Seats cannot be held right now. You can still book.');
    expect(screen.getByRole('button', { name: 'Request' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Hold while I decide' })).toBeEnabled();
  });
});

describe('a request waiting for the driver', () => {
  it('says when it will be closed, and says nothing of the kind once it is answered', async () => {
    signIn('PASSENGER');
    serve({ 'GET /bookings': () => json([booking, { ...booking, id: 91, status: 'CONFIRMED' }]) });
    open('/bookings');

    const deadlines = await screen.findAllByText(/The driver has until .* to answer\. After that the request closes and everything you paid is returned\./);
    expect(deadlines).toHaveLength(1); // the pending one only
  });
});

describe('publishing a ride through the page', () => {
  const vehicle = { id: 3, make: 'Maruti', model: 'Ertiga', year: 2022, colour: 'Silver', seats: 7 };
  const published = { ...rideWithRoute, notes: null, maxTwoInBack: false, seriesSize: 1 };

  async function fillIn() {
    fireEvent.change(await screen.findByLabelText('Leaving at'), { target: { value: '2030-01-01T07:00' } });
    await userEvent.clear(screen.getByLabelText('Seats offered'));
    await userEvent.type(screen.getByLabelText('Seats offered'), '2');
    await userEvent.click(screen.getByLabelText('Confirm bookings instantly, without asking me'));
    await userEvent.click(screen.getByLabelText('Satara'));
    await userEvent.clear(screen.getByLabelText('Price to Satara (₹)'));
    await userEvent.type(screen.getByLabelText('Price to Satara (₹)'), '270');
    await userEvent.clear(screen.getByLabelText('Price to Pune (₹)'));
    await userEvent.type(screen.getByLabelText('Price to Pune (₹)'), '250');
  }

  it('sends the stops, prices, seats and approval choice the driver entered, then shows their rides', async () => {
    signIn('DRIVER');
    const fetchMock = serve({
      'GET /vehicles': () => json([vehicle]),
      'POST /rides': () => json(published, 201),
      'GET /rides/mine': () => json([published]),
    });
    open('/rides/new');

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: 'Publish ride' }));

    expect(await screen.findByRole('heading', { name: 'My rides' })).toBeInTheDocument();
    const sent = fetchMock.mock.calls.find(([url, init]) => init?.method === 'POST' && new URL(String(url)).pathname.endsWith('/rides'));
    const body = JSON.parse(String(sent?.[1]?.body));
    expect(body).toMatchObject({
      vehicleId: 3,
      departureTime: new Date('2030-01-01T07:00').toISOString(),
      seatsOffered: 2,
      instantBooking: false,
      segmentPrices: [270, 250],
      returnDepartureTime: null,
      repeatWeeks: 0,
    });
    expect(body.stops.map((stop: { name: string }) => stop.name)).toEqual(['Kolhapur', 'Satara', 'Pune']);
    expect(body.stops[0].offsetMinutes).toBe(0);
  });

  it("keeps the form and shows the server's reason when publishing is refused", async () => {
    signIn('DRIVER');
    serve({
      'GET /vehicles': () => json([vehicle]),
      'POST /rides': () => json({ detail: 'This vehicle can offer at most 6 seats' }, 400),
    });
    open('/rides/new');

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: 'Publish ride' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This vehicle can offer at most 6 seats');
    expect(screen.getByRole('heading', { name: 'Publish a ride' })).toBeInTheDocument();
    expect(screen.getByLabelText('Price to Satara (₹)')).toHaveValue(270);
  });
});

describe('running a ride from my rides', () => {
  const posted = (fetchMock: ReturnType<typeof serve>) =>
    fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').map(([url]) => new URL(String(url)).pathname.replace('/api/v1', ''));

  it('accepts one request and declines another', async () => {
    signIn('DRIVER');
    let requests = [booking, { ...booking, id: 91, passengerName: 'Meera Kulkarni', passengerId: 5 }];
    const decide = (id: number, status: string) => () => {
      requests = requests.map((b) => (b.id === id ? { ...b, status: status as Booking['status'] } : b));
      return json(requests.find((b) => b.id === id));
    };
    const fetchMock = serve({
      'GET /rides/mine': () => json([{ ...rideWithRoute, notes: null, maxTwoInBack: false, seriesSize: 1 }]),
      'GET /rides/12/bookings': () => json(requests),
      'POST /bookings/90/accept': decide(90, 'CONFIRMED'),
      'POST /bookings/91/reject': decide(91, 'REJECTED'),
    });
    open('/rides');

    await userEvent.click(await screen.findByRole('button', { name: 'Show passengers' }));
    expect(await screen.findByRole('link', { name: 'Asha Patil' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(2);

    await userEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument());

    expect(posted(fetchMock)).toEqual(['/bookings/90/accept', '/bookings/91/reject']);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Declined by the driver')).toBeInTheDocument();
  });

  it('starts the ride, marks a no-show and completes only after confirming each irreversible step', async () => {
    signIn('DRIVER');
    let ride = { ...rideWithRoute, instantBooking: true, notes: null, maxTwoInBack: false, seriesSize: 1 };
    let aboard = [{ ...booking, status: 'CONFIRMED' as Booking['status'] }];
    const fetchMock = serve({
      'GET /rides/mine': () => json([ride]),
      'GET /rides/12/bookings': () => json(aboard),
      'POST /rides/12/start': () => {
        ride = { ...ride, status: 'IN_PROGRESS' };
        return json(ride);
      },
      'POST /bookings/90/no-show': () => {
        aboard = [{ ...aboard[0], status: 'NO_SHOW' }];
        return json(aboard[0]);
      },
      'POST /rides/12/complete': () => {
        ride = { ...ride, status: 'COMPLETED' };
        return json(ride);
      },
    });
    open('/rides');

    await userEvent.click(await screen.findByRole('button', { name: 'Start ride' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Show passengers' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Did not board' }));
    expect(posted(fetchMock)).toEqual(['/rides/12/start']); // asks first
    await userEvent.click(screen.getByRole('button', { name: 'Yes, mark as no-show' }));
    expect(await screen.findByText('Did not board')).toBeInTheDocument(); // now the status, not a button

    await userEvent.click(screen.getByRole('button', { name: 'Complete ride' }));
    expect(posted(fetchMock)).toEqual(['/rides/12/start', '/bookings/90/no-show']);
    await userEvent.click(screen.getByRole('button', { name: 'Yes, we have arrived' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Complete ride' })).not.toBeInTheDocument());

    expect(posted(fetchMock)).toEqual(['/rides/12/start', '/bookings/90/no-show', '/rides/12/complete']);
  });
});

describe('payments (passenger)', () => {
  const payment = {
    bookingId: 90, fromStop: 'Kolhapur', toStop: 'Pune', fare: 520, serviceFee: 52, amount: 572,
    method: 'UPI', provider: 'MOCK', status: 'SETTLED', refunded: 0, refundReason: null, createdAt: '2026-10-30T10:00:00Z',
  };

  it('lists what was paid and what came back, and says the money is simulated', async () => {
    signIn('PASSENGER');
    serve({
      'GET /payments': () =>
        json([
          { ...payment, bookingId: 92, status: 'HELD' },
          { ...payment, bookingId: 91, method: 'CARD', refunded: 572, refundReason: 'DRIVER_CANCELLED' },
          payment,
        ]),
    });
    open('/payments');

    // 572 held + (572 - 572) + 572 settled.
    expect(await screen.findByText('₹1,144')).toBeInTheDocument();
    expect(screen.getByText('₹572: The driver cancelled')).toBeInTheDocument();
    expect(screen.getByText('Held until the trip ends')).toBeInTheDocument();
    expect(screen.getByText('Nothing')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getAllByText('₹520 fare + ₹52 service fee')).toHaveLength(3);
    expect(await screen.findByText(/Payments here are simulated/)).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/payments');
  });

  it('says so when nothing has been paid, and is not offered to drivers', async () => {
    signIn('PASSENGER');
    serve({ 'GET /payments': () => json([]) });
    open('/payments');
    expect(await screen.findByText('You have not paid for anything yet.')).toBeInTheDocument();
  });
});

describe('women-only rides', () => {
  const vehicle = { id: 3, make: 'Maruti', model: 'Ertiga', year: 2022, colour: 'Silver', seats: 7 };

  it('lets a driver whose profile says she is a woman offer one, and sends the choice', async () => {
    signIn('DRIVER');
    const fetchMock = serve({
      'GET /me/profile': () => json({ gender: 'FEMALE' }),
      'GET /vehicles': () => json([vehicle]),
      'POST /rides': () => json({ ...rideWithRoute, notes: null, maxTwoInBack: false, seriesSize: 1, womenOnly: true }, 201),
      'GET /rides/mine': () => json([{ ...rideWithRoute, notes: null, maxTwoInBack: false, seriesSize: 1, womenOnly: true }]),
    });
    open('/rides/new');

    fireEvent.change(await screen.findByLabelText('Leaving at'), { target: { value: '2030-01-01T07:00' } });
    await userEvent.click(await screen.findByLabelText('Women passengers only'));
    await userEvent.click(screen.getByRole('button', { name: 'Publish ride' }));

    expect(await screen.findByText('Women only')).toBeInTheDocument();
    const sent = fetchMock.mock.calls.find(([url, init]) => init?.method === 'POST' && new URL(String(url)).pathname.endsWith('/rides'));
    expect(JSON.parse(String(sent?.[1]?.body)).womenOnly).toBe(true);
  });

  it('explains instead of offering it to any other driver', async () => {
    signIn('DRIVER');
    serve({ 'GET /vehicles': () => json([vehicle]) });
    open('/rides/new');

    expect(await screen.findByText(/can be offered by a driver whose profile says she is a woman/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Women passengers only')).not.toBeInTheDocument();
  });

  it('offers a woman passenger the filter and marks women-only results', async () => {
    signIn('PASSENGER');
    const fetchMock = serve({
      'GET /me/profile': () => json({ gender: 'FEMALE' }),
      'GET /rides/search': () => json([{ ...candidate, womenOnly: true }]),
    });
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    await userEvent.click(await screen.findByLabelText('Are for women only'));
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(/Women only/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('womenOnly=true'))).toBe(true);
  });

  it('does not offer the filter to anyone else', async () => {
    signIn('PASSENGER');
    serve({});
    open('/search');

    await userEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    expect(screen.queryByLabelText('Are for women only')).not.toBeInTheDocument();
  });
});

describe('travel passes', () => {
  const offers = [
    { kind: 'WEEKLY', days: 7, price: 99 },
    { kind: 'MONTHLY', days: 30, price: 299 },
    { kind: 'ANNUAL', days: 365, price: 2499 },
  ];
  const day = 24 * 3600 * 1000;
  const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

  it('buys a pass with the chosen method and shows it running', async () => {
    signIn('PASSENGER');
    let owned: unknown[] = [];
    const bought = { id: 1, kind: 'MONTHLY', price: 299, startsAt: iso(-1000), endsAt: iso(30 * day), provider: 'MOCK' };
    const fetchMock = serve({
      'GET /passes/offers': () => json(offers),
      'GET /passes': () => json(owned),
      'POST /passes': () => {
        owned = [bought];
        return json(bought, 201);
      },
    });
    open('/passes');

    expect(await screen.findByText('You have no pass.')).toBeInTheDocument();
    expect(screen.getByText('₹2,499')).toBeInTheDocument();
    expect(await screen.findByText(/Payments here are simulated/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Pay with'), 'Card');
    await userEvent.click(screen.getByRole('button', { name: 'Buy Monthly pass' }));

    expect(await screen.findByText('Your pass is bought.')).toBeInTheDocument();
    expect(await screen.findByText(/Running until/)).toBeInTheDocument();
    const sent = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(sent?.[1]?.body))).toEqual({ kind: 'MONTHLY', paymentMethod: 'CARD' });
  });

  it('tells a running, a waiting and an ended pass apart', async () => {
    signIn('PASSENGER');
    serve({
      'GET /passes/offers': () => json(offers),
      'GET /passes': () =>
        json([
          { id: 3, kind: 'WEEKLY', price: 99, startsAt: iso(5 * day), endsAt: iso(12 * day), provider: 'MOCK' },
          { id: 2, kind: 'WEEKLY', price: 99, startsAt: iso(-2 * day), endsAt: iso(5 * day), provider: 'MOCK' },
          { id: 1, kind: 'ANNUAL', price: 2499, startsAt: iso(-400 * day), endsAt: iso(-35 * day), provider: 'MOCK' },
        ]),
    });
    open('/passes');

    expect(await screen.findByText(/^Starts .*, runs until/)).toBeInTheDocument();
    expect(screen.getByText(/^Running until/)).toBeInTheDocument();
    expect(screen.getByText(/^Ended/)).toBeInTheDocument();
  });

  it("shows the server's reason when the payment is declined", async () => {
    signIn('PASSENGER');
    serve({
      'GET /passes/offers': () => json(offers),
      'GET /passes': () => json([]),
      'POST /passes': () => json({ detail: 'The payment was declined. No pass was bought.' }, 402),
    });
    open('/passes');

    await userEvent.click(await screen.findByRole('button', { name: 'Buy Weekly pass' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The payment was declined. No pass was bought.');
  });
});
