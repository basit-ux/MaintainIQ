import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getSocket, disconnectSocket } from '../lib/socket'
import { getContacts as fetchContacts } from '../lib/chat'
import { normalizeMessage } from '../lib/normalize'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [contacts, setContacts] = useState([])
  const [onlineIds, setOnlineIds] = useState(new Set())
  const [typingFrom, setTypingFrom] = useState(new Set())
  const listenersBound = useRef(false)

  const refreshContacts = useCallback(async () => {
    if (!isAuthenticated) return
    const data = await fetchContacts()
    setContacts(data)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket()
      setContacts([])
      return
    }

    refreshContacts()
    const socket = getSocket()
    if (!socket || listenersBound.current) return
    listenersBound.current = true

    socket.on('connect', () => {
      socket.emit('presence:list', null, (ids) => setOnlineIds(new Set(ids || [])))
    })

    socket.on('presence:update', ({ userId, isOnline }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev)
        if (isOnline) next.add(userId)
        else next.delete(userId)
        return next
      })
    })

    socket.on('message:receive', () => {
      refreshContacts()
    })

    socket.on('message:sent-ack', () => {
      refreshContacts()
    })

    socket.on('typing:start', ({ senderId }) => {
      setTypingFrom((prev) => new Set(prev).add(senderId))
    })
    socket.on('typing:stop', ({ senderId }) => {
      setTypingFrom((prev) => {
        const next = new Set(prev)
        next.delete(senderId)
        return next
      })
    })

    return () => {
      socket.off('connect')
      socket.off('presence:update')
      socket.off('message:receive')
      socket.off('message:sent-ack')
      socket.off('typing:start')
      socket.off('typing:stop')
      listenersBound.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

  return (
    <ChatContext.Provider value={{ contacts, onlineIds, typingFrom, refreshContacts, totalUnread }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

export function useChatUnread() {
  const ctx = useContext(ChatContext)
  return ctx ? ctx.totalUnread : 0
}
