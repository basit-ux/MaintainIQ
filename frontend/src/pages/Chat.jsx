import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Circle, Check, CheckCheck, MessageCircle, ImagePlus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { getSocket } from '../lib/socket'
import { getMessages } from '../lib/chat'
import { apiRequest, buildFormData } from '../lib/api'
import { normalizeMessage } from '../lib/normalize'
import { formatDateTime } from '../lib/helpers'

function StatusTick({ status }) {
  if (status === 'seen') return <CheckCheck size={13} className="text-amber" />
  if (status === 'delivered') return <CheckCheck size={13} className="text-steel-400" />
  return <Check size={13} className="text-steel-400" />
}

export default function Chat() {
  const { user } = useAuth()
  const { contacts, onlineIds, typingFrom, refreshContacts } = useChat()
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const bottomRef = useRef(null)
  const typingTimeout = useRef(null)
  const fileInputRef = useRef(null)

  const active = contacts.find((c) => c.id === activeId) || null

  const loadMessages = useCallback(async (userId) => {
    const data = await getMessages(userId)
    setMessages(data)
  }, [])

  useEffect(() => {
    if (!activeId) return
    loadMessages(activeId)
    const socket = getSocket()
    socket?.emit('message:seen', { otherUserId: activeId })
  }, [activeId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    function onReceive(msg) {
      const m = normalizeMessage(msg)
      if (m.sender === activeId || m.receiver === activeId) {
        setMessages((prev) => [...prev, m])
        if (m.sender === activeId) socket.emit('message:seen', { otherUserId: activeId })
      }
    }
    function onSentAck(msg) {
      const m = normalizeMessage(msg)
      if (m.receiver === activeId) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      }
    }
    function onSeenAck({ by }) {
      if (by === activeId) {
        setMessages((prev) => prev.map((m) => (m.receiver === activeId ? m : { ...m, status: 'seen' })))
      }
    }

    socket.on('message:receive', onReceive)
    socket.on('message:sent-ack', onSentAck)
    socket.on('message:seen-ack', onSeenAck)
    return () => {
      socket.off('message:receive', onReceive)
      socket.off('message:sent-ack', onSentAck)
      socket.off('message:seen-ack', onSeenAck)
    }
  }, [activeId])

  function handleTyping(value) {
    setText(value)
    const socket = getSocket()
    if (!socket || !activeId) return
    socket.emit('typing:start', { receiverId: activeId })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { receiverId: activeId })
    }, 1200)
  }

  function handlePickImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() && !imageFile) return
    if (!activeId) return

    if (imageFile) {
      // Uploaded via REST (multipart) so we can reuse Cloudinary middleware;
      // the resulting message is then broadcast to the contacts list.
      const fd = buildFormData({ text: text.trim() }, 'image', imageFile)
      const result = await apiRequest(`/chat/messages/${activeId}`, { method: 'POST', body: fd, isForm: true })
      if (result.ok) {
        setMessages((prev) => [...prev, normalizeMessage(result.message)])
      }
      setText('')
      clearImage()
      refreshContacts()
      return
    }

    const socket = getSocket()
    const payload = { receiverId: activeId, text: text.trim(), imageUrl: '' }
    socket?.emit('message:send', payload, (res) => {
      if (res?.ok) {
        refreshContacts()
      }
    })
    setText('')
  }

  const isTyping = activeId && typingFrom.has(activeId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <p className="text-xs font-mono uppercase tracking-widest text-amber mb-1.5">Team Chat</p>
      <h1 className="font-display text-2xl font-semibold text-steel-50 mb-6">Messages</h1>

      <div className="bg-steel-800 border border-steel-500 rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] h-[70vh] min-h-[420px]">
        {/* Sidebar */}
        <div className={`border-steel-500 md:border-r overflow-y-auto ${activeId ? 'hidden md:block' : 'block'}`}>
          {contacts.length === 0 ? (
            <div className="p-5 text-sm text-steel-300 text-center">
              {user.role === 'admin' ? 'No technicians yet.' : 'No admin contact available.'}
            </div>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-steel-500/60 hover:bg-steel-700/50 transition-colors ${
                  activeId === c.id ? 'bg-steel-700/70' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-steel-600 flex items-center justify-center text-steel-100 text-sm font-semibold">
                    {c.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <Circle
                    size={9}
                    className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-steel-800 ${
                      onlineIds.has(c.id) ? 'text-ok fill-ok' : 'text-steel-500 fill-steel-500'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-steel-50 truncate">{c.name}</p>
                    {c.lastMessage && (
                      <span className="text-[10px] text-steel-400 font-mono shrink-0">
                        {new Date(c.lastMessage.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-steel-300 truncate">
                    {c.lastMessage ? (c.lastMessage.text || (c.lastMessage.imageUrl ? 'Photo' : '')) : c.role}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber text-steel-950 text-[10px] font-mono font-semibold">
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Conversation */}
        <div className={`flex flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-steel-300 text-sm gap-2">
              <MessageCircle size={28} className="text-steel-500" />
              Select a conversation to start chatting.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-steel-500">
                <button onClick={() => setActiveId(null)} className="md:hidden text-steel-300 text-sm">←</button>
                <div className="w-8 h-8 rounded-full bg-steel-600 flex items-center justify-center text-steel-100 text-xs font-semibold">
                  {active.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-steel-50">{active.name}</p>
                  <p className="text-[11px] text-steel-400">
                    {isTyping ? <span className="text-amber">typing…</span> : onlineIds.has(active.id) ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.sender === user.id
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        mine ? 'bg-amber/15 border border-amber/30 text-steel-50' : 'bg-steel-700 border border-steel-500 text-steel-100'
                      }`}>
                        {m.imageUrl && (
                          <img src={m.imageUrl} alt="attachment" className="rounded-md mb-1.5 max-h-52 object-cover" />
                        )}
                        {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        <div className={`flex items-center gap-1 mt-1 text-[10px] ${mine ? 'text-amber/70 justify-end' : 'text-steel-400'}`}>
                          <span className="font-mono">{formatDateTime(m.createdAt)}</span>
                          {mine && <StatusTick status={m.status} />}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {imagePreview && (
                <div className="px-4 pt-2 flex items-center gap-2">
                  <div className="relative">
                    <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded-md border border-steel-500" />
                    <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 bg-steel-900 border border-steel-500 rounded-full p-0.5">
                      <X size={12} className="text-steel-200" />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-steel-500">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-md border border-steel-500 text-steel-300 hover:border-amber hover:text-amber transition-colors shrink-0"
                >
                  <ImagePlus size={16} />
                </button>
                <input
                  value={text}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-md bg-amber text-steel-950 hover:bg-amber-light transition-colors shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
