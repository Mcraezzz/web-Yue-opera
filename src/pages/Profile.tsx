import { useState, useEffect, useCallback, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaCommentDots, FaHeart, FaHistory, FaSignOutAlt, FaStar, FaTrash } from 'react-icons/fa'
import './Profile.css'
import { clearHistory } from '../hooks/useHistory'
import img1 from '../assets/generated/liangzhu-stage.jpg'
import img2 from '../assets/generated/hongloumeng-stage.jpg'

type TabKey = 'likes' | 'collections' | 'comments' | 'history'

interface ProfileUser {
  nickname: string
  bio: string
}

interface ProfileItem {
  title: string
  desc: string
  time: string
  image?: string
  path?: string
}

interface ProfileResponse {
  user: ProfileUser
  activities: Record<TabKey, ProfileItem[]>
}

const tabItems: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: 'likes', label: '我的点赞', icon: <FaHeart /> },
  { key: 'collections', label: '我的收藏', icon: <FaStar /> },
  { key: 'comments', label: '我的评论', icon: <FaCommentDots /> },
  { key: 'history', label: '浏览记录', icon: <FaHistory /> },
]

const fallbackProfile: ProfileResponse = {
  user: {
    nickname: '戏曲爱好者A8848',
    bio: '愿在江南水韵与婉转清音中，寻一处心灵栖息地。',
  },
  activities: {
    likes: [],
    collections: [],
    comments: [],
    history: [],
  },
}

export default function Profile() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('likes')
  const [profile, setProfile] = useState<ProfileResponse>(fallbackProfile)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('yueju_token')))
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('yueju_token')))

  const loadProfile = useCallback(() => {
    const token = localStorage.getItem('yueju_token')
    setIsAuthenticated(Boolean(token))
    if (!token) {
      setProfile(fallbackProfile)
      setError('')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || '个人中心数据加载失败')
        setProfile(data)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '个人中心数据加载失败')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    const frame = window.requestAnimationFrame(loadProfile)

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'yueju_token' || event.key === 'yueju_user' || event.key === null) {
        loadProfile()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('yueju-auth-change', loadProfile)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('yueju-auth-change', loadProfile)
    }
  }, [loadProfile])

  const handleLogout = () => {
    const token = localStorage.getItem('yueju_token')
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined)
    }
    localStorage.removeItem('yueju_token')
    localStorage.removeItem('yueju_user')
    window.dispatchEvent(new Event('yueju-auth-change'))
    navigate('/')
  }

  const handleClearHistory = async () => {
    await clearHistory()
    setProfile((prev) => ({
      ...prev,
      activities: {
        ...prev.activities,
        history: [],
      },
    }))
  }

  const getHistoryPath = (path?: string) => {
    const normalized = path?.trim()
    if (!normalized || normalized.startsWith('http')) return ''
    return normalized.startsWith('/') ? normalized : `/${normalized}`
  }

  const handleHistoryNavigate = (path?: string) => {
    const target = getHistoryPath(path)
    if (target) navigate(target)
  }

  const handleHistoryKeyDown = (event: KeyboardEvent<HTMLDivElement>, path?: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const target = getHistoryPath(path)
    if (!target) return
    event.preventDefault()
    navigate(target)
  }

  const renderList = (items: ProfileItem[]) => {
    if (loading) return <div className="empty-state">加载中...</div>
    if (error) return <div className="empty-state">{error}</div>
    if (items.length === 0) return <div className="empty-state">暂无记录</div>

    return (
      <>
        {activeTab === 'history' && items.length > 0 && (
          <div className="history-toolbar">
            <span>共 {items.length} 条记录</span>
            <button className="clear-history-btn" onClick={handleClearHistory}>
              <FaTrash /> 清空记录
            </button>
          </div>
        )}
        {items.map((item, i) => {
          const itemTarget = getHistoryPath(item.path)

          return (
            <div
              key={`${item.title}-${i}`}
              className={`profile-item${itemTarget ? ' is-clickable' : ''}`}
              role={itemTarget ? 'button' : undefined}
              tabIndex={itemTarget ? 0 : undefined}
              title={itemTarget ? '点击查看内容' : undefined}
              onClick={itemTarget ? () => handleHistoryNavigate(item.path) : undefined}
              onKeyDown={itemTarget ? (event) => handleHistoryKeyDown(event, item.path) : undefined}
            >
              <img src={item.image || (i % 2 === 0 ? img1 : img2)} alt={item.title} />
              <div className="item-details">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
                <span className="item-time">{item.time}</span>
              </div>
            </div>
          )
        })}
      </>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="page-container profile-page">
        <div className="profile-header dark-header">
          <div className="profile-user reveal-up">
            <div className="profile-avatar">越</div>
            <div className="profile-info">
              <h2>请先登录</h2>
              <p>登录后可查看点赞、收藏、评论与浏览记录。</p>
            </div>
          </div>
        </div>
        <div className="profile-content reveal-up reveal-delay-1">
          <div className="profile-main profile-login-state">
            <div className="empty-state">
              当前未登录，请从右上角“登录/注册”进入账号。
              <Link to="/" className="profile-home-link">返回首页</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container profile-page">
      <div className="profile-header dark-header">
        <div className="profile-user reveal-up">
          <div className="profile-avatar">越</div>
          <div className="profile-info">
            <h2>{profile.user.nickname}</h2>
            <p>{profile.user.bio}</p>
          </div>
          <button className="profile-logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> 退出登录
          </button>
        </div>
      </div>
      <div className="profile-content reveal-up reveal-delay-1">
        <div className="profile-sidebar">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="profile-main">
          <div className="profile-list">
            {renderList(profile.activities[activeTab])}
          </div>
        </div>
      </div>
    </div>
  )
}
