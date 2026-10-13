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
  driverId: number;
  /** Null until somebody has rated the driver. */
  driverRating: number | null;
  driverRatingCount: number;
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

export type ReportOutcome = 'DISMISS' | 'WARN' | 'SUSPEND';

/** One member's report about another, as an administrator sees it. */
export interface MemberReport {
  id: number;
  reporterId: number;
  reporterName: string;
  reportedUserId: number;
  reportedUserName: string;
  reportedUserStatus: 'ACTIVE' | 'SUSPENDED';
  bookingId: number | null;
  reason: 'UNSAFE_DRIVING' | 'HARASSMENT' | 'NO_SHOW' | 'FRAUD' | 'OTHER';
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  outcome: ReportOutcome | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminOverview {
  users: Record<string, number>;
  rides: Record<string, number>;
  bookings: Record<string, number>;
  suspendedMembers: number;
  openReports: number;
}

export interface Member {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  memberSince: string;
}

export interface AuditEntry {
  id: number;
  actorId: number;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: number | null;
  /** JSON text, shown as it is. */
  detail: string;
  createdAt: string;
}

/** Named so as not to shadow the browser's own Notification. */
export interface AppNotification {
  id: string;
  type: string;
  message: string;
  bookingId: number | null;
  createdAt: string;
  read: boolean;
}

export interface Review {
  stars: number;
  comment: string;
  /** First name only. */
  reviewerName: string;
  createdAt: string;
}

/** What any signed-in member may see about another. */
export interface Profile {
  id: number;
  fullName: string;
  role: Role;
  memberSince: string;
  completedTrips: number;
  averageStars: number | null;
  ratingCount: number;
  reviews: Review[];
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
  /** Whether each side has rated the other for this trip. */
  passengerRated: boolean;
  driverRated: boolean;
}
