import assert from 'node:assert/strict';
import { test } from 'node:test';

import { connectWithRetry } from '../src/connect.js';

test('keeps trying until MongoDB answers, then sets up once', async () => {
  let calls = 0;
  const client = {
    connect: async () => {
      calls += 1;
      if (calls < 3) throw new Error('Server selection timed out after 2000 ms');
    },
  };
  const waits = [];
  let setUp = 0;
  const logged = [];

  const attempts = await connectWithRetry(client, {
    onConnected: () => {
      setUp += 1;
    },
    wait: async (ms) => {
      waits.push(ms);
    },
    log: (message) => logged.push(message),
  });

  assert.equal(attempts, 3);
  assert.equal(setUp, 1);
  assert.deepEqual(waits, [1000, 2000]);
  assert.match(logged[0], /\(attempt 1\): Server selection timed out/);
});

test('waits no longer than the cap between attempts', async () => {
  let calls = 0;
  const client = {
    connect: async () => {
      calls += 1;
      if (calls < 5) throw new Error('down');
    },
  };
  const waits = [];
  await connectWithRetry(client, { wait: async (ms) => waits.push(ms), log: () => {}, maxDelayMs: 2500 });
  assert.deepEqual(waits, [1000, 2000, 2500, 2500]);
});

test('a setup that fails is tried again with the connection', async () => {
  let setUps = 0;
  const client = { connect: async () => {} };
  const attempts = await connectWithRetry(client, {
    onConnected: async () => {
      setUps += 1;
      if (setUps === 1) throw new Error('index creation failed');
    },
    wait: async () => {},
    log: () => {},
  });
  assert.equal(attempts, 2);
  assert.equal(setUps, 2);
});
