// The one place the app talks to core-api. Every request carries the session token and
// every failure becomes an ApiError with a message fit to show.

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let token: string | null = null;
let onUnauthorized: () => void = () => {};

export function setToken(value: string | null): void {
  token = value;
}

/** Called when the server rejects the session token, so the app can sign the user out. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  if (response.status === 401 && token) onUnauthorized();
  if (!response.ok) throw new ApiError(response.status, await problemDetail(response));
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

// core-api answers errors with an RFC 7807 problem document.
async function problemDetail(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as { detail?: string; title?: string };
    return problem.detail ?? problem.title ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
