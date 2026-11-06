import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBrush,
  FaMusic,
  FaUsers,
} from 'react-icons/fa'
import { GiTheaterCurtains, GiToolbox } from 'react-icons/gi'
import './PageCommon.css'
import './StageAndBackstage.css'

import imgCostume from '../assets/generated/costume-display.jpg'
import imgMakeup from '../assets/generated/makeup-portrait.jpg'
import imgHeadwear from '../assets/generated/headwear-display.jpg'
import imgStage from '../assets/generated/stage-set.jpg'
import imgRehearsal from '../assets/img/微信图片_2026-04-24_005047_817.png'
import imgYutangStage from '../assets/online/yutangchun-stage.jpg'
import imgBackstageBrush from '../assets/online/opera-creative-process.jpg'
import imgDressingRoom from '../assets/online/opera-dressing-room.jpg'
import imgBackstageMakeup from '../assets/img/微信图片_20260423200929_35_793.png'
import imgOrchestra from '../assets/img/微信图片_2026-04-24_005106_369.jpg'

const stageHotspots = [
  {
    id: 'costume',
    title: '服饰水袖',
    eyebrow: 'Costume',
    img: imgCostume,
    x: 218,
    y: 326,
    line: '218,326 404,326 404,176 658,176',
    desc: '水袖、云肩、褶裙与戏服廓形共同塑造角色的身份与气韵。',
    detail:
      '越剧服饰强调清雅、流动和身段配合。台前看见的是衣袖翻飞，实际每一次抬手、转身、亮相都要让服装线条与唱腔节奏合拍。',
  },
  {
    id: 'headwear',
    title: '头饰盔帽',
    eyebrow: 'Headwear',
    img: imgHeadwear,
    x: 245,
    y: 122,
    line: '245,122 420,122 420,176 658,176',
    desc: '珠翠、发簪、冠饰和头套让人物身份在远距离也清晰可读。',
    detail:
      '头面既是装饰，也是人物标识。它需要在灯下闪出层次，同时又要足够稳固，承受走台、转身、水袖牵动和连续表演。',
  },
  {
    id: 'makeup',
    title: '妆容神采',
    eyebrow: 'Makeup',
    img: imgMakeup,
    x: 216,
    y: 180,
    line: '216,180 384,180 384,176 658,176',
    desc: '眉眼、腮红和唇色把演员推向角色，也放大人物情绪。',
    detail:
      '越剧妆面明亮柔和，强调眼神和面部轮廓。观众席到舞台有距离，妆容必须让细微情绪在光线下依然被看见。',
  },
  {
    id: 'set',
    title: '舞台布景',
    eyebrow: 'Stage Set',
    img: imgStage,
    x: 560,
    y: 262,
    line: '560,262 620,262 620,176 658,176',
    desc: '门楼、桌椅、栏杆与灯光组织空间，观众一眼进入故事。',
    detail:
      '越剧舞台常用简洁布景完成叙事转换。一处门、一把椅、一束侧光，都可能成为人物关系和情绪转折的视觉提示。',
  },
]

const backstageRooms = [
  {
    title: '化妆间',
    icon: <FaBrush />,
    img: imgBackstageMakeup,
    desc: '镜灯亮起后，底色、眉眼、腮红、唇色、头套和头面依次完成。',
    detail: '化妆间把演员一点点推入角色。每一笔都服务舞台距离，让观众在远处也能读清神情。',
  },
  {
    title: '排练厅',
    icon: <FaUsers />,
    img: imgRehearsal,
    desc: '读本、排身段、合乐、走台，反复校准唱腔、眼神、节奏和调度。',
    detail: '一出戏的从容来自排练厅的反复打磨，演员在这里把文字、音乐和身段变成可演出的节奏。',
  },
  {
    title: '乐队伴奏',
    icon: <FaMusic />,
    img: imgOrchestra,
    desc: '越胡、鼓板与丝竹托住唱腔，也控制换气、情绪和转场的呼吸。',
    detail: '乐队像幕后的一条呼吸线，演员情绪推进、场次转换和节奏起落都靠伴奏及时承接。',
  },
  {
    title: '换装与走台',
    icon: <GiToolbox />,
    img: imgDressingRoom,
    desc: '抢妆、换衣、递道具、候场、上下场，构成最紧凑的幕后时间线。',
    detail: '走台会确认灯位、道具、入口和站位。台前越显得从容，幕后越需要分秒不差。',
  },
]

const frontDetailPages = [
  {
    title: '服饰水袖',
    label: '服饰 / 水袖 / 云肩',
    img: imgCostume,
    intro: '越剧服装以清丽、柔美、淡雅见长，古装衣常借鉴仕女画、年画和民间艺术，强调短衣长裙、形体分明与舞台动作的流动感。',
    points: ['衣袖与水袖承担抒情功能，抬手、翻袖、收袖都要配合唱腔节奏。', '色彩常偏中间色，避免过度刺眼，让人物气质更温婉。', '云肩、褶裙、飘带、玉佩等细节共同标明人物身份与场景氛围。'],
    note: '台前看见的是一身行头，真正支撑它的是人物性格、身段线路、灯光色温与演员动作之间的协调。',
  },
  {
    title: '妆容神采',
    label: '妆面 / 眉眼 / 腮红',
    img: imgMakeup,
    intro: '越剧化装吸收传统水粉妆、电影和话剧化妆的长处，形成色彩明快柔和、线条清新、五官分明而又带艺术夸张的特点。',
    points: ['眉眼决定人物第一眼的精神状态，是近景表情和远距离观看之间的桥。', '腮红、唇色、眼线会随着角色年龄、身份和情绪轻重调整。', '妆面不追求厚重脸谱化，而是在柔美抒情中保留舞台可读性。'],
    note: '化妆不是单纯变漂亮，而是让角色在灯光、距离和唱做节奏中被观众读出来。',
  },
  {
    title: '头饰盔帽',
    label: '头面 / 珠翠 / 盔帽',
    img: imgHeadwear,
    intro: '越剧头饰从早期插戴式头面逐步发展，改革后更强调清丽、简洁和服装协调，珠凤、发簪、流苏、冠帽共同完成角色身份提示。',
    points: ['头饰的高度、轮廓和色彩要与演员脸型、服饰色系相互协调。', '珠翠和流苏在灯下形成细微闪动，增强人物的贵气或柔美。', '头套、发髻和冠饰必须稳固，承受转身、走台和连续表演。'],
    note: '头饰是台前最容易被看见的“身份标记”，也是幕后最需要精细固定的部位之一。',
  },
  {
    title: '舞台布景',
    label: '布景 / 灯光 / 道具',
    img: imgStage,
    intro: '越剧进入城市剧场和改良文戏阶段后，逐步使用软幕布景、灯光器材和更完整的舞台美术，舞台不再只是背景，而成为叙事的一部分。',
    points: ['门楼、栏杆、桌椅和屏风用来组织故事空间。', '灯光色片、侧光和追光可以提示时间、地点和人物情绪。', '简洁道具常承担象征功能，让唱腔和身段成为画面中心。'],
    note: '好的舞台美术不会抢走演员，而是在观众不察觉时把故事的空间和情绪托起来。',
  },
]

const backstageDetailPages = [
  {
    title: '化妆间',
    label: '定妆 / 头套 / 镜灯',
    img: imgBackstageMakeup,
    intro: '化妆间是角色诞生的第一现场，演员在镜灯前完成底色、眉眼、腮红、唇色、头套与头面，逐步从日常状态进入戏中人物。',
    points: ['先处理底色和轮廓，再强化眉眼与唇色，最后配合头套、珠翠和服装整体校正。', '镜前化妆必须考虑舞台距离，近看浓，远看才清楚。', '定妆完成后还要检查出汗、灯光反射和头饰稳定性。'],
    note: '化妆间的目标不是复制生活面孔，而是把角色精神准确送到观众席。',
  },
  {
    title: '排练厅',
    label: '读本 / 身段 / 走台',
    img: imgRehearsal,
    intro: '排练厅把文本变成可演出的身体节奏。演员从读本、粗排、细排到合乐、走台，反复校准唱腔、眼神、身段和调度。',
    points: ['读本阶段先确定人物关系和情绪线。', '排身段时把水袖、步法、转身和亮相固定下来。', '走台时确认上下场口、灯位、道具位置和演员站位。'],
    note: '台前的一次从容亮相，往往来自排练厅里几十次同样动作的修正。',
  },
  {
    title: '乐队伴奏',
    label: '越胡 / 鼓板 / 丝竹',
    img: imgOrchestra,
    intro: '越胡是越剧主要伴奏乐器之一，乐队与鼓板共同托住唱腔节奏，也影响换气、转场和情绪推进。',
    points: ['主胡常承担引领唱腔线条、提示节奏和控制情绪起伏的作用。', '鼓板帮助演员把唱、念、做、舞落到统一节拍。', '伴奏需要听演员呼吸，不能只按谱推进。'],
    note: '乐队在幕后，却像舞台的呼吸线，让人物情绪有起承转合。',
  },
  {
    title: '换装与走台',
    label: '候场 / 抢妆 / 调度',
    img: imgDressingRoom,
    intro: '换装与走台是幕后最紧凑的时间线。抢妆、递道具、候场、上下场口和站位确认必须环环相扣。',
    points: ['换装要按场次顺序提前整理衣架、头面和随身道具。', '候场时需要确认音乐入点、灯光提示和上场方向。', '走台能发现道具遮挡、灯位偏差和演员动线冲突。'],
    note: '观众看到的“无缝换场”，常常来自幕后分秒不差的协作。',
  },
]

export default function StageAndBackstage() {
  const [flipped, setFlipped] = useState(false)
  const [activeSpotId, setActiveSpotId] = useState(stageHotspots[0].id)
  const [activeRoomIndex, setActiveRoomIndex] = useState(0)
  const activeSpot = stageHotspots.find((spot) => spot.id === activeSpotId) ?? stageHotspots[0]

  const handleRoomSelect = (index: number) => {
    if (index === activeRoomIndex) return

    flushSync(() => setActiveRoomIndex(index))
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelectorAll('.stageback-page .reveal-up, .stageback-page .reveal-scale')
        .forEach((element) => element.classList.add('revealed'))

      const targetId = window.location.hash.includes('backstage-details')
        ? 'backstage-details'
        : window.location.hash.includes('frontstage-details')
          ? 'frontstage-details'
          : ''

      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      window.scrollTo(0, 0)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="page-container stageback-page">
      <div className="page-header dark-header stageback-header">
        <img src={imgYutangStage} alt="" className="stageback-header-bg" />
        <GiTheaterCurtains className="museum-header-icon reveal-scale" />
        <h1 className="reveal-up">台前幕后</h1>
        <p className="reveal-up reveal-delay-1">一面是灯下风华，一面是幕后的汗水、粉墨与排练声。</p>
      </div>

      <div className="page-content stageback-content">
        <section className="stageback-lead reveal-up">
          <span className="intro-eyebrow">Frontstage / Backstage</span>
          <h2>翻过一重幕，才看见一出戏真正的形状</h2>
          <p>
            台前是一方完整的戏剧舞台，演员、服饰、妆容、头面和布景在灯光下合成江南长卷；幕后则是化妆间、排练厅、乐队与换装走台共同运转的准备房间。
          </p>
        </section>

        <section className="stage-flip-section">
          <div className="stage-flip-shell reveal-up reveal-delay-1">
            <button
              className="stage-flip-arrow"
              type="button"
              aria-label={flipped ? '翻回台前' : '翻到幕后'}
              title={flipped ? '翻回台前' : '翻到幕后'}
              onClick={() => setFlipped((value) => !value)}
            >
              {flipped ? <FaArrowLeft /> : <FaArrowRight />}
            </button>

            <div className={`stage-flip-card ${flipped ? 'is-flipped' : ''}`}>
              <div className="stage-flip-edge stage-flip-edge-left" />
              <div className="stage-flip-edge stage-flip-edge-right" />
              <div className="stage-flip-edge stage-flip-edge-top" />
              <div className="stage-flip-edge stage-flip-edge-bottom" />
              <article className="stage-face stage-face-front">
                <div className="interactive-stage">
                  <div className="theater-roof" />
                  <div className="theater-eave" />
                  <div className="theater-pillar theater-pillar-left" />
                  <div className="theater-pillar theater-pillar-right" />
                  <div className="stage-curtain-top" />
                  <div className="stage-curtain-left" />
                  <div className="stage-curtain-right" />
                  <div className="stage-proscenium-frame" />

                  <div className="stage-photo-board">
                    <img src={imgYutangStage} alt="越剧演员在舞台上表演" />
                    <svg className="hotspot-connector" viewBox="0 0 1000 620" aria-hidden="true">
                      <polyline points={activeSpot.line} />
                    </svg>
                    {stageHotspots.map((spot) => (
                      <button
                        className={`stage-hotspot ${activeSpotId === spot.id ? 'active' : ''}`}
                        style={{ left: `${spot.x / 10}%`, top: `${spot.y / 6.2}%` }}
                        type="button"
                        key={spot.id}
                        aria-label={`查看${spot.title}介绍`}
                        onClick={() => setActiveSpotId(spot.id)}
                      >
                        <span aria-hidden="true" />
                      </button>
                    ))}
                  </div>

                  <article className="hotspot-callout">
                    <div className="hotspot-callout-img">
                      <img src={activeSpot.img} alt={activeSpot.title} />
                    </div>
                    <div className="hotspot-callout-copy">
                      <span>{activeSpot.eyebrow}</span>
                      <h3>{activeSpot.title}</h3>
                      <p>{activeSpot.desc}</p>
                      <p className="detail-text">{activeSpot.detail}</p>
                    </div>
                  </article>

                  <div className="stage-footlight" />
                  <div className="stage-title-plate">
                    <span>ON STAGE</span>
                    <h2>台前风华</h2>
                  </div>
                </div>
              </article>

              <article className="stage-face stage-face-back">
                <div className="prep-room">
                  <div className="theater-roof" />
                  <div className="theater-eave" />
                  <div className="theater-pillar theater-pillar-left" />
                  <div className="theater-pillar theater-pillar-right" />
                  <div className="prep-room-curtain" />
                  <div className="prep-room-wall">
                    <div className="prep-room-title">
                      <span>BEHIND THE CURTAIN</span>
                      <h2>幕布后的准备房间</h2>
                      <p>化妆、排练、伴奏、换装与走台在同一条时间线上协作，把台前的从容稳稳托住。</p>
                    </div>

                    <div className="prep-room-table">
                      <img src={imgBackstageBrush} alt="戏曲后台化妆细节" />
                    </div>

                    <div className="prep-room-grid">
                      {backstageRooms.map((room, index) => (
                        <button
                          className={`prep-room-card prep-room-card-${index + 1} ${activeRoomIndex === index ? 'active' : 'compact'}`}
                          key={room.title}
                          type="button"
                          aria-pressed={activeRoomIndex === index}
                          onClick={() => handleRoomSelect(index)}
                        >
                          <div className="prep-room-card-img">
                            <img src={room.img} alt={room.title} />
                          </div>
                          <div className="prep-room-card-copy">
                            <div className="prep-room-card-icon">{room.icon}</div>
                            <h3>{room.title}</h3>
                            <p>{room.desc}</p>
                            <p className="detail-text">{room.detail}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="frontstage-details" className="deep-page deep-page-front reveal-up">
          <div className="deep-page-heading">
            <span className="intro-eyebrow">On Stage Details</span>
            <h2>台前四项系统详览</h2>
            <p>从服饰、水袖、妆容、头饰到舞台布景，台前美学并不是单点装饰，而是一套让人物被看见、让情绪被读懂的视觉系统。</p>
          </div>
          <div className="deep-grid">
            {frontDetailPages.map((item, index) => (
              <article className={`deep-card deep-card-${index + 1}`} key={item.title}>
                <div className="deep-card-media">
                  <img src={item.img} alt={item.title} />
                </div>
                <div className="deep-card-copy">
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.intro}</p>
                  <ul>
                    {item.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                  <p className="deep-note">{item.note}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="backstage-details" className="deep-page deep-page-back reveal-up">
          <div className="deep-page-heading">
            <span className="intro-eyebrow">Backstage Details</span>
            <h2>幕后四室系统详览</h2>
            <p>幕后的秩序来自空间分工：化妆间生成角色，排练厅打磨表演，乐队控制呼吸，换装与走台保证正式演出的每一次衔接。</p>
          </div>
          <div className="deep-back-map">
            {backstageDetailPages.map((item, index) => (
              <article className={`deep-back-card deep-back-card-${index + 1}`} key={item.title}>
                <img src={item.img} alt={item.title} />
                <div>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.intro}</p>
                  <ul>
                    {item.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                  <p className="deep-note">{item.note}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
