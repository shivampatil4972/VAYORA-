// Where chat messages and GPS points are kept. MongoDB in the running system; a plain
// in-memory version for tests.

// A position is only useful while a trip is recent, and it says where a person was.
const GPS_RETENTION_SECONDS = 7 * 24 * 60 * 60;

export class MemoryStore {
  constructor() {
    this.messages = [];
    this.locations = [];
  }

  async saveMessage(message) {
    this.messages.push({ ...message });
  }

  async recentMessages(rideId, limit) {
    return this.messages.filter((message) => message.rideId === rideId).slice(-limit);
  }

  async saveLocation(point) {
    this.locations.push({ ...point });
  }

  async lastLocation(rideId) {
    return this.locations.filter((point) => point.rideId === rideId).at(-1) ?? null;
  }
}

export class MongoStore {
  /** @param db a connected `Db` from the mongodb driver */
  constructor(db) {
    this.messages = db.collection('chat_messages');
    this.locations = db.collection('gps_traces');
  }

  async ensureIndexes() {
    await this.messages.createIndex({ rideId: 1, sentAt: 1 });
    await this.locations.createIndex({ rideId: 1, at: -1 });
    await this.locations.createIndex({ storedAt: 1 }, { expireAfterSeconds: GPS_RETENTION_SECONDS });
  }

  async saveMessage(message) {
    await this.messages.insertOne({ ...message, _id: message.id });
  }

  async recentMessages(rideId, limit) {
    const newestFirst = await this.messages
      .find({ rideId }, { projection: { _id: 0 } })
      .sort({ sentAt: -1 })
      .limit(limit)
      .toArray();
    return newestFirst.reverse();
  }

  async saveLocation(point) {
    // storedAt is a real date for the expiry index; `at` stays the ISO string clients get.
    await this.locations.insertOne({ ...point, storedAt: new Date(point.at) });
  }

  async lastLocation(rideId) {
    return this.locations.findOne({ rideId }, { sort: { at: -1 }, projection: { _id: 0, storedAt: 0 } });
  }
}
