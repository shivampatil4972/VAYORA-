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

/** The session token, for the one other thing that needs it: the live connection. */
export function getToken(): string | null {
  return token;
}

/** Called when the server rejects the session token, so the app can sign the user out. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const response = await send(path, options);
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/**
 * Fetches a file with the session token and hands it to the browser to save. A plain link
 * cannot do this: it would go without the token.
 */
export async function download(path: string, filename: string): Promise<void> {
  const blob = await (await send(path, {})).blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** A photo or other file the server keeps, or null if there is none. */
export async function fetchFile(path: string): Promise<Blob | null> {
  try {
    return await (await send(path, {})).blob();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function send(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<Response> {
  const headers: Record<string, string> = { ...options.headers };
  // A file goes as itself; anything else as JSON.
  const file = options.body instanceof Blob ? options.body : null;
  if (file) headers['Content-Type'] = file.type || 'application/octet-stream';
  else if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const sentToken = token;
  if (sentToken) headers.Authorization = `Bearer ${sentToken}`;

  let response: Response;
  try {
    response = await fetch(`${BASE}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: file ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  // Only if the rejected token is still the session's: a slow answer to a request made
  // by an earlier session must not sign out the one that replaced it.
  if (response.status === 401 && sentToken && sentToken === token) onUnauthorized();
  if (!response.ok) throw new ApiError(response.status, await problemDetail(response));
  return response;
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
