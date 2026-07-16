import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma.js'
import { toSafeUser, serializeMessage } from '../utils/serializers.js'

// userId (string) -> Set of socket ids (a user can have multiple tabs/devices)
const onlineUsers = new Map()

function addOnlineSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
  onlineUsers.get(userId).add(socketId)
}

function removeOnlineSocket(userId, socketId) {
  const set = onlineUsers.get(userId)
  if (!set) return
  set.delete(socketId)
  if (set.size === 0) onlineUsers.delete(userId)
}

function isUserOnline(userId) {
  return onlineUsers.has(String(userId))
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  })

  // Authenticate every socket connection via JWT (sent in the handshake).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]
      if (!token) return next(new Error('Authentication error: no token'))
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await prisma.user.findUnique({ where: { id: decoded.id } })
      if (!user) return next(new Error('Authentication error: user not found'))
      socket.userId = String(user.id)
      socket.userRole = user.role
      next()
    } catch (err) {
      next(new Error('Authentication error: invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.userId
    addOnlineSocket(userId, socket.id)
    socket.join(userId) // personal room, so we can emit to a user by id

    await prisma.user.update({ where: { id: userId }, data: { isOnline: true, lastSeen: new Date() } })
    io.emit('presence:update', { userId, isOnline: true })

    // ---- Send a message ----
    socket.on('message:send', async ({ receiverId, text, imageUrl }, callback) => {
      try {
        if (!receiverId || (!text && !imageUrl)) {
          return callback?.({ ok: false, error: 'Message must have a receiver and text or an image.' })
        }

        const receiver = await prisma.user.findUnique({ where: { id: receiverId } })
        if (!receiver) return callback?.({ ok: false, error: 'Receiver not found.' })

        const sender = await prisma.user.findUnique({ where: { id: userId } })
        const canChat =
          sender.role === 'admin' ||
          !sender.assignedAdminId ||
          String(sender.assignedAdminId) === String(receiverId)
        if (!canChat) {
          return callback?.({ ok: false, error: 'You are not authorized to chat with this user.' })
        }

        const delivered = isUserOnline(receiverId)
        const message = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId,
            text: text || '',
            imageUrl: imageUrl || '',
            status: delivered ? 'delivered' : 'sent',
          },
        })

        const payload = serializeMessage({
          ...message,
          sender: toSafeUser(sender),
          receiver: toSafeUser(receiver),
        })

        // Deliver to receiver if online.
        io.to(receiverId).emit('message:receive', payload)
        // Echo back to sender (for multi-device sync + delivery confirmation).
        io.to(userId).emit('message:sent-ack', payload)

        callback?.({ ok: true, message: payload })
      } catch (err) {
        callback?.({ ok: false, error: err.message })
      }
    })

    // ---- Typing indicator ----
    socket.on('typing:start', ({ receiverId }) => {
      if (receiverId) io.to(receiverId).emit('typing:start', { senderId: userId })
    })
    socket.on('typing:stop', ({ receiverId }) => {
      if (receiverId) io.to(receiverId).emit('typing:stop', { senderId: userId })
    })

    // ---- Seen receipts ----
    socket.on('message:seen', async ({ otherUserId }) => {
      try {
        await prisma.message.updateMany({
          where: { senderId: otherUserId, receiverId: userId, status: { not: 'seen' } },
          data: { status: 'seen', seenAt: new Date() },
        })
        io.to(otherUserId).emit('message:seen-ack', { by: userId })
      } catch (err) {
        console.error('message:seen error', err.message)
      }
    })

    // ---- Presence query (who's online, for chat sidebar) ----
    socket.on('presence:list', (_, callback) => {
      callback?.(Array.from(onlineUsers.keys()))
    })

    socket.on('disconnect', async () => {
      removeOnlineSocket(userId, socket.id)
      if (!isUserOnline(userId)) {
        await prisma.user.update({ where: { id: userId }, data: { isOnline: false, lastSeen: new Date() } })
        io.emit('presence:update', { userId, isOnline: false, lastSeen: new Date() })
      }
    })
  })

  return io
}

export { isUserOnline }
