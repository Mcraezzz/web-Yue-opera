import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import './PageCommon.css'
import { GiDramaMasks } from 'react-icons/gi'
import schoolsHeaderBg from '../assets/img/微信图片_2026-04-24_004922_323.jpg'
import img1 from '../assets/generated/yuan-school-founder-new.webp'
import imgFu from '../assets/schools/fu-quanxiang.jpg'
import imgXu from '../assets/schools/xu-yulan.jpg'
import imgWang from '../assets/schools/wang-wenjuan.jpg'
import imgLv from '../assets/schools/lv-ruiying.jpg'
import artistMao from '../assets/artists/mao-weitao.jpg'
import artistHe from '../assets/artists/he-saifei.jpg'
import artistFang from '../assets/artists/fang-yafen.jpg'
import artistQian from '../assets/artists/qian-huili.jpg'
import artistShan from '../assets/artists/shan-yangping.jpg'
import artistZhao from '../assets/artists/zhao-zhigang.jpg'

const schools = [
  {
    name: '袁派',
    founder: '袁雪芬',
    features: '质朴平易，委婉细腻，深沉含蓄，韵味醇厚。',
    desc: '袁派是越剧花旦中最基本、最流行的一个流派。它在很大程度上奠定了越剧抒情柔美的基调。',
    roles: '《祥林嫂》中的祥林嫂、《西厢记》中的崔莺莺。',
    img: img1
  },
  {
    name: '傅派',
    founder: '傅全香',
    features: '嗓音明亮，音域宽广，润腔华彩，跌宕多姿。',
    desc: '傅派以花旦、花衫戏见长，擅长表现感情强烈、命运跌宕的女性形象，唱做念舞结合紧密，富于戏剧张力。',
    roles: '《梁山伯与祝英台》中的祝英台、《情探》中的敫桂英、《孔雀东南飞》中的刘兰芝。',
    img: imgFu
  },
  {
    name: '徐派',
    founder: '徐玉兰',
    features: '高昂激越，俊逸潇洒，音色嘹亮，神采夺人。',
    desc: '徐派是越剧小生流派中的重要一支，旋律常在中高音区展开，善于塑造风流倜傥、情感浓烈的人物形象。',
    roles: '《红楼梦》中的贾宝玉、《西厢记》中的张珙、《追鱼》中的张珍。',
    img: imgXu
  },
  {
    name: '王派',
    founder: '王文娟',
    features: '清丽婉转，细腻传神，层次丰富，情韵深长。',
    desc: '王派以旦角表演见长，重视人物性格和心理层次的刻画，尤其擅长表现含蓄、敏感而富有诗意的女性形象。',
    roles: '《红楼梦》中的林黛玉、《追鱼》中的鲤鱼精、《孟丽君》中的孟丽君。',
    img: imgWang
  },
  {
    name: '吕派',
    founder: '吕瑞英',
    features: '音色甜美，华彩清新，戏路宽广，明朗灵动。',
    desc: '吕派唱腔脱胎于袁派而自成面貌，兼擅花旦、花衫、青衣、刀马旦，表演明快生动，人物气质鲜活。',
    roles: '《三看御妹》中的刘金定、《穆桂英挂帅》中的穆桂英、《九斤姑娘》中的张九斤。',
    img: imgLv
  }
]

const modernArtists = [
  {
    name: '茅威涛',
    school: '尹派小生 / 越剧革新代表',
    desc: '当代越剧领军人物，将尹派艺术推向新高度，持续尝试越剧题材与剧场形态创新。',
    detail: '浙江小百花越剧团代表性艺术家，擅长小生，师承尹桂芳而形成自己的舞台气质。她以《陆游与唐琬》《孔乙己》《新版梁祝》等作品拓宽越剧表达，也推动环境式、跨界化的当代越剧探索。',
    works: '《陆游与唐琬》《西厢记》《孔乙己》《新版梁祝》《江南好人》',
    honor: '三度获得中国戏剧梅花奖，五次获文华表演奖。',
    img: artistMao
  },
  {
    name: '王文娟',
    school: '王派创始人 / 旦角',
    desc: '以演“林黛玉”蜚声海内外，唱腔清丽婉转，表演细腻传神。',
    detail: '王文娟擅长越剧旦角，注重人物性格和心理层次的塑造。她在越剧电影《红楼梦》中饰演林黛玉，使王派艺术成为越剧旦角中极具辨识度的一脉。',
    works: '《红楼梦》《追鱼》《春香传》《孟丽君》',
    honor: '国家级非遗代表性传承人，上海白玉兰戏剧表演艺术奖终身成就奖获得者。',
    img: imgWang
  },
  {
    name: '何赛飞',
    school: '小百花出身 / 越剧与影视双栖',
    desc: '将电影电视的表演经验融入越剧，形成独特的舞台与银幕魅力。',
    detail: '何赛飞毕业于浙江艺术学校，早年出演越剧电影《五女拜寿》，后在影视表演中广为观众熟知。她长期关注戏曲传承，也常以演员身份为传统戏曲发声。',
    works: '《五女拜寿》《唐伯虎》《大宅门》《追月》',
    honor: '中国电影金鸡奖最佳女主角、大众电影百花奖最佳女配角获得者。',
    img: artistHe
  },
  {
    name: '方亚芬',
    school: '袁派花旦 / 上海越剧院',
    desc: '扮相俊美，嗓音圆润清丽，兼学多派，唱做俱佳。',
    detail: '方亚芬宗袁派，也学习其他花旦、小生和老生流派。她戏路开阔，能应工花旦、闺门旦、青衣、刀马旦、武旦、泼辣旦和老旦，是当代袁派传人中的重要人物。',
    works: '《西厢记》《红楼梦》《祥林嫂》《梁山伯与祝英台》《玉卿嫂》',
    honor: '中国戏剧梅花奖、上海白玉兰戏剧表演艺术奖主角奖获得者。',
    img: artistFang
  },
  {
    name: '钱惠丽',
    school: '徐派小生 / 非遗传承人',
    desc: '嗓音高亢亮丽，擅于揣摩人物心理，是徐派艺术的重要传人。',
    detail: '钱惠丽师承徐玉兰，几乎继承徐派主要剧目，并在唱腔与表演之间继续探索中生代女小生的表现边界。她长期在上海越剧院演出和带教青年演员。',
    works: '《红楼梦》《西厢记》《追鱼》《紫玉钗》《韩非子》',
    honor: '第五批国家级非遗代表性项目代表性传承人，中国戏剧梅花奖获得者。',
    img: artistQian
  },
  {
    name: '单仰萍',
    school: '王派花旦 / 上海越剧院',
    desc: '唱腔朴实中蕴清丽，淡雅中藏华彩，气质典雅。',
    detail: '单仰萍立足王派，兼收袁派、金派等诸家之长。她的表演注重人物内心，也结合自身音质形成沉稳含蓄、质朴自然的青衣形象。',
    works: '《红楼梦》《孟丽君》《碧玉簪》《舞台姐妹》《家》',
    honor: '中国戏剧梅花奖、文华表演奖获得者。',
    img: artistShan
  },
  {
    name: '赵志刚',
    school: '尹派小生 / 非遗传承人',
    desc: '博采徐、范、尹、陆诸派，尤以尹派见长。',
    detail: '赵志刚从上海越剧院学馆成长为青年剧团主要演员，1982 年拜尹桂芳为师。他主演大量传统与新编剧目，也以跨界和实验作品拓展尹派小生的当代表达。',
    works: '《何文秀》《沙漠王子》《陆文龙》《红楼梦》《镜像红楼》',
    honor: '上海白玉兰主角奖、中国戏剧梅花奖、文华表演奖获得者。',
    img: artistZhao
  }
]

export default function Schools() {
  const location = useLocation()
  const [activeArtist, setActiveArtist] = useState(modernArtists[0].name)

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (location.hash === '#artists') {
        document.getElementById('artists')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo(0, 0)
      }
    }, 120)

    return () => clearTimeout(timeout)
  }, [location.pathname, location.hash])

  return (
    <div className="page-container">
      <div className="page-header dark-header schools-header">
        <img src={schoolsHeaderBg} alt="" className="schools-header-bg" />
        <div className="schools-header-overlay" />
        <GiDramaMasks className="page-header-icon reveal-scale" />
        <h1 className="reveal-up">名家流派</h1>
        <p className="reveal-up reveal-delay-1">一腔一调各有风骨，台上台下皆是传奇。品鉴越剧的艺术灵魂。</p>
      </div>

      <div className="page-content">
        <section className="content-section">
          <span className="section-eyebrow reveal-up">流派谱系</span>
          <h2 className="section-title-left reveal-up">流派风华</h2>
          <div className="schools-list">
            {schools.map((school, i) => (
              <div className={`school-detail-card reveal-up reveal-delay-${(i % 3) + 1}`} key={school.name}>
                <div className="school-header">
                  <img src={school.img} alt={school.name} className="school-avatar" />
                  <div className="school-title">
                    <h3>{school.name}</h3>
                    <span className="founder">创始人：{school.founder}</span>
                  </div>
                </div>
                <div className="school-body">
                  <p><strong>艺术特色：</strong>{school.features}</p>
                  <p><strong>流派简介：</strong>{school.desc}</p>
                  <p><strong>代表角色：</strong>{school.roles}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="artists" className="content-section artists-section reveal-up">
          <span className="section-eyebrow">名家身影</span>
          <h2 className="section-title-left">名家荟萃</h2>
          <div className="artists-grid">
            {modernArtists.map((artist) => {
              const isActive = activeArtist === artist.name
              return (
                <button
                  type="button"
                  className={`artist-card ${isActive ? 'active' : ''}`}
                  key={artist.name}
                  onClick={() => setActiveArtist(artist.name)}
                  aria-expanded={isActive}
                >
                  <img src={artist.img} alt={artist.name} className="artist-photo" />
                  <div className="artist-copy">
                    <div className="artist-name">{artist.name}</div>
                    <div className="artist-school">{artist.school}</div>
                    <p className="artist-desc">{artist.desc}</p>
                    <div className="artist-detail">
                      <div className="artist-detail-inner">
                        <p>{artist.detail}</p>
                        <p><strong>代表作品：</strong>{artist.works}</p>
                        <p><strong>荣誉：</strong>{artist.honor}</p>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
