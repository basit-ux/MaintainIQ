// Thin Socket.IO client wrapper. Connects once per session, authenticated
// with the same JWT used for REST calls.
import { io } from 'socket.io-client'
import { getStoredToken } from './api'

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

export function getSocket() {
  const token = getStoredToken()
  if (!token) return null

  if (socket && socket.connected) return socket

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
  } else if (!socket.connected) {
    socket.auth = { token }
    socket.connect()
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
