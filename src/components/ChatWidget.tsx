import { useRef, useEffect, type KeyboardEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FaTimes,
  FaPaperPlane,
  FaRobot,
  FaPaintBrush,
  FaSpinner,
  FaUser,
  FaTheaterMasks,
  FaExternalLinkAlt,
  FaTrash,
} from 'react-icons/fa'
import { useState } from 'react'
import { useAiChat } from '../hooks/useAiChat'
import RichMessage from './RichMessage'
import './ChatWidget.css'

const HIDDEN_PATHS = ['/ai', '/profile']

export default function ChatWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'chat' | 'image'>('chat')
  const [chatInput, setChatInput] = useState('')
  const [imageInput, setImageInput] = useState('')
  const { messages, imageResults, chatLoading, imageLoading, sendChat, sendImage, clearChat, clearImageResults } = useAiChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentMessages = mode === 'chat' ? messages : imageResults
  const currentLoading = mode === 'chat' ? chatLoading : imageLoading
  const currentInput = mode === 'chat' ? chatInput : imageInput

  const shouldHide = HIDDEN_PATHS.some((path) => location.pathname.startsWith(path))

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages, currentLoading])

  if (shouldHide) return null

  const handleSend = () => {
    const text = currentInput.trim()
    if (!text || currentLoading) return
    if (mode === 'chat') {
      setChatInput('')
      sendChat(text)
    } else {
      setImageInput('')
      sendImage(text)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    if (mode === 'chat') clearChat()
    else clearImageResults()
  }

  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-tabs">
              <button className={`chat-tab ${mode === 'chat' ? 'active' : ''}`} onClick={() => setMode('chat')}>
                <FaRobot /> AI 问答
              </button>
              <button className={`chat-tab ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>
                <FaPaintBrush /> AI 生图
              </button>
            </div>
            <div className="chat-header-actions">
              <button className="chat-clear" onClick={handleClear} title="清空对话" aria-label="清空">
                <FaTrash />
              </button>
              <button className="chat-close" onClick={() => setOpen(false)} aria-label="关闭">
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {currentMessages.map((msg, i) => (
              <div className={`chat-msg ${msg.role}`} key={i}>
                <div className="msg-avatar">
                  {msg.role === 'assistant' ? <FaRobot /> : <FaUser />}
                </div>
                <div className="msg-bubble">
                  <RichMessage content={msg.content} />
                  {msg.image && (
                    <a href={msg.image} target="_blank" rel="noopener noreferrer">
                      <img src={msg.image} alt="AI 生成图片" className="msg-image" />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {currentLoading && (
              <div className="chat-msg assistant">
                <div className="msg-avatar"><FaRobot /></div>
                <div className="msg-bubble loading-bubble">
                  <FaSpinner className="spinner" />
                  <span>{mode === 'chat' ? '思考中...' : '生成中...'}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder={mode === 'chat' ? '输入你的问题...' : '描述你想生成的图片...'}
              value={currentInput}
              onChange={(e) => {
                if (mode === 'chat') setChatInput(e.target.value)
                else setImageInput(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              disabled={currentLoading}
            />
            <button className="chat-send" onClick={handleSend} disabled={currentLoading || !currentInput.trim()} aria-label="发送">
              <FaPaperPlane />
            </button>
          </div>

          <div className="chat-footer-bar">
            <button
              className="chat-goto-ai"
              onClick={() => { setOpen(false); navigate('/ai') }}
            >
              <FaExternalLinkAlt /> 前往 AI 入戏体验完整功能
            </button>
          </div>
        </div>
      )}

      <button className={`chat-fab ${open ? 'hide' : ''}`} onClick={() => setOpen(true)} aria-label="打开 AI 助手">
        <FaTheaterMasks />
      </button>
    </>
  )
}
