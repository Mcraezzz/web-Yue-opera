import { Fragment } from 'react'
import { Link } from 'react-router-dom'

interface RichMessageProps {
  content: string
}

const internalPathPattern = /\/(?:repertoire|schools|scroll|news|backstage|ai|profile|search)(?:#[A-Za-z0-9_-]+)?(?:\?[A-Za-z0-9=&%_.-]+)?/g
const sectionTitlePattern = /【(?:AI\s*综合回答|站内资料引用|相关入口|相关剧目|相关流派)】/

function formatMessageContent(content: string) {
  return content
    .replace(/\r\n?/g, '\n')
    .replace(/\s*(【(?:AI\s*综合回答|站内资料引用|相关入口|相关剧目|相关流派)】)\s*/g, '\n\n$1\n\n')
    .replace(/([^\n])\s+(\d+\.\s*【)/g, '$1\n$2')
    .replace(/([^\n])\s+(-\s*\/(?:repertoire|schools|scroll|news|backstage|ai|profile|search))/g, '$1\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trimStart()
}

export default function RichMessage({ content }: RichMessageProps) {
  const formattedContent = sectionTitlePattern.test(content) ? formatMessageContent(content) : content
  const parts: Array<string | { path: string }> = []
  let cursor = 0

  for (const match of formattedContent.matchAll(internalPathPattern)) {
    const path = match[0]
    const index = match.index ?? 0
    if (index > cursor) {
      parts.push(formattedContent.slice(cursor, index))
    }
    parts.push({ path })
    cursor = index + path.length
  }

  if (cursor < formattedContent.length) {
    parts.push(formattedContent.slice(cursor))
  }

  return (
    <span className="rich-message">
      {parts.map((part, index) => (
        typeof part === 'string' ? (
          <Fragment key={`${index}-${part.slice(0, 8)}`}>{part}</Fragment>
        ) : (
          <Link className="rich-message-link" key={`${index}-${part.path}`} to={part.path}>
            {part.path}
          </Link>
        )
      ))}
    </span>
  )
}
