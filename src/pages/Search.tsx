import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowRight, FaSearch } from 'react-icons/fa'
import './PageCommon.css'
import './Search.css'

interface SearchItem {
  title: string
  category: string
  desc: string
  path?: string
  score?: number
  matchedBy?: string
  source?: string
}

interface SearchEntry extends SearchItem {
  path: string
  hint: string
}

const featuredEntries: SearchEntry[] = [
  {
    title: '越剧长卷',
    category: '历史',
    desc: '从落地唱书到新越剧改革，沿时间轴阅读越剧的百年流变。',
    path: '/scroll',
    hint: '发展脉络'
  },
  {
    title: '梁山伯与祝英台',
    category: '剧目',
    desc: '越剧代表性经典剧目，讲述梁祝之间的凄美爱情故事。',
    path: '/repertoire',
    hint: '经典剧目'
  },
  {
    title: '名家荟萃',
    category: '演员',
    desc: '认识茅威涛、王文娟、何赛飞等越剧名家的艺术人生。',
    path: '/schools#artists',
    hint: '人物档案'
  },
  {
    title: '流派风华',
    category: '流派',
    desc: '袁派、傅派、徐派、王派、吕派各有声腔风骨。',
    path: '/schools',
    hint: '名家流派'
  }
]

const fixedCategories = ['全部', '剧目', '新闻', '流派', '演员', '历史', '唱腔', '舞台', '服饰', '视频']

const routeByCategory: Record<string, string> = {
  剧目: '/repertoire',
  新闻: '/news',
  流派: '/schools',
  演员: '/schools#artists',
  历史: '/scroll',
  唱腔: '/schools',
  舞台: '/backstage',
  服饰: '/backstage',
  视频: '/repertoire'
}

const titleRoutes: Record<string, string> = {
  越剧的诞生: '/scroll',
  女子越剧的兴起: '/scroll',
  梁祝经典片段: '/repertoire',
  天上掉下个林妹妹: '/repertoire',
  袁雪芬: '/schools',
  徐玉兰: '/schools',
  王文娟: '/schools#artists'
}

function normalizeCategory(category: string) {
  return category
}

function getEntry(item: SearchItem): SearchEntry {
  const category = normalizeCategory(item.category)
  return {
    ...item,
    category,
    path: item.path || titleRoutes[item.title] || routeByCategory[category] || '/',
    hint: category
  }
}

export default function Search() {
  const [keyword, setKeyword] = useState('')
  const [submittedKeyword, setSubmittedKeyword] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [categories, setCategories] = useState<string[]>(fixedCategories)
  const [items, setItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const hasSearched = submittedKeyword.trim().length > 0 || activeCategory !== '全部'

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const requestKeyword = hasSearched ? (submittedKeyword || activeCategory) : ''
      const params = new URLSearchParams({
        keyword: requestKeyword,
        category: activeCategory,
      })

      setLoading(true)
      setError('')
      fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) throw new Error(data?.error || '搜索失败')
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(data.categories.map((cat: string) => normalizeCategory(cat)))
          }
          setItems((data.items || []).map((item: SearchItem) => ({
            ...item,
            category: normalizeCategory(item.category)
          })))
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setError(err instanceof Error ? err.message : '搜索失败')
          }
        })
        .finally(() => setLoading(false))
    }, 220)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [submittedKeyword, activeCategory, hasSearched])

  const entries = useMemo(() => {
    const normalizedItems = items.map(getEntry)
    if (activeCategory === '全部') return normalizedItems
    return normalizedItems.filter((item) => item.category === activeCategory)
  }, [items, activeCategory])
  const suggestions = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized || hasSearched) return []
    return entries
      .filter((item) => `${item.title}${item.category}${item.desc}`.toLowerCase().includes(normalized))
      .slice(0, 5)
  }, [entries, keyword, hasSearched])

  const visibleResults = hasSearched ? entries.slice(0, 9) : featuredEntries

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmittedKeyword(keyword.trim())
  }

  const handleSuggestion = (title: string) => {
    setKeyword(title)
    setSubmittedKeyword(title)
  }

  return (
    <div className={`search-page page ${hasSearched ? 'searched' : ''}`}>
      <section className="search-hero">
        <div className="search-hero-inner reveal-up">
          <span className="search-eyebrow">越韵清音 · 全站索引</span>
          <h1>寻一声越韵</h1>
          <p>输入剧目、流派、人物或历史节点，快速抵达你想看的内容。</p>

          <form className="search-panel" onSubmit={handleSubmit}>
            <FaSearch className="search-panel-icon" />
            <input
              type="text"
              placeholder="搜索 梁祝、王文娟、袁派、越剧的诞生..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                if (submittedKeyword) setSubmittedKeyword('')
              }}
              className="search-input"
            />
            <button type="submit">搜索</button>
          </form>

          {suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((item) => (
                <button key={`${item.category}-${item.title}`} type="button" onClick={() => handleSuggestion(item.title)}>
                  <span>{item.category}</span>
                  {item.title}
                </button>
              ))}
            </div>
          )}

          {!hasSearched && (
            <div className="search-quick-links">
              {featuredEntries.map((item) => (
                <button key={item.title} type="button" onClick={() => handleSuggestion(item.title)}>
                  {item.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="search-content">
        <div className="search-content-head reveal-up">
          <div>
            <span className="search-section-kicker">{hasSearched ? '搜索结果' : '精选入口'}</span>
            <h2>{hasSearched ? `关于“${submittedKeyword || activeCategory}”` : '先从这些内容开始'}</h2>
          </div>
          {hasSearched && <p>{loading ? '正在检索...' : `显示 ${visibleResults.length} 条相关内容`}</p>}
        </div>

        <div className="search-category-tabs reveal-up reveal-delay-1">
          {categories.map((cat) => (
            <button
              key={cat}
              className={activeCategory === cat ? 'active' : ''}
              onClick={() => {
                setActiveCategory(cat)
                if (cat !== '全部' && !submittedKeyword) setSubmittedKeyword(keyword.trim() || cat)
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {error && <div className="search-empty">{error}</div>}
        {!error && !loading && visibleResults.length === 0 && (
          <div className="search-empty">没有找到匹配内容，换个关键词试试。</div>
        )}

        {!error && (
          <div className="search-result-grid">
            {visibleResults.map((item) => (
              <Link className="search-result-card" to={item.path} key={`${item.category}-${item.title}`}>
                <span className="result-category">{item.hint}</span>
                {hasSearched && (
                  <div className="result-meta">
                    <span>{item.matchedBy || '语义检索'}</span>
                    {item.source && <span>{item.source}</span>}
                    {typeof item.score === 'number' && item.score > 0 && <span>{item.score.toFixed(1)}</span>}
                  </div>
                )}
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <div className="result-link">
                  前往查看 <FaArrowRight />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
