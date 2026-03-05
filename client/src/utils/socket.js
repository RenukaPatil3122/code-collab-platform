// src/utils/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Get token from localStorage — sent in handshake so server knows who this is
function getToken() {
  return localStorage.getItem("ct_token") || null;
}

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity, // FIX: never give up — handles Render cold start
  reconnectionDelay: 1000, // start retrying after 1s
  reconnectionDelayMax: 5000, // cap at 5s between retries
  timeout: 60000, // wait up to 60s — covers Render's ~50s wake-up delay
  auth: (cb) => cb({ token: getToken() }),
});

// Call this after login so socket reconnects with fresh token
export function reconnectSocketWithToken() {
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
}
