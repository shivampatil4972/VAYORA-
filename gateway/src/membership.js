// Asks core-api whether the bearer of a token belongs to a ride. The gateway sends the
// user's own token: core-api answers for that user, and the gateway learns nothing it
// could not have been told by them directly.

/**
 * @returns async (token, rideId) => { role, fullName, rideStatus } or null if the user
 *          is not on the ride. Throws if core-api cannot be reached, so that an outage
 *          is an error to the client and not a silent "you are not a member".
 */
export function coreApiMembership(baseUrl, { fetchImpl = fetch, timeoutMs = 3000 } = {}) {
  return async (token, rideId) => {
    const response = await fetchImpl(`${baseUrl}/api/v1/rides/${rideId}/membership`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404 || response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error(`core-api answered ${response.status}`);
    const { role, fullName, rideStatus } = await response.json();
    return { role, fullName, rideStatus };
  };
}
