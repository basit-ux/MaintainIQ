// REST calls for chat (contacts list, message history). Real-time send/
// receive/typing/seen happen over Socket.IO — see socket.js and ChatContext.
import { apiRequest } from './api'
import { normalizeUser, normalizeMessage } from './normalize'

export async function getContacts() {
  const result = await apiRequest('/chat/contacts')
  if (!result.ok) return []
  return (result.contacts || []).map((c) => ({ ...normalizeUser(c), unreadCount: c.unreadCount || 0, lastMessage: c.lastMessage || null }))
}

export async function getMessages(otherUserId) {
  const result = await apiRequest(`/chat/messages/${otherUserId}`)
  if (!result.ok) return []
  return (result.messages || []).map(normalizeMessage)
}
