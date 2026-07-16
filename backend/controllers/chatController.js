import asyncHandler from 'express-async-handler'
import prisma from '../config/prisma.js'
import { uploadBufferToCloudinary } from '../services/cloudinaryService.js'
import { toSafeUser, serializeMessage } from '../utils/serializers.js'

// @desc    Get the list of people the current user is allowed to chat with
//          Admin -> all technicians. Technician -> only their assigned admin
//          (falls back to all admins if none explicitly assigned).
// @route   GET /api/chat/contacts
// @access  Private
export const getContacts = asyncHandler(async (req, res) => {
  let contacts

  if (req.user.role === 'admin') {
    contacts = await prisma.user.findMany({ where: { role: 'technician' } })
  } else {
    if (req.user.assignedAdminId) {
      contacts = await prisma.user.findMany({ where: { id: req.user.assignedAdminId } })
    } else {
      contacts = await prisma.user.findMany({ where: { role: 'admin' } })
    }
  }

  // Attach unread counts + last message preview per contact.
  const enriched = await Promise.all(
    contacts.map(async (contact) => {
      const unreadCount = await prisma.message.count({
        where: { senderId: contact.id, receiverId: req.user.id, status: { not: 'seen' } },
      })
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: req.user.id, receiverId: contact.id },
            { senderId: contact.id, receiverId: req.user.id },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })

      return {
        ...toSafeUser(contact),
        unreadCount,
        lastMessage: lastMessage
          ? { text: lastMessage.text, imageUrl: lastMessage.imageUrl, createdAt: lastMessage.createdAt, sender: lastMessage.senderId }
          : null,
      }
    })
  )

  // Sort by most recent activity first.
  enriched.sort((a, b) => {
    const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0
    const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0
    return bt - at
  })

  res.json({ ok: true, contacts: enriched })
})

function assertCanChat(currentUser, otherUserId) {
  // Authorization: admin can chat with any technician; technician only with
  // their assigned admin (or any admin if none assigned yet).
  if (currentUser.role === 'admin') return true
  if (currentUser.assignedAdminId && String(currentUser.assignedAdminId) === String(otherUserId)) return true
  if (!currentUser.assignedAdminId) return true // no admin assigned yet -> allow reaching any admin
  return false
}

// @desc    Get full message history between the current user and another user
// @route   GET /api/chat/messages/:userId
// @access  Private
export const getMessages = asyncHandler(async (req, res) => {
  const otherUserId = req.params.userId

  const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } })
  if (!otherUser) {
    res.status(404)
    throw new Error('User not found.')
  }

  if (req.user.role === 'technician' && otherUser.role === 'technician') {
    res.status(403)
    throw new Error('Technicians can only chat with their assigned admin.')
  }
  if (!assertCanChat(req.user, otherUserId)) {
    res.status(403)
    throw new Error('You are not authorized to chat with this user.')
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  // Mark all messages from the other user as seen.
  await prisma.message.updateMany({
    where: { senderId: otherUserId, receiverId: req.user.id, status: { not: 'seen' } },
    data: { status: 'seen', seenAt: new Date() },
  })

  res.json({ ok: true, messages: messages.map(serializeMessage) })
})

// @desc    Send a message (REST fallback; primary path is Socket.IO)
// @route   POST /api/chat/messages/:userId
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
  const receiverId = req.params.userId
  const otherUser = await prisma.user.findUnique({ where: { id: receiverId } })
  if (!otherUser) {
    res.status(404)
    throw new Error('User not found.')
  }
  if (!assertCanChat(req.user, receiverId)) {
    res.status(403)
    throw new Error('You are not authorized to chat with this user.')
  }

  let imageUrl = ''
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'maintainiq/chat')
    imageUrl = result.secure_url
  }

  if (!req.body.text && !imageUrl) {
    res.status(400)
    throw new Error('Message must have text or an image.')
  }

  const message = await prisma.message.create({
    data: {
      senderId: req.user.id,
      receiverId,
      text: req.body.text || '',
      imageUrl,
      status: 'sent',
    },
  })

  res.status(201).json({ ok: true, message: serializeMessage(message) })
})
