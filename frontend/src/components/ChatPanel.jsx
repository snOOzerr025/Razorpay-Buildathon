import React, { useState, useRef, useEffect } from 'react'
import { AI_KNOWLEDGE_BASE } from '../data/mockData'

function renderMarkdownText(text) {
  // Simple clean markdown parser for bullets, bold, and backticks
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    let formatted = line
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Code ticks
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="mono-inline">$1</code>')
    // Headings
    if (line.startsWith('### ')) {
      return <h4 key={idx} className="chat-heading" dangerouslySetInnerHTML={{ __html: formatted.replace('### ', '') }} />
    }
    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return (
        <li key={idx} className="chat-bullet" dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-*]\s+/, '') }} />
      )
    }
    // Numbered list
    if (/^\d+\.\s+/.test(line.trim())) {
      return (
        <li key={idx} className="chat-numbered" dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s+/, '') }} />
      )
    }
    if (!line.trim()) {
      return <div key={idx} className="chat-spacer" />
    }
    return <p key={idx} className="chat-para" dangerouslySetInnerHTML={{ __html: formatted }} />
  })
}

export function ChatPanel({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your **Parity AI Assistant**. I can explain how the 5 deterministic passes work, inspect SOX auditability rules, walk through MDR/GST fee mathematics, or guide you through exception resolutions. Ask me anything or select a prompt below!",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const quickPrompts = [
    'How do the 5 passes work?',
    'How is MDR + GST calculated?',
    'Explain HOOTL vs HOTL vs HITL',
    'What is a Compensating Entry?',
    'Why use bounded subset-sum in Pass 4?',
  ]

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  const findKnowledgeBaseReply = (query) => {
    const qLower = query.toLowerCase()
    for (const item of AI_KNOWLEDGE_BASE) {
      if (item.keywords.some(k => qLower.includes(k))) {
        return item.reply
      }
    }
    return `### Parity Reconciliation Engine

Parity is an autonomous three-way financial reconciliation controller:
- **Deterministic Core**: Executes 5 sequential passes (Exact, Tolerance, Refund, Split Roll-up, AI Exceptions).
- **Zero LLM Arithmetic**: All money math strictly in Python Decimal half-up rounding.
- **Risk-Tiered**: HOOTL (auto-posts), HOTL (monitored), and HITL (explicit human sign-off required).
- **SOX Auditability**: Append-only audit log with SHA-256 deduplication and compensating entries.`
  }

  const sendMessage = async (textToSend) => {
    const query = textToSend || input
    if (!query.trim() || loading) return

    const userMessage = { role: 'user', content: query.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      // Try hitting the live FastAPI chat route
      const res = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        return
      }
    } catch {
      // Offline fallback: Use rich financial controller knowledge base
    }

    // Knowledge base response
    setTimeout(() => {
      const kbAnswer = findKnowledgeBaseReply(query)
      setMessages(prev => [...prev, { role: 'assistant', content: kbAnswer }])
      setLoading(false)
    }, 400)
  }

  if (!isOpen) return null

  return (
    <div className="chat-panel-container animate-slide-up" role="dialog" aria-modal="true" aria-label="Parity Assistant">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title-row">
          <span className="chat-badge-icon">⚡</span>
          <div>
            <h3 className="chat-header-title">Parity Assistant</h3>
            <span className="chat-header-sub">Financial Intelligence &amp; SOX Forensics</span>
          </div>
        </div>
        <div className="chat-header-controls">
          <button
            className="chat-btn-clear"
            onClick={() => setMessages([{ role: 'assistant', content: 'Chat history cleared. How can I assist you with reconciliation today?' }])}
            title="Clear Chat History"
          >
            Clear
          </button>
          <button className="chat-btn-close" onClick={onClose} aria-label="Close Assistant">
            ✕
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="chat-quick-prompts-bar">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            className="chat-prompt-pill"
            onClick={() => sendMessage(p)}
            disabled={loading}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-area">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-message-row message-${m.role}`}>
            {m.role === 'assistant' && (
              <div className="chat-avatar-assistant">⚡</div>
            )}
            <div className={`chat-bubble bubble-${m.role}`}>
              {m.role === 'assistant' ? renderMarkdownText(m.content) : m.content}
            </div>
            {m.role === 'user' && (
              <div className="chat-avatar-user">👤</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-message-row message-assistant">
            <div className="chat-avatar-assistant">⚡</div>
            <div className="chat-bubble bubble-assistant typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-text-input"
          placeholder="Ask about 5 passes, fees, exceptions, or governance…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          Send ↑
        </button>
      </div>
    </div>
  )
}
