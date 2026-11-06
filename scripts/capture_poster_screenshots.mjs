import path from 'node:path'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const runtimeRequire = createRequire('C:/Users/22672/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/')
const { chromium } = runtimeRequire('playwright')

const root = process.cwd()
const outDir = path.join(root, 'design_output', 'screenshots')
fs.mkdirSync(outDir, { recursive: true })

const baseUrl = pathToFileURL(path.join(root, 'dist', 'index.html')).href

const shots = [
  { name: 'home-hero.png', hash: '', wait: '.hero-section' },
  { name: 'ai-page.png', hash: '#/ai', wait: '.ai-enter-page' },
  { name: 'backstage-page.png', hash: '#/backstage', wait: '.stage-backstage-page, .page-container' },
  { name: 'schools-page.png', hash: '#/schools', wait: '.schools-page, .page-container' },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })

for (const shot of shots) {
  const url = `${baseUrl}${shot.hash}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  try {
    await page.waitForSelector(shot.wait, { timeout: 10000 })
  } catch {
    await page.waitForTimeout(2000)
  }
  await page.screenshot({ path: path.join(outDir, shot.name), fullPage: false })
  console.log(path.join(outDir, shot.name))
}

await browser.close()
