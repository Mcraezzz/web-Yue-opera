import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { FaSearch, FaSignOutAlt, FaUserCircle } from 'react-icons/fa'
import './Navbar.css'

const navItems = [
  { path: '/', label: '首页' },
  { path: '/scroll', label: '越剧长卷' },
  { path: '/repertoire', label: '经典剧目' },
  { path: '/schools', label: '名家流派' },
  { path: '/backstage', label: '台前幕后' },
  { path: '/news', label: '新闻资讯' },
  { path: '/ai', label: 'AI入戏' },
]

export default function Navbar({ onOpenAuth }: { onOpenAuth: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('yueju_token')))

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const syncAuthState = () => setIsAuthenticated(Boolean(localStorage.getItem('yueju_token')))

    window.addEventListener('storage', syncAuthState)
    window.addEventListener('yueju-auth-change', syncAuthState)
    return () => {
      window.removeEventListener('storage', syncAuthState)
      window.removeEventListener('yueju-auth-change', syncAuthState)
    }
  }, [])

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
    setMenuOpen(false)
    navigate('/')
  }

  const isHomePage = location.pathname === '/'
  const navClass = scrolled === 0 ? 'transparent' : scrolled < 120 ? 'semi' : 'solid'
  const pageClass = isHomePage ? 'home-nav' : ''
  const logoSrc = isAuthenticated
    ? '/logo-user.svg?v=ai-gold-seal-20260602'
    : '/logo-guest.svg?v=ai-white-seal-20260602'

  return (
    <nav className={`navbar ${navClass} ${pageClass}`}>
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-logo">
          <img src={logoSrc} alt="越韵清音" className="brand-logo-img" width="40" height="40" />
          <span className="logo-text">越韵清音</span>
        </NavLink>

        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar-collapse ${menuOpen ? 'show' : ''}`}>
          <ul className="navbar-menu">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => setMenuOpen(false)}
                  end={item.path === '/'}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="navbar-actions">
            <Link to="/search" className="search-btn" title="搜索/分类" onClick={() => setMenuOpen(false)}>
              <FaSearch />
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="profile-btn" onClick={() => setMenuOpen(false)}>
                  <FaUserCircle /> 个人主页
                </Link>
                <button className="logout-btn" onClick={handleLogout} title="退出登录">
                  <FaSignOutAlt /> 退出登录
                </button>
              </>
            ) : (
              <button
                className="login-btn"
                onClick={() => {
                  setMenuOpen(false)
                  onOpenAuth()
                }}
              >
                登录/注册
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
