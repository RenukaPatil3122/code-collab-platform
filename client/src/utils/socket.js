// src/utils/socket.js

import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

// Get token from localStorage — sent in handshake so server knows who this is
function getToken() {
  return localStorage.getItem("ct_token") || null;
}

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  auth: {
    token: getToken(),
  },
});

// Call this after login so socket reconnects with fresh token
export function reconnectSocketWithToken() {
  const token = getToken();
  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
}
