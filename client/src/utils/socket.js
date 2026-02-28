import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5, //If your internet drops or the server goes down, Socket.io will automatically try to reconnect 5 times before giving up. So instead of just dying, it keeps trying — reconnect attempt 1, 2, 3, 4, 5... if all fail then it stops.
  reconnectionDelay: 1000,
});
