import { describe, expect, it, vi } from 'vitest';

import { api, ApiError, setToken, setUnauthorizedHandler } from './api';

function respondWith(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('api', () => {
  it('sends JSON with the session token to the versioned API', async () => {
    const fetchMock = respondWith(200, { id: 7 });
    setToken('abc');

    const result = await api<{ id: number }>('/bookings', { method: 'POST', body: { rideId: 1 } });

    expect(result).toEqual({ id: 7 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/bookings');
    expect(init).toMatchObject({
      method: 'POST',
      body: '{"rideId":1}',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc' },
    });
  });

  it('sends no Authorization header when signed out', async () => {
    const fetchMock = respondWith(200, []);

    await api('/rides/search');

    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
  });

  it("raises the server's own explanation from a problem document", async () => {
    respondWith(409, { title: 'Conflict', detail: 'Not enough seats left on that part of the ride' });

    await expect(api('/bookings', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Not enough seats left on that part of the ride',
    });
  });

  it('falls back to a generic message when the error has no readable body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));

    await expect(api('/bookings')).rejects.toMatchObject({ status: 502, message: 'Request failed (502)' });
  });

  it('reports an unreachable server as such', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await api('/bookings').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).message).toMatch(/Cannot reach the server/);
  });

  it('signs the user out when the server rejects their token, but not on a failed login', async () => {
    const signOut = vi.fn();
    setUnauthorizedHandler(signOut);

    respondWith(401, { detail: 'Invalid email or password' });
    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toThrow('Invalid email or password');
    expect(signOut).not.toHaveBeenCalled();

    setToken('expired');
    respondWith(401);
    await expect(api('/me')).rejects.toBeInstanceOf(ApiError);
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('does not sign out the current session when a request from an earlier one is rejected late', async () => {
    const signOut = vi.fn();
    setUnauthorizedHandler(signOut);
    let answer!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => (answer = resolve))));

    setToken('old-session');
    const pending = api('/me').catch((e: unknown) => e);
    setToken('new-session'); // someone else signed in before the answer came back
    answer(new Response(null, { status: 401 }));

    expect(await pending).toBeInstanceOf(ApiError);
    expect(signOut).not.toHaveBeenCalled();
  });
});
