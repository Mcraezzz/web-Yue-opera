import { useState, useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { GiPagoda } from 'react-icons/gi'
import { FaAngleDoubleUp } from 'react-icons/fa'
import Navbar from './Navbar'
import AuthModal from './AuthModal'
import ChatWidget from './ChatWidget'
import './Layout.css'

export default function Layout() {
  const location = useLocation()
  const [authOpen, setAuthOpen] = useState(false)
  const [showBackTop, setShowBackTop] = useState(false)

  useEffect(() => {
    const openAuth = () => setAuthOpen(true)
    window.addEventListener('yueju-open-auth', openAuth)
    return () => window.removeEventListener('yueju-open-auth', openAuth)
  }, [])

  useEffect(() => {
    const updateBackTop = () => {
      const isHomeFirstScreen =
        location.pathname === '/' && window.scrollY < Math.max(window.innerHeight - 80, 480)
      setShowBackTop(!isHomeFirstScreen)
    }

    updateBackTop()
    window.addEventListener('scroll', updateBackTop, { passive: true })
    window.addEventListener('resize', updateBackTop)
    return () => {
      window.removeEventListener('scroll', updateBackTop)
      window.removeEventListener('resize', updateBackTop)
    }
  }, [location.pathname])

  useEffect(() => {
    // Trigger route transition animation
    const wrapper = document.querySelector('.route-wrapper') as HTMLElement | null
    if (wrapper) {
      wrapper.style.animation = 'none'
      void wrapper.offsetHeight // force reflow
      wrapper.style.animation = ''
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    // Wait for DOM to render after route change
    const timeout = setTimeout(() => {
      const elements = document.querySelectorAll(
        '.reveal-up, .reveal-left, .reveal-right, .reveal-scale, .line-draw'
      )
      elements.forEach((el) => observer.observe(el))
    }, 100)

    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [location.pathname])

  // Global button ripple effect
  useEffect(() => {
    const selectors =
      '.btn-primary, .btn-outline, .btn-secondary, .play-action-btn, .interaction-btn, .login-btn, .search-btn, .profile-btn, .logout-btn, .comment-input-area button, .artist-card, .layout-back-top'

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const btn = target.closest<HTMLElement>(selectors)
      if (!btn) return

      const rect = btn.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const ripple = document.createElement('span')
      ripple.classList.add('ripple')
      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`

      // Auto-detect ripple color based on button background
      const computedStyle = window.getComputedStyle(btn)
      const bgColor = computedStyle.backgroundColor
      const isDark =
        bgColor.includes('rgb(21, 23, 26)') ||
        bgColor.includes('rgb(166,') ||
        bgColor.includes('rgba(0, 0, 0') ||
        bgColor.includes('transparent')
      ripple.style.background = isDark
        ? 'rgba(255, 255, 255, 0.25)'
        : 'rgba(166, 58, 72, 0.2)'

      btn.classList.add('ripple-container')
      btn.appendChild(ripple)

      const cleanup = () => {
        ripple.remove()
        if (!btn.querySelector('.ripple')) {
          btn.classList.remove('ripple-container')
        }
      }
      ripple.addEventListener('animationend', cleanup)
      setTimeout(cleanup, 700)
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  return (
    <div className="layout">
      <Navbar onOpenAuth={() => setAuthOpen(true)} />
      <main className="main-content">
        <div className="route-wrapper">
          <Outlet />
        </div>
      </main>
      <footer className="footer">
        <div className="footer-pattern"></div>
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <GiPagoda className="footer-logo-icon" />
              <h3>越韵清音</h3>
              <p>在江南水韵与婉转清音中，传承东方美学。</p>
            </div>
            <div className="footer-links">
              <h4>快捷导航</h4>
              <ul>
                <li><Link to="/">首页</Link></li>
                <li><Link to="/scroll">越剧长卷</Link></li>
                <li><Link to="/repertoire">经典剧目</Link></li>
                <li><Link to="/schools">名家流派</Link></li>
                <li><Link to="/backstage">台前幕后</Link></li>
                <li><Link to="/news">新闻资讯</Link></li>
                <li><Link to="/ai">AI入戏</Link></li>
              </ul>
            </div>
            <div className="footer-contact">
              <h4>浙江省嵊州市越剧文化博物馆</h4>
              <p>电话: 0575-83022152</p>
              <p>地址: 浙江省绍兴市嵊州市百步街8号</p>
              <p>开放时间: 周二至周日 09:00-16:00</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 越韵清音 — 传承经典，弘扬国粹</p>
            <p className="footer-collab">特别鸣谢: 地方戏曲数字化保护项目</p>
          </div>
        </div>
      </footer>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <ChatWidget />
      <button
        type="button"
        className={`layout-back-top ${showBackTop ? 'show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        title="Back to top"
      >
        <FaAngleDoubleUp />
      </button>
    </div>
  )
}
