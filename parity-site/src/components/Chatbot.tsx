'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Bot, User } from 'lucide-react'
import Fuse from 'fuse.js'
import { knowledgeBase } from '@/lib/assistant-kb'

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'init', 
      role: 'assistant', 
      content: "I can explain how Parity's matching engine works, what an exception means, and why a record landed where it did — ask me anything about the run." 
    }
  ])
  
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const fuse = new Fuse(knowledgeBase, {
    keys: ['question'],
    threshold: 0.4
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    // Process Retrieval
    setTimeout(() => {
      const results = fuse.search(userMsg.content)
      let reply = "I'm not sure about that. I am scoped to explaining Parity's reconciliation domain, the matching passes, and the exception queue."
      
      if (results.length > 0) {
        const bestMatch = results[0].item.answer
        reply = typeof bestMatch === 'function' ? bestMatch() : bestMatch
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply
      }])
    }, 400)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40 ${isOpen ? 'hidden' : ''}`}
        style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
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
            <div className="h-16 flex items-center justify-between px-4 shrink-0"
              style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-medium" style={{ color: 'var(--text-primary)' }}>Parity Assistant</h3>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>Knowledge Base Mode</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={msg.role === 'user'
                      ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                      : { backgroundColor: 'var(--bg-base)', color: 'var(--accent-primary)', border: '1px solid var(--border-accent)' }
                    }>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="p-3 text-sm leading-relaxed rounded-xl"
                    style={msg.role === 'user'
                      ? { backgroundColor: 'var(--accent-primary)', color: '#fff' }
                      : { backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                    }>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
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
                  disabled={!input.trim()}
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
