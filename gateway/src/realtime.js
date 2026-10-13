import { randomUUID } from 'node:crypto';

// Chat and live position for a ride.
//
// The gateway carries messages; it does not decide who may see them. Whether someone
// belongs to a ride is core-api's to say, and is asked again whenever the answer held
// here is older than `membershipTtlMs`, so a passenger who cancels stops receiving.

export const LIMITS = {
  textMax: 500,
  // At most this many chat messages per socket in any window.
  messagesPerWindow: 10,
  windowMs: 10_000,
  // A driver's position is accepted at most this often.
  locationMinIntervalMs: 1_000,
  // Messages sent to someone joining.
  historySize: 50,
  membershipTtlMs: 15_000,
  // How often each socket's rides are re-checked without it doing anything.
  sweepMs: 15_000,
};

const room = (rideId) => `ride:${rideId}`;
const isRideId = (value) => Number.isSafeInteger(value) && value > 0;
const isCoordinate = (value, limit) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

/**
 * @param io          the Socket.IO server; every socket must already carry `data.user`
 *                    (the verified token's claims) and `data.token`
 * @param membership  async (token, rideId) => { role, fullName, rideStatus } or null
 * @param store       where messages and positions are kept
 */
export function attachRealtime(io, { membership, store, now = Date.now, limits = LIMITS }) {
  io.on('connection', (socket) => {
    const userId = Number(socket.data.user.sub);
    // A room of one, for anything meant for this person alone.
    socket.join(`user:${userId}`);

    const rides = new Map(); // rideId -> { member, checkedAt }
    const sentAt = []; // times of recent chat messages, for the rate limit
    let lastLocationAt = -Infinity;

    /** The caller's standing on a ride, asking core-api again if what we hold is stale. */
    async function standing(rideId) {
      const held = rides.get(rideId);
      if (held && now() - held.checkedAt < limits.membershipTtlMs) return held.member;
      const member = await membership(socket.data.token, rideId);
      if (!member) {
        rides.delete(rideId);
        socket.leave(room(rideId));
        return null;
      }
      rides.set(rideId, { member, checkedAt: now() });
      return member;
    }

    // Someone who cancels and then stays silent must stop receiving too, so membership
    // is re-checked on a timer and not only when they next send something.
    const sweep = setInterval(() => {
      for (const rideId of rides.keys()) {
        standing(rideId).catch((error) => console.error('membership check failed:', error.message));
      }
    }, limits.sweepMs);
    sweep.unref();
    socket.on('disconnect', () => clearInterval(sweep));

    /** Runs a handler, always answers the client, and never lets an error escape. */
    const handle = (event, handler) =>
      socket.on(event, async (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        try {
          reply(await handler(payload ?? {}));
        } catch (error) {
          console.error(`${event} failed:`, error.message);
          reply({ ok: false, error: 'server_error' });
        }
      });

    handle('ride:join', async ({ rideId }) => {
      if (!isRideId(rideId)) return { ok: false, error: 'invalid' };
      rides.delete(rideId); // joining always asks core-api afresh
      const member = await standing(rideId);
      // Not a member and no such ride look the same from outside.
      if (!member) return { ok: false, error: 'not_a_member' };
      socket.join(room(rideId));
      return {
        ok: true,
        role: member.role,
        rideStatus: member.rideStatus,
        messages: await store.recentMessages(rideId, limits.historySize),
        location: await store.lastLocation(rideId),
      };
    });

    handle('ride:leave', async ({ rideId }) => {
      rides.delete(rideId);
      socket.leave(room(rideId));
      return { ok: true };
    });

    handle('chat:send', async ({ rideId, text }) => {
      if (!isRideId(rideId) || typeof text !== 'string') return { ok: false, error: 'invalid' };
      const body = text.trim();
      if (body.length === 0 || body.length > limits.textMax) return { ok: false, error: 'invalid' };
      if (!rides.has(rideId)) return { ok: false, error: 'not_joined' };

      while (sentAt.length && now() - sentAt[0] >= limits.windowMs) sentAt.shift();
      if (sentAt.length >= limits.messagesPerWindow) return { ok: false, error: 'rate_limited' };

      const member = await standing(rideId);
      if (!member) return { ok: false, error: 'not_a_member' };

      sentAt.push(now());
      const message = {
        id: randomUUID(),
        rideId,
        senderId: userId,
        senderName: member.fullName,
        text: body,
        sentAt: new Date(now()).toISOString(),
      };
      await store.saveMessage(message);
      io.to(room(rideId)).emit('chat:message', message);
      return { ok: true, id: message.id };
    });

    handle('location:update', async ({ rideId, lat, lon }) => {
      if (!isRideId(rideId) || !isCoordinate(lat, 90) || !isCoordinate(lon, 180)) {
        return { ok: false, error: 'invalid' };
      }
      if (!rides.has(rideId)) return { ok: false, error: 'not_joined' };
      if (now() - lastLocationAt < limits.locationMinIntervalMs) return { ok: false, error: 'rate_limited' };

      let member = await standing(rideId);
      // A ride that was not yet under way when we last asked may be by now.
      if (member && member.role === 'DRIVER' && member.rideStatus !== 'IN_PROGRESS') {
        rides.delete(rideId);
        member = await standing(rideId);
        if (member) socket.join(room(rideId));
      }
      if (!member) return { ok: false, error: 'not_a_member' };
      if (member.role !== 'DRIVER') return { ok: false, error: 'not_the_driver' };
      if (member.rideStatus !== 'IN_PROGRESS') return { ok: false, error: 'ride_not_in_progress' };

      lastLocationAt = now();
      const point = { rideId, lat, lon, at: new Date(now()).toISOString() };
      await store.saveLocation(point);
      socket.to(room(rideId)).emit('location', point);
      return { ok: true };
    });
  });
}
