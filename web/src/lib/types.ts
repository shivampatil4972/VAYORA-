// Shapes of core-api's JSON, as its controllers return them.

export type Role = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export interface User {
  id: number;
  /** Null for a member who signed up with a phone number. */
  email: string | null;
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
  /** The driver's own description; null if not said. */
  comfort: Comfort | null;
  luggage: Luggage | null;
  electric: boolean;
  batteryKwh: number | null;
  consumptionKwhPer100Km: number | null;
  /** What the two figures above imply on a full charge. Not a measured range. */
  estimatedRangeKm: number | null;
  /** Insurance as the driver declares it, never checked; both null if not said. */
  insurer: string | null;
  insuredUntil: string | null;
}

export type Comfort = 'BASIC' | 'COMFORT' | 'PREMIUM';

/** The largest bag each passenger may bring. */
export type Luggage = 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE';

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
  /** Null on a ride with no recorded route. */
  distanceKm: number | null;
  durationMinutes: number | null;
  /** `STRAIGHT_LINE` means the stops were only joined up: not a road distance. */
  routeSource: RouteSource | null;
  /** [lat, lon] pairs. */
  path: [number, number][];
  /** Whatever the driver typed for passengers; null if nothing. */
  notes: string | null;
  /** The driver's promise of at most two passengers on the back seat. */
  maxTwoInBack: boolean;
  /** Rides published together with this one, itself included. */
  seriesSize: number;
  /** Offered only to passengers whose profile says they are a woman. */
  womenOnly: boolean;
}

export type RouteSource = 'OSRM' | 'STRAIGHT_LINE';

export type SearchSort = 'TIME' | 'PRICE' | 'RATING' | 'PROXIMITY';

/** A route through some stops before a ride is published, with a suggested price per leg. */
export interface RoutePreview {
  distanceKm: number;
  durationMinutes: number;
  source: RouteSource;
  legs: { distanceKm: number; durationMinutes: number; suggestedPrice: number }[];
  path: [number, number][];
  /** Rest stops and chargers near the route, in the order they are reached. */
  alongRoute: AlongRoute[];
}

/** A day and stretch where passengers searched and were offered no ride. */
export interface SupplyGap {
  date: string;
  fromStop: string;
  toStop: string;
  emptySearches: number;
  driversNudged: number;
}

/** A place to stop, entered by an administrator; nothing checks it is open or working. */
export interface Stopover {
  id: number;
  kind: 'REST' | 'CHARGER';
  name: string;
  lat: number;
  lon: number;
  chargerKw: number | null;
  notes: string | null;
}

export interface AlongRoute {
  stopover: Stopover;
  kmAlong: number;
  kmOffRoute: number;
  /** The rest stop nearest the point a break is due; at most one per route. */
  suggestedBreak: boolean;
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
  /** Straight-line metres between the passenger's points and the stops used. */
  pickupDistanceM: number;
  dropoffDistanceM: number;
  /** The driver confirmed an email address or a phone number. Not an identity check. */
  driverConfirmed: boolean;
  maxTwoInBack: boolean;
  /** Make and model, as the driver entered them. */
  vehicle: string;
  comfort: Comfort | null;
  luggage: Luggage | null;
  electric: boolean;
  womenOnly: boolean;
  /** The driver's own past rides: none of it is a prediction. */
  driverRidesCompleted: number;
  driverRidesWithdrawn: number;
  /** In a straight line at a set pace, so the real walk is longer. */
  pickupWalkMinutes: number;
  dropoffWalkMinutes: number;
  /** The driver has withdrawn rides and completed fewer than the set share: from their record only. */
  suggestFlexible: boolean;
  /** Already on the road: offered only from stops it is not yet near, and it may reach them before the time shown. */
  underWay: boolean;
  /** The driver has completed enough rides and withdrawn none lately, so the service fee is lower: from their record only. */
  keptRides: boolean;
  /** Insurance the driver declares, never checked: only while it covers the trip's date. */
  insurer: string | null;
  insuredUntil: string | null;
}

/** What a passenger agrees to, when booking, should the driver withdraw the ride. */
export type FlexTier = 'EXACT' | 'FLEXIBLE' | 'ANY_TIME';

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
  /**
   * Each feature's share of the log relative risk. Positive raises the estimated chance of
   * a cancellation. Empty for scores logged before explanations existed.
   */
  contributions: Record<string, number>;
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
  disputedTrips: number;
}

export interface Member {
  id: number;
  fullName: string;
  email: string | null;
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
/** A notification as an English template and the values that fill it. */
export interface NotificationText {
  template: string;
  values: Record<string, TextValue>;
}

export type TextValue = string | NotificationText | NotificationText[];

export interface AppNotification {
  id: string;
  type: string;
  /** The English, which older notifications only have. */
  message: string;
  text: NotificationText | null;
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
  /** Proved with a code. Says nothing about who the member is. */
  emailVerified: boolean;
  phoneVerified: boolean;
  bio: string | null;
  /** From a birth year, so a year out either way. */
  age: number | null;
  smoking: boolean | null;
  pets: boolean | null;
  music: boolean | null;
  chattiness: Chattiness | null;
  /** Drivers only: the share of requests they answered themselves. Null with too few. */
  responseRate?: number | null;
  /** Drivers only: median minutes from a request to their answer. */
  responseMinutes?: number | null;
  /** NEWCOMER up to AMBASSADOR; see levelLabels. */
  level?: string;
}

/** A driver's own record, for them alone. */
export interface Reliability {
  ridesCompleted: number;
  ridesWithdrawn: number;
  passengersCarried: number;
  passengersCancelled: number;
  noShowsMarked: number;
  averageStars: number | null;
  ratingCount: number;
  responseRate: number | null;
  responseMinutes: number | null;
  level: string;
}

export type Chattiness = 'QUIET' | 'MODERATE' | 'TALKATIVE';

export type Gender = 'FEMALE' | 'MALE' | 'OTHER';

/** A member's own profile. Null means not said. */
export interface MyProfile {
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  bio: string | null;
  birthYear: number | null;
  gender: Gender | null;
  smoking: boolean | null;
  pets: boolean | null;
  music: boolean | null;
  chattiness: Chattiness | null;
}

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relation: string | null;
}

/** The answer to pressing the emergency button. */
export interface SosRaised {
  alertId: number;
  contactsTold: number;
  /** False while messages are simulated: nobody outside the platform was told. */
  reallySent: boolean;
  emergencyNumber: string;
}

export interface SosAlert {
  id: number;
  userId: number;
  userName: string;
  userPhone: string | null;
  rideId: number | null;
  lat: number | null;
  lon: number | null;
  contactsTold: number;
  /** `MOCK` means the contacts were not really messaged. */
  sender: string;
  status: 'OPEN' | 'ACKNOWLEDGED';
  createdAt: string;
}

/** A message the mock sender was asked to send and did not. */
export interface MockMessage {
  channel: 'EMAIL' | 'PHONE';
  to: string;
  text: string;
  at: string;
}

/** How long a driver has to answer a request before it is closed and refunded. */
export interface RequestTerms {
  answerWithinMinutes: number;
  /** Closed this long before boarding, however recent the request. */
  closesMinutesBeforeBoarding: number;
}

/** Seats kept from other passengers for a few minutes. Not a booking. */
export interface SeatHold {
  rideId: number;
  fromSeq: number;
  toSeq: number;
  seats: number;
  expiresAt: string;
}

export type PaymentMethod = 'CARD' | 'UPI' | 'WALLET';

export interface PaymentTerms {
  /** `MOCK` means payments are simulated and no money moves. */
  provider: string;
  serviceFeeRate: number;
  /** Most generous first. Later than the last tier refunds nothing. */
  refundTiers: { atLeastHoursBefore: number; fareShare: number }[];
}

export type PassKind = 'WEEKLY' | 'MONTHLY' | 'ANNUAL';

/** A pass on sale. */
export interface PassOffer {
  kind: PassKind;
  days: number;
  price: number;
}

/** A pass a passenger bought. While it runs, their bookings carry no service fee. */
export interface TravelPass {
  id: number;
  kind: PassKind;
  price: number;
  startsAt: string;
  endsAt: string;
  /** `MOCK` means no money moved. */
  provider: string;
}

/** One of a passenger's payments, with what came back. */
export interface PassengerPayment {
  bookingId: number;
  fromStop: string;
  toStop: string;
  fare: number;
  serviceFee: number;
  /** Fare plus fee: what was held. */
  amount: number;
  method: PaymentMethod;
  /** `MOCK` means no money moved. */
  provider: string;
  status: 'HELD' | 'SETTLED';
  /** 0 when nothing came back. */
  refunded: number;
  refundReason: 'NOT_ACCEPTED' | 'DRIVER_CANCELLED' | 'PASSENGER_CANCELLED' | null;
  createdAt: string;
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
  /** The passenger's answer to whether a completed trip happened; null until given. */
  passengerConfirmed?: boolean | null;
  flexTier?: FlexTier;
  /** Who drives, and in what: make, model and colour as the driver entered them. */
  driverId?: number;
  driverName?: string;
  vehicle?: string | null;
}

/** A completed trip its passenger says did not happen. */
export interface DisputedTrip {
  bookingId: number;
  passengerId: number;
  passengerName: string;
  driverId: number;
  driverName: string;
  fromStop: string;
  toStop: string;
  boardingTime: string;
  disputedAt: string;
}

/** A bus service entered by an administrator; not checked against the operator. */
export interface BusService {
  id: number;
  operator: string;
  fromStop: string;
  toStop: string;
  /** Local time of day, HH:mm:ss. */
  departs: string;
  durationMinutes: number;
  fare: number;
  notes: string | null;
}
