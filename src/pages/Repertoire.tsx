import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  FaPlayCircle,
  FaMusic,
  FaHeart,
  FaRegHeart,
  FaStar,
  FaRegStar,
  FaCommentDots,
  FaCheckCircle,
  FaGlobeAsia,
  FaHeadphones,
  FaLock,
  FaShareAlt,
  FaPaperPlane,
  FaExpand,
  FaFilm,
  FaRobot,
  FaTags,
  FaClosedCaptioning,
  FaChartLine,
  FaMicrophoneAlt,
  FaUpload,
  FaVolumeUp,
} from 'react-icons/fa'
import './PageCommon.css'
import { recordHistory } from '../hooks/useHistory'
import img1 from '../assets/generated/liangzhu-stage.jpg'
import img2 from '../assets/generated/hongloumeng-stage.jpg'
import img3 from '../assets/generated/xixiangji-archive.jpg'
import img4 from '../assets/generated/xianglinsao-stage.jpg'
import img5 from '../assets/generated/biyuzan-water-town.jpg'
import img6 from '../assets/generated/zhuiyu-night-theater.jpg'
import repertoireHeaderBg from '../assets/img/微信图片_20260423200929_36_793.png'

interface Play {
  id: number
  title: string
  category: string
  desc: string
  imageKey: string
  likeCount: number
  collectionCount: number
}

interface PlayComment {
  id: number
  content: string
  nickname: string
  createdAt: string
}

interface PlayInteraction {
  liked: boolean
  collected: boolean
  likeCount: number
  collectionCount: number
  shareCount: number
  comments: PlayComment[]
}

type MediaType = 'video' | 'audio'

interface MediaMoment {
  time: string
  title: string
  text: string
}

interface MediaCaption {
  start: string
  end: string
  text: string
}

interface MediaAnalysis {
  summary: string
  background?: string
  actors?: string
  school?: string
  technique?: string
  plot?: string
  emotion?: string
  vocal: string
  scene: string
  narrator: string
  narratorVoiceUrl?: string
  keywords: string[]
  captions?: MediaCaption[]
  moments: MediaMoment[]
  plotNodes?: PlotNode[]
  emotionCurve: number[]
  audioFeatures?: AudioFeatures
  askPrompts: string[]
}

interface PlotNode {
  time: number
  end?: number
  timeLabel: string
  title: string
  plot: string
  curve: string
  emotion?: number | null
  energy?: number | null
  rhythm?: number | null
  pitchHz?: number | null
  tempoBpm?: number | null
}

interface AudioFeaturePoint {
  time: number
  end?: number
  timeLabel: string
  pitchHz?: number | null
  pitchNorm?: number
  tempoBpm?: number | null
  rhythm?: number
  energy?: number
  emotion?: number
}

interface AudioFeatures {
  durationSeconds?: number
  mediaDurationSeconds?: number
  tempo?: number
  pitchMeanHz?: number
  pitchRangeHz?: Array<number | null>
  energyMean?: number
  energyPeak?: number
  points?: AudioFeaturePoint[]
  backend?: string
}

interface MultimediaItem {
  title: string
  type: MediaType
  duration: string
  bvid: string
  audioUrl?: string
  analysis: MediaAnalysis
}

interface UserAudioRecord {
  id: string
  title: string
  audioUrl: string
  fileName: string
  isPublic: boolean
  userId?: string
  username?: string
  nickname?: string
  likeCount?: number
  favoriteCount?: number
  likedBy?: string[]
  favoritedBy?: string[]
  comments?: UserAudioComment[]
  targetTitle: string
  createdAt: string
  features: AudioFeatures
  comparison?: PracticeComparison
}

interface CurrentAudioUser {
  id: string
  username: string
  nickname?: string
  loggedIn: boolean
}

interface UserAudioComment {
  id: string
  author: string
  createdAt: string
  text: string
}

interface PracticeComparison {
  targetTitle: string
  totalScore: number
  emotionScore: number
  energyScore: number
  pitchScore: number
  suggestions: string[]
  targetPoints: AudioFeaturePoint[]
  userPoints: AudioFeaturePoint[]
}

type FeatureKey = 'emotion' | 'energy' | 'pitchNorm'

type BrowserAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

const parseClockToSeconds = (value: string) => {
  const parts = value.split(':').map((part) => Number(part))
  if (parts.some((part) => Number.isNaN(part))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

const formatClock = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds || 0))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remain = safeSeconds % 60
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
}

const metricText = (value: number | null | undefined, unit: string) => (
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(value >= 100 ? 1 : 2)} ${unit}` : '待分析'
)

const percentText = (value: number | null | undefined) => (
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '待分析'
)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const normalizeOperaTitle = (title: string) => title.replace(/[《》\s·.()（）]/g, '')

const average = (values: number[]) => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
)

const estimatePitchHz = (samples: Float32Array, sampleRate: number) => {
  let crossings = 0
  let previous = samples[0] || 0
  for (let i = 1; i < samples.length; i += 1) {
    const current = samples[i]
    if ((previous <= 0 && current > 0) || (previous >= 0 && current < 0)) crossings += 1
    previous = current
  }
  const hz = (crossings * sampleRate) / (2 * samples.length)
  return hz >= 70 && hz <= 900 ? hz : null
}

const buildAudioFeaturesFromBuffer = (buffer: AudioBuffer): AudioFeatures => {
  const channel = buffer.getChannelData(0)
  const duration = buffer.duration || channel.length / buffer.sampleRate
  const pointCount = Math.max(12, Math.min(40, Math.round(duration / 5) || 12))
  const segmentLength = Math.max(1, Math.floor(channel.length / pointCount))
  const raw = Array.from({ length: pointCount }, (_, index) => {
    const start = index * segmentLength
    const end = index === pointCount - 1 ? channel.length : Math.min(channel.length, start + segmentLength)
    let squareSum = 0
    for (let i = start; i < end; i += 1) squareSum += channel[i] * channel[i]
    const rms = Math.sqrt(squareSum / Math.max(1, end - start))
    const pitchHz = estimatePitchHz(channel.slice(start, end), buffer.sampleRate)
    return {
      time: (start / channel.length) * duration,
      end: (end / channel.length) * duration,
      rms,
      pitchHz,
    }
  })

  const maxRms = Math.max(...raw.map((point) => point.rms), 0.0001)
  const pitches = raw.map((point) => point.pitchHz).filter((value): value is number => typeof value === 'number')
  const minPitch = pitches.length ? Math.min(...pitches) : 120
  const maxPitch = pitches.length ? Math.max(...pitches) : 520
  const pitchSpan = Math.max(1, maxPitch - minPitch)
  const points: AudioFeaturePoint[] = raw.map((point) => {
    const energy = clamp((point.rms / maxRms) * 100, 0, 100)
    const pitchNorm = point.pitchHz ? clamp(((point.pitchHz - minPitch) / pitchSpan) * 100, 0, 100) : 46
    const emotion = clamp(energy * 0.58 + pitchNorm * 0.42, 0, 100)
    return {
      time: point.time,
      end: point.end,
      timeLabel: formatClock(point.time),
      pitchHz: point.pitchHz,
      pitchNorm,
      tempoBpm: null,
      rhythm: clamp(energy * 0.72 + Math.abs(pitchNorm - 50) * 0.32, 0, 100),
      energy,
      emotion,
    }
  })

  const pitchMeanHz = average(pitches)
  const energyValues = points.map((point) => point.energy || 0)
  return {
    durationSeconds: duration,
    mediaDurationSeconds: duration,
    pitchMeanHz: pitchMeanHz || undefined,
    pitchRangeHz: pitches.length ? [minPitch, maxPitch] : [null, null],
    energyMean: average(energyValues),
    energyPeak: Math.max(...energyValues, 0),
    points,
    backend: 'Web Audio API 本地分析',
  }
}

const analyzeAudioFile = async (file: File): Promise<AudioFeatures> => {
  const AudioContextClass = window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext
  if (!AudioContextClass) throw new Error('当前浏览器不支持音频分析')
  const arrayBuffer = await file.arrayBuffer()
  const context = new AudioContextClass()
  try {
    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0))
    return buildAudioFeaturesFromBuffer(audioBuffer)
  } finally {
    void context.close()
  }
}

const resampleFeaturePoints = (points: AudioFeaturePoint[], count: number) => {
  if (!points.length) return []
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = count === 1 ? 0 : Math.round((index / (count - 1)) * (points.length - 1))
    return points[sourceIndex]
  })
}

const similarityScore = (target: AudioFeaturePoint[], user: AudioFeaturePoint[], key: FeatureKey) => {
  const count = Math.min(target.length, user.length, 36)
  if (!count) return 0
  const targetPoints = resampleFeaturePoints(target, count)
  const userPoints = resampleFeaturePoints(user, count)
  const distance = average(targetPoints.map((targetPoint, index) => {
    const userPoint = userPoints[index]
    const targetValue = key === 'pitchNorm' ? targetPoint.pitchNorm ?? 50 : getFeatureValue(targetPoint, key)
    const userValue = key === 'pitchNorm' ? userPoint.pitchNorm ?? 50 : getFeatureValue(userPoint, key)
    return Math.abs(targetValue - userValue)
  }))
  return Math.round(clamp(100 - distance, 0, 100))
}

const comparePracticeAudio = (target: MultimediaItem, userFeatures: AudioFeatures): PracticeComparison | undefined => {
  const targetPoints = target.analysis.audioFeatures?.points || []
  const userPoints = userFeatures.points || []
  if (!targetPoints.length || !userPoints.length) return undefined

  const emotionScore = similarityScore(targetPoints, userPoints, 'emotion')
  const energyScore = similarityScore(targetPoints, userPoints, 'energy')
  const pitchScore = similarityScore(targetPoints, userPoints, 'pitchNorm')
  const totalScore = Math.round(emotionScore * 0.32 + energyScore * 0.28 + pitchScore * 0.4)
  const suggestions: string[] = []

  if (pitchScore < 72) suggestions.push('音准与原唱线条还有距离，可先放慢速度练习高低音转换，重点校准长音落点。')
  else suggestions.push('音准走势与目标唱段较接近，继续保持字头清楚和尾音稳定。')

  if (energyScore < 72) suggestions.push('能量起伏不够贴合原唱，可在强拍、拖腔和情绪转折处加强气息支撑。')
  else suggestions.push('能量强弱控制较稳定，已经能跟上目标唱段的主要起伏。')

  if (emotionScore < 72) suggestions.push('情绪曲线偏平或转折提前，建议对照字幕节点练习“先收后放”的情绪推进。')
  else suggestions.push('情绪推进比较自然，适合继续打磨咬字、气口和身段节奏。')

  if (totalScore >= 88) suggestions.unshift('整体模仿完成度较高，可以进入细节润色阶段。')
  else if (totalScore >= 76) suggestions.unshift('整体已经接近目标唱段，下一步重点修正音准和能量峰值。')
  else suggestions.unshift('建议先分句练习，再整段连唱，优先保证音准和气息稳定。')

  return {
    targetTitle: target.title,
    totalScore,
    emotionScore,
    energyScore,
    pitchScore,
    suggestions,
    targetPoints,
    userPoints,
  }
}

const featurePolyline = (points: AudioFeaturePoint[], key: FeatureKey) => {
  if (!points.length) return ''
  return points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100
    const value = key === 'pitchNorm' ? point.pitchNorm ?? 50 : getFeatureValue(point, key)
    const y = 88 - (value / 100) * 72
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
}

const imageMap: Record<string, string> = {
  'play-1': img1,
  'play-2': img2,
  'play-3': img3,
  'play-4': img4,
  'play-5': img5,
  'play-6': img6,
}

const fallbackMultimedia: MultimediaItem[] = [
  {
    title: '《红楼梦·天上掉下个林妹妹》',
    type: 'video',
    duration: '03:45',
    bvid: 'BV1pQ4y1W7Wd',
    analysis: {
      summary: '宝黛初见的经典段落，画面语义集中在人物对视、礼仪动作和园林空间，适合展示越剧如何用唱腔表达“似曾相识”的细腻心理。',
      vocal: '王派审美侧重含蓄、清雅和细腻咬字，旋律线条柔和，情绪从惊喜转向试探与怜惜。',
      scene: '可识别的视觉元素包括黛玉身段、宝玉折扇、园林布景、柔和侧光和古典服饰层次。',
      narrator: '这段讲解建议使用温和、清晰的通用女性或中性音色，提示观众关注宝黛初见时的眼神、身段和唱腔转折。',
      narratorVoiceUrl: '',
      keywords: ['宝黛初见', '王派韵味', '园林布景', '人物对视', '古典服饰', 'FunASR', 'librosa', '经典唱段'],
      captions: [
        { start: '00:05', end: '00:12', text: '快过来见过你林妹妹。' },
        { start: '00:30', end: '00:35', text: '天上掉下个林妹妹。' },
        { start: '01:43', end: '01:52', text: '妹妹你读过书吗。' },
      ],
      moments: [
        { time: '00:12', title: '人物入场', text: '镜头建立园林空间，人物身段节奏较慢，强化初见前的含蓄气氛。' },
        { time: '01:08', title: '唱腔起句', text: '唱词进入人物心理，旋律以柔和上行为主，表现惊喜与试探。' },
        { time: '02:36', title: '情绪回收', text: '动作幅度收小，视线与身段转为内敛，适合讲解越剧的细腻抒情。' },
      ],
      emotionCurve: [28, 42, 58, 73, 66, 54, 62, 48],
      askPrompts: ['王派为什么适合表现林黛玉？', '宝黛初见的舞台调度有什么特点？', '这段唱腔如何表现人物心理？'],
    },
  },
  {
    title: '《梁祝·十八相送》',
    type: 'video',
    duration: '05:20',
    bvid: 'BV1WJ411T777',
    analysis: {
      summary: '“十八相送”以送别路程串联情感递进，智能解析重点在二人行进路线、身段呼应和唱词中的隐喻表达。',
      vocal: '唱腔以抒情和叙事交替推进，小生与旦角的声线形成问答式关系，情绪由明朗转向不舍。',
      scene: '画面中常见桥、水、路、书生行装等江南意象，可作为舞台空间与情感空间叠合的示例。',
      narrator: '讲解员可用平稳的导览音色串联“起程、借景、离情”三段，帮助用户边听边理解唱词隐喻。',
      narratorVoiceUrl: '',
      keywords: ['十八相送', '梁祝', '送别', '江南意象', '身段呼应', 'FunASR', 'librosa', '经典唱段'],
      captions: [
        { start: '00:00', end: '00:30', text: '三载同窗情如海，山伯难舍祝英台。' },
        { start: '00:30', end: '00:58', text: '相依相伴送下山，又向钱塘道上来。' },
        { start: '00:58', end: '01:28', text: '书房门前一枝梅，树上百鸟对打对。' },
        { start: '01:28', end: '01:58', text: '青青荷叶清水塘，鸳鸯成对又成双。' },
        { start: '01:58', end: '02:32', text: '梁兄啊，英台若是女红妆，梁兄愿不愿配鸳鸯？' },
        { start: '02:32', end: '03:04', text: '配鸳鸯配鸳鸯，可惜你英台不是女红妆。' },
        { start: '03:04', end: '03:42', text: '前面到了一条河，漂来一对大白鹅。' },
        { start: '03:42', end: '04:18', text: '眼前一条独木桥，我心又慌来胆又小。' },
        { start: '04:18', end: '04:54', text: '眼前还有一口井，井底两个影，一男一女笑盈盈。' },
        { start: '04:54', end: '05:20', text: '十八里相送到长亭，十八里相送到长亭。' },
      ],
      moments: [
        { time: '00:20', title: '送别起程', text: '二人并行建立关系，步法和视线形成互相牵引。' },
        { time: '02:18', title: '隐喻递进', text: '唱词借景言情，语义识别重点落在桥、水、路等意象。' },
        { time: '04:42', title: '离情加深', text: '节奏趋缓，身体距离和唱腔停顿共同表现不舍。' },
      ],
      emotionCurve: [36, 45, 51, 63, 70, 78, 72, 84],
      askPrompts: ['十八相送为什么适合做越剧入门？', '梁祝中的江南意象有哪些？', '越剧如何用身段表现送别？'],
    },
  },
  {
    title: '袁派名段《祥林嫂·天生雪》',
    type: 'audio',
    duration: '04:15',
    bvid: 'BV1Wx411u7N7',
    analysis: {
      summary: '该唱段适合做音频智能分析示例：不用画面也能通过声腔强弱、拖腔长度和节奏密度判断人物压抑处境。',
      vocal: '袁派唱腔质朴醇厚，音色不追求外放华丽，而是通过稳定气口和低回旋律积累悲剧重量。',
      scene: '音频模式下可用声纹、能量和停顿自动生成“情绪章节”，再回连到《祥林嫂》的现实题材背景。',
      narrator: '讲解员应避免模仿真实演员唱腔，只用授权通用音色解释“低声起势、拖腔加重、悲剧收束”的听点。',
      narratorVoiceUrl: '',
      keywords: ['袁派', '祥林嫂', '现实题材', '悲剧意识', '音频识别', 'FunASR', 'librosa', '经典唱段'],
      captions: [
        { start: '00:00', end: '00:28', text: '雪满地，风满天，寒冬腊月又一年。' },
        { start: '00:28', end: '00:58', text: '这长长的日子我怎么过，如梦如真在眼前。' },
        { start: '00:58', end: '01:28', text: '曾记得婆婆领我十一岁，那祥林他还在摇篮眠。' },
        { start: '01:28', end: '01:58', text: '我是又做媳妇又做姐，含辛茹苦十几年。' },
        { start: '01:58', end: '02:28', text: '谁知道伤寒夺去老六的命，阿毛又遭恶狼衔。' },
        { start: '02:28', end: '02:58', text: '撇下我无依无靠无田地，那大伯又收去屋两间。' },
        { start: '02:58', end: '03:30', text: '没奈何我两次重把鲁府进，只求得免受饥饿度残年。' },
        { start: '03:30', end: '04:15', text: '我只有抬头问苍天，我低头问人间。' },
      ],
      moments: [
        { time: '00:18', title: '低声起势', text: '能量较低，适合标注人物压抑状态。' },
        { time: '01:46', title: '拖腔加重', text: '长音和停顿增多，情绪识别为沉郁上升。' },
        { time: '03:28', title: '悲剧收束', text: '尾句力度回落，形成命运感较强的结束。' },
      ],
      emotionCurve: [24, 31, 49, 58, 76, 82, 69, 55],
      askPrompts: ['袁派唱腔有什么特点？', '《祥林嫂》为什么是越剧改革重要作品？', '音频如何识别唱段情绪？'],
    },
  },
  {
    title: '尹派名段《何文秀·算命》',
    type: 'audio',
    duration: '04:47',
    bvid: 'BV1ud4y1s7mJ',
    analysis: {
      summary: '该段适合展示小生音频分析：系统可从吐字、节奏和音区变化识别尹派儒雅、深沉、舒展的声腔气质。',
      vocal: '尹派小生行腔流畅舒展，字头清晰，情绪不急不露，常以克制方式呈现人物机智与深情。',
      scene: '虽然是音频唱段，也可根据唱词主题提取“身份试探、机智应对、情节反转”等语义标签。',
      narrator: '讲解员可采用沉稳的授权通用音色，重点解释小生唱段的字头、节奏和叙事推进，不进行真实演员声音复刻。',
      narratorVoiceUrl: '',
      keywords: ['尹派', '小生', '何文秀', '算命', '节奏识别', 'FunASR', 'librosa', '经典唱段'],
      captions: [
        { start: '00:00', end: '00:26', text: '清早起来出了城，要劝慰我妻王兰英。' },
        { start: '00:26', end: '00:52', text: '白布招牌手中拿，善观气色写分明。' },
        { start: '00:52', end: '01:20', text: '急急行来不留停，九里桑园叫算命。' },
        { start: '01:20', end: '01:48', text: '命中好来命中坏，生死关煞各分明。' },
        { start: '01:48', end: '02:20', text: '算得准来再付钱，算不准来不要银。' },
        { start: '02:20', end: '02:56', text: '妈妈听道，祖造男命二十一，命里规定说终身。' },
        { start: '02:56', end: '03:34', text: '十七岁命犯天狗星，无风起浪三尺深。' },
        { start: '03:34', end: '04:14', text: '幸亏又逢贵人星，贵人相救得重生。' },
        { start: '04:14', end: '04:47', text: '他命中实在不该死，目今还在世上存。' },
      ],
      moments: [
        { time: '00:36', title: '叙事铺垫', text: '节奏较稳，语义重点在人物身份与处境交代。' },
        { time: '02:55', title: '机智试探', text: '字词密度增加，适合标记为剧情推进段。' },
        { time: '05:40', title: '情绪回望', text: '声线舒展，人物情绪由机变转向深情。' },
      ],
      emotionCurve: [32, 38, 46, 62, 71, 65, 58, 68],
      askPrompts: ['尹派小生和范派小生有什么区别？', '《何文秀》适合分析哪些唱腔特点？', '如何从节奏判断唱段情绪？'],
    },
  },
]

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('yueju_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const requireLogin = () => {
  if (localStorage.getItem('yueju_token')) return true
  alert('请先登录后再操作')
  return false
}

const readJsonResponse = async <T,>(res: Response, fallbackMessage: string): Promise<T> => {
  const text = await res.text()
  let data: unknown = {}

  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(res.ok ? '接口返回内容不是有效 JSON' : fallbackMessage)
    }
  } else if (!res.ok) {
    throw new Error(fallbackMessage)
  }

  if (!res.ok) {
    const error = typeof data === 'object' && data && 'error' in data
      ? String((data as { error?: unknown }).error || '')
      : ''
    throw new Error(error || fallbackMessage)
  }

  return data as T
}

const playVideoMap: Record<string, string> = {
  '梁山伯与祝英台': '/videos/liangzhu.mp4',
  '梁祝': '/videos/liangzhu.mp4',
  '红楼梦': '/videos/hongloumeng.mp4',
  '西厢记': '/videos/xixiangji.mp4',
  '祥林嫂': '/videos/xianglinsao.mp4',
  '碧玉簪': '/videos/biyuzan.mp4',
  '追鱼': '/videos/zhuiyu.mp4',
}

const findLocalVideoSource = (title: string) => {
  const plainTitle = normalizeOperaTitle(title)
  return Object.entries(playVideoMap).find(([keyword]) => plainTitle.includes(keyword))?.[1] || ''
}

const findMediaAnalysisForTitle = (title: string, items: MultimediaItem[]) => {
  const plainTitle = normalizeOperaTitle(title)
  return items.find((item) => {
    const itemTitle = normalizeOperaTitle(item.title)
    return plainTitle.includes(itemTitle) || itemTitle.includes(plainTitle)
  })?.analysis
}

function PlayCardComponent({ play, index, onPlay }: { play: Play; index: number; onPlay: (title: string, videoSrc: string) => void }) {
  const [liked, setLiked] = useState(false)
  const [collected, setCollected] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [likeCount, setLikeCount] = useState(play.likeCount)
  const [collectionCount, setCollectionCount] = useState(play.collectionCount)
  const [shareCount, setShareCount] = useState(0)
  const [comments, setComments] = useState<PlayComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    fetch(`/api/play-interactions?playId=${play.id}`, {
      headers: getAuthHeaders(),
    })
      .then(async (res) => {
        const data = await readJsonResponse<PlayInteraction>(res, '互动数据加载失败')
        setLiked(data.liked)
        setCollected(data.collected)
        setLikeCount(data.likeCount)
        setCollectionCount(data.collectionCount)
        setShareCount(data.shareCount)
        setComments(data.comments || [])
      })
      .catch((err) => setActionError(err instanceof Error ? err.message : '互动数据加载失败'))
  }, [play.id])

  const postInteraction = async <T,>(url: string, body?: unknown): Promise<T> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return readJsonResponse<T>(res, '操作失败')
  }

  const handleLike = async () => {
    if (!requireLogin()) return
    setActionError('')
    try {
      const data = await postInteraction<{ liked: boolean; likeCount: number }>(`/api/play-interactions/${play.id}/like`)
      setLiked(data.liked)
      setLikeCount(data.likeCount)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '点赞失败')
    }
  }

  const handleCollection = async () => {
    if (!requireLogin()) return
    setActionError('')
    try {
      const data = await postInteraction<{ collected: boolean; collectionCount: number }>(`/api/play-interactions/${play.id}/collection`)
      setCollected(data.collected)
      setCollectionCount(data.collectionCount)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '收藏失败')
    }
  }

  const handleShare = async () => {
    if (!requireLogin()) return
    setActionError('')
    try {
      const data = await postInteraction<{ shareCount: number }>(`/api/play-interactions/${play.id}/share`)
      setShareCount(data.shareCount)
      await navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#/repertoire`)
      alert('分享已记录，链接也复制好了')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '分享失败')
    }
  }

  const handleComment = async () => {
    const content = newComment.trim()
    if (!content || !requireLogin()) return
    setActionError('')
    try {
      const data = await postInteraction<{ comment: PlayComment }>(`/api/play-interactions/${play.id}/comments`, { content })
      setComments([...comments, data.comment])
      setNewComment('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '评论失败')
    }
  }

  return (
    <div className={`play-card reveal-up reveal-delay-${(index % 3) + 1}`}>
      <div className="play-img">
        <img src={imageMap[play.imageKey] || img1} alt={play.title} />
        <span className="play-category">{play.category}</span>
        <div
          className="play-overlay"
          onClick={() => onPlay(`《${play.title}》`, findLocalVideoSource(play.title))}
        >
          <FaPlayCircle />
          <span>观看全剧</span>
        </div>
      </div>
      <div className="play-info">
        <h3>《{play.title}》</h3>
        <p>{play.desc}</p>

        <div className="play-interactions">
          <button className={`interaction-btn ${liked ? 'active' : ''}`} onClick={handleLike}>
            {liked ? <FaHeart /> : <FaRegHeart />} {likeCount}
          </button>
          <button className={`interaction-btn ${collected ? 'active' : ''}`} onClick={handleCollection}>
            {collected ? <FaStar /> : <FaRegStar />} {collectionCount}
          </button>
          <button className={`interaction-btn ${showComments ? 'active' : ''}`} onClick={() => setShowComments(!showComments)}>
            <FaCommentDots /> {comments.length}
          </button>
          <button className="interaction-btn" onClick={handleShare}>
            <FaShareAlt /> 分享{shareCount > 0 ? ` ${shareCount}` : ''}
          </button>
        </div>
        {actionError && <div className="interaction-error">{actionError}</div>}
      </div>

      {showComments && (
        <div className="comments-section">
          <div className="comments-list">
            {comments.length === 0 && <div className="comment-empty">还没有评论，来写第一句吧。</div>}
            {comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-avatar">{comment.nickname?.slice(0, 1) || '评'}</div>
                <div className="comment-text">
                  <strong>{comment.nickname}</strong>
                  <span>{comment.createdAt}</span>
                  <p>{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="comment-input-area">
            <input
              type="text"
              placeholder="写下你的评论..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            />
            <button onClick={handleComment}><FaPaperPlane /></button>
          </div>
        </div>
      )}
    </div>
  )
}

interface VideoModalState {
  open: boolean
  title: string
  src: string
  analysis?: MediaAnalysis
}

type FullscreenVideo = HTMLVideoElement & {
  webkitRequestFullscreen?: HTMLVideoElement['requestFullscreen']
  msRequestFullscreen?: HTMLVideoElement['requestFullscreen']
}

const getFeatureIndex = (points: AudioFeaturePoint[], currentTime: number) => {
  if (!points.length) return -1
  const index = points.findIndex((point) => currentTime >= point.time && currentTime < (point.end ?? point.time))
  if (index >= 0) return index
  if (currentTime <= points[0].time) return 0
  return points.length - 1
}

const getFeatureValue = (point: AudioFeaturePoint, key: 'pitchNorm' | 'rhythm' | 'energy' | 'emotion') => {
  const value = point[key]
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, 0, 100) : 0
}

const getPlotNodeIndex = (nodes: PlotNode[], currentTime: number) => {
  if (!nodes.length) return -1
  const nextIndex = nodes.findIndex((node) => currentTime < node.time)
  if (nextIndex === 0) return 0
  if (nextIndex === -1) return nodes.length - 1
  return nextIndex - 1
}

const getCaptionIndex = (captions: MediaCaption[], currentTime: number) => {
  if (!captions.length) return -1
  const activeIndex = captions.findIndex((caption) => {
    const start = parseClockToSeconds(caption.start)
    const end = parseClockToSeconds(caption.end)
    return currentTime >= start && currentTime < end
  })
  if (activeIndex >= 0) return activeIndex
  if (currentTime < parseClockToSeconds(captions[0].start)) return -1
  const previousIndex = captions.findLastIndex((caption) => currentTime >= parseClockToSeconds(caption.start))
  return previousIndex >= 0 ? previousIndex : -1
}

const buildSecondCaptions = (captions: MediaCaption[], totalDuration: number) => {
  if (!captions.length) return []
  const alreadySecondLevel = captions.every((caption) => {
    const start = parseClockToSeconds(caption.start)
    const end = parseClockToSeconds(caption.end)
    return end > start && end - start <= 1
  })
  if (alreadySecondLevel) return captions

  const rows: MediaCaption[] = []
  captions.forEach((caption, index) => {
    const start = Math.floor(parseClockToSeconds(caption.start))
    const rawEnd = Math.ceil(parseClockToSeconds(caption.end))
    const nextStart = captions[index + 1] ? Math.floor(parseClockToSeconds(captions[index + 1].start)) : 0
    const end = Math.max(
      start + 1,
      rawEnd || nextStart || Math.ceil(totalDuration) || start + 1
    )
    for (let second = start; second < end; second += 1) {
      rows.push({
        start: formatClock(second),
        end: formatClock(Math.min(second + 1, end)),
        text: caption.text,
      })
    }
  })
  return rows
}

const normalizeCaptionText = (text: string) => text.trim().replace(/\s+/g, ' ')

const collapseCaptionSegments = (captions: MediaCaption[]) => {
  const segments: MediaCaption[] = []

  captions.forEach((caption) => {
    const text = normalizeCaptionText(caption.text)
    if (!text) return

    const previous = segments[segments.length - 1]
    const currentStart = parseClockToSeconds(caption.start)
    const previousEnd = previous ? parseClockToSeconds(previous.end) : 0

    if (
      previous &&
      normalizeCaptionText(previous.text) === text &&
      Math.abs(previousEnd - currentStart) <= 0.5
    ) {
      previous.end = caption.end
      return
    }

    segments.push({ ...caption, text })
  })

  return segments
}

const emotionPolyline = (points: AudioFeaturePoint[]) => {
  if (!points.length) return ''
  return points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100
    const y = 42 - (getFeatureValue(point, 'emotion') / 100) * 36
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
}

const featureCurvePoint = (
  point: AudioFeaturePoint,
  index: number,
  points: AudioFeaturePoint[],
  key: 'emotion' | 'energy',
  duration: number
) => {
  const x = duration > 0
    ? clamp((point.time / duration) * 100, 0, 100)
    : points.length === 1
      ? 0
      : (index / (points.length - 1)) * 100
  const y = 88 - (getFeatureValue(point, key) / 100) * 72
  return { x, y }
}

const featureCurvePolyline = (points: AudioFeaturePoint[], key: 'emotion' | 'energy', duration: number) => (
  points.map((point, index) => {
    const { x, y } = featureCurvePoint(point, index, points, key, duration)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
)

function FeatureTrack({
  label,
  value,
  color,
  points,
  currentIndex,
  valueKey,
  onSeek,
}: {
  label: string
  value: string
  color: string
  points: AudioFeaturePoint[]
  currentIndex: number
  valueKey: 'pitchNorm' | 'rhythm' | 'energy'
  onSeek: (time: number) => void
}) {
  const visibleCount = 34
  const startIndex = clamp(currentIndex - Math.floor(visibleCount / 2), 0, Math.max(0, points.length - visibleCount))
  const visiblePoints = points.slice(startIndex, startIndex + visibleCount)

  return (
    <div className="sync-feature-track">
      <div className="sync-track-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="sync-track-bars" style={{ gridTemplateColumns: `repeat(${Math.max(visiblePoints.length, 1)}, minmax(4px, 1fr))` }}>
        {visiblePoints.map((point, index) => {
          const realIndex = startIndex + index
          return (
            <button
              type="button"
              className={`sync-track-bar ${realIndex === currentIndex ? 'active' : ''}`}
              style={{
                height: `${Math.max(8, getFeatureValue(point, valueKey))}%`,
                backgroundColor: color,
              }}
              key={`${label}-${point.time}`}
              title={`${point.timeLabel} ${label} ${Math.round(getFeatureValue(point, valueKey))}%`}
              onClick={() => onSeek(point.time)}
            />
          )
        })}
      </div>
      <div className="sync-track-time">
        <span>{visiblePoints[0]?.timeLabel || '00:00'}</span>
        <span>{visiblePoints[visiblePoints.length - 1]?.timeLabel || '00:00'}</span>
      </div>
    </div>
  )
}

function FeatureSyncPanel({
  analysis,
  currentTime,
  duration,
  onSeek,
}: {
  analysis?: MediaAnalysis
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}) {
  const features = analysis?.audioFeatures
  const points = features?.points || []
  const plotNodes = analysis?.plotNodes || []
  const currentIndex = getFeatureIndex(points, currentTime)
  const activePlotIndex = getPlotNodeIndex(plotNodes, currentTime)
  const currentPoint = currentIndex >= 0 ? points[currentIndex] : undefined
  const totalDuration = features?.mediaDurationSeconds || features?.durationSeconds || duration || 0
  const progress = totalDuration ? clamp((currentTime / totalDuration) * 100, 0, 100) : 0
  const polyline = emotionPolyline(points)

  if (!points.length) {
    return (
      <aside className="video-sync-panel empty">
        <h4><FaChartLine /> 唱腔实时分析</h4>
        <p>该视频暂未加载 librosa 音频特征，仍可正常播放。</p>
      </aside>
    )
  }

  return (
    <aside className="video-sync-panel">
      <div className="sync-panel-head">
        <span><FaChartLine /> 唱腔实时曲线</span>
        <strong>{formatClock(currentTime)} / {formatClock(totalDuration)}</strong>
      </div>

      <div className={`sync-panel-layout ${plotNodes.length > 0 ? '' : 'single'}`}>
        <div className="sync-chart-column">
          <div className="sync-metric-grid">
            <div className="sync-metric-card pitch">
              <span>当前音高</span>
              <strong>{metricText(currentPoint?.pitchHz, 'Hz')}</strong>
            </div>
            <div className="sync-metric-card rhythm">
              <span>当前节奏</span>
              <strong>{metricText(currentPoint?.tempoBpm, 'BPM')}</strong>
            </div>
            <div className="sync-metric-card energy">
              <span>当前能量</span>
              <strong>{percentText(currentPoint?.energy)}</strong>
            </div>
            <div className="sync-metric-card emotion">
              <span>情绪强度</span>
              <strong>{percentText(currentPoint?.emotion)}</strong>
            </div>
          </div>

          <div className="sync-overview">
            <div className="sync-overview-label">
              <span>全片情绪走势</span>
              <span>{features?.backend || 'librosa'}</span>
            </div>
            <svg viewBox="0 0 100 44" preserveAspectRatio="none" aria-label="全片情绪曲线">
              <polyline points={polyline} />
              <line x1={progress} x2={progress} y1="3" y2="42" />
            </svg>
          </div>

          <FeatureTrack
            label="音高走势"
            value={`均值 ${metricText(features?.pitchMeanHz, 'Hz')}`}
            color="#b99034"
            points={points}
            currentIndex={currentIndex}
            valueKey="pitchNorm"
            onSeek={onSeek}
          />
          <FeatureTrack
            label="节奏密度"
            value={`全局 ${metricText(features?.tempo, 'BPM')}`}
            color="#3f7d7a"
            points={points}
            currentIndex={currentIndex}
            valueKey="rhythm"
            onSeek={onSeek}
          />
          <FeatureTrack
            label="能量强弱"
            value={`峰值 ${percentText(features?.energyPeak)}`}
            color="#a63a48"
            points={points}
            currentIndex={currentIndex}
            valueKey="energy"
            onSeek={onSeek}
          />

          <p className="sync-panel-note">
            图表由 librosa 提取的音高、节奏密度和 RMS 能量综合生成；点击任一柱形可跳转到对应时间点。
          </p>
        </div>

        {plotNodes.length > 0 && (
          <div className="sync-plot-column">
            <div className="sync-plot-nodes">
              <div className="sync-section-title">
                <span>剧情高潮 / 转折点</span>
                <strong>{plotNodes.length} 个节点</strong>
              </div>
              <div className="sync-plot-list">
                {plotNodes.map((node, index) => (
                  <button
                    type="button"
                    className={`sync-plot-node ${index === activePlotIndex ? 'active' : ''}`}
                    key={`${node.title}-${node.time}`}
                    onClick={() => onSeek(node.time)}
                  >
                    <time>{node.timeLabel}</time>
                    <span className="plot-node-body">
                      <strong>{node.title}</strong>
                      <span>{node.plot}</span>
                      <em>{node.curve}</em>
                      <span className="plot-node-metrics">
                        <b>情绪 {percentText(node.emotion)}</b>
                        <b>能量 {percentText(node.energy)}</b>
                        <b>节奏 {percentText(node.rhythm)}</b>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function ClassicListeningPanel({
  analysis,
  currentTime,
  totalDuration,
  currentPoint,
  currentFeatureIndex,
  onSeek,
}: {
  analysis: MediaAnalysis
  currentTime: number
  totalDuration: number
  currentPoint?: AudioFeaturePoint
  currentFeatureIndex: number
  onSeek: (time: number) => void
}) {
  const safeDuration = totalDuration || analysis.audioFeatures?.durationSeconds || 0
  const captions = buildSecondCaptions(analysis.captions || [], safeDuration)
  const captionSegments = collapseCaptionSegments(captions)
  const points = analysis.audioFeatures?.points || []
  const activeCaptionIndex = getCaptionIndex(captionSegments, currentTime)
  const activeCaption = activeCaptionIndex >= 0 ? captionSegments[activeCaptionIndex] : undefined
  const progress = safeDuration ? clamp((currentTime / safeDuration) * 100, 0, 100) : 0
  const emotionLine = featureCurvePolyline(points, 'emotion', safeDuration)
  const currentEmotionPoint = currentPoint && currentFeatureIndex >= 0
    ? featureCurvePoint(currentPoint, currentFeatureIndex, points, 'emotion', safeDuration)
    : undefined
  const barWidth = points.length ? Math.max(1.4, Math.min(3.2, 82 / points.length)) : 2.4

  return (
    <div className="classic-listening-sync">
      <div className="synced-caption-card">
        <div className="sync-card-head">
          <span><FaClosedCaptioning /> 同步台词</span>
          <strong>{formatClock(currentTime)}</strong>
        </div>
        <div className={`current-caption ${activeCaption ? 'active' : ''}`}>
          <time>{activeCaption ? `${activeCaption.start} - ${activeCaption.end}` : '待播放'}</time>
          <p>{activeCaption?.text || '点击播放后，当前台词会随音频进度自动高亮。'}</p>
        </div>
        {captionSegments.length > 0 ? (
          <div className="synced-caption-list" aria-label="台词时间段列表">
            {captionSegments.map((caption, index) => {
              const isActive = index === activeCaptionIndex
              return (
                <button
                  type="button"
                  className={`synced-caption-line ${isActive ? 'active' : ''}`}
                  key={`${caption.start}-${caption.end}`}
                  onClick={() => onSeek(parseClockToSeconds(caption.start))}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <time>{caption.start} - {caption.end}</time>
                  <span>{caption.text}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="sync-empty-note">当前唱段暂未加载字幕。</p>
        )}
      </div>

      <div className="synced-curve-card">
        <div className="sync-card-head">
          <span><FaChartLine /> 情绪曲线与能量柱状图</span>
          <strong>{formatClock(currentTime)} / {formatClock(safeDuration)}</strong>
        </div>
        <div className="audio-feature-strip compact" aria-label="当前音频特征">
          <div className="audio-feature-card">
            <span>当前情绪</span>
            <strong>{percentText(currentPoint?.emotion)}</strong>
          </div>
          <div className="audio-feature-card">
            <span>当前能量</span>
            <strong>{percentText(currentPoint?.energy)}</strong>
          </div>
          <div className="audio-feature-card">
            <span>当前音高</span>
            <strong>{metricText(currentPoint?.pitchHz, 'Hz')}</strong>
          </div>
          <div className="audio-feature-card">
            <span>当前节奏</span>
            <strong>{metricText(currentPoint?.tempoBpm, 'BPM')}</strong>
          </div>
        </div>

        {points.length > 0 ? (
          <>
            <div className="classic-curve-frame">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label="情绪曲线与能量柱状图"
                onClick={(event) => {
                  if (!safeDuration) return
                  const rect = event.currentTarget.getBoundingClientRect()
                  const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
                  onSeek(ratio * safeDuration)
                }}
              >
                <line className="classic-curve-grid" x1="0" x2="100" y1="16" y2="16" />
                <line className="classic-curve-grid" x1="0" x2="100" y1="52" y2="52" />
                <line className="classic-curve-grid" x1="0" x2="100" y1="88" y2="88" />
                {points.map((point, index) => {
                  const { x } = featureCurvePoint(point, index, points, 'energy', safeDuration)
                  const height = (getFeatureValue(point, 'energy') / 100) * 72
                  return (
                    <rect
                      className={`classic-energy-bar ${index === currentFeatureIndex ? 'active' : ''}`}
                      key={`energy-${point.time}`}
                      x={clamp(x - barWidth / 2, 0, 100 - barWidth)}
                      y={88 - height}
                      width={barWidth}
                      height={height}
                      rx="0.45"
                    />
                  )
                })}
                <polyline className="classic-curve-line emotion" points={emotionLine} />
                <line className="classic-curve-cursor" x1={progress} x2={progress} y1="8" y2="92" />
                {currentEmotionPoint && <circle className="classic-curve-dot emotion" cx={currentEmotionPoint.x} cy={currentEmotionPoint.y} r="1.9" />}
              </svg>
            </div>
            <div className="classic-curve-ticks">
              <span>00:00</span>
              <span>{formatClock(safeDuration / 2)}</span>
              <span>{formatClock(safeDuration)}</span>
            </div>
            <div className="classic-curve-legend">
              <span><i className="emotion" /> 情绪强度</span>
              <span><i className="energy" /> 能量柱</span>
              <span><i className="cursor" /> 当前播放点</span>
            </div>
          </>
        ) : (
          <p className="sync-empty-note">当前唱段暂未加载 librosa 曲线数据。</p>
        )}
      </div>
    </div>
  )
}

function UserFeatureChart({ features }: { features?: AudioFeatures }) {
  const points = features?.points || []
  if (!points.length) {
    return <p className="sync-empty-note">上传后将生成情绪、能量和音准曲线。</p>
  }

  const barWidth = Math.max(1.4, Math.min(3.4, 86 / points.length))
  return (
    <div className="upload-chart-frame">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="上传音频分析曲线">
        <line className="classic-curve-grid" x1="0" x2="100" y1="16" y2="16" />
        <line className="classic-curve-grid" x1="0" x2="100" y1="52" y2="52" />
        <line className="classic-curve-grid" x1="0" x2="100" y1="88" y2="88" />
        {points.map((point, index) => {
          const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100
          const height = (getFeatureValue(point, 'energy') / 100) * 72
          return (
            <rect
              className="upload-energy-bar"
              key={`upload-energy-${point.time}`}
              x={clamp(x - barWidth / 2, 0, 100 - barWidth)}
              y={88 - height}
              width={barWidth}
              height={height}
              rx="0.45"
            />
          )
        })}
        <polyline className="upload-line emotion" points={featurePolyline(points, 'emotion')} />
        <polyline className="upload-line pitch" points={featurePolyline(points, 'pitchNorm')} />
      </svg>
    </div>
  )
}

function PracticeComparisonChart({ comparison }: { comparison: PracticeComparison }) {
  const tracks: Array<{ label: string; key: FeatureKey; hint: string }> = [
    { label: '情绪走势', key: 'emotion', hint: '观察情绪推进是否与原唱同步' },
    { label: '能量强弱', key: 'energy', hint: '观察气息强弱与发力位置' },
    { label: '音准线条', key: 'pitchNorm', hint: '观察高低音走向与旋律贴合度' },
  ]

  return (
    <div className="practice-compare-chart">
      {tracks.map((track) => (
        <div className="practice-track" key={track.key}>
          <div className="practice-track-head">
            <strong>{track.label}</strong>
            <span>{track.hint}</span>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${track.label}对比`}>
            <line className="classic-curve-grid" x1="0" x2="100" y1="20" y2="20" />
            <line className="classic-curve-grid" x1="0" x2="100" y1="54" y2="54" />
            <line className="classic-curve-grid" x1="0" x2="100" y1="88" y2="88" />
            <polyline className="compare-line target" points={featurePolyline(comparison.targetPoints, track.key)} />
            <polyline className="compare-line user" points={featurePolyline(comparison.userPoints, track.key)} />
          </svg>
        </div>
      ))}
      <div className="compare-legend">
        <span><i className="target" /> 原唱唱段</span>
        <span><i className="user" /> 我的模仿</span>
      </div>
    </div>
  )
}

const guestAudioUser: CurrentAudioUser = {
  id: 'guest',
  username: '游客',
  loggedIn: false,
}

const readCurrentAudioUser = (): CurrentAudioUser => {
  if (typeof window === 'undefined') return guestAudioUser
  const token = localStorage.getItem('yueju_token')
  if (!token) return guestAudioUser

  try {
    const rawUser = localStorage.getItem('yueju_user')
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as { id?: number | string; username?: string; nickname?: string }
      const username = parsed.username?.trim() || parsed.nickname?.trim() || '已登录用户'
      return {
        id: String(parsed.id ?? parsed.username ?? username),
        username,
        nickname: parsed.nickname?.trim() || undefined,
        loggedIn: true,
      }
    }
  } catch {
    // 登录信息损坏时仍允许保存作品，只显示兜底用户。
  }

  return {
    id: 'user',
    username: '已登录用户',
    loggedIn: true,
  }
}

const getAudioUserKey = (user: Pick<CurrentAudioUser, 'id' | 'username'>) => String(user.id || user.username || 'guest')

const getRecordOwnerLabel = (record: UserAudioRecord) => {
  if (record.username?.trim()) return record.username.trim()
  if (record.nickname?.trim()) return record.nickname.trim()
  return '游客'
}

function UserPerformanceLab({ mediaItems }: { mediaItems: MultimediaItem[] }) {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [workTitle, setWorkTitle] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [targetTitle, setTargetTitle] = useState('')
  const [features, setFeatures] = useState<AudioFeatures | undefined>()
  const [comparison, setComparison] = useState<PracticeComparison | undefined>()
  const [records, setRecords] = useState<UserAudioRecord[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [currentUser, setCurrentUser] = useState<CurrentAudioUser>(() => readCurrentAudioUser())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const selectedTarget = mediaItems.find((item) => item.title === targetTitle)

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  useEffect(() => {
    const syncCurrentUser = () => setCurrentUser(readCurrentAudioUser())
    const syncCurrentUserFromStorage = (event: StorageEvent) => {
      if (event.key === 'yueju_token' || event.key === 'yueju_user' || event.key === null) {
        syncCurrentUser()
      }
    }

    window.addEventListener('storage', syncCurrentUserFromStorage)
    window.addEventListener('yueju-auth-change', syncCurrentUser)
    return () => {
      window.removeEventListener('storage', syncCurrentUserFromStorage)
      window.removeEventListener('yueju-auth-change', syncCurrentUser)
    }
  }, [])

  const handleFileChange = (event: { target: HTMLInputElement }) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setUploadError('请上传 mp3、wav、m4a 等音频文件。')
      return
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioFile(file)
    setAudioUrl(URL.createObjectURL(file))
    setWorkTitle(file.name.replace(/\.[^.]+$/, ''))
    setFeatures(undefined)
    setComparison(undefined)
    setUploadError('')
  }

  const runAnalysis = async () => {
    if (!audioFile) {
      setUploadError('请先选择一段自己的演唱音频。')
      return
    }
    setAnalyzing(true)
    setUploadError('')
    try {
      const nextFeatures = await analyzeAudioFile(audioFile)
      setFeatures(nextFeatures)
      setComparison(selectedTarget ? comparePracticeAudio(selectedTarget, nextFeatures) : undefined)
    } catch (err) {
      setFeatures(undefined)
      setComparison(undefined)
      setUploadError(err instanceof Error ? err.message : '音频分析失败，请更换文件后重试。')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleTargetChange = (value: string) => {
    setTargetTitle(value)
    const nextTarget = mediaItems.find((item) => item.title === value)
    setComparison(features && nextTarget ? comparePracticeAudio(nextTarget, features) : undefined)
  }

  const saveRecord = () => {
    if (!audioFile || !audioUrl || !features) return
    const owner = readCurrentAudioUser()
    setCurrentUser(owner)
    const nextRecord: UserAudioRecord = {
      id: `${audioFile.name}-${Date.now()}`,
      title: workTitle.trim() || audioFile.name.replace(/\.[^.]+$/, ''),
      fileName: audioFile.name,
      audioUrl,
      isPublic,
      userId: getAudioUserKey(owner),
      username: owner.username,
      nickname: owner.nickname,
      likeCount: 0,
      favoriteCount: 0,
      likedBy: [],
      favoritedBy: [],
      comments: [],
      targetTitle,
      createdAt: new Date().toLocaleString(),
      features,
      comparison,
    }
    setRecords((prev) => [nextRecord, ...prev].slice(0, 8))
  }

  const publicRecords = records.filter((record) => record.isPublic)
  const currentUserKey = getAudioUserKey(currentUser)
  const canManageRecord = (record: UserAudioRecord) => {
    if (!record.userId && !record.username) return true
    return String(record.userId || record.username) === currentUserKey || record.username === currentUser.username
  }

  const withdrawRecord = (id: string) => {
    setRecords((prev) => prev.map((record) => (record.id === id ? { ...record, isPublic: false } : record)))
  }

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== id))
    setCommentDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const toggleRecordLike = (id: string) => {
    const user = readCurrentAudioUser()
    setCurrentUser(user)
    const userKey = getAudioUserKey(user)
    setRecords((prev) => prev.map((record) => {
      if (record.id !== id) return record
      const likedBy = record.likedBy || []
      const hasLiked = likedBy.includes(userKey)
      return {
        ...record,
        likedBy: hasLiked ? likedBy.filter((key) => key !== userKey) : [...likedBy, userKey],
        likeCount: Math.max(0, (record.likeCount ?? likedBy.length) + (hasLiked ? -1 : 1)),
      }
    }))
  }

  const toggleRecordFavorite = (id: string) => {
    const user = readCurrentAudioUser()
    setCurrentUser(user)
    const userKey = getAudioUserKey(user)
    setRecords((prev) => prev.map((record) => {
      if (record.id !== id) return record
      const favoritedBy = record.favoritedBy || []
      const hasFavorited = favoritedBy.includes(userKey)
      return {
        ...record,
        favoritedBy: hasFavorited ? favoritedBy.filter((key) => key !== userKey) : [...favoritedBy, userKey],
        favoriteCount: Math.max(0, (record.favoriteCount ?? favoritedBy.length) + (hasFavorited ? -1 : 1)),
      }
    }))
  }

  const submitRecordComment = (id: string) => {
    const text = (commentDrafts[id] || '').trim()
    if (!text) return
    const user = readCurrentAudioUser()
    setCurrentUser(user)
    const nextComment: UserAudioComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: user.username,
      createdAt: new Date().toLocaleString(),
      text,
    }
    setRecords((prev) => prev.map((record) => (
      record.id === id ? { ...record, comments: [...(record.comments || []), nextComment] } : record
    )))
    setCommentDrafts((prev) => ({ ...prev, [id]: '' }))
  }

  return (
    <div className="user-performance-lab">
      <div className="upload-workbench">
        <div className="upload-card primary">
          <div className="upload-card-head">
            <FaUpload />
            <div>
              <h3>上传我的演唱音频</h3>
              <p>支持 mp3、wav、m4a，本地生成情绪、能量与音准曲线。</p>
            </div>
          </div>
          <div className="upload-form-grid">
            <label className="audio-upload-box">
              <input type="file" accept="audio/*" onChange={handleFileChange} />
              <FaMicrophoneAlt />
              <span>{audioFile ? audioFile.name : '选择音频文件'}</span>
            </label>
            <label>
              作品名称
              <input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="例如：我的《天上掉下个林妹妹》练习" />
            </label>
            <label>
              练习目标
              <select value={targetTitle} onChange={(event) => handleTargetChange(event.target.value)}>
                <option value="">不选择目标，仅分析我的音频</option>
                {mediaItems.map((item) => (
                  <option value={item.title} key={item.title}>{item.title}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="visibility-toggle" aria-label="作品公开设置">
            <button type="button" className={isPublic ? 'active' : ''} onClick={() => setIsPublic(true)}>
              <FaGlobeAsia /> 公开给他人
            </button>
            <button type="button" className={!isPublic ? 'active' : ''} onClick={() => setIsPublic(false)}>
              <FaLock /> 仅自己可见
            </button>
          </div>

          {audioUrl && (
            <div className="uploaded-audio-player">
              <span><FaHeadphones /> 我的音频</span>
              <audio src={audioUrl} controls />
            </div>
          )}
          {selectedTarget?.audioUrl && (
            <div className="uploaded-audio-player target">
              <span><FaMusic /> 练习原唱</span>
              <audio src={selectedTarget.audioUrl} controls />
            </div>
          )}
          {uploadError && <p className="upload-error">{uploadError}</p>}
          <div className="upload-action-row">
            <button type="button" className="play-action-btn" onClick={runAnalysis} disabled={analyzing || !audioFile}>
              <FaChartLine /> {analyzing ? '分析中...' : '分析音频'}
            </button>
            <button type="button" className="media-analyze-btn" onClick={saveRecord} disabled={!features}>
              <FaCheckCircle /> 保存作品
            </button>
          </div>
        </div>

        <div className="upload-card">
          <div className="upload-card-head">
            <FaChartLine />
            <div>
              <h3>我的唱腔分析</h3>
              <p>上传后自动显示平均音高、能量峰值与走势。</p>
            </div>
          </div>
          <div className="upload-score-grid">
            <div><span>平均音高</span><strong>{metricText(features?.pitchMeanHz, 'Hz')}</strong></div>
            <div><span>平均能量</span><strong>{percentText(features?.energyMean)}</strong></div>
            <div><span>能量峰值</span><strong>{percentText(features?.energyPeak)}</strong></div>
            <div><span>片段时长</span><strong>{features?.durationSeconds ? formatClock(features.durationSeconds) : '待分析'}</strong></div>
          </div>
          <UserFeatureChart features={features} />
          <div className="classic-curve-legend">
            <span><i className="emotion" /> 情绪</span>
            <span><i className="energy" /> 能量柱</span>
            <span><i className="pitch" /> 音准线</span>
          </div>
        </div>
      </div>

      {comparison && (
        <div className="practice-result-panel">
          <div className="media-insight-head">
            <span><FaRobot /> 练习对比评分</span>
            <h3>{comparison.targetTitle}</h3>
            <p>系统将原唱唱段与我的模仿音频在情绪、能量和音准三个维度进行曲线对齐比较。</p>
          </div>
          <div className="practice-score-grid">
            <div className="total"><span>综合得分</span><strong>{comparison.totalScore}</strong><em>/ 100</em></div>
            <div><span>情绪贴合</span><strong>{comparison.emotionScore}</strong></div>
            <div><span>能量控制</span><strong>{comparison.energyScore}</strong></div>
            <div><span>音准相似</span><strong>{comparison.pitchScore}</strong></div>
          </div>
          <PracticeComparisonChart comparison={comparison} />
          <div className="practice-suggestion-list">
            {comparison.suggestions.map((suggestion) => (
              <p key={suggestion}>{suggestion}</p>
            ))}
          </div>
        </div>
      )}

      <div className="public-audio-stage">
        <div className="sync-card-head">
          <span><FaGlobeAsia /> 用户公开作品</span>
          <strong>{publicRecords.length} 段</strong>
        </div>
        {publicRecords.length > 0 ? (
          <div className="public-audio-grid">
            {publicRecords.map((record) => {
              const comments = record.comments || []
              const likedBy = record.likedBy || []
              const favoritedBy = record.favoritedBy || []
              const liked = likedBy.includes(currentUserKey)
              const favorited = favoritedBy.includes(currentUserKey)
              return (
                <article className="public-audio-card" key={record.id}>
                  <div className="public-audio-card-head">
                    <div>
                      <h4>{record.title}</h4>
                      <span className="public-audio-owner">发布者：{getRecordOwnerLabel(record)}</span>
                      <span className="public-audio-meta">{record.createdAt} · {record.targetTitle ? `练习 ${record.targetTitle}` : '自由演唱'}</span>
                    </div>
                    {canManageRecord(record) && (
                      <div className="public-audio-actions">
                        <button type="button" onClick={() => withdrawRecord(record.id)}>撤回公开</button>
                        <button type="button" className="danger" onClick={() => deleteRecord(record.id)}>删除</button>
                      </div>
                    )}
                  </div>
                  <audio src={record.audioUrl} controls />
                  <p>
                    音高 {metricText(record.features.pitchMeanHz, 'Hz')}，
                    能量峰值 {percentText(record.features.energyPeak)}
                    {record.comparison ? `，练习得分 ${record.comparison.totalScore}` : ''}
                  </p>
                  <div className="public-audio-social" aria-label={`${record.title}互动区`}>
                    <button type="button" className={liked ? 'active' : ''} onClick={() => toggleRecordLike(record.id)}>
                      {liked ? <FaHeart /> : <FaRegHeart />} {record.likeCount ?? likedBy.length}
                    </button>
                    <button type="button" className={favorited ? 'active' : ''} onClick={() => toggleRecordFavorite(record.id)}>
                      {favorited ? <FaStar /> : <FaRegStar />} {record.favoriteCount ?? favoritedBy.length}
                    </button>
                    <span className="comment-count" title="评论数">
                      <FaCommentDots /> {comments.length}
                    </span>
                  </div>
                  <div className="public-audio-comments">
                    {comments.length > 0 ? (
                      comments.map((comment) => (
                        <div className="public-audio-comment" key={comment.id}>
                          <strong>{comment.author}</strong>
                          <em>{comment.createdAt}</em>
                          <p>{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="public-audio-comment-empty">还没有评论，来写下第一句鼓励。</p>
                    )}
                    <div className="public-audio-comment-form">
                      <input
                        value={commentDrafts[record.id] || ''}
                        onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [record.id]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') submitRecordComment(record.id)
                        }}
                        placeholder="写一句评论或练习建议"
                      />
                      <button type="button" onClick={() => submitRecordComment(record.id)}>
                        <FaPaperPlane /> 评论
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="sync-empty-note">暂无公开作品。上传分析后选择“公开给他人”，即可展示在这里。</p>
        )}
      </div>
    </div>
  )
}

function VideoPlayerModal({ title, src, analysis, onClose }: { title: string; src: string; analysis?: MediaAnalysis; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleFullscreen = () => {
    const video = videoRef.current as FullscreenVideo | null
    if (video) {
      const requestFS =
        video.requestFullscreen ||
        video.webkitRequestFullscreen ||
        video.msRequestFullscreen
      if (requestFS) void requestFS.call(video)
    }
  }

  const handleSeek = (time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  return createPortal(
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-header">
          <h3>{title}</h3>
          <div className="video-modal-actions">
            <button className="video-modal-fullscreen" onClick={handleFullscreen} title="全屏播放">
              <FaExpand />
            </button>
            <button className="video-modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="video-modal-body">
          <div className="video-modal-player">
            <video
              ref={videoRef}
              src={src}
              title={title}
              controls
              autoPlay
              preload="metadata"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
              onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
            />
          </div>
          <FeatureSyncPanel analysis={analysis} currentTime={currentTime} duration={duration} onSeek={handleSeek} />
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Repertoire() {
  const [plays, setPlays] = useState<Play[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [videoModal, setVideoModal] = useState<VideoModalState>({ open: false, title: '', src: '' })
  const [mediaItems, setMediaItems] = useState<MultimediaItem[]>(fallbackMultimedia)
  const [videoFeatureItems, setVideoFeatureItems] = useState<MultimediaItem[]>([])
  const [activeMediaTitle, setActiveMediaTitle] = useState(fallbackMultimedia[0].title)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const activeMedia = mediaItems.find((item) => item.title === activeMediaTitle) || mediaItems[0] || fallbackMultimedia[0]
  const audioFeatures = activeMedia.analysis.audioFeatures
  const audioFeaturePoints = audioFeatures?.points || []
  const totalAudioDuration = audioFeatures?.durationSeconds || audioDuration || parseClockToSeconds(activeMedia.duration)
  const currentAudioFeatureIndex = getFeatureIndex(audioFeaturePoints, audioCurrentTime)
  const currentAudioPoint = currentAudioFeatureIndex >= 0 ? audioFeaturePoints[currentAudioFeatureIndex] : undefined
  const getAnalysisText = (key: keyof MediaAnalysis, fallback: string) => {
    const value = activeMedia.analysis[key]
    return typeof value === 'string' && value.trim() ? value : fallback
  }

  const openVideo = (title: string, videoSrc: string, desc?: string) => {
    if (!videoSrc) {
      alert('暂无本地视频源')
      return
    }
    setVideoModal({ open: true, title, src: videoSrc, analysis: findMediaAnalysisForTitle(title, videoFeatureItems) })
    recordHistory({ title, desc: desc || '观看视频', path: '/repertoire' })
  }

  useEffect(() => {
    window.scrollTo(0, 0)

    fetch('/api/plays')
      .then(async (res) => {
        const data = await readJsonResponse<{ items?: Play[]; error?: string }>(res, '剧目加载失败，请确认后端服务已启动')
        setPlays(data.items || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : '剧目加载失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    fetch('/data/classic-arias.json?v=classic-arias-20260602-all-dialogue-tags', { signal: controller.signal })
      .then(async (res) => {
        return readJsonResponse<{ items?: MultimediaItem[]; error?: string }>(res, '经典唱段数据加载失败')
      })
      .then((data) => {
        if (!Array.isArray(data.items) || data.items.length === 0) return
        setMediaItems(data.items)
        setActiveMediaTitle((current) => (
          current === fallbackMultimedia[0].title || !data.items?.some((item) => item.title === current)
            ? data.items![0].title
            : current
        ))
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.warn('经典唱段数据加载失败，已使用本地兜底数据', err)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    fetch('/data/video-feature-analyses.json', { signal: controller.signal })
      .then(async (res) => {
        return readJsonResponse<{ items?: MultimediaItem[] }>(res, '视频特征数据加载失败')
      })
      .then((data) => {
        if (Array.isArray(data.items)) setVideoFeatureItems(data.items)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.warn('视频特征数据加载失败', err)
      })

    return () => controller.abort()
  }, [])

  const handlePlayAudio = (item: MultimediaItem) => {
    setActiveMediaTitle(item.title)
    setAudioCurrentTime(0)
    setAudioDuration(item.analysis.audioFeatures?.durationSeconds || parseClockToSeconds(item.duration))
    window.setTimeout(() => {
      const player = audioRef.current
      if (!player || !item.audioUrl) return
      player.src = item.audioUrl
      player.play().catch(() => undefined)
    }, 0)
  }

  const handleSeekAudio = (time: number) => {
    const player = audioRef.current
    const maxDuration = totalAudioDuration || player?.duration || 0
    const nextTime = clamp(time, 0, maxDuration)
    if (player) player.currentTime = nextTime
    setAudioCurrentTime(nextTime)
  }

  return (
    <div className="page-container">
      <div className="page-header dark-header repertoire-header">
        <img src={repertoireHeaderBg} alt="" className="repertoire-header-bg" />
        <div className="repertoire-header-overlay" />
        <FaFilm className="page-header-icon reveal-scale" />
        <h1 className="reveal-up">经典剧目与经典唱段</h1>
        <p className="reveal-up reveal-delay-1">传世佳作，百看不厌。光影看全剧，清音听唱段。</p>
      </div>

      <div className="page-content">
        <section className="content-section">
          <span className="section-eyebrow reveal-up">传世剧目</span>
          <h2 className="section-title-left reveal-up">经典剧目一览</h2>
          {loading && <div className="empty-state">加载中...</div>}
          {error && <div className="empty-state">{error}</div>}
          {!loading && !error && (
            <div className="plays-grid">
              {plays.map((play, i) => (
                <PlayCardComponent key={play.id} play={play} index={i} onPlay={(title, videoSrc) => openVideo(title, videoSrc, play.desc)} />
              ))}
            </div>
          )}
        </section>

        <section className="content-section media-section reveal-up">
          <span className="section-eyebrow">清音唱段</span>
          <h2 className="section-title-left">经典唱段</h2>
          <div className="media-list">
            {mediaItems.map((item) => (
              <div
                className={`media-item ${activeMedia.title === item.title ? 'active' : ''}`}
                key={item.title}
              >
                <div className="media-icon">
                  <FaMusic />
                </div>
                <div className="media-details">
                  <h4>{item.title}</h4>
                  <span>音频唱段 · {item.duration}</span>
                </div>
                <button
                  type="button"
                  className="media-analyze-btn"
                  onClick={() => setActiveMediaTitle(item.title)}
                >
                  解析
                </button>
                <button
                  className="play-action-btn"
                  onClick={() => handlePlayAudio(item)}
                >
                  播放
                </button>
              </div>
            ))}
          </div>

          <div className="media-intelligence-panel">
            <div className="media-insight-head">
              <span><FaRobot /> AI 智能解析</span>
              <h3>{activeMedia.title}</h3>
              <p>{activeMedia.analysis.summary}</p>
            </div>

            <div className="media-insight-tags" aria-label="识别关键词">
              <FaTags />
              {activeMedia.analysis.keywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>

            <div className="classic-audio-player">
              <div>
                <FaMusic />
                <span>当前播放：{activeMedia.title}</span>
              </div>
              {activeMedia.audioUrl ? (
                <audio
                  ref={audioRef}
                  controls
                  src={activeMedia.audioUrl}
                  onLoadedMetadata={(event) => {
                    setAudioDuration(event.currentTarget.duration || parseClockToSeconds(activeMedia.duration))
                    setAudioCurrentTime(event.currentTarget.currentTime || 0)
                  }}
                  onTimeUpdate={(event) => setAudioCurrentTime(event.currentTarget.currentTime || 0)}
                  onSeeked={(event) => setAudioCurrentTime(event.currentTarget.currentTime || 0)}
                  onEnded={(event) => setAudioCurrentTime(event.currentTarget.duration || totalAudioDuration)}
                />
              ) : (
                <span className="voice-note">音频资源加载中...</span>
              )}
            </div>

            <ClassicListeningPanel
              analysis={activeMedia.analysis}
              currentTime={audioCurrentTime}
              totalDuration={totalAudioDuration}
              currentPoint={currentAudioPoint}
              currentFeatureIndex={currentAudioFeatureIndex}
              onSeek={handleSeekAudio}
            />

            <div className="media-insight-grid classic-aria-grid">
              <div className="media-insight-block">
                <FaFilm />
                <h4>背景</h4>
                <p>{getAnalysisText('background', activeMedia.analysis.summary)}</p>
              </div>
              <div className="media-insight-block">
                <FaMicrophoneAlt />
                <h4>演员</h4>
                <p>{getAnalysisText('actors', '该唱段的演员信息以后可继续从片头字幕、剧目资料和人工校订中补充。')}</p>
              </div>
              <div className="media-insight-block">
                <FaMicrophoneAlt />
                <h4>流派</h4>
                <p>{getAnalysisText('school', activeMedia.analysis.vocal)}</p>
              </div>
              <div className="media-insight-block">
                <FaChartLine />
                <h4>技巧</h4>
                <p>{getAnalysisText('technique', activeMedia.analysis.vocal)}</p>
              </div>
              <div className="media-insight-block">
                <FaClosedCaptioning />
                <h4>剧情</h4>
                <p>{getAnalysisText('plot', activeMedia.analysis.scene)}</p>
              </div>
              <div className="media-insight-block">
                <FaVolumeUp />
                <h4>情绪与能量</h4>
                <p>{getAnalysisText('emotion', '由 librosa 提取音高、节奏和能量后生成情绪曲线，可辅助观察唱腔推进。')}</p>
              </div>
            </div>

            <div className="media-ask-row">
              {activeMedia.analysis.askPrompts.map((prompt) => (
                <Link to="/ai" key={prompt}>{prompt}</Link>
              ))}
            </div>
          </div>
        </section>

        <section className="content-section user-audio-section reveal-up">
          <span className="section-eyebrow">个人练声</span>
          <h2 className="section-title-left">用户唱段上传与练习评测</h2>
          <UserPerformanceLab mediaItems={mediaItems} />
        </section>
      </div>

      {videoModal.open && (
        <VideoPlayerModal
          title={videoModal.title}
          src={videoModal.src}
          analysis={videoModal.analysis || findMediaAnalysisForTitle(videoModal.title, videoFeatureItems)}
          onClose={() => setVideoModal({ open: false, title: '', src: '' })}
        />
      )}
    </div>
  )
}
