import { describe, expect, it } from 'vitest';

import { registerSchema, rideSchema, searchSchema, toPublishRequest, vehicleSchema, type RideForm } from './schemas';

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

const tomorrow = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);

function ride(overrides: Partial<RideForm> = {}): RideForm {
  return {
    vehicleId: 4,
    departure: tomorrow(),
    seatsOffered: 3,
    instantBooking: true,
    stops: [
      { included: true, offsetMinutes: 0, priceFromPrevious: 0 },
      { included: false, offsetMinutes: 75, priceFromPrevious: 0 },
      { included: true, offsetMinutes: 130, priceFromPrevious: 270 },
      { included: true, offsetMinutes: 270, priceFromPrevious: 250 },
    ],
    ...overrides,
  };
}

describe('registerSchema', () => {
  const valid = { fullName: 'Asha Patil', email: 'asha@example.test', password: 'long-enough', role: 'DRIVER' };

  it('accepts a complete form', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('refuses a short password, a bad email and the admin role', () => {
    expect(messages(registerSchema.safeParse({ ...valid, password: 'short' }))).toContain('Use at least 8 characters');
    expect(messages(registerSchema.safeParse({ ...valid, email: 'not-an-email' }))).toContain('Enter a valid email');
    expect(registerSchema.safeParse({ ...valid, role: 'ADMIN' }).success).toBe(false);
  });
});

describe('searchSchema', () => {
  const valid = { origin: 'Karad', destination: 'Pune', date: '2026-11-02', seats: '2' };

  it('turns the seats text into a number', () => {
    expect(searchSchema.parse(valid).seats).toBe(2);
  });

  it('refuses a destination that is not further along the corridor', () => {
    expect(searchSchema.safeParse({ ...valid, origin: 'Satara', destination: 'Karad' }).success).toBe(false);
    expect(searchSchema.safeParse({ ...valid, origin: 'Pune', destination: 'Pune' }).success).toBe(false);
  });

  it('refuses a place off the corridor and a seat count out of range', () => {
    expect(searchSchema.safeParse({ ...valid, destination: 'Mumbai' }).success).toBe(false);
    expect(searchSchema.safeParse({ ...valid, seats: '0' }).success).toBe(false);
    expect(searchSchema.safeParse({ ...valid, seats: '9' }).success).toBe(false);
  });
});

describe('vehicleSchema', () => {
  it('lets the year be left blank but not nonsensical', () => {
    const base = { make: 'Maruti', model: 'Ertiga', colour: '', seats: '7' };
    expect(vehicleSchema.parse({ ...base, year: '' }).year).toBe('');
    expect(vehicleSchema.parse({ ...base, year: '2022' }).year).toBe(2022);
    expect(vehicleSchema.safeParse({ ...base, year: '1492' }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...base, year: '', seats: '1' }).success).toBe(false);
  });
});

describe('rideSchema', () => {
  it('accepts a ride with two or more stops in order', () => {
    expect(rideSchema.safeParse(ride()).success).toBe(true);
  });

  it('refuses a departure in the past', () => {
    expect(messages(rideSchema.safeParse(ride({ departure: '2020-01-01T08:00' })))).toContain('Choose a time in the future');
  });

  it('refuses fewer than two stops', () => {
    const stops = ride().stops.map((stop, index) => ({ ...stop, included: index === 0 }));
    expect(messages(rideSchema.safeParse(ride({ stops })))).toContain('A ride needs at least two stops');
  });

  it('refuses a stop that is not later than the one before, ignoring skipped stops', () => {
    const stops = ride().stops;
    stops[2] = { ...stops[2], offsetMinutes: 0 };
    expect(messages(rideSchema.safeParse(ride({ stops })))).toContain('Must be later than the stop before');

    const skippedIsIgnored = ride().stops;
    skippedIsIgnored[1] = { included: false, offsetMinutes: 9999, priceFromPrevious: 0 };
    expect(rideSchema.safeParse(ride({ stops: skippedIsIgnored })).success).toBe(true);
  });

  it('refuses a negative price or an absurd offset on an included stop', () => {
    const negative = ride().stops;
    negative[2] = { ...negative[2], priceFromPrevious: -5 };
    expect(messages(rideSchema.safeParse(ride({ stops: negative })))).toContain('Enter a price of 0 or more');

    const absurd = ride().stops;
    absurd[3] = { ...absurd[3], offsetMinutes: 99999 };
    expect(messages(rideSchema.safeParse(ride({ stops: absurd })))).toContain('Enter whole minutes, up to two days');
  });
});

describe('toPublishRequest', () => {
  it('sends only the included stops, with one price per leg', () => {
    const body = toPublishRequest(ride());

    expect(body.stops.map((stop) => stop.name)).toEqual(['Kolhapur', 'Satara', 'Pune']);
    expect(body.stops.map((stop) => stop.offsetMinutes)).toEqual([0, 130, 270]);
    expect(body.segmentPrices).toEqual([270, 250]);
    expect(body.stops[1]).toMatchObject({ lat: 17.6805, lon: 74.0183 });
  });

  it('measures offsets from the first included stop when the ride starts mid-corridor', () => {
    const stops = ride().stops;
    stops[0] = { ...stops[0], included: false };
    stops[1] = { included: true, offsetMinutes: 75, priceFromPrevious: 0 };

    const body = toPublishRequest(ride({ stops }));

    expect(body.stops.map((stop) => stop.name)).toEqual(['Karad', 'Satara', 'Pune']);
    expect(body.stops.map((stop) => stop.offsetMinutes)).toEqual([0, 55, 195]);
    expect(body.segmentPrices).toEqual([270, 250]);
  });

  it('sends the departure as an absolute instant', () => {
    expect(toPublishRequest(ride()).departureTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
