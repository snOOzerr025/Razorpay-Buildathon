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
        className={`fixed bottom-6 right-6 w-14 h-14 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40 ${isOpen ? 'hidden' : ''}`}
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
            className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-[#0a0a0a] border border-white/10 shadow-2xl z-50 flex flex-col rounded-sm overflow-hidden text-white"
          >
            {/* Header */}
            <div className="h-16 bg-[#050505] border-b border-white/10 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-[#00E5FF]/20 text-[#00E5FF] p-1.5 rounded-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-white">Parity Assistant</h3>
                  <p className="text-[10px] uppercase tracking-wider text-[#00E5FF]">Knowledge Base Mode</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-black text-[#00E5FF] border border-[#00E5FF]/30'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-white text-black rounded-l-xl rounded-br-xl' : 'bg-black border border-white/10 text-gray-300 rounded-r-xl rounded-bl-xl'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-[#050505] border-t border-white/10">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about the matching engine..."
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-4 py-3 pr-12 rounded-sm focus:outline-none focus:border-[#00E5FF] transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-[#00E5FF] disabled:opacity-50 transition-colors"
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
