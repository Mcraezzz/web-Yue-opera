export interface HistoryItem {
  title: string
  desc: string
  time: string
  path?: string
}

function getToken() {
  return localStorage.getItem('yueju_token') || ''
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function recordHistory(item: Omit<HistoryItem, 'time'>) {
  if (!getToken()) return

  fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(item),
  }).catch(() => undefined)
}

export function getHistory(): HistoryItem[] {
  return []
}

export async function clearHistory() {
  if (!getToken()) return

  await fetch('/api/history', {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
