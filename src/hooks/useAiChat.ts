import { useCallback, useEffect, useState } from 'react'

type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  role: MessageRole
  content: string
  image?: string
}

interface ImageHistoryItem {
  prompt: string
  imageUrl: string
  createdAt: string
}

interface AiChatStore {
  messages: ChatMessage[]
  imageResults: ChatMessage[]
  chatLoading: boolean
  imageLoading: boolean
}

type StateUpdater<T> = T | ((prev: T) => T)

const initialChatMessage: ChatMessage = {
  role: 'assistant',
  content: '你好！我是越韵清音 AI 助手，你可以问我任何关于越剧的问题。',
}

const initialImageMessage: ChatMessage = {
  role: 'assistant',
  content: '你好！输入描述，我可以为你生成越剧相关的图片。',
}

let aiChatStore: AiChatStore = {
  messages: [initialChatMessage],
  imageResults: [initialImageMessage],
  chatLoading: false,
  imageLoading: false,
}

const aiChatListeners = new Set<(state: AiChatStore) => void>()

function emitAiChatStore() {
  aiChatListeners.forEach((listener) => listener(aiChatStore))
}

function setAiChatStore(updater: StateUpdater<AiChatStore>) {
  aiChatStore = typeof updater === 'function'
    ? (updater as (prev: AiChatStore) => AiChatStore)(aiChatStore)
    : updater
  emitAiChatStore()
}

function setSharedMessages(updater: StateUpdater<ChatMessage[]>) {
  setAiChatStore((prev) => ({
    ...prev,
    messages: typeof updater === 'function'
      ? (updater as (prev: ChatMessage[]) => ChatMessage[])(prev.messages)
      : updater,
  }))
}

function setSharedImageResults(updater: StateUpdater<ChatMessage[]>) {
  setAiChatStore((prev) => ({
    ...prev,
    imageResults: typeof updater === 'function'
      ? (updater as (prev: ChatMessage[]) => ChatMessage[])(prev.imageResults)
      : updater,
  }))
}

function setSharedChatLoading(value: boolean) {
  setAiChatStore((prev) => ({ ...prev, chatLoading: value }))
}

function setSharedImageLoading(value: boolean) {
  setAiChatStore((prev) => ({ ...prev, imageLoading: value }))
}

function getToken() {
  return localStorage.getItem('yueju_token') || ''
}

function openAuth() {
  window.dispatchEvent(new Event('yueju-open-auth'))
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() })
  const data = await parseJsonResponse(res)
  if (!res.ok) throw new Error(responseError(data))
  return data as T
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  const data = await parseJsonResponse(res)
  if (!res.ok) throw new Error(responseError(data))
  return data as T
}

async function postTextStream(
  url: string,
  body: unknown,
  onText: (text: string) => void,
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await parseJsonResponse(res).catch(() => ({}))
    throw new Error(responseError(data))
  }

  if (!res.body) {
    const text = await res.text()
    if (text) onText(text)
    return text
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    if (chunk) {
      fullText += chunk
      onText(fullText)
    }
  }

  const tail = decoder.decode()
  if (tail) {
    fullText += tail
    onText(fullText)
  }

  return fullText
}

async function deleteJson(url: string) {
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) {
    const data = await parseJsonResponse(res).catch(() => ({}))
    throw new Error(responseError(data))
  }
}

function responseError(data: Record<string, unknown>) {
  return typeof data.error === 'string' ? data.error : '请求失败，请稍后重试'
}
async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text) return {}

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error('AI 接口没有返回有效数据，请检查 API 代理或后端服务')
    }
    return { error: text.trim() || 'AI 接口数据解析失败' }
  }
}

function normalizeMessages(items: ChatMessage[]) {
  const validItems = items.filter((msg) => (
    msg
    && (msg.role === 'user' || msg.role === 'assistant')
    && typeof msg.content === 'string'
  ))
  return validItems.length > 0 ? validItems : [initialChatMessage]
}

function replaceLastAssistant(content: string) {
  setSharedMessages((prev) => {
    const next = [...prev]
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i].role === 'assistant') {
        next[i] = { ...next[i], content }
        return next
      }
    }
    return [...next, { role: 'assistant', content }]
  })
}

export function useAiChat() {
  const [store, setStore] = useState(aiChatStore)

  useEffect(() => {
    aiChatListeners.add(setStore)
    setStore(aiChatStore)
    return () => {
      aiChatListeners.delete(setStore)
    }
  }, [])

  const loadChatHistory = useCallback(async () => {
    if (!getToken()) {
      setSharedMessages([initialChatMessage])
      return
    }

    try {
      const data = await getJson<{ items: ChatMessage[] }>('/api/ai/chat/history')
      setSharedMessages(normalizeMessages(data.items || []))
    } catch {
      setSharedMessages([initialChatMessage])
    }
  }, [])

  const loadImageHistory = useCallback(async () => {
    if (!getToken()) {
      setSharedImageResults([initialImageMessage])
      return
    }

    try {
      const data = await getJson<{ items: ImageHistoryItem[] }>('/api/ai/image/history')
      const historyMessages = [...(data.items || [])].reverse().flatMap((item) => [
        { role: 'user' as const, content: item.prompt },
        { role: 'assistant' as const, content: '图片已生成：', image: item.imageUrl },
      ])
      setSharedImageResults(historyMessages.length > 0 ? historyMessages : [initialImageMessage])
    } catch {
      setSharedImageResults([initialImageMessage])
    }
  }, [])

  useEffect(() => {
    loadChatHistory()
    loadImageHistory()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'yueju_token' || event.key === 'yueju_user' || event.key === null) {
        loadChatHistory()
        loadImageHistory()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('yueju-auth-change', loadChatHistory)
    window.addEventListener('yueju-auth-change', loadImageHistory)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('yueju-auth-change', loadChatHistory)
      window.removeEventListener('yueju-auth-change', loadImageHistory)
    }
  }, [loadChatHistory, loadImageHistory])

  const sendChat = useCallback(async (text: string) => {
    if (!getToken()) {
      openAuth()
      setSharedMessages((prev) => [...prev, { role: 'assistant', content: '请先登录，登录后你的 AI 对话会保存到账号中。' }])
      return
    }

    const userMsg: ChatMessage = { role: 'user', content: text }
    setSharedMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }])
    setSharedChatLoading(true)

    let streamedText = ''

    try {
      streamedText = await postTextStream('/api/ai/chat/stream', { message: text }, (partial) => {
        streamedText = partial
        replaceLastAssistant(partial || '正在生成回复...')
      })

      if (!streamedText.trim()) {
        const data = await postJson<{ reply: string }>('/api/ai/chat', { message: text })
        replaceLastAssistant(data.reply || '暂未收到 AI 回复，请稍后重试。')
      }
    } catch (err) {
      if (streamedText.trim()) {
        replaceLastAssistant(`${streamedText.trim()}\n\n（流式连接中断，已停止继续生成。）`)
      } else {
        try {
          const data = await postJson<{ reply: string }>('/api/ai/chat', { message: text })
          replaceLastAssistant(data.reply || '暂未收到 AI 回复，请稍后重试。')
        } catch (fallbackErr) {
          const message = fallbackErr instanceof Error
            ? fallbackErr.message
            : err instanceof Error
              ? err.message
              : '网络错误，请稍后重试。'
          replaceLastAssistant(message)
        }
      }
    } finally {
      setSharedChatLoading(false)
    }
  }, [])

  const sendVision = useCallback(async (text: string, imageDataUrl: string, prompt: string) => {
    if (!getToken()) {
      openAuth()
      setSharedMessages((prev) => [...prev, { role: 'assistant', content: '请先登录，登录后才能上传图片并进行 AI 识别。' }])
      return
    }

    const content = text.trim() || '请识别这张越剧相关图片。'
    const userMsg: ChatMessage = { role: 'user', content, image: imageDataUrl }
    setSharedMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }])
    setSharedChatLoading(true)

    try {
      const data = await postJson<{ reply: string }>('/api/ai/chat/vision', {
        message: content,
        imageDataUrl,
        prompt,
      })
      setSharedMessages((prev) => {
        const next = [...prev]
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].role === 'assistant') {
            next[i] = { ...next[i], content: data.reply || '图片识别完成，但暂未生成文字说明。' }
            return next
          }
        }
        return [...next, { role: 'assistant', content: data.reply || '图片识别完成。' }]
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '图片识别失败，请稍后重试。'
      setSharedMessages((prev) => [
        ...prev.filter((item, index) => !(index === prev.length - 1 && item.role === 'assistant' && !item.content)),
        { role: 'assistant', content: message },
      ])
    } finally {
      setSharedChatLoading(false)
    }
  }, [])

  const sendImage = useCallback(async (text: string) => {
    if (!getToken()) {
      openAuth()
      setSharedImageResults((prev) => [...prev, { role: 'assistant', content: '请先登录，登录后你的 AI 生图会保存到账号中。' }])
      return
    }

    const userMsg: ChatMessage = { role: 'user', content: text }
    setSharedImageResults((prev) => [...prev, userMsg])
    setSharedImageLoading(true)

    try {
      const data = await postJson<{ imageUrl: string }>('/api/ai/image', { prompt: text, displayPrompt: text })
      setSharedImageResults((prev) => [
        ...prev,
        { role: 'assistant', content: '图片已生成：', image: data.imageUrl },
      ])
    } catch (err) {
      setSharedImageResults((prev) => [
        ...prev,
        { role: 'assistant', content: err instanceof Error ? err.message : '网络错误，请稍后重试。' },
      ])
    } finally {
      setSharedImageLoading(false)
    }
  }, [])

  const clearChat = useCallback(async () => {
    if (getToken()) {
      await deleteJson('/api/ai/chat/history').catch(() => undefined)
    }
    setSharedMessages([initialChatMessage])
  }, [])

  const clearImageResults = useCallback(async () => {
    if (getToken()) {
      await deleteJson('/api/ai/image/history').catch(() => undefined)
    }
    setSharedImageResults([initialImageMessage])
  }, [])

  return {
    messages: store.messages,
    imageResults: store.imageResults,
    loading: store.chatLoading,
    chatLoading: store.chatLoading,
    imageLoading: store.imageLoading,
    setMessages: setSharedMessages,
    setImageResults: setSharedImageResults,
    sendChat,
    sendVision,
    sendImage,
    clearChat,
    clearImageResults,
  }
}
