'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Bot, User } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const ACCENT = '#5A3A22'  // WCAG AA 4.5:1 on white background

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: "I can explain how Parity's matching engine works, what an exception means, and why a record landed where it did — ask me anything about the run.",
    },
  ])

  const endRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  // Escape closes the dialog
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
    // Simple focus trap — Tab from last element wraps to first
    if (e.key === 'Tab' && panelRef.current) {
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Focus the close button on open
      setTimeout(() => firstFocusableRef.current?.focus(), 0)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Cancel any in-flight chat request when the panel closes or unmounts
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('API error')
      }

      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
        },
      ])
    } catch (error: any) {
      if (error?.name === 'AbortError') return
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm having trouble connecting to the AI backend right now. Ensure you have a GEMINI_API_KEY in your .env file.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open Parity Assistant"
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40 ${isOpen ? 'hidden' : ''}`}
        style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="chatbot-title"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] shadow-2xl z-50 flex flex-col rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Header */}
            <div
              className="h-16 flex items-center justify-between px-4 shrink-0"
              style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="chatbot-title" className="font-display font-medium" style={{ color: 'var(--text-primary)' }}>
                    Parity Assistant
                  </h3>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                    AI Mode
                  </p>
                </div>
              </div>
              <button
                ref={firstFocusableRef}
                onClick={() => setIsOpen(false)}
                aria-label="Close Parity Assistant"
                className="transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                  }`}
                >
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={
                      msg.role === 'user'
                        ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                        : {
                            backgroundColor: 'var(--bg-base)',
                            color: 'var(--accent-primary)',
                            border: '1px solid var(--border-accent)',
                          }
                    }
                  >
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div
                    className="p-3 text-sm leading-relaxed rounded-xl"
                    style={
                      msg.role === 'user'
                        // WCAG AA: dark-brown text on accent-primary copper background
                        // — passes ~4.7:1. White-on-copper was 3.5:1 (failed).
                        ? { backgroundColor: 'var(--accent-primary)', color: '#1a1a1a' }
                        : {
                            backgroundColor: 'var(--bg-base)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-4"
              style={{ backgroundColor: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}
            >
              <div className="relative">
                <label htmlFor="chatbot-input" className="sr-only">
                  Message
                </label>
                <input
                  id="chatbot-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about the matching engine..."
                  className="w-full text-sm px-4 py-3 pr-12 rounded-lg focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 disabled:opacity-50 transition-colors"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
