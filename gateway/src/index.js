import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { socketAuth } from './auth.js';

const PORT = process.env.PORT ?? 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is required');
  process.exit(1);
}

const app = express();
app.get('/health', (_req, res) => {
  res.json({ status: 'UP', service: 'gateway' });
});

const httpServer = createServer(app);
const io = new Server(httpServer);
io.use(socketAuth(JWT_SECRET));

httpServer.listen(PORT, () => {
  console.log(`gateway listening on ${PORT}`);
});
