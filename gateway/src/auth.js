import jwt from 'jsonwebtoken';

// core-api signs tokens; the gateway only ever verifies them.
export function verifyToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

export function socketAuth(secret) {
  return (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized: missing token'));
    try {
      socket.data.user = verifyToken(token, secret);
      // Kept so the gateway can ask core-api, as this user, what they may join.
      socket.data.token = token;
      next();
    } catch {
      next(new Error('unauthorized: invalid token'));
    }
  };
}
