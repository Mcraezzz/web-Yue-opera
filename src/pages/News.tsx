import { useEffect, useState } from 'react'
import './PageCommon.css'
import { recordHistory } from '../hooks/useHistory'
import { FaNewspaper } from 'react-icons/fa'
import newsHeaderBg from '../assets/img/微信图片_20260423200920_33_793.png'

interface NewsItem {
  id: number
  title: string
  date: string
  category: string
  summary: string
  sourceUrl?: string
}

export default function News() {
  const [newsList, setNewsList] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)

    fetch('/api/news')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || '新闻加载失败')
        setNewsList(data.items || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : '新闻加载失败'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-container">
      <div className="page-header dark-header news-header">
        <img src={newsHeaderBg} alt="" className="news-header-bg" />
        <div className="news-header-overlay"></div>
        <FaNewspaper className="page-header-icon reveal-scale" />
        <h1 className="reveal-up">新闻资讯</h1>
        <p className="reveal-up reveal-delay-1">越剧动态，实时关注。最新行业资讯与演出信息。</p>
      </div>

      <div className="page-content">
        <section className="content-section">
          {loading && <div className="empty-state">加载中...</div>}
          {error && <div className="empty-state">{error}</div>}
          {!loading && !error && (
            <div className="news-list">
              {newsList.map((news, i) => (
                <article className={`news-item reveal-up reveal-delay-${(i % 4) + 1}`} key={news.id}>
                  <div className="news-meta">
                    <span className="news-date">{news.date}</span>
                    <span className="news-category">{news.category}</span>
                  </div>
                  <h3 className="news-title">{news.title}</h3>
                  <p className="news-summary">{news.summary}</p>
                  <a
                    href={news.sourceUrl || '#'}
                    className="news-link"
                    target={news.sourceUrl ? '_blank' : undefined}
                    rel={news.sourceUrl ? 'noopener noreferrer' : undefined}
                    onClick={() =>
                      recordHistory({
                        title: news.title,
                        desc: news.category,
                        path: '/news',
                      })
                    }
                  >
                    阅读全文 →
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
