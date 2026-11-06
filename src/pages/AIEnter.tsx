import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  FaBookmark,
  FaDownload,
  FaEye,
  FaFeatherAlt,
  FaImage,
  FaPaperPlane,
  FaRegImages,
  FaRedo,
  FaSpinner,
  FaTheaterMasks,
  FaTimes,
  FaUpload,
  FaUser,
} from 'react-icons/fa'
import { useAiChat } from '../hooks/useAiChat'
import RichMessage from '../components/RichMessage'
import './AIEnter.css'
import aiPoster from '../assets/generated/ai-poster.jpg'
import aiStage from '../assets/generated/ai-stage.jpg'
import aiCharacter from '../assets/generated/ai-character.jpg'

type Mode = 'chat' | 'image'

interface ImageHistoryItem {
  id?: number | string | null
  prompt: string
  imageUrl: string
  createdAt: string
}

const hotQuestions = [
  '越剧为什么被称为江南戏曲？',
  '《梁山伯与祝英台》在越剧中有什么地位？',
  '袁派、尹派、范派的唱腔有什么区别？',
  '越剧女班兴起对舞台表演有什么影响？',
]

const themeTags = ['越剧历史', '经典剧目', '名家流派', '唱腔身段', '舞台美学', '当代创新']

const readingLinks = [
  { label: '看经典剧目', to: '/repertoire' },
  { label: '看名家流派', to: '/schools' },
  { label: '看越剧长卷', to: '/scroll' },
]

const templates = [
  '越剧海报，江南水乡夜色，红色题签，电影级构图',
  '花旦角色半身像，粉色戏服，珠翠头面，宣纸质感',
  '江南戏台，月洞门布景，水袖演员登场，柔和舞台光',
  '舞台灯光场景，越剧群像谢幕，青绿山水背景',
  '戏曲服饰设计图，越剧云肩水袖，细腻刺绣纹样',
]

const styleOptions = ['越剧海报', '花旦角色', '江南戏台', '舞台灯光', '服饰设计']
const ratioOptions = ['1:1', '4:3', '3:4', '16:9']
const defaultVisionPrompt = '你是越剧文化图像识别助手。请从图片中识别人物行当、服饰头面、水袖身段、舞台布景、画面文字、可能剧目与流派线索；先说明可确认内容，再说明不确定推测，最后给出适合继续追问的问题。'
const maxUploadImageSize = 8 * 1024 * 1024
const maxVisionImageEdge = 1280
const visionImageQuality = 0.86

function readRawFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('图片读取失败'))
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败'))
    image.src = dataUrl
  })
}

async function readFileAsDataUrl(file: File) {
  const originalDataUrl = await readRawFileAsDataUrl(file)
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return originalDataUrl

  try {
    const image = await loadImageElement(originalDataUrl)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    if (!width || !height) return originalDataUrl

    const scale = Math.min(1, maxVisionImageEdge / Math.max(width, height))
    if (scale >= 1 && file.size <= 1_800_000) return originalDataUrl

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(14, Math.round(width * scale))
    canvas.height = Math.max(14, Math.round(height * scale))
    const context = canvas.getContext('2d')
    if (!context) return originalDataUrl

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL(file.type === 'image/webp' ? 'image/webp' : 'image/jpeg', visionImageQuality)
  } catch {
    return originalDataUrl
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  const data = await parseJsonResponse(res)

  if (!res.ok) {
    throw new Error(responseError(data))
  }

  return data as T
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() })
  const data = await parseJsonResponse(res)

  if (!res.ok) {
    throw new Error(responseError(data))
  }

  return data as T
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) {
    const data = await parseJsonResponse(res)
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
      throw new Error('AI 接口没有返回有效数据，请检查后端服务或代理配置')
    }
    return { error: text.trim() || 'AI 接口数据解析失败' }
  }
}

function getToken() {
  return localStorage.getItem('yueju_token') || ''
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function openAuth() {
  window.dispatchEvent(new Event('yueju-open-auth'))
}

export default function AIEnter() {
  const [mode, setMode] = useState<Mode>('chat')
  const [chatInput, setChatInput] = useState('')
  const [chatImage, setChatImage] = useState<{ dataUrl: string; name: string } | null>(null)
  const [visionPrompt, setVisionPrompt] = useState(defaultVisionPrompt)
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageStyle, setImageStyle] = useState(styleOptions[0])
  const [imageRatio, setImageRatio] = useState(ratioOptions[0])
  const [imageLoading, setImageLoading] = useState(false)
  const [lastImage, setLastImage] = useState('')
  const [brokenImageUrls, setBrokenImageUrls] = useState<Record<string, boolean>>({})
  const [deletingImageIds, setDeletingImageIds] = useState<Record<string, boolean>>({})
  const [savedQuestions, setSavedQuestions] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('yueju_saved_questions') || '[]') as string[]
    } catch {
      return []
    }
  })
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([])
  const { messages, sendChat, sendVision, loading: chatLoading } = useAiChat()
  const dialogueScrollRef = useRef<HTMLDivElement>(null)
  const chatImageInputRef = useRef<HTMLInputElement>(null)

  const safeMessages = useMemo(() => (Array.isArray(messages) ? messages : []), [messages])

  const lastQuestion = useMemo(() => [...safeMessages].reverse().find((msg) => msg.role === 'user')?.content || '', [safeMessages])

  const markImageBroken = (imageUrl: string) => {
    setBrokenImageUrls((prev) => ({ ...prev, [imageUrl]: true }))
  }

  const imageHistoryKey = (item: ImageHistoryItem) => String(item.id ?? `${item.imageUrl}-${item.createdAt}`)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelectorAll('.ai-enter-page .reveal-up').forEach((element) => {
        element.classList.add('revealed')
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [mode])

  useEffect(() => {
    const dialogueScroll = dialogueScrollRef.current
    if (!dialogueScroll) return

    dialogueScroll.scrollTo({
      top: dialogueScroll.scrollHeight,
      behavior: 'smooth',
    })
  }, [safeMessages, chatLoading])

  useEffect(() => {
    const loadImageHistory = async () => {
      if (!getToken()) {
        setImageHistory([])
        return
      }

      try {
        const data = await getJson<{ items: ImageHistoryItem[] }>('/api/ai/image/history')
        setImageHistory(data.items || [])
      } catch {
        setImageHistory([])
      }
    }

    loadImageHistory()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'yueju_token' || event.key === 'yueju_user' || event.key === null) {
        loadImageHistory()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('yueju-auth-change', loadImageHistory)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('yueju-auth-change', loadImageHistory)
    }
  }, [])

  const sendQuestion = async (question = chatInput.trim(), useSelectedImage = true) => {
    const text = question.trim()
    if (chatLoading) return
    if (useSelectedImage && chatImage) {
      if (!getToken()) {
        openAuth()
        alert('请先登录，登录后才能上传图片并进行 AI 识别。')
        return
      }
      const currentImage = chatImage
      setChatInput('')
      setChatImage(null)
      await sendVision(text || '请识别这张越剧相关图片。', currentImage.dataUrl, visionPrompt)
      return
    }
    if (!text) return
    setChatInput('')
    await sendChat(text)
  }

  const handleChatImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('请上传 JPG、PNG、WebP 等图片文件。')
      return
    }
    if (file.size > maxUploadImageSize) {
      alert('图片不能超过 8MB，请压缩后再上传。')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setChatImage({ dataUrl, name: file.name })
    } catch (err) {
      alert(err instanceof Error ? err.message : '图片读取失败，请重新上传。')
    }
  }

  const handleChatKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuestion()
    }
  }

  const saveQuestion = () => {
    if (!lastQuestion || savedQuestions.includes(lastQuestion)) return
    const next = [lastQuestion, ...savedQuestions].slice(0, 8)
    setSavedQuestions(next)
    localStorage.setItem('yueju_saved_questions', JSON.stringify(next))
  }

  const generateImage = async (prompt = imagePrompt.trim()) => {
    const text = prompt.trim()
    if (!text || imageLoading) return
    if (!getToken()) {
      openAuth()
      alert('请先登录，登录后你的 AI 生图会保存到账号中。')
      return
    }

    setImagePrompt(text)
    setImageLoading(true)
    const finalPrompt = `${text}，${imageStyle}风格，比例${imageRatio}，越剧视觉美学，宣纸肌理，精致戏曲服饰，高清`

    try {
      const data = await postJson<{ imageUrl: string; id?: number | null }>('/api/ai/image', { prompt: finalPrompt, displayPrompt: text })
      setLastImage(data.imageUrl)
      const next = [
        { id: data.id, prompt: text, imageUrl: data.imageUrl, createdAt: new Date().toLocaleString() },
        ...imageHistory,
      ].slice(0, 6)
      setImageHistory(next)
    } catch (err) {
      setLastImage('')
      alert(err instanceof Error ? err.message : '图片生成失败，请稍后重试。')
    } finally {
      setImageLoading(false)
    }
  }

  const saveImage = () => {
    if (!lastImage) return
    const existing = imageHistory.find((item) => item.imageUrl === lastImage)
    const next = [
      existing || { prompt: imagePrompt || '未命名越剧图像', imageUrl: lastImage, createdAt: new Date().toLocaleString() },
      ...imageHistory.filter((item) => item.imageUrl !== lastImage),
    ].slice(0, 6)
    setImageHistory(next)
  }

  const deleteImageHistoryItem = async (item: ImageHistoryItem) => {
    const key = imageHistoryKey(item)
    const confirmed = window.confirm('确定删除这条 AI 生图历史记录吗？')
    if (!confirmed) return

    setDeletingImageIds((prev) => ({ ...prev, [key]: true }))
    try {
      if (item.id !== undefined && item.id !== null) {
        await deleteJson(`/api/ai/image/history/${item.id}`)
      }
      setImageHistory((prev) => prev.filter((historyItem) => imageHistoryKey(historyItem) !== key))
      if (lastImage === item.imageUrl) setLastImage('')
      setBrokenImageUrls((prev) => {
        const next = { ...prev }
        delete next[item.imageUrl]
        return next
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败，请稍后重试。')
    } finally {
      setDeletingImageIds((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  return (
    <div className="ai-enter-page page-container">
      <header className="ai-hero">
        <div className="ai-hero-inner reveal-up">
          <span className="ai-eyebrow">AI入戏</span>
          <h1>{mode === 'chat' ? 'AI问戏' : 'AI造梦工坊'}</h1>
          <p>
            {mode === 'chat'
              ? '你可以向它提问越剧历史、剧目、演员、流派等问题'
              : '输入一句话，生成属于你的越剧视觉作品'}
          </p>
          <div className="ai-mode-switch" aria-label="AI入戏模块切换">
            <button className={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')}>
              <FaFeatherAlt /> AI对话页
            </button>
            <button className={mode === 'image' ? 'active' : ''} onClick={() => setMode('image')}>
              <FaRegImages /> AI生图页
            </button>
          </div>
        </div>
      </header>

      {mode === 'chat' ? (
        <main className="ai-chat-layout page-content">
          <section className="talk-room reveal-up">
            <div className="talk-room-title">
              <FaTheaterMasks />
              <div>
                <h2>雅室对谈</h2>
                <p>像请一位数字讲解官入席，慢慢问、细细听。</p>
              </div>
            </div>
            <div className="dialogue-scroll" ref={dialogueScrollRef}>
              {safeMessages.map((msg, index) => (
                <div className={`dialogue-row ${msg.role}`} key={`${msg.role}-${index}`}>
                  <div className="dialogue-avatar">{msg.role === 'assistant' ? <FaFeatherAlt /> : <FaUser />}</div>
                  <div className="dialogue-bubble">
                    {msg.image && <img src={msg.image} alt="上传识别图片" className="dialogue-image" />}
                    <RichMessage content={msg.content} />
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="dialogue-row assistant">
                  <div className="dialogue-avatar"><FaFeatherAlt /></div>
                  <div className="dialogue-bubble thinking"><FaSpinner /> 正在斟酌唱词...</div>
                </div>
              )}
            </div>
            <div className="vision-prompt-panel">
              <label htmlFor="vision-prompt"><FaEye /> 识图前置 Prompt</label>
              <textarea
                id="vision-prompt"
                value={visionPrompt}
                onChange={(event) => setVisionPrompt(event.target.value)}
                disabled={chatLoading}
              />
            </div>
            <div className="question-compose">
              <div className="chat-compose-main">
                {chatImage && (
                  <div className="chat-image-preview">
                    <img src={chatImage.dataUrl} alt="待识别图片" />
                    <span>{chatImage.name}</span>
                    <button type="button" onClick={() => setChatImage(null)} aria-label="移除图片">
                      <FaTimes />
                    </button>
                  </div>
                )}
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder={chatImage ? '例如：请识别这张图里的服饰、行当和可能剧目' : '例如：越剧袁派和尹派有什么不同？'}
                  disabled={chatLoading}
                />
              </div>
              <div className="compose-actions">
                <input
                  ref={chatImageInputRef}
                  type="file"
                  accept="image/*"
                  className="chat-image-input"
                  onChange={handleChatImageChange}
                />
                <button
                  type="button"
                  className="upload-image-btn"
                  onClick={() => chatImageInputRef.current?.click()}
                  disabled={chatLoading}
                >
                  <FaUpload /> 上传图片
                </button>
                <button onClick={() => sendQuestion()} disabled={chatLoading || (!chatInput.trim() && !chatImage)}>
                  {chatImage ? <FaEye /> : <FaPaperPlane />}
                  {chatImage ? '识别图片' : '发送'}
                </button>
              </div>
            </div>
          </section>

          <aside className="ai-side-panel reveal-up reveal-delay-1">
            <section>
              <h3>热门问题</h3>
              <div className="prompt-list">
                {hotQuestions.map((question) => (
                  <button key={question} onClick={() => sendQuestion(question, false)} disabled={chatLoading}>
                    {question}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3>常见主题</h3>
              <div className="theme-tags">
                {themeTags.map((tag) => (
                  <button key={tag} onClick={() => sendQuestion(`请介绍${tag}`, false)} disabled={chatLoading}>
                    {tag}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3>推荐阅读</h3>
              <div className="reading-list">
                {readingLinks.map((item) => (
                  <Link key={item.to} to={item.to}>{item.label}</Link>
                ))}
              </div>
            </section>
          </aside>

          <section className="ai-link-band reveal-up reveal-delay-2">
            <div>
              <h3>看相关页面</h3>
              <p>把问到的剧目、演员、流派继续展开阅读。</p>
            </div>
            <div className="link-actions">
              <Link to="/repertoire">经典剧目</Link>
              <Link to="/schools">名家流派</Link>
              <button onClick={saveQuestion} disabled={!lastQuestion}><FaBookmark /> 收藏问题</button>
              <button onClick={() => setMode('image')}><FaImage /> 跳转 AI 生图</button>
            </div>
          </section>
        </main>
      ) : (
        <main className="ai-image-layout page-content">
          <section className="dream-workshop reveal-up">
            <div className="workshop-form">
              <h2>输入生成</h2>
              <p>从一句意象开始，给它一点风格、比例和舞台气息。</p>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="例如：粉衣花旦立于江南水榭，身后是月洞门与莲池"
                disabled={imageLoading}
              />
              <div className="workshop-controls">
                <label>
                  风格选择
                  <select value={imageStyle} onChange={(e) => setImageStyle(e.target.value)}>
                    {styleOptions.map((style) => <option key={style}>{style}</option>)}
                  </select>
                </label>
                <label>
                  比例选择
                  <select value={imageRatio} onChange={(e) => setImageRatio(e.target.value)}>
                    {ratioOptions.map((ratio) => <option key={ratio}>{ratio}</option>)}
                  </select>
                </label>
              </div>
              <button className="generate-btn" onClick={() => generateImage()} disabled={imageLoading || !imagePrompt.trim()}>
                {imageLoading ? <FaSpinner /> : <FaImage />}
                {imageLoading ? '生成中...' : '立即生成'}
              </button>
            </div>

            <div className="template-area">
              <h3>模板推荐</h3>
              <div className="template-grid">
                {templates.map((template) => (
                  <button key={template} onClick={() => setImagePrompt(template)}>
                    {template}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="result-stage reveal-up reveal-delay-1">
            <div className="result-image">
              {imageLoading ? (
                <div className="result-placeholder"><FaSpinner /> 正在铺纸设色...</div>
              ) : lastImage && brokenImageUrls[lastImage] ? (
                <div className="result-placeholder image-expired-placeholder">
                  <FaRegImages /> 这张历史图片地址已过期，请重新生成后收藏。
                </div>
              ) : lastImage ? (
                <img src={lastImage} alt="AI生成越剧视觉作品" onError={() => markImageBroken(lastImage)} />
              ) : (
                <div className="sample-triptych">
                  <img src={aiPoster} alt="越剧海报示例" />
                  <img src={aiCharacter} alt="花旦角色示例" />
                  <img src={aiStage} alt="江南戏台示例" />
                </div>
              )}
            </div>
            <div className="result-actions">
              {lastImage && (
                <a href={lastImage} target="_blank" rel="noopener noreferrer" download>
                  <FaDownload /> 下载
                </a>
              )}
              <button onClick={saveImage} disabled={!lastImage}><FaBookmark /> 收藏</button>
              <button onClick={() => generateImage()} disabled={imageLoading || !imagePrompt.trim()}><FaRedo /> 再次生成</button>
            </div>
          </section>

          <section className="image-history reveal-up reveal-delay-2">
            <h3>历史记录</h3>
            {imageHistory.length === 0 ? (
              <p className="history-empty">生成后的作品会留在这里，方便回看。</p>
            ) : (
              <div className="history-scroll">
                <div className="history-grid">
                  {imageHistory.map((item) => {
                    const key = imageHistoryKey(item)
                    const deleting = Boolean(deletingImageIds[key])
                    return (
                      <article className="history-card" key={key}>
                        <button className="history-preview-btn" type="button" onClick={() => setLastImage(item.imageUrl)}>
                          {brokenImageUrls[item.imageUrl] ? (
                            <div className="history-image-fallback">
                              <FaRegImages />
                              <small>图片地址已过期</small>
                            </div>
                          ) : (
                            <img src={item.imageUrl} alt={item.prompt} onError={() => markImageBroken(item.imageUrl)} />
                          )}
                          <span>{item.prompt}</span>
                        </button>
                        <button
                          className="history-delete-btn"
                          type="button"
                          onClick={() => deleteImageHistoryItem(item)}
                          disabled={deleting}
                          aria-label={`删除${item.prompt}`}
                          title="删除记录"
                        >
                          {deleting ? <FaSpinner /> : <FaTimes />}
                        </button>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  )
}
