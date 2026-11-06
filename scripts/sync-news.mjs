import mysql from 'mysql2/promise'

const news = [
  {
    title: '第六届中国越剧艺术节拟入选作品名单公示',
    date: '2026-04-23',
    category: '艺术节资讯',
    summary: '文化和旅游部发布第六届中国越剧艺术节拟入选作品名单，参演作品遴选工作已结束，公示时间为2026年4月23日至29日。',
    sourceUrl: 'https://zwgk.mct.gov.cn/zfxxgkml/wysy/202604/t20260423_965565.html',
  },
  {
    title: '文化和旅游部同意备案浙江省第六届中国越剧艺术节',
    date: '2026-04-20',
    category: '行业动态',
    summary: '文化和旅游部同意于2026年5月15日至6月12日在浙江省绍兴市举办第六届中国越剧艺术节，主办单位为浙江省人民政府、文化和旅游部。',
    sourceUrl: 'https://www.mct.gov.cn/whzx/zxgz/jqhdgl/202604/t20260420_965506.htm',
  },
  {
    title: '第六届中国越剧艺术节申报事项发布',
    date: '2026-04-01',
    category: '申报通知',
    summary: '文化和旅游部艺术司发布申报事项，第六届中国越剧艺术节将于2026年5月中旬至6月中旬在浙江绍兴举办。',
    sourceUrl: 'https://zwgk.mct.gov.cn/zfxxgkml/wysy/202604/t20260401_965258.html',
  },
  {
    title: '越剧薪火相传120年',
    date: '2026-03-31',
    category: '文化传承',
    summary: '人民网刊发人民日报报道，聚焦越剧诞生120年及“传百廿越韵 承时代新声”座谈会，展现越剧在新时代的传承与创新。',
    sourceUrl: 'https://cpc.people.com.cn/n1/2026/0331/c64387-40692191.html',
  },
  {
    title: '百年越剧艺术实现青春“突围”',
    date: '2026-03-18',
    category: '青年传播',
    summary: '中国旅游报报道环境式越剧《新龙门客栈》的持续热潮，分析其如何以年轻化表达拓宽越剧传播边界。',
    sourceUrl: 'https://www.ctnews.com.cn/wenhua/content/2026-03/18/content_185124.html',
  },
  {
    title: '在跨界中拓展戏曲美学',
    date: '2026-02-25',
    category: '演出评论',
    summary: '央视网从“春晚精彩回放”角度评论《越韵中国年——2026越剧春节晚会》，关注其跨界表达与戏曲美学创新。',
    sourceUrl: 'https://news.cctv.com/2026/02/25/ARTIELjBJ3uO2kzi0kRQu2k6260225.shtml',
  },
]

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'web_yueju',
  charset: 'utf8mb4',
})

await connection.execute('DELETE FROM news')
for (const [index, item] of news.entries()) {
  await connection.execute(
    `INSERT INTO news (title, category, summary, published_date, source_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item.title, item.category, item.summary, item.date, item.sourceUrl, index + 1],
  )
}

const [rows] = await connection.query(
  `SELECT title, DATE_FORMAT(published_date, '%Y-%m-%d') AS date, source_url AS sourceUrl
   FROM news
   ORDER BY published_date DESC`,
)
console.log(JSON.stringify(rows, null, 2))
await connection.end()
