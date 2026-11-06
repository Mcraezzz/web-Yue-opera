import { useState, type FormEvent } from 'react'
import { FaTimes } from 'react-icons/fa'
import './AuthModal.css'

interface AuthUser {
  id: string
  username: string
  nickname: string
  bio: string
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthenticated?: (user: AuthUser) => void
}

export default function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(isLogin ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          nickname: username,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || '认证失败，请稍后重试')
      }

      localStorage.setItem('yueju_token', data.token)
      localStorage.setItem('yueju_user', JSON.stringify(data.user))
      window.dispatchEvent(new Event('yueju-auth-change'))
      onAuthenticated?.(data.user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '认证失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setConfirmPassword('')
  }

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose} aria-label="关闭">
          <FaTimes />
        </button>
        <h2>{isLogin ? '登录越韵清音' : '注册账号'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="用户名 / 邮箱"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {!isLogin && (
            <input
              type="password"
              placeholder="确认密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          )}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? '提交中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
        <p className="auth-switch" onClick={switchMode}>
          {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
        </p>
      </div>
    </div>
  )
}
