import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { afterEach, beforeEach, test } from 'node:test';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import { socketAuth } from '../src/auth.js';
import { coreApiMembership } from '../src/membership.js';
import { attachRealtime, LIMITS } from '../src/realtime.js';
import { MemoryStore } from '../src/store.js';

const SECRET = 'test-secret';
const DRIVER = 1;
const ASHA = 2;
const MEERA = 3;
const STRANGER = 9;

// Who is on which ride, as core-api would say. Tests change it to model a cancellation.
let rides;
let store;
let clock;
let server;
let url;
let sockets;
let membershipCalls;

beforeEach(async () => {
  rides = {
    10: { status: 'SCHEDULED', members: { [DRIVER]: ['DRIVER', 'Ravi Jadhav'], [ASHA]: ['PASSENGER', 'Asha Patil'], [MEERA]: ['PASSENGER', 'Meera Kulkarni'] } },
    20: { status: 'IN_PROGRESS', members: { [DRIVER]: ['DRIVER', 'Ravi Jadhav'], [STRANGER]: ['PASSENGER', 'Someone Else'] } },
  };
  store = new MemoryStore();
  clock = { now: 1_800_000_000_000 };
  sockets = [];
  membershipCalls = 0;

  await start(LIMITS);
});

/** Starts the gateway on a free port. A test wanting other limits calls it again. */
async function start(limits) {
  if (server) await new Promise((resolve) => server.close(resolve));
  const httpServer = createServer();
  server = new Server(httpServer);
  server.use(socketAuth(SECRET));
  attachRealtime(server, {
    store,
    limits,
    now: () => clock.now,
    membership: async (token, rideId) => {
      membershipCalls++;
      const userId = Number(jwt.decode(token).sub);
      const member = rides[rideId]?.members[userId];
      return member ? { role: member[0], fullName: member[1], rideStatus: rides[rideId].status } : null;
    },
  });
  await new Promise((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${httpServer.address().port}`;
}

afterEach(async () => {
  for (const socket of sockets) socket.disconnect();
  await new Promise((resolve) => server.close(resolve));
  server = undefined;
});

function client(userId, token = jwt.sign({ sub: String(userId) }, SECRET, { algorithm: 'HS256' })) {
  const socket = connect(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

const ask = (socket, event, payload) => socket.timeout(2000).emitWithAck(event, payload);
const next = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
/** Resolves true if the event arrives within a short while, false if it does not. */
const arrives = (socket, event) =>
  Promise.race([next(socket, event).then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 150))]);

test('a connection without a valid token is refused', async () => {
  await assert.rejects(client(ASHA, 'not-a-token'), /unauthorized/);
  await assert.rejects(client(ASHA, jwt.sign({ sub: '2' }, 'another-secret')), /unauthorized/);
});

test('a member joins and is told their role and the ride status', async () => {
  const asha = await client(ASHA);

  const joined = await ask(asha, 'ride:join', { rideId: 10 });

  assert.deepEqual(joined, { ok: true, role: 'PASSENGER', rideStatus: 'SCHEDULED', messages: [], location: null });
});

test('someone not on the ride cannot join, and a missing ride looks the same', async () => {
  const stranger = await client(STRANGER);

  assert.deepEqual(await ask(stranger, 'ride:join', { rideId: 10 }), { ok: false, error: 'not_a_member' });
  assert.deepEqual(await ask(stranger, 'ride:join', { rideId: 999 }), { ok: false, error: 'not_a_member' });
  assert.deepEqual(await ask(stranger, 'ride:join', { rideId: 'ten' }), { ok: false, error: 'invalid' });
});

test('a message reaches everyone on the ride, with the sender named by the server', async () => {
  const [driver, asha] = [await client(DRIVER), await client(ASHA)];
  await ask(driver, 'ride:join', { rideId: 10 });
  await ask(asha, 'ride:join', { rideId: 10 });

  const atDriver = next(driver, 'chat:message');
  const atAsha = next(asha, 'chat:message');
  // The client claims another identity; the server ignores it.
  const sent = await ask(asha, 'chat:send', { rideId: 10, text: '  Running five minutes late  ', senderId: DRIVER, senderName: 'Ravi' });

  assert.equal(sent.ok, true);
  for (const message of [await atDriver, await atAsha]) {
    assert.equal(message.text, 'Running five minutes late');
    assert.equal(message.senderId, ASHA);
    assert.equal(message.senderName, 'Asha Patil');
    assert.equal(message.rideId, 10);
    assert.equal(message.id, sent.id);
    assert.equal(message.sentAt, new Date(clock.now).toISOString());
  }
});

test("a message never reaches another ride's passengers, even one the same driver is on", async () => {
  const [driver, asha, stranger] = [await client(DRIVER), await client(ASHA), await client(STRANGER)];
  await ask(driver, 'ride:join', { rideId: 10 });
  await ask(asha, 'ride:join', { rideId: 10 });
  await ask(stranger, 'ride:join', { rideId: 20 });

  const leaked = arrives(stranger, 'chat:message');
  await ask(asha, 'chat:send', { rideId: 10, text: 'private to ride 10' });

  assert.equal(await leaked, false);
  assert.deepEqual((await store.recentMessages(20, 50)), []);
});

test('nothing can be sent to a ride that was not joined, or that the sender is not on', async () => {
  const stranger = await client(STRANGER);

  assert.deepEqual(await ask(stranger, 'chat:send', { rideId: 10, text: 'hello' }), { ok: false, error: 'not_joined' });
  assert.deepEqual(await ask(stranger, 'location:update', { rideId: 10, lat: 17, lon: 74 }), { ok: false, error: 'not_joined' });
  assert.equal(store.messages.length, 0);
});

test('empty, oversized and non-text messages are refused', async () => {
  const asha = await client(ASHA);
  await ask(asha, 'ride:join', { rideId: 10 });

  for (const text of ['', '   ', 'x'.repeat(LIMITS.textMax + 1), 42, null, { $ne: '' }]) {
    assert.deepEqual(await ask(asha, 'chat:send', { rideId: 10, text }), { ok: false, error: 'invalid' });
  }
  assert.equal((await ask(asha, 'chat:send', { rideId: 10, text: 'x'.repeat(LIMITS.textMax) })).ok, true);
  assert.equal(store.messages.length, 1);
});

test('a flood of messages is cut off, and allowed again once the window has passed', async () => {
  const asha = await client(ASHA);
  await ask(asha, 'ride:join', { rideId: 10 });

  for (let i = 0; i < LIMITS.messagesPerWindow; i++) {
    assert.equal((await ask(asha, 'chat:send', { rideId: 10, text: `message ${i}` })).ok, true);
  }
  assert.deepEqual(await ask(asha, 'chat:send', { rideId: 10, text: 'one too many' }), { ok: false, error: 'rate_limited' });

  clock.now += LIMITS.windowMs;
  assert.equal((await ask(asha, 'chat:send', { rideId: 10, text: 'after the window' })).ok, true);
  assert.equal(store.messages.length, LIMITS.messagesPerWindow + 1);
});

test('someone joining later gets the recent messages, oldest first', async () => {
  const asha = await client(ASHA);
  await ask(asha, 'ride:join', { rideId: 10 });
  await ask(asha, 'chat:send', { rideId: 10, text: 'first' });
  await ask(asha, 'chat:send', { rideId: 10, text: 'second' });

  const meera = await client(MEERA);
  const joined = await ask(meera, 'ride:join', { rideId: 10 });

  assert.deepEqual(joined.messages.map((message) => message.text), ['first', 'second']);
});

test('a passenger who cancels stops being able to send, and stops receiving', async () => {
  const [driver, asha] = [await client(DRIVER), await client(ASHA)];
  await ask(driver, 'ride:join', { rideId: 10 });
  await ask(asha, 'ride:join', { rideId: 10 });

  delete rides[10].members[ASHA]; // core-api now says she is not on the ride
  clock.now += LIMITS.membershipTtlMs; // and what the gateway held has gone stale

  assert.deepEqual(await ask(asha, 'chat:send', { rideId: 10, text: 'still here?' }), { ok: false, error: 'not_a_member' });
  const received = arrives(asha, 'chat:message');
  await ask(driver, 'chat:send', { rideId: 10, text: 'for those still booked' });
  assert.equal(await received, false);
});

test('a passenger who cancels and then says nothing stops receiving as well', async () => {
  await start({ ...LIMITS, membershipTtlMs: 0, sweepMs: 20 });
  const [driver, asha] = [await client(DRIVER), await client(ASHA)];
  await ask(driver, 'ride:join', { rideId: 10 });
  await ask(asha, 'ride:join', { rideId: 10 });

  delete rides[10].members[ASHA];
  await new Promise((resolve) => setTimeout(resolve, 100)); // several sweeps

  const received = arrives(asha, 'chat:message');
  assert.equal((await ask(driver, 'chat:send', { rideId: 10, text: 'for those still booked' })).ok, true);
  assert.equal(await received, false);
});

test('membership is not asked of core-api on every message', async () => {
  const asha = await client(ASHA);
  await ask(asha, 'ride:join', { rideId: 10 });
  const afterJoin = membershipCalls;

  for (let i = 0; i < 5; i++) await ask(asha, 'chat:send', { rideId: 10, text: `message ${i}` });

  assert.equal(membershipCalls, afterJoin);
});

test('only the driver may send a position, and only while the ride is under way', async () => {
  const [driver, asha] = [await client(DRIVER), await client(ASHA)];
  await ask(driver, 'ride:join', { rideId: 10 });
  await ask(asha, 'ride:join', { rideId: 10 });
  const here = { rideId: 10, lat: 17.289, lon: 74.1818 };

  assert.deepEqual(await ask(asha, 'location:update', here), { ok: false, error: 'not_the_driver' });
  assert.deepEqual(await ask(driver, 'location:update', here), { ok: false, error: 'ride_not_in_progress' });

  rides[10].status = 'IN_PROGRESS'; // the driver starts the ride; no need to rejoin
  clock.now += LIMITS.locationMinIntervalMs;
  const seen = next(asha, 'location');
  assert.deepEqual(await ask(driver, 'location:update', here), { ok: true });
  assert.deepEqual(await seen, { ...here, at: new Date(clock.now).toISOString() });
  assert.deepEqual(await store.lastLocation(10), { ...here, at: new Date(clock.now).toISOString() });
});

test('positions are range-checked and accepted at most once an interval', async () => {
  const driver = await client(DRIVER);
  await ask(driver, 'ride:join', { rideId: 20 });

  for (const bad of [{ lat: 91, lon: 74 }, { lat: 17, lon: 181 }, { lat: '17', lon: 74 }, { lat: NaN, lon: 74 }, {}]) {
    assert.deepEqual(await ask(driver, 'location:update', { rideId: 20, ...bad }), { ok: false, error: 'invalid' });
  }
  assert.deepEqual(await ask(driver, 'location:update', { rideId: 20, lat: 17, lon: 74 }), { ok: true });
  assert.deepEqual(await ask(driver, 'location:update', { rideId: 20, lat: 17.01, lon: 74 }), { ok: false, error: 'rate_limited' });
  clock.now += LIMITS.locationMinIntervalMs;
  assert.deepEqual(await ask(driver, 'location:update', { rideId: 20, lat: 17.01, lon: 74 }), { ok: true });
  assert.equal(store.locations.length, 2);
});

test('someone joining a ride under way is given the last known position', async () => {
  const driver = await client(DRIVER);
  await ask(driver, 'ride:join', { rideId: 20 });
  await ask(driver, 'location:update', { rideId: 20, lat: 17.5, lon: 74.1 });

  const passenger = await client(STRANGER);
  const joined = await ask(passenger, 'ride:join', { rideId: 20 });

  assert.equal(joined.location.lat, 17.5);
});

test('after a dropped connection a client must join again, and gets what it missed', async () => {
  const [driver, asha] = [await client(DRIVER), await client(ASHA)];
  await ask(driver, 'ride:join', { rideId: 10 });
  await ask(asha, 'ride:join', { rideId: 10 });
  asha.disconnect();

  await ask(driver, 'chat:send', { rideId: 10, text: 'sent while she was away' });
  const back = await client(ASHA);

  assert.deepEqual(await ask(back, 'chat:send', { rideId: 10, text: 'hello again' }), { ok: false, error: 'not_joined' });
  const rejoined = await ask(back, 'ride:join', { rideId: 10 });
  assert.deepEqual(rejoined.messages.map((message) => message.text), ['sent while she was away']);
});

test('a failing store is an error to that client, and the gateway carries on', async () => {
  const asha = await client(ASHA);
  await ask(asha, 'ride:join', { rideId: 10 });
  const save = store.saveMessage;
  store.saveMessage = async () => {
    throw new Error('mongo is down');
  };

  assert.deepEqual(await ask(asha, 'chat:send', { rideId: 10, text: 'lost' }), { ok: false, error: 'server_error' });

  store.saveMessage = save;
  assert.equal((await ask(asha, 'chat:send', { rideId: 10, text: 'kept' })).ok, true);
});

test('membership is asked of core-api with the user’s own token', async () => {
  const calls = [];
  const membership = coreApiMembership('http://core-api:8080', {
    fetchImpl: async (requested, init) => {
      calls.push([requested, init.headers.Authorization]);
      return new Response(JSON.stringify({ role: 'PASSENGER', fullName: 'Asha Patil', rideStatus: 'SCHEDULED', userId: 2 }));
    },
  });

  assert.deepEqual(await membership('abc', 10), { role: 'PASSENGER', fullName: 'Asha Patil', rideStatus: 'SCHEDULED' });
  assert.deepEqual(calls, [['http://core-api:8080/api/v1/rides/10/membership', 'Bearer abc']]);
});

test('a refusal from core-api means not a member; an outage is an error, not a refusal', async () => {
  const answering = (status) => coreApiMembership('http://core-api:8080', { fetchImpl: async () => new Response(null, { status }) });

  for (const status of [401, 403, 404]) assert.equal(await answering(status)('abc', 10), null);
  await assert.rejects(answering(503)('abc', 10), /503/);
});
