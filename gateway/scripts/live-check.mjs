// Not part of `npm test`: drives chat and live position through a running stack.
//
//   docker compose up -d --wait
//   node gateway/scripts/live-check.mjs
//
// Registers a driver, a passenger and a stranger on core-api, books a ride, and checks
// over real sockets that the two on the ride can talk, the stranger cannot join, and
// only the driver's position is relayed once the ride is under way.

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { io as connect } from 'socket.io-client';

const API = process.env.CORE_API_URL ?? 'http://localhost:8080';
const GATEWAY = process.env.GATEWAY_URL ?? 'http://localhost:3000';

async function call(method, path, token, body) {
  const response = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.ok(response.ok, `${method} ${path} -> ${response.status}`);
  return response.status === 204 ? null : response.json();
}

const register = async (role, fullName) =>
  (await call('POST', '/auth/register', null, { email: `live-${randomUUID().slice(0, 8)}@example.test`, password: 'correct-horse-battery', fullName, role })).accessToken;

function socket(token) {
  const client = connect(GATEWAY, { auth: { token }, transports: ['websocket'], reconnection: false });
  return new Promise((resolve, reject) => {
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });
}

const ask = (client, event, payload) => client.timeout(5000).emitWithAck(event, payload);
const next = (client, event) => new Promise((resolve) => client.once(event, resolve));

const [driver, passenger, stranger] = [await register('DRIVER', 'Ravi Jadhav'), await register('PASSENGER', 'Asha Patil'), await register('PASSENGER', 'Nosy Parker')];
const vehicle = await call('POST', '/vehicles', driver, { make: 'Tata', model: 'Nexon', seats: 5 });
const ride = await call('POST', '/rides', driver, {
  vehicleId: vehicle.id,
  departureTime: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
  seatsOffered: 3,
  instantBooking: true,
  stops: [
    { name: 'Kolhapur', lat: 16.705, lon: 74.2433, offsetMinutes: 0 },
    { name: 'Pune', lat: 18.5204, lon: 73.8567, offsetMinutes: 270 },
  ],
  segmentPrices: [520],
});
await call('POST', '/bookings', passenger, { rideId: ride.id, fromSeq: 0, toSeq: 1, seats: 1, paymentMethod: 'UPI' });

const [d, p, s] = [await socket(driver), await socket(passenger), await socket(stranger)];
console.log('stranger joins:', await ask(s, 'ride:join', { rideId: ride.id }));
const joined = await ask(p, 'ride:join', { rideId: ride.id });
console.log('passenger joins:', { ok: joined.ok, role: joined.role, rideStatus: joined.rideStatus });
console.log('driver joins:', (await ask(d, 'ride:join', { rideId: ride.id })).role);

const heard = next(d, 'chat:message');
await ask(p, 'chat:send', { rideId: ride.id, text: 'I am at the bus stand gate.' });
const message = await heard;
console.log('driver hears:', `${message.senderName}: ${message.text}`);

const here = { rideId: ride.id, lat: 16.71, lon: 74.24 };
console.log('position before the ride starts:', await ask(d, 'location:update', here));
console.log('position from the passenger:', await ask(p, 'location:update', here));
await call('POST', `/rides/${ride.id}/start`, driver);
const seen = next(p, 'location');
console.log('position once under way:', await ask(d, 'location:update', here));
const point = await seen;
console.log('passenger sees the driver at:', point.lat, point.lon);

const late = await socket(passenger);
const again = await ask(late, 'ride:join', { rideId: ride.id });
console.log('a fresh connection gets history and position:', again.messages.length, 'message,', again.location ? 'position present' : 'no position');

for (const client of [d, p, s, late]) client.disconnect();
console.log('ride id:', ride.id);
