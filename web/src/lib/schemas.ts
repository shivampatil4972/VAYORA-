// Form validation. The limits mirror core-api's, so a form that passes here is not then
// bounced by the server for a reason the user could have been told up front.

import { z } from 'zod';

import { CORRIDOR } from './corridor';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name').max(100),
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email').max(254),
  password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'),
  role: z.enum(['PASSENGER', 'DRIVER'], { message: 'Choose how you will use JOURNEX' }),
});
export type RegisterForm = z.infer<typeof registerSchema>;

const stopNames = CORRIDOR.map((stop) => stop.name);

export const searchSchema = z
  .object({
    origin: z.string().refine((name) => stopNames.includes(name), 'Choose where you start'),
    destination: z.string().refine((name) => stopNames.includes(name), 'Choose where you are going'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
    seats: z.coerce.number().int().min(1, 'At least 1 seat').max(8, 'At most 8 seats'),
  })
  .refine((form) => stopNames.indexOf(form.destination) > stopNames.indexOf(form.origin), {
    path: ['destination'],
    message: 'The destination must come after the starting point on the way to Pune',
  });
export type SearchForm = z.infer<typeof searchSchema>;

export const vehicleSchema = z.object({
  make: z.string().trim().min(1, 'Enter the make').max(50),
  model: z.string().trim().min(1, 'Enter the model').max(50),
  year: z.union([z.literal(''), z.coerce.number().int().min(1980, 'Too old').max(2100, 'Check the year')]),
  colour: z.string().trim().max(30),
  seats: z.coerce.number().int().min(2, 'At least 2, counting the driver').max(9, 'At most 9'),
});
export type VehicleForm = z.infer<typeof vehicleSchema>;

export const rideSchema = z
  .object({
    vehicleId: z.coerce.number().int().positive('Choose a vehicle'),
    departure: z.string().min(1, 'Choose when you leave'),
    seatsOffered: z.coerce.number().int().min(1, 'Offer at least 1 seat').max(8, 'At most 8 seats'),
    instantBooking: z.boolean(),
    // One entry per corridor stop, in travel order. The numbers are checked below, and
    // only for stops the driver included: an unticked stop's fields are hidden, so an
    // error on one could never be seen or fixed.
    stops: z.array(
      z.object({
        included: z.boolean(),
        offsetMinutes: z.coerce.number(),
        // Price per seat of the leg that ends at this stop.
        priceFromPrevious: z.coerce.number(),
      }),
    ),
  })
  .superRefine((form, context) => {
    if (Number.isNaN(Date.parse(form.departure)) || Date.parse(form.departure) <= Date.now()) {
      context.addIssue({ code: 'custom', path: ['departure'], message: 'Choose a time in the future' });
    }
    const included = form.stops.map((stop, index) => ({ ...stop, index })).filter((stop) => stop.included);
    if (included.length < 2) {
      context.addIssue({ code: 'custom', path: ['stops'], message: 'A ride needs at least two stops' });
    }
    for (const stop of included) {
      if (!Number.isInteger(stop.offsetMinutes) || stop.offsetMinutes < 0 || stop.offsetMinutes > 2880) {
        context.addIssue({
          code: 'custom',
          path: ['stops', stop.index, 'offsetMinutes'],
          message: 'Enter whole minutes, up to two days',
        });
      }
      if (!(stop.priceFromPrevious >= 0 && stop.priceFromPrevious <= 999999)) {
        context.addIssue({
          code: 'custom',
          path: ['stops', stop.index, 'priceFromPrevious'],
          message: 'Enter a price of 0 or more',
        });
      }
    }
    for (let i = 1; i < included.length; i++) {
      if (included[i].offsetMinutes <= included[i - 1].offsetMinutes) {
        context.addIssue({
          code: 'custom',
          path: ['stops', included[i].index, 'offsetMinutes'],
          message: 'Must be later than the stop before',
        });
      }
    }
  });
export type RideForm = z.infer<typeof rideSchema>;

/** Turns the publish form into the body core-api expects. */
export function toPublishRequest(form: RideForm) {
  const included = form.stops.map((stop, index) => ({ ...stop, place: CORRIDOR[index] })).filter((stop) => stop.included);
  const start = included[0].offsetMinutes;
  return {
    vehicleId: form.vehicleId,
    departureTime: new Date(form.departure).toISOString(),
    seatsOffered: form.seatsOffered,
    instantBooking: form.instantBooking,
    stops: included.map((stop) => ({
      name: stop.place.name,
      lat: stop.place.lat,
      lon: stop.place.lon,
      // The server wants minutes after departure, and the ride departs from its first stop.
      offsetMinutes: stop.offsetMinutes - start,
    })),
    segmentPrices: included.slice(1).map((stop) => stop.priceFromPrevious),
  };
}
