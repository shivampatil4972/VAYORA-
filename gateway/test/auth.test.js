import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { socketAuth, verifyToken } from '../src/auth.js';

const SECRET = 'test-secret';

function runMiddleware(auth) {
  const socket = { handshake: { auth }, data: {} };
  let error;
  socketAuth(SECRET)(socket, (err) => { error = err; });
  return { socket, error };
}

test('verifyToken accepts a token signed with the shared secret', () => {
  const token = jwt.sign({ sub: 'user-1' }, SECRET, { algorithm: 'HS256' });
  assert.equal(verifyToken(token, SECRET).sub, 'user-1');
});

test('verifyToken rejects a token signed with another secret', () => {
  const token = jwt.sign({ sub: 'user-1' }, 'other-secret', { algorithm: 'HS256' });
  assert.throws(() => verifyToken(token, SECRET));
});

test('verifyToken rejects an expired token', () => {
  const token = jwt.sign({ sub: 'user-1' }, SECRET, { algorithm: 'HS256', expiresIn: -10 });
  assert.throws(() => verifyToken(token, SECRET));
});

test('socketAuth attaches the user for a valid token', () => {
  const token = jwt.sign({ sub: 'user-1' }, SECRET, { algorithm: 'HS256' });
  const { socket, error } = runMiddleware({ token });
  assert.equal(error, undefined);
  assert.equal(socket.data.user.sub, 'user-1');
});

test('socketAuth refuses a connection with no token', () => {
  const { error } = runMiddleware({});
  assert.match(error.message, /missing token/);
});

test('socketAuth refuses a connection with a bad token', () => {
  const { error } = runMiddleware({ token: 'not-a-jwt' });
  assert.match(error.message, /invalid token/);
});
