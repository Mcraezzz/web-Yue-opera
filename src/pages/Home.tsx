import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GiLanternFlame, GiPaintBrush } from 'react-icons/gi'
import { FaPlayCircle, FaMagic, FaRobot, FaSearch, FaChevronRight, FaQuestionCircle, FaCheckCircle, FaTimesCircle, FaRedo } from 'react-icons/fa'
import './Home.css'
import { sampleQuestions, type QuizQuestion } from '../data/yuejuQuiz'
import heroImg from '../assets/generated/ai-stage.jpg'
import heroBg2 from '../assets/img/微信图片_2026-04-24_005125_918.jpg'
import heroBg3 from '../assets/img/微信图片_2026-04-24_005044_037.png'
import preview1 from '../assets/generated/liangzhu-stage.jpg'
import preview2 from '../assets/generated/hongloumeng-stage.jpg'
import imgArt from '../assets/generated/xixiangji-archive.jpg'
import imgAbout from '../assets/img/微信图片_2026-04-24_005119_039.jpg'
import imgCostume from '../assets/img/微信图片_2026-04-24_005100_586.jpg'
import imgHistory from '../assets/generated/yuan-school-founder.jpg'
import imgPerformance from '../assets/generated/wunvbaishou-stage.jpg'
import imgYin from '../assets/generated/yin-school-role.jpg'
import imgFan from '../assets/generated/fan-school-liangzhu.jpg'
import imgMakeup from '../assets/img/微信图片_20260423200929_34_793.png'
import imgHeadwear from '../assets/img/微信图片_2026-04-24_005100_586.jpg'
import imgStageSet from '../assets/img/微信图片_2026-04-24_005015_185.jpg'
import aiCharacter from '../assets/generated/ai-character.jpg'
import aiStage from '../assets/generated/ai-stage.jpg'
import aiPoster from '../assets/generated/ai-poster.jpg'
import backstagePreview from '../assets/img/微信图片_2026-04-24_005115_034.jpg'

const historyNodes = [
  { time: '1900s', title: '起于江南', desc: '从民间说唱到戏曲舞台，越剧的雏形逐渐形成' },
  { time: '1930s', title: '风华初成', desc: '女班兴起，舞台表演日趋成熟' },
  { time: '1950s', title: '经典流传', desc: '《梁祝》《红楼梦》等剧目深入人心' },
  { time: '至今', title: '当代传承', desc: '在保留传统韵味的同时，积极探索创新' },
]

const repertoire = [
  { title: '《梁山伯与祝英台》', desc: '越剧最负盛名的传世经典', tags: ['爱情', '才子佳人'], quote: '死生契阔，与子成说。', img: preview1 },
  { title: '《红楼梦》', desc: '越剧舞台上的金字招牌', tags: ['家族', '经典唱段'], quote: '天上掉下个林妹妹，似一朵轻云刚出岫。', img: preview2 },
  { title: '《西厢记》', desc: '元杂剧名作的婉转重现', tags: ['爱情', '反抗封建'], quote: '碧云天，黄花地，西风紧，北雁南飞。', img: imgArt },
  { title: '《五女拜寿》', desc: '新时期越剧原创经典', tags: ['家庭', '伦理'], quote: '患难之中见真情，雪中送炭暖人心。', img: imgPerformance },
]

const todayRecommendations = [
  { playTitle: '梁山伯与祝英台', displayTitle: '《梁山伯与祝英台》', performer: '茅威涛（尹派小生）', lyric: '绕绿堤，拂柳丝，穿过花径。听何处，哀怨笛，风送声声。' },
  { playTitle: '红楼梦', displayTitle: '《红楼梦》', performer: '王文娟（王派代表）', lyric: '天上掉下个林妹妹，似一朵轻云刚出岫。' },
  { playTitle: '西厢记', displayTitle: '《西厢记》', performer: '方亚芬（袁派传人）', lyric: '碧云天，黄花地，西风紧，北雁南飞。' },
  { playTitle: '五女拜寿', displayTitle: '《五女拜寿》', performer: '何赛飞（经典银幕形象）', lyric: '患难之中见真情，雪中送炭暖人心。' },
  { playTitle: '祥林嫂', displayTitle: '《祥林嫂》', performer: '袁雪芬（越剧改革先驱）', lyric: '雪落无声人独立，命似寒灯照旧尘。' },
  { playTitle: '追鱼', displayTitle: '《追鱼》', performer: '徐玉兰（徐派小生）', lyric: '碧波深处情初动，一尾灵鱼入梦来。' },
  { playTitle: '梁山伯与祝英台', displayTitle: '《梁祝・十八相送》', performer: '范瑞娟（范派小生）', lyric: '三载同窗情如海，一路相送意难平。' },
  { playTitle: '红楼梦', displayTitle: '《红楼梦・葬花》', performer: '王文娟（王派旦角）', lyric: '花谢花飞飞满天，红消香断有谁怜。' },
  { playTitle: '西厢记', displayTitle: '《西厢记・琴心》', performer: '吕瑞英（吕派花旦）', lyric: '月移花影上栏杆，一曲琴心诉未完。' },
  { playTitle: '五女拜寿', displayTitle: '《五女拜寿・拜寿》', performer: '浙江小百花越剧团', lyric: '厅前一拜亲恩重，风雨人间见孝心。' },
  { playTitle: '祥林嫂', displayTitle: '《祥林嫂・问苍天》', performer: '袁雪芬（袁派艺术）', lyric: '问苍天何处容身，半生风雪半生尘。' },
  { playTitle: '追鱼', displayTitle: '《追鱼・书馆》', performer: '徐玉兰、王文娟', lyric: '一纸书香牵旧梦，半窗月色照新缘。' },
  { playTitle: '梁山伯与祝英台', displayTitle: '《梁祝・楼台会》', performer: '茅威涛、陈辉玲', lyric: '楼台一会肝肠断，旧誓新愁两不堪。' },
  { playTitle: '红楼梦', displayTitle: '《红楼梦・金玉良缘》', performer: '越剧电影经典唱段', lyric: '一个是阆苑仙葩，一个是美玉无瑕。' },
  { playTitle: '西厢记', displayTitle: '《西厢记・长亭》', performer: '方亚芬、钱惠丽', lyric: '晓来谁染霜林醉，总是离人泪。' },
  { playTitle: '五女拜寿', displayTitle: '《五女拜寿・团圆》', performer: '何赛飞、陶慧敏', lyric: '人间冷暖终须见，一盏亲情照晚晴。' },
  { playTitle: '祥林嫂', displayTitle: '《祥林嫂・风雪夜》', performer: '单仰萍（王派传人）', lyric: '风雪压门灯影瘦，苦命人间问归途。' },
  { playTitle: '追鱼', displayTitle: '《追鱼・观灯》', performer: '钱惠丽（徐派传人）', lyric: '灯火满城春意动，水月人间两相逢。' },
  { playTitle: '梁山伯与祝英台', displayTitle: '《梁祝・化蝶》', performer: '越剧经典合唱', lyric: '愿化彩蝶双飞去，人间天上永相随。' },
  { playTitle: '红楼梦', displayTitle: '《红楼梦・读西厢》', performer: '王派、徐派经典搭档', lyric: '花影移来书卷暖，春心一点入诗篇。' },
]

const aesthetics = [
  { key: 'costume', title: '服饰', desc: '水袖翻转之间，是含蓄与优雅的东方审美', img: imgCostume },
  { key: 'makeup', title: '妆容', desc: '一笔眼妆，一抹胭脂，勾勒角色的情绪与身份', img: imgMakeup },
  { key: 'headwear', title: '头饰', desc: '珠翠摇曳，是舞台之上的流光', img: imgHeadwear },
  { key: 'stage', title: '舞台', desc: '月洞门、花窗、栏杆、景片，共同组成诗意空间', img: imgStageSet },
]

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function todayRecommendationKey(recommendation: (typeof todayRecommendations)[number]) {
  return stableHash([
    recommendation.playTitle,
    recommendation.displayTitle,
    recommendation.performer,
    recommendation.lyric,
  ].join('|')).toString(36)
}

function getVisitorId() {
  const key = 'yueju_visitor_id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const next = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem(key, next)
  return next
}

function getRecommendationIdentity() {
  try {
    const user = JSON.parse(localStorage.getItem('yueju_user') || '{}') as { id?: number; username?: string }
    if (user.id || user.username) return `user:${user.id || user.username}`
  } catch {
    // fall through to browser visitor identity
  }
  return `visitor:${getVisitorId()}`
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('yueju_token')))
  const [recommendationIdentity, setRecommendationIdentity] = useState(() => getRecommendationIdentity())
  const [isCollected, setIsCollected] = useState(false)
  const [collectLoading, setCollectLoading] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => sampleQuestions())
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizFinished, setQuizFinished] = useState(false)

  const quizCurrent = quizQuestions[quizIndex]
  const quizSelected = quizCurrent ? quizAnswers[quizCurrent.id] : undefined
  const quizScore = useMemo(
    () => quizQuestions.reduce((total, question) => total + (quizAnswers[question.id] === question.answer ? 1 : 0), 0),
    [quizAnswers, quizQuestions],
  )

  const quizResult = useMemo(() => {
    if (quizScore === 10) return { title: '满分入戏！', text: '你对越剧基础知识非常熟悉，太漂亮了。' }
    if (quizScore >= 8) return { title: '很棒，底子很稳！', text: '大部分题都拿下了，再看几出经典剧目会更从容。' }
    if (quizScore >= 6) return { title: '不错，已经入门！', text: '你已经抓住了越剧的基本脉络，继续听戏会进步很快。' }
    return { title: '开了个好头！', text: '再来一组题，分数很快就能涨上去。' }
  }, [quizScore])

  const todayRecommendation = useMemo(() => {
    const index = stableHash(`${recommendationIdentity}:${todayKey()}`) % todayRecommendations.length
    return todayRecommendations[index]
  }, [recommendationIdentity])
  const activeTodayRecommendationKey = useMemo(() => todayRecommendationKey(todayRecommendation), [todayRecommendation])

  useEffect(() => {
    const syncAuth = () => {
      setIsAuthenticated(Boolean(localStorage.getItem('yueju_token')))
      setRecommendationIdentity(getRecommendationIdentity())
    }
    const syncAuthFromStorage = (event: StorageEvent) => {
      if (event.key === 'yueju_token' || event.key === 'yueju_user' || event.key === null) {
        syncAuth()
      }
    }

    window.addEventListener('storage', syncAuthFromStorage)
    window.addEventListener('yueju-auth-change', syncAuth)
    return () => {
      window.removeEventListener('storage', syncAuthFromStorage)
      window.removeEventListener('yueju-auth-change', syncAuth)
    }
  }, [])

  useEffect(() => {
    async function initTodayCollection() {
      if (!isAuthenticated) {
        setIsCollected(false)
        return
      }

      try {
        const interRes = await fetch(`/api/today-playlist/collection?recommendationKey=${encodeURIComponent(activeTodayRecommendationKey)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('yueju_token') || ''}` },
        })
        if (interRes.ok) {
          const interData = await interRes.json()
          setIsCollected(Boolean(interData.collected))
        } else {
          setIsCollected(false)
        }
      } catch (e) {
        console.error('初始化今日戏单失败', e)
        setIsCollected(false)
      }
    }
    initTodayCollection()
  }, [isAuthenticated, activeTodayRecommendationKey])

  const handleCollectToday = async () => {
    if (!isAuthenticated) {
      window.dispatchEvent(new Event('yueju-open-auth'))
      return
    }
    if (collectLoading) return

    setCollectLoading(true)
    try {
      const res = await fetch('/api/today-playlist/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('yueju_token') || ''}`,
        },
        body: JSON.stringify({
          recommendationKey: activeTodayRecommendationKey,
          playTitle: todayRecommendation.playTitle,
          displayTitle: todayRecommendation.displayTitle,
          performer: todayRecommendation.performer,
          lyric: todayRecommendation.lyric,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setIsCollected(data.collected)
        alert(data.collected ? '已收藏到我的戏单' : '已取消收藏')
      } else {
        alert(data.error || '操作失败，请稍后重试')
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setCollectLoading(false)
    }
  }

  const restartHomeQuiz = () => {
    setQuizQuestions(sampleQuestions())
    setQuizIndex(0)
    setQuizAnswers({})
    setQuizFinished(false)
  }

  const selectHomeQuizOption = (optionIndex: number) => {
    if (!quizCurrent || quizSelected !== undefined || quizFinished) return
    setQuizAnswers((prev) => ({ ...prev, [quizCurrent.id]: optionIndex }))
  }

  const goNextHomeQuiz = () => {
    if (!quizCurrent || quizSelected === undefined) return
    if (quizIndex === quizQuestions.length - 1) {
      setQuizFinished(true)
      return
    }
    setQuizIndex((prev) => prev + 1)
  }

  const scrollToAboutSection = () => {
    const target = document.getElementById('home-about-section')
    const navbarHeight = document.querySelector('.navbar')?.getBoundingClientRect().height ?? 80
    if (!target) return

    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - navbarHeight,
      behavior: 'smooth',
    })
  }

  return (
    <div className="home page">
      <div className="opening-curtain" aria-hidden="true">
        <div className="hero-curtain left"></div>
        <div className="hero-curtain right"></div>
      </div>
      {/* 1. 首屏视觉主区域 */}
      <section className="hero-section">
        <div className="hero-bg-slider" aria-hidden="true">
          <img src={heroImg} alt="" className="hero-bg slide-1" />
          <img src={heroBg2} alt="" className="hero-bg slide-2" />
          <img src={heroBg3} alt="" className="hero-bg slide-3" />
        </div>
        <div className="hero-overlay">
          <div className="petals"></div>
        </div>
        <div className="hero-lanterns">
          <GiLanternFlame className="lantern left-lantern" />
          <GiLanternFlame className="lantern right-lantern" />
        </div>
        
        <div className="hero-content reveal-up">
          <h1>越韵清音</h1>
          <p className="hero-subtitle reveal-up reveal-delay-1">
            在江南水韵与婉转清音中，走近越剧的舞台、人物与故事
          </p>
          <div className="hero-actions reveal-up reveal-delay-2">
            <Link to="/repertoire" className="btn-primary">进入看戏</Link>
            <button type="button" className="btn-outline" onClick={scrollToAboutSection}>开始探索</button>
            <Link to="/ai" className="btn-secondary">
              AI问戏
            </Link>
          </div>
          <div className="scroll-hint reveal-up reveal-delay-3">
            <span>向下滚动</span>
            <div className="scroll-arrow"></div>
          </div>
        </div>
      </section>

      {/* 2. 第二屏：一句话认识越剧 */}
      <section className="about-section" id="home-about-section">
        <div className="about-container">
          <div className="about-text reveal-up">
            <span className="section-eyebrow">越音初识</span>
            <h2 className="section-title-left">越剧是什么？</h2>
            <ul className="about-list">
              <li>起源于江南的中国戏曲艺术</li>
              <li>以婉转唱腔、细腻表演和诗意舞台见长</li>
              <li>代表作品包括《梁山伯与祝英台》《红楼梦》等</li>
              <li>是中国最具代表性的地方戏曲之一</li>
            </ul>
            <div className="about-actions">
              <Link to="/scroll" className="link-with-arrow">了解发展历史 <FaChevronRight /></Link>
            </div>
          </div>
          <div className="about-visual reveal-up reveal-delay-1">
            <img src={imgAbout} alt="越剧之美" className="about-img" />
            <div className="about-deco-frame"></div>
          </div>
        </div>
      </section>

      {/* 3. 第三屏：越剧长卷入口区 */}
      <section className="history-scroll-section">
        <div className="history-container">
          <span className="section-eyebrow section-eyebrow-center reveal-up">百年长卷</span>
          <h2 className="section-title reveal-up">循着一卷江南清梦，读懂越剧的来处</h2>
          <div className="history-timeline">
            {historyNodes.map((node, i) => (
              <div key={i} className={`history-node reveal-up reveal-delay-${i + 1}`}>
                <div className="node-time">{node.time}</div>
                <div className="node-dot"></div>
                <div className="node-card">
                  <h3>{node.title}</h3>
                  <p>{node.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="history-action">
            <Link to="/scroll" className="node-link">展开了解 <FaChevronRight /></Link>
          </div>
        </div>
      </section>

      {/* 4. 第四屏：经典剧目推荐区 */}
      <section className="repertoire-section">
        <div className="repertoire-container">
          <span className="section-eyebrow section-eyebrow-center reveal-up">经典戏单</span>
          <h2 className="section-title reveal-up">今夜开戏：不可错过的经典剧目</h2>
          <div className="rep-grid">
            {repertoire.map((rep, i) => (
              <Link to="/repertoire" key={i} className={`rep-card reveal-up reveal-delay-${i + 1}`}>
                <div className="rep-img-wrapper">
                  <img src={rep.img} alt={rep.title} />
                  <div className="rep-hover-overlay">
                    <div className="rep-quote">"{rep.quote}"</div>
                  </div>
                  <div className="rep-border-deco"></div>
                </div>
                <div className="rep-info">
                  <h3>{rep.title}</h3>
                  <p>{rep.desc}</p>
                  <div className="rep-tags">
                    {rep.tags.map(tag => <span key={tag} className="rep-tag">{tag}</span>)}
                  </div>
                  <span className="rep-enter">进入剧目页 <FaChevronRight /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 第五屏：名家演员 / 流派入口区 */}
      <section className="artists-schools-section">
        <div className="as-container">
          <div className="as-left reveal-up">
            <span className="section-eyebrow">台上名家</span>
            <h2 className="section-title-left">台上有风华，台下有传奇</h2>
            <div className="artists-list">
              <div className="artist-item">
                <img src={imgHistory} alt="袁雪芬" className="artist-avatar" />
                <div className="artist-info">
                  <h4>袁雪芬</h4>
                  <p>袁派创始人 / 代表作《祥林嫂》</p>
                </div>
              </div>
              <div className="artist-item">
                <img src={imgYin} alt="尹桂芳" className="artist-avatar" />
                <div className="artist-info">
                  <h4>尹桂芳</h4>
                  <p>尹派创始人 / 代表作《红楼梦》</p>
                </div>
              </div>
              <div className="artist-item">
                <img src={imgFan} alt="范瑞娟" className="artist-avatar" />
                <div className="artist-info">
                  <h4>范瑞娟</h4>
                  <p>范派创始人 / 代表作《梁山伯与祝英台》</p>
                </div>
              </div>
            </div>
            <Link to="/schools#artists" className="btn-outline as-btn">了解人物</Link>
          </div>
          
          <div className="as-divider"></div>

          <div className="as-right reveal-up reveal-delay-1">
            <span className="section-eyebrow">流派声腔</span>
            <h2 className="section-title-left">一腔一调，各有风骨</h2>
            <div className="schools-bubbles">
              {['袁派', '傅派', '徐派', '王派', '吕派'].map((school, i) => (
                <div key={school} className={`school-bubble anim-float-${i % 3}`}>
                  <span>{school}</span>
                  <button className="play-audio-btn" title="试听唱腔"><FaPlayCircle /></button>
                </div>
              ))}
            </div>
            <Link to="/schools" className="btn-outline as-btn">进入流派详情</Link>
          </div>
        </div>
      </section>

      {/* 6. 第六屏：舞台美学区 */}
      <section className="aesthetics-section">
        <div className="aes-container">
          <span className="section-eyebrow section-eyebrow-center reveal-up">舞台美学</span>
          <h2 className="section-title reveal-up">一方戏台，藏着越剧最美的细节</h2>
          <div className="aes-grid">
            {aesthetics.map((aes, i) => (
              <div key={aes.key} className={`aes-card aes-${aes.key} reveal-up reveal-delay-${i + 1}`}>
                <div className="aes-img">
                  <img src={aes.img} alt={aes.title} />
                </div>
                <div className="aes-text">
                  <h3>{aes.title}</h3>
                  <p>{aes.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="aes-action reveal-up reveal-delay-4">
            <Link to="/backstage#frontstage-details" className="btn-primary aes-front-btn">
              探索台前
            </Link>
          </div>
        </div>
      </section>

      {/* 7. 第七屏：数字档案 / 幕后台前区 */}
      <section className="archive-bts-section">
        <div className="archive-bts-container">
          <div className="bts-card reveal-up reveal-delay-1">
            <GiPaintBrush className="bg-icon" />
            <h3>一出戏背后的故事</h3>
            <ul className="bts-list">
              <li>化妆间</li>
              <li>排练厅</li>
              <li>乐队伴奏</li>
              <li>换装与走台</li>
            </ul>
            <Link to="/backstage#backstage-details" className="btn-outline archive-btn">走进幕后</Link>
          </div>
          <div className="archive-bts-image reveal-up reveal-delay-2">
            <img src={backstagePreview} alt="越剧幕后准备场景" />
          </div>
        </div>
      </section>

      {/* 8. 第八屏：AI互动主打区 */}
      <section className="ai-section" id="home-ai-section">
        <div className="ai-container">
          <span className="section-eyebrow section-eyebrow-center reveal-up">数字问戏</span>
          <h2 className="section-title reveal-up">不止看戏，你还可以与越剧对话</h2>
          <div className="ai-cards">
            <div className="ai-card reveal-up">
              <div className="ai-icon-bg"><FaRobot /></div>
              <h3>AI 问戏</h3>
              <p>问越剧历史 · 问剧目人物 · 问唱词含义 · 问流派区别</p>
              <div className="ai-mock-input">
                <FaSearch className="mock-icon" />
                <span className="mock-text">例如：越剧和昆曲有什么不同？</span>
              </div>
              <Link to="/ai" className="btn-primary">立即提问</Link>
            </div>
            <div className="ai-card reveal-up reveal-delay-1">
              <div className="ai-icon-bg"><FaMagic /></div>
              <h3>AI 造梦工坊</h3>
              <p>生成越剧人物形象 · 生成江南戏台场景 · 古风海报</p>
              <div className="ai-mock-gallery">
                <div className="mock-pic" style={{ backgroundImage: `url(${aiCharacter})` }}></div>
                <div className="mock-pic" style={{ backgroundImage: `url(${aiStage})` }}></div>
                <div className="mock-pic" style={{ backgroundImage: `url(${aiPoster})` }}></div>
              </div>
              <Link to="/ai" className="btn-outline">立即生成</Link>
            </div>
          </div>
          <div className="home-quiz-section reveal-up reveal-delay-2">
            <div className="home-quiz-heading">
              <div className="home-quiz-icon"><FaQuestionCircle /></div>
              <div>
                <h3>越剧小测</h3>
                <p>听过一段越音，也来试试你记住了多少。</p>
              </div>
            </div>

            {quizFinished ? (
              <div className="home-quiz-result">
                <div>
                  <strong>{quizScore}</strong>
                  <span>/10</span>
                </div>
                <h4>{quizResult.title}</h4>
                <p>{quizResult.text}</p>
                <button type="button" className="home-quiz-next" onClick={restartHomeQuiz}>
                  <FaRedo /> 再来一组
                </button>
              </div>
            ) : quizCurrent ? (
              <div className="home-quiz-panel">
                <div className="home-quiz-topline">
                  <span>第 {quizIndex + 1}/10 题</span>
                  <span>得分 {quizScore}</span>
                </div>
                <h4>{quizCurrent.question}</h4>
                <div className="home-quiz-options">
                  {quizCurrent.options.map((option, optionIndex) => {
                    const isSelected = quizSelected === optionIndex
                    const isAnswer = quizCurrent.answer === optionIndex
                    const optionClass = [
                      'home-quiz-option',
                      isSelected ? 'selected' : '',
                      quizSelected !== undefined && isAnswer ? 'correct' : '',
                      quizSelected !== undefined && isSelected && !isAnswer ? 'wrong' : '',
                    ].filter(Boolean).join(' ')

                    return (
                      <button
                        type="button"
                        className={optionClass}
                        key={option}
                        onClick={() => selectHomeQuizOption(optionIndex)}
                        disabled={quizSelected !== undefined}
                      >
                        <span>{String.fromCharCode(65 + optionIndex)}</span>
                        {option}
                      </button>
                    )
                  })}
                </div>
                {quizSelected !== undefined && (
                  <div className={`home-quiz-note ${quizSelected === quizCurrent.answer ? 'right' : 'miss'}`}>
                    {quizSelected === quizCurrent.answer ? <FaCheckCircle /> : <FaTimesCircle />}
                    <div>
                      <strong>{quizSelected === quizCurrent.answer ? '答对啦' : `正确答案：${quizCurrent.options[quizCurrent.answer]}`}</strong>
                      <p>{quizCurrent.note}</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="home-quiz-next"
                  onClick={goNextHomeQuiz}
                  disabled={quizSelected === undefined}
                >
                  {quizIndex === quizQuestions.length - 1 ? '查看结果' : '下一题'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 9. 第九屏：今日推荐 / 个性化入口 */}
      <section className="today-section">
        <div className="today-container reveal-up">
          <span className="section-eyebrow section-eyebrow-center">今日推荐</span>
          <h2 className="section-title">今日戏单</h2>
          <div className="today-content">
            <div className="today-item">
              <span className="today-label">今日推荐剧目</span>
              <h4>{todayRecommendation.displayTitle}</h4>
            </div>
            <div className="today-item">
              <span className="today-label">今日推荐演员</span>
              <h4>{todayRecommendation.performer}</h4>
            </div>
            <div className="today-item quote-item">
              <span className="today-label">今日唱词</span>
              <blockquote>"{todayRecommendation.lyric}"</blockquote>
            </div>
          </div>
          <button
            className="btn-primary today-btn"
            onClick={handleCollectToday}
            disabled={collectLoading}
          >
            {collectLoading ? '处理中...' : isCollected ? '已收藏' : '收藏到我的戏单'}
          </button>
        </div>
      </section>

      {/* 10. 第十屏：结尾召唤区 */}
      <section className="cta-section">
        <div className="cta-overlay"></div>
        <GiLanternFlame className="cta-lantern" />
        <div className="cta-content reveal-up">
          <span className="section-eyebrow section-eyebrow-center">余音未尽</span>
          <h2>一声越音未尽，下一幕由你开启</h2>
          <div className="cta-buttons">
            <Link to="/repertoire" className="btn-primary">去看经典剧目</Link>
            <Link to="/ai" className="btn-secondary">去问 AI</Link>
            <Link to="/ai" className="btn-outline">去生成海报</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
