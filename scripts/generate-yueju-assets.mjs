import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const rootDir = resolve(import.meta.dirname, '..')
const envPath = join(rootDir, '.env')
const outDir = join(rootDir, 'src', 'assets', 'generated')

loadEnv(envPath)
mkdirSync(outDir, { recursive: true })

const apiBase = process.env.VOLCENGINE_API_BASE || 'https://ark.cn-beijing.volces.com/api/v3'
const apiKey = process.env.VOLCENGINE_API_KEY
const model = process.env.IMAGE_MODEL || 'doubao-seedream-5-0-260128'

if (!apiKey) {
  throw new Error('Missing VOLCENGINE_API_KEY in .env')
}

const common =
  '高清写实摄影风格，越剧主题，中国江南审美，舞台灯光精致，画面干净高级，无文字，无水印，无logo，不要出现真实名人肖像。'

const jobs = [
  {
    file: 'liangzhu-stage.jpg',
    prompt: `${common} 越剧《梁山伯与祝英台》舞台场景，一位蓝白长衫小生与一位粉白戏服旦角在月洞门布景前对望，水袖轻扬，爱情悲剧氛围，适合剧目卡片横图。`,
  },
  {
    file: 'hongloumeng-stage.jpg',
    prompt: `${common} 越剧《红楼梦》舞台剧照感，贾宝玉与林黛玉气质的人物在雅致园林式舞台中并立，粉色与浅蓝戏服，梦幻柔美，适合剧目卡片横图。`,
  },
  {
    file: 'xixiangji-archive.jpg',
    prompt: `${common} 越剧《西厢记》主题，古典书院与花窗舞台布景，才子佳人含蓄相望，温暖戏台灯光，元杂剧名作的婉转气质，适合剧目卡片横图。`,
  },
  {
    file: 'wunvbaishou-stage.jpg',
    prompt: `${common} 越剧《五女拜寿》原创经典舞台场景，五位女性角色身着不同色彩的精致越剧戏服在厅堂舞台中行礼，家庭伦理戏氛围，适合剧目卡片横图。`,
  },
  {
    file: 'xianglinsao-stage.jpg',
    prompt: `${common} 越剧《祥林嫂》现代题材舞台场景，冷色灯光，女性角色神情坚韧而悲悯，简洁现实主义布景，鲁迅文学改编气质，适合剧目卡片横图。`,
  },
  {
    file: 'biyuzan-water-town.jpg',
    prompt: `${common} 越剧《碧玉簪》江南水乡户外小戏台，白墙黑瓦、小桥流水、观众围坐，传统剧目清雅温婉，适合剧目卡片横图。`,
  },
  {
    file: 'zhuiyu-night-theater.jpg',
    prompt: `${common} 越剧《追鱼》神话传说舞台，夜色水波、红灯、古戏台与浪漫蓝色灯光，鲤鱼精传说的梦幻感，适合剧目卡片横图。`,
  },
  {
    file: 'yuan-school-founder.jpg',
    prompt: `${common} 袁派越剧意象图，端庄旦角人物半身像，淡雅戏服，温婉细腻，背景为传统戏曲展陈墙，不指向真实人物，适合圆形流派头像。`,
  },
  {
    file: 'yin-school-role.jpg',
    prompt: `${common} 尹派越剧小生意象图，清秀小生身着浅蓝长衫，手持折扇，气质洒脱深沉，江南舞台背景，不指向真实人物，适合圆形流派头像。`,
  },
  {
    file: 'fan-school-liangzhu.jpg',
    prompt: `${common} 范派越剧小生意象图，英气小生身着白蓝戏服，稳健大方，舞台灯光明亮，展现梁山伯式角色气质，不指向真实人物，适合圆形流派头像。`,
  },
  {
    file: 'early-yueju-water-town.jpg',
    prompt: `${common} 1900年代江南乡村草台戏，白墙黑瓦水乡，民间艺人在简朴戏台上演唱落地唱书，历史感，适合时间线横图。`,
  },
  {
    file: 'male-troupe-stage.jpg',
    prompt: `${common} 1906年前后男班兴起，草台上男演员扮演传统戏曲角色，朴素服饰，观众围观，老照片质感但彩色高清，适合时间线横图。`,
  },
  {
    file: 'women-troupe-rehearsal.jpg',
    prompt: `${common} 1920年代女子越剧科班排练场景，年轻女演员穿浅色练功服学习水袖和身段，老师指导，温暖室内光，适合时间线横图。`,
  },
  {
    file: 'shanghai-theater.jpg',
    prompt: `${common} 1930年代上海剧场外景，霓虹与海派建筑，越剧海报橱窗但不要可读文字，观众入场，繁华都市戏曲氛围，适合时间线横图。`,
  },
  {
    file: 'reform-exhibit.jpg',
    prompt: `${common} 1942年越剧改革主题，舞台设计手稿、剧本、灯光图和戏服陈列在展柜中，现代舞美体系建立的历史感，适合历史图文横图。`,
  },
  {
    file: 'costume-display.jpg',
    prompt: `${common} 越剧服饰展示，木质衣架上陈列粉色、水蓝、月白色刺绣戏服，旁边有绣鞋和折扇，细节丰富，适合美学栏目横图。`,
  },
  {
    file: 'makeup-portrait.jpg',
    prompt: `${common} 越剧妆容特写，年轻旦角完成精致眼妆和发饰，镜前柔光，胭脂与眉眼细节清晰，适合美学栏目横图。`,
  },
  {
    file: 'headwear-display.jpg',
    prompt: `${common} 越剧头饰珠翠陈列，凤冠、珠花、流苏摆放在深色绒布上，细节闪耀，博物馆级静物摄影，适合美学栏目横图。`,
  },
  {
    file: 'stage-set.jpg',
    prompt: `${common} 越剧舞台布景，月洞门、花窗、栏杆、江南园林景片，暖色灯光，空舞台等待开演，适合美学栏目横图。`,
  },
  {
    file: 'ai-character.jpg',
    prompt: `${common} AI造梦工坊缩略图，越剧人物形象生成效果，年轻旦角身着粉色戏服，江南园林背景，清透梦幻，横图。`,
  },
  {
    file: 'ai-stage.jpg',
    prompt: `${common} AI造梦工坊缩略图，江南戏台场景生成效果，古典戏台、灯笼、烟雨水乡、柔和金色灯光，横图。`,
  },
  {
    file: 'ai-poster.jpg',
    prompt: `${common} AI造梦工坊缩略图，古风越剧海报视觉，戏服、花窗、红灯与水墨质感组合，不要任何文字，横图。`,
  },
]

for (const [index, job] of jobs.entries()) {
  console.log(`[${index + 1}/${jobs.length}] generating ${job.file}`)
  const imageUrl = await generateImage(job.prompt)
  const image = await fetch(imageUrl)
  if (!image.ok) {
    throw new Error(`Failed to download ${job.file}: ${image.status}`)
  }

  const buffer = Buffer.from(await image.arrayBuffer())
  writeFileSync(join(outDir, job.file), buffer)
}

function loadEnv(filePath) {
  if (!existsSync(filePath)) return

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    let value = trimmed.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

async function generateImage(prompt) {
  const response = await fetch(`${apiBase}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: false,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Image API failed: ${response.status}`)
  }

  const imageUrl = data?.data?.[0]?.url
  if (!imageUrl) {
    throw new Error(`Image API did not return a URL: ${JSON.stringify(data).slice(0, 300)}`)
  }
  return imageUrl
}
