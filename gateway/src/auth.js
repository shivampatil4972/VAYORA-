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
      next();
    } catch {
      next(new Error('unauthorized: invalid token'));
    }
  };
}
