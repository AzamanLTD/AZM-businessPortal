/**
 * Azaman Business Portal — socket.io singleton.
 *
 * One connection per session, mirroring the backend's auth model: the JWT is
 * passed in the handshake (`auth.token`), which the server verifies in its
 * `io.use()` middleware (server.js) and then auto-joins `user_<id>`. We still
 * emit `join_user_room` for parity/safety — the server validates it against the
 * JWT, so it is a no-op if it doesn't match.
 *
 * The connected socket is also published on `window.__azSocket` so the existing
 * <NotificationBell /> (which listens for the optional `biz_notification`
 * nudge) goes live the moment auth completes — no prop drilling required.
 */
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://azm-backend.onrender.com' : 'http://localhost:3000');

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  // If a stale (disconnected) instance lingers, tear it down first.
  if (socket) disconnectSocket();

  socket = io(BACKEND_URL, {
    transports: ['polling', 'websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  socket.on('connect',       () => console.log('[Socket] Connected:', socket.id));
  socket.on('disconnect',    (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

  // Publish for components that opportunistically listen (e.g. NotificationBell).
  if (typeof window !== 'undefined') window.__azSocket = socket;

  return socket;
}

export function joinUserRoom(userId) {
  if (userId == null) return;
  socket?.emit('join_user_room', { userId });
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  if (typeof window !== 'undefined') window.__azSocket = null;
}
