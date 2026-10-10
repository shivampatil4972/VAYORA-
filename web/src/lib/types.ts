// Shapes of core-api's JSON, as its controllers return them.

export type Role = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface Session {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number | null;
  colour: string | null;
  /** Total seats including the driver's. */
  seats: number;
}

export interface Stop {
  seq: number;
  name: string;
  lat: number;
  lon: number;
  departureTime: string;
}

/** Segment `seq` runs from stop `seq` to stop `seq + 1`. */
export interface Segment {
  seq: number;
  price: number;
  seatsTotal: number;
  seatsAvailable: number;
}

export type RideStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Ride {
  id: number;
  driverId: number;
  driverName: string;
  vehicleId: number;
  departureTime: string;
  seatsOffered: number;
  instantBooking: boolean;
  status: RideStatus;
  stops: Stop[];
  segments: Segment[];
}

/** One search result: a ride and the stretch of it the passenger would travel. */
export interface Candidate {
  rideId: number;
  driverName: string;
  instantBooking: boolean;
  fromSeq: number;
  toSeq: number;
  fromStop: string;
  toStop: string;
  boardingTime: string;
  arrivalTime: string;
  pricePerSeat: number;
  seatsAvailable: number;
  /** For the seats searched for. */
  fare: number;
  serviceFee: number;
  /** Fare plus fee: what booking would hold. */
  total: number;
}

/** The newest durability estimate of one live booking. Administrators only. */
export interface HazardScore {
  bookingId: number;
  rideId: number;
  passengerName: string;
  fromStop: string;
  toStop: string;
  boardingTime: string;
  survivalProbability: number;
  modelVersion: string;
  scoredAt: string;
}

export interface ScoringSummary {
  scored: number;
  alreadyScored: number;
  failed: number;
  skippedRun: boolean;
}

export type PaymentMethod = 'CARD' | 'UPI' | 'WALLET';

export interface PaymentTerms {
  /** `MOCK` means payments are simulated and no money moves. */
  provider: string;
  serviceFeeRate: number;
  /** Most generous first. Later than the last tier refunds nothing. */
  refundTiers: { atLeastHoursBefore: number; fareShare: number }[];
}

/** A payout to a driver. */
export interface Settlement {
  bookingId: number;
  passengerName: string;
  fromStop: string;
  toStop: string;
  amount: number;
  reason: 'TRIP_COMPLETED' | 'PASSENGER_NO_SHOW' | 'LATE_CANCELLATION';
  provider: string;
  createdAt: string;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Booking {
  id: number;
  rideId: number;
  passengerId: number;
  passengerName: string;
  fromSeq: number;
  toSeq: number;
  fromStop: string;
  toStop: string;
  seats: number;
  /** The fare. */
  price: number;
  /** Null on a booking nothing was charged for. */
  serviceFee: number | null;
  total: number | null;
  refunded: number | null;
  status: BookingStatus;
  boardingTime: string;
  createdAt: string;
}
