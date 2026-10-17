// Connects to MongoDB, trying again until it answers.
//
// The driver connects by itself on first use, but if that first attempt fails it keeps the
// closed connection and every later call fails with "Topology is closed": the gateway would
// stay broken until restarted. An explicit connect() starts afresh, so it is called here
// until one succeeds. Until then a store call fails for that one client, as before.

/**
 * @param {{ connect: () => Promise<unknown> }} client
 * @param {{ onConnected?: () => Promise<void> | void, wait?: (ms: number) => Promise<void>,
 *           log?: (message: string) => void, maxDelayMs?: number }} [options]
 * @returns {Promise<number>} the number of attempts it took
 */
export async function connectWithRetry(client, options = {}) {
  const {
    onConnected = () => {},
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log = (message) => console.error(message),
    maxDelayMs = 30_000,
  } = options;
  for (let attempt = 1; ; attempt += 1) {
    try {
      await client.connect();
      await onConnected();
      return attempt;
    } catch (error) {
      const delay = Math.min(maxDelayMs, 1000 * attempt);
      log(`MongoDB not reachable (attempt ${attempt}): ${error.message}; trying again in ${delay} ms`);
      await wait(delay);
    }
  }
}
