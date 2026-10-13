import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { setToken } from '../lib/api';

// No test may reach a real server. One that needs answers stubs fetch itself; any other
// request fails the way an unreachable server would.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('network access is disabled in tests');
    }),
  );
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  setToken(null);
  vi.unstubAllGlobals();
});
