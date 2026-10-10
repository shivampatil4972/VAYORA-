import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { setToken } from '../lib/api';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  setToken(null);
  vi.unstubAllGlobals();
});
