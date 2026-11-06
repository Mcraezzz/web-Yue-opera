import { useEffect } from 'react'
import { GiScrollUnfurled } from 'react-icons/gi'
import './PageCommon.css'
import img1 from '../assets/generated/early-yueju-water-town.jpg'
import img2 from '../assets/generated/male-troupe-stage.jpg'
import img3 from '../assets/generated/women-troupe-rehearsal.jpg'
import img4 from '../assets/generated/shanghai-theater.jpg'
import img5 from '../assets/generated/reform-exhibit.jpg'
import scrollHeaderBg from '../assets/img/微信图片_2026-04-24_005111_201.jpg'

export default function ScrollPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const timeline = [
    { year: '清末民初', title: '落地唱书', desc: '越剧的前身“落地唱书”在浙江嵊县一带开始流行，这是越剧孕育的萌芽期。艺人们在农闲时走村串户，演唱民间故事。', img: img1 },
    { year: '1906年', title: '男班兴起', desc: '部分落地唱书艺人开始在草台上演出，标志着越剧作为一种独立的戏曲形式正式诞生，此时主要由男演员表演。', img: img2 },
    { year: '1923年', title: '女班出现', desc: '第一个女子越剧科班在嵊县施家岙成立。女演员的加入使得越剧的唱腔更加婉转清丽，逐渐形成了越剧独特的柔美风格。', img: img3 },
    { year: '1938年', title: '进入上海', desc: '越剧女班大量涌入上海，在商业大都市的繁荣背景下，越剧吸收了话剧、电影等其他艺术形式的元素，迅速发展壮大。', img: img4 },
    { year: '1942年', title: '越剧改革', desc: '以袁雪芬为代表的越剧界有识之士，开始了越剧改革。引入了导演制、建立了完整的舞美、灯光体系，并创制了“尺调腔”，极大丰富了越剧的艺术表现力。', img: img5 },
  ]

  return (
    <div className="page-container">
      <div className="page-header dark-header scroll-header">
        <img src={scrollHeaderBg} alt="" className="scroll-header-bg" />
        <div className="scroll-header-overlay"></div>
        <GiScrollUnfurled className="page-header-icon reveal-scale" />
        <h1 className="reveal-up">越剧长卷</h1>
        <p className="reveal-up reveal-delay-1">百转千回，水袖藏梦。循着时光的长轴，感受越剧的百年风华。</p>
      </div>

      <div className="page-content">
        <section className="scroll-intro-section">
          <div className="scroll-intro-heading reveal-up">
            <span className="intro-eyebrow">一曲江南，一卷越音</span>
            <h2>越剧概览</h2>
          </div>
          <p className="scroll-intro-lead reveal-up reveal-delay-1">
            越剧是中国传统戏曲的重要剧种之一，2006 年被列入第一批国家级非物质文化遗产代表性项目名录。它发源于浙江绍兴嵊县一带，在清末民间曲艺“落地唱书”的基础上吸收余姚滩簧、绍剧等剧种曲调与表演元素，先后经历“小歌班”“的笃班”“绍兴文戏”“女子绍兴文戏”等阶段，1938 年正式改称“越剧”。
          </p>
          <div className="scroll-intro-facts reveal-up reveal-delay-2">
            <div>
              <strong>发源地</strong>
              <span>浙江绍兴嵊县一带</span>
            </div>
            <div>
              <strong>非遗身份</strong>
              <span>国家级非遗 Ⅳ-53</span>
            </div>
            <div>
              <strong>成熟转折</strong>
              <span>1942 年新越剧改革</span>
            </div>
            <div>
              <strong>审美气质</strong>
              <span>清悠婉转，长于抒情</span>
            </div>
          </div>
          <div className="scroll-intro-grid">
            <article className="scroll-intro-item reveal-up reveal-delay-1">
              <span>01</span>
              <h3>剧种概念</h3>
              <p>越剧以唱、念、做、舞综合塑造人物，题材多取自民间故事、古典文学与社会人生，代表剧目包括《梁山伯与祝英台》《红楼梦》《祥林嫂》《西厢记》等。</p>
            </article>
            <article className="scroll-intro-item reveal-up reveal-delay-2">
              <span>02</span>
              <h3>起源流变</h3>
              <p>1906 年前后，“落地唱书”由田间街坊走上草台，逐渐形成戏曲形态；1916 年进入上海后称“绍兴文戏”，女班兴起后形成更柔婉清丽的舞台风格。</p>
            </article>
            <article className="scroll-intro-item reveal-up reveal-delay-3">
              <span>03</span>
              <h3>声腔行当</h3>
              <p>越剧唱腔属板腔体，常见曲调有尺调、四工调、弦下调等；行当以小旦、小生、老生、小丑、老旦、大面为骨架，尤以小生小旦见长。</p>
            </article>
            <article className="scroll-intro-item reveal-up reveal-delay-4">
              <span>04</span>
              <h3>舞台美学</h3>
              <p>1942 年袁雪芬等推动新越剧改革，吸收话剧、电影、昆曲与京剧程式，形成写意与写实相结合的表演方法；布景、灯光、服饰趋于清新淡雅。</p>
            </article>
          </div>
          <p className="scroll-intro-note reveal-up reveal-delay-5">
            从嵊州乡间到上海剧场，再到当代舞台，越剧的生命力来自不断吸收新经验：它既保存江南声腔的柔美，也持续借助现代剧场、影像传播与青年演员培养，让传统戏曲与今天的观众重新相遇。
          </p>
        </section>

        <section className="timeline-section">
          <div className="timeline">
            {timeline.map((item, i) => (
              <div key={i} className={`timeline-item reveal-up ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="timeline-content">
                  <div className="timeline-year">{item.year}</div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                  <img src={item.img} alt={item.title} className="timeline-img" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
