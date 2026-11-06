from __future__ import annotations

from pathlib import Path
import re
import shutil

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "competition_materials"
DESKTOP_DIR = Path(r"C:\Users\22672\Desktop\越韵清音——韩一赫、陶司宸、史墨栋")
SIGNED_PDF = OUT_DIR / "参赛作品说明书-署名版.pdf"
ANON_PDF = OUT_DIR / "参赛作品说明书-匿名版.pdf"
DESKTOP_SIGNED_PDF = DESKTOP_DIR / "参赛作品说明书-署名版.pdf"
DESKTOP_ANON_PDF = DESKTOP_DIR / "参赛作品说明书-匿名版.pdf"
DESKTOP_SIGNED_NEW_PDF = DESKTOP_DIR / "参赛作品说明书-署名版-新版.pdf"
DESKTOP_ANON_NEW_PDF = DESKTOP_DIR / "参赛作品说明书-匿名版-新版.pdf"
ROOT_SIGNED_PDF = ROOT / "参赛作品说明书-署名版.pdf"
ROOT_ANON_PDF = ROOT / "参赛作品说明书-匿名版.pdf"
ROOT_SIGNED_DETAIL_PDF = ROOT / "参赛作品说明书-署名版-详细版.pdf"
ROOT_ANON_DETAIL_PDF = ROOT / "参赛作品说明书-匿名版-详细版.pdf"

WORK_TITLE = "越韵清音—越剧文化知识与多模态智能交互平台"
COMPLETE_TIME = "2026年5月"

SCHOOL_META = [
    ("作品名称", WORK_TITLE),
    ("学校", "中国传媒大学海南国际学院"),
    ("学院", "海南国际学院"),
    ("专业", "智能科学与技术"),
    ("学生", "韩一赫、陶司宸、史墨栋"),
    ("指导老师", "杜歆茜"),
    ("完成时间", COMPLETE_TIME),
]


def register_fonts() -> dict[str, str]:
    candidates = {
        "regular": [
            Path(r"C:\Windows\Fonts\simsun.ttc"),
            Path(r"C:\Windows\Fonts\NotoSerifSC-VF.ttf"),
            Path(r"C:\Windows\Fonts\msyh.ttc"),
        ],
        "bold": [
            Path(r"C:\Windows\Fonts\simhei.ttf"),
            Path(r"C:\Windows\Fonts\msyhbd.ttc"),
            Path(r"C:\Windows\Fonts\NotoSansSC-VF.ttf"),
        ],
        "serif": [
            Path(r"C:\Windows\Fonts\simkai.ttf"),
            Path(r"C:\Windows\Fonts\simsun.ttc"),
            Path(r"C:\Windows\Fonts\NotoSerifSC-VF.ttf"),
        ],
    }

    resolved: dict[str, str] = {}
    for role, paths in candidates.items():
        for path in paths:
            if path.exists():
                font_name = f"Yueju{role.title()}"
                suffix = path.suffix.lower()
                if suffix == ".ttc":
                    pdfmetrics.registerFont(TTFont(font_name, str(path), subfontIndex=0))
                else:
                    pdfmetrics.registerFont(TTFont(font_name, str(path)))
                resolved[role] = font_name
                break
        else:
            resolved[role] = "Helvetica"

    return resolved


FONTS = register_fonts()


def make_styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    base = ParagraphStyle(
        "BaseCN",
        parent=sample["Normal"],
        fontName=FONTS["regular"],
        fontSize=12,
        leading=20,
        textColor=colors.black,
        alignment=TA_JUSTIFY,
        wordWrap="CJK",
        firstLineIndent=24,
        spaceAfter=0,
    )
    return {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base,
            fontName=FONTS["bold"],
            fontSize=22,
            leading=34,
            alignment=TA_CENTER,
            textColor=colors.black,
            firstLineIndent=0,
            spaceAfter=20,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base,
            fontName=FONTS["bold"],
            fontSize=18,
            leading=29,
            alignment=TA_CENTER,
            textColor=colors.black,
            firstLineIndent=0,
            spaceAfter=24,
        ),
        "cover_field_label": ParagraphStyle(
            "CoverFieldLabelCN",
            parent=base,
            fontName=FONTS["bold"],
            fontSize=14,
            leading=22,
            alignment=TA_RIGHT,
            firstLineIndent=0,
            textColor=colors.black,
        ),
        "cover_field_value": ParagraphStyle(
            "CoverFieldValueCN",
            parent=base,
            fontName=FONTS["regular"],
            fontSize=14,
            leading=22,
            alignment=TA_CENTER,
            firstLineIndent=0,
            textColor=colors.black,
        ),
        "h1": ParagraphStyle(
            "Heading1CN",
            parent=base,
            fontName=FONTS["bold"],
            fontSize=16,
            leading=23,
            textColor=colors.black,
            firstLineIndent=0,
            spaceBefore=9,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "Heading2CN",
            parent=base,
            fontName=FONTS["bold"],
            fontSize=14,
            leading=20,
            textColor=colors.black,
            firstLineIndent=0,
            spaceBefore=4,
            spaceAfter=2,
            keepWithNext=True,
        ),
        "body": base,
        "body_no_indent": ParagraphStyle(
            "BodyNoIndentCN",
            parent=base,
            firstLineIndent=0,
        ),
        "small": ParagraphStyle(
            "SmallCN",
            parent=base,
            fontSize=10,
            leading=16,
            textColor=colors.black,
            alignment=TA_LEFT,
            firstLineIndent=0,
        ),
        "lead": ParagraphStyle(
            "LeadCN",
            parent=base,
            fontName=FONTS["regular"],
            fontSize=12,
            leading=20,
            textColor=colors.black,
            firstLineIndent=24,
            spaceAfter=0,
        ),
        "table_cell": ParagraphStyle(
            "TableCellCN",
            parent=base,
            fontSize=9.6,
            leading=14,
            alignment=TA_LEFT,
            firstLineIndent=0,
            wordWrap="CJK",
        ),
        "table_head": ParagraphStyle(
            "TableHeadCN",
            parent=base,
            fontName=FONTS["bold"],
            fontSize=9.8,
            leading=14,
            alignment=TA_CENTER,
            firstLineIndent=0,
            textColor=colors.black,
        ),
        "footer": ParagraphStyle(
            "FooterCN",
            parent=base,
            fontSize=10.5,
            leading=12,
            alignment=TA_CENTER,
            firstLineIndent=0,
            textColor=colors.black,
        ),
    }


STYLES = make_styles()


def p(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), STYLES[style])


def bullet_list(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, "body_no_indent"), leftIndent=0) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=22,
        bulletFontName=FONTS["regular"],
        bulletFontSize=8,
        bulletOffsetY=1,
    )


def numbered_list(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, "body_no_indent"), leftIndent=0) for item in items],
        bulletType="1",
        leftIndent=24,
        bulletFontName=FONTS["regular"],
        bulletFontSize=10.5,
    )


def kv_table(rows: list[tuple[str, str]], width: float = 15.2 * cm) -> Table:
    data = [[p(k, "table_cell"), p(v, "table_cell")] for k, v in rows]
    table = Table(data, colWidths=[3.1 * cm, width - 3.1 * cm], hAlign="CENTER")
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONTS["regular"]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTNAME", (0, 0), (0, -1), FONTS["bold"]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.black),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def data_table(headers: list[str], rows: list[list[str]], col_widths: list[float]) -> Table:
    data = [[p(h, "table_head") for h in headers]]
    data.extend([[p(cell, "table_cell") for cell in row] for row in rows])
    table = Table(data, colWidths=col_widths, hAlign="CENTER", repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeeee")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("FONTNAME", (0, 0), (-1, 0), FONTS["bold"]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.45, colors.black),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.black),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 3.6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.6),
            ]
        )
    )
    return table


def cover_field_table(rows: list[tuple[str, str]]) -> Table:
    data = [[p(f"{label}：", "cover_field_label"), p(value, "cover_field_value")] for label, value in rows]
    table = Table(data, colWidths=[3.5 * cm, 10.6 * cm], hAlign="CENTER")
    style_commands = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for index in range(len(rows)):
        style_commands.append(("LINEBELOW", (1, index), (1, index), 0.75, colors.black))
    table.setStyle(TableStyle(style_commands))
    return table


class YuejuDoc(BaseDocTemplate):
    def __init__(self, filename: Path, title: str, anonymous: bool):
        super().__init__(
            str(filename),
            pagesize=A4,
            leftMargin=2.55 * cm,
            rightMargin=2.25 * cm,
            topMargin=2.05 * cm,
            bottomMargin=1.8 * cm,
            title=title,
            author="" if anonymous else "韩一赫、陶司宸、史墨栋",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id="normal",
        )
        template = PageTemplate(id="main", frames=[frame], onPage=self.draw_page)
        self.addPageTemplates([template])
        self.anonymous = anonymous

    def draw_page(self, canvas, doc):
        width, height = A4
        if doc.page == 1:
            return
        canvas.saveState()
        canvas.setFont(FONTS["regular"], 10.5)
        canvas.setFillColor(colors.black)
        canvas.drawCentredString(width / 2, 1.25 * cm, f"{doc.page - 1}")
        canvas.restoreState()


def section(title: str, body: list) -> list:
    return [p(title, "h1"), *body, Spacer(1, 2.4 * mm)]


def build_cover(anonymous: bool) -> list:
    story: list = []
    story.append(Spacer(1, 36 * mm))
    story.append(p("参赛作品说明书", "cover_title"))
    story.append(Spacer(1, 30 * mm))
    if anonymous:
        story.append(cover_field_table([("作品名称", WORK_TITLE), ("完成时间", COMPLETE_TIME)]))
    else:
        story.append(cover_field_table(SCHOOL_META))
    story.append(PageBreak())
    return story


def common_intro(anonymous: bool) -> list:
    online_text = "项目已具备线上演示环境，核心页面、后端接口、数据持久化和智能升级能力已经贯通。"
    if not anonymous:
        online_text = "项目已具备线上演示环境（http://8.148.250.84/），核心页面、后端接口、数据持久化和智能升级能力已经贯通。"
    module_rows = [
        ["首页", "沉浸式首屏、越剧简介、历史节点、经典剧目入口、名家流派入口、舞台美学入口、AI 入口、越剧小测、今日戏单。"],
        ["越剧长卷", "以时间线组织越剧起源、女班兴起、进入上海、新越剧改革等发展阶段，帮助用户形成历史脉络。"],
        ["经典剧目", "展示 6 个代表剧目，支持本地视频播放、点赞、收藏、评论、分享；经典唱段区接入 6 条音频、同步唱词、关键词、时间轴、情绪曲线和用户练声评测。"],
        ["名家流派", "展示袁派、傅派、徐派、王派、吕派等流派谱系，以及茅威涛、王文娟、何赛飞等艺术家资料。"],
        ["台前幕后", "通过翻转式交互展示服饰水袖、头饰盔帽、妆容神采、舞台布景，以及化妆、排练、伴奏、换装等幕后流程。"],
        ["新闻与搜索", "新闻页读取数据库动态；搜索页基于站内知识检索，结合领域词、语义扩展和 BM25 风格评分，支持关键词查询、分类聚合和结果跳转。"],
        ["AI 入戏", "包含 AI 问戏、图片识别和 AI 造梦工坊，支持站内知识增强问答、流式回复、生图模板、风格选择和历史记录。"],
        ["图像识别导览", "支持上传越剧相关图片，由服务端代理视觉模型进行图像识别；未配置视觉模型时返回越剧图像导览框架，辅助用户理解服饰、头面、身段和舞台线索。"],
        ["个人中心", "集中展示用户昵称、点赞、收藏、评论、浏览历史和退出登录等账号数据，为后续个性化推荐保留基础。"],
    ]
    return section(
        "一、作品简介",
        [
            p("1. 建设背景", "h2"),
            p(
                "越剧是中国地方戏曲中具有广泛影响力和鲜明江南审美特征的剧种，兼具文学、音乐、表演、服饰、舞台美术等多重文化价值。随着数字媒体和人工智能技术的发展，传统戏曲传播不再局限于剧场、教材或线下展陈，也可以通过 Web 平台、交互设计和智能导览形成新的文化入口。当前年轻用户接触越剧时，常遇到术语陌生、流派关系复杂、唱段不易理解、资料分散等问题，因此需要一个兼具知识梳理、视听体验和智能辅助的综合平台。",
                "body",
            ),
            p("2. 作品定位", "h2"),
            p(
                f"《{WORK_TITLE}》是面向越剧文化传播、学习体验与智能导览场景的 Web 平台。作品以“文化知识展示 + 用户互动 + 多模态智能交互”为总体定位，将越剧历史、经典剧目、流派艺术、台前幕后、新闻资讯、知识检索、AI 问答、AI 生图与音视频智能解析整合为一套可运行的应用系统。平台既服务初次接触越剧的普通观众，也可服务课堂教学、校园文化展示、戏曲社团活动和公共文化展陈。",
                "body",
            ),
            p("3. 当前进度", "h2"),
            p(
                online_text
                + " 前端采用 React 19、TypeScript、Vite 与 HashRouter 构建单页应用，后端采用 Java 21、Spring Boot、Spring JDBC 与 MySQL 提供 REST API。系统已实现账号注册登录、剧目点赞收藏评论分享、浏览历史、个人中心、AI 对话记录、AI 生图记录、站内知识增强问答、知识检索、媒体分析结果展示、图像识别导览、服务器部署包和本地开发脚本等能力，已经具备完整演示条件。",
                "body",
            ),
            p("4. 功能模块", "h2"),
            data_table(["模块", "已实现内容"], module_rows, [3.0 * cm, 12.4 * cm]),
            p("5. 系统特征", "h2"),
            bullet_list(
                [
                    "内容系统化：将历史、剧目、流派、人物、舞台美学和新闻资讯按不同阅读场景重新组织，降低入门门槛。",
                    "交互可参与：通过小测、今日戏单、点赞、收藏、评论、分享和个人中心提升用户参与感。",
                    "智能可辅助：通过站内知识增强问答、知识检索、越剧视觉生成、音视频唱段分析和服饰舞台图像识别，帮助用户理解唱词、唱腔、人物造型和舞台语义。",
                    "工程可扩展：前后端分离、统一 API、数据库初始化、环境变量配置和部署说明，为后续扩展后台管理与更多模型能力保留空间。",
                ]
            ),
        ],
    )


def design_principles() -> list:
    architecture_rows = [
        ["表现层", "React 19、TypeScript、Vite、HashRouter", "负责页面路由、组件渲染、状态同步、响应式布局、动效、弹窗和用户输入反馈。"],
        ["业务接口层", "Spring Boot、Spring Web MVC、Controller/Service/DTO", "提供 `/api` 统一入口，处理认证、内容、互动、AI、媒体分析、个人中心等请求。"],
        ["数据层", "MySQL、Spring JDBC、DatabaseInitializer", "保存用户、Token、剧目、新闻、搜索条目、互动记录、AI 历史和浏览历史，并在启动时自动补齐表结构。"],
        ["智能服务层", "火山方舟兼容接口、站内知识检索、FunASR、librosa、ffmpeg、Web Audio API", "完成知识片段召回、AI 问答/识图/生图、字幕校订、关键词辅助、音频特征曲线和用户练声分析。"],
        ["部署层", "Nginx、dist 静态资源、Spring Boot Jar、环境变量", "前端静态托管，后端本地端口服务，生产环境通过 `/api` 反向代理连接。"],
    ]
    data_rows = [
        ["用户登录", "用户提交账号密码，后端校验密码哈希，生成随机 Token；前端保存 Token，后续请求携带 Authorization 头。"],
        ["内容浏览", "前端从 `/api/plays`、`/api/news`、`/api/search` 等接口读取内容，同时根据页面交互记录浏览历史。"],
        ["剧目互动", "点赞、收藏、评论、分享等操作写入 MySQL，个人中心按当前登录用户聚合展示。"],
        ["AI 问答", "用户问题先进入站内知识检索链路，召回相关剧目、流派、名家、新闻和搜索条目，再由服务端代理模型生成回答；模型不可用时使用本地知识兜底，并保存历史。"],
        ["知识检索", "搜索请求结合关键词匹配、领域词、语义扩展和 BM25 风格评分，结果按剧目、人物、流派、唱腔、舞台、视频与新闻聚合后返回前端。"],
        ["媒体分析", "离线脚本对授权音视频进行唱词校订、关键词辅助、音频特征、节奏能量和情绪曲线分析；前端直接读取 JSON，后端也提供媒体分析接口。"],
        ["图像导览", "上传越剧相关图片后，前端转为 data URL，后端调用支持图片输入的视觉模型；未配置时返回可用于导览的观察框架。"],
    ]
    return section(
        "二、设计原理",
        [
            p("1. 总体架构设计", "h2"),
            p(
                "系统采用前后端分离架构。前端负责文化内容呈现与用户交互，后端负责数据、认证、AI 服务代理和媒体分析结果管理。该结构既能保证页面体验的灵活性，又能把账号、密钥、数据库和模型调用等敏感能力集中在服务端，便于安全维护和后续扩展。",
            ),
            data_table(["层次", "主要技术", "作用"], architecture_rows, [2.4 * cm, 4.2 * cm, 8.8 * cm]),
            p("2. 文化知识图谱化组织", "h2"),
            p(
                "作品把越剧知识拆解为历史脉络、剧目文本、流派谱系、人物艺术、舞台美学、新闻动态和音视频片段等多个维度。页面结构不是简单堆叠资料，而是通过路由、卡片、时间线、热点区域和检索结果，把碎片化知识转化为可浏览、可比较、可继续探索的文化知识网络。",
            ),
            p(
                "例如，用户可以从首页认识越剧基本概念，再进入越剧长卷理解历史阶段；也可以从经典剧目进入具体唱段，再通过 AI 问戏追问人物关系、流派特点和唱腔审美。这样的组织方式使内容之间形成连续路径，而不是孤立页面。",
            ),
            p("3. 前后端分离与数据持久化", "h2"),
            p(
                "前端负责沉浸式视觉呈现、交互状态和用户体验；后端统一承担数据初始化、账号认证、互动写入、个人数据查询、AI 服务代理和媒体分析服务。数据库保存用户账号、Token、剧目、新闻、搜索条目、点赞收藏评论分享、AI 对话、生图记录和浏览历史，保证用户数据不局限在单一浏览器。",
            ),
            p(
                "认证流程采用数据库持久化 Token：登录或注册成功后，后端生成随机 Token，前端写入 localStorage；需要账号身份的接口统一携带 `Authorization: Bearer <token>`；后端仅保存 Token 的 SHA-256 哈希并记录过期时间和最近使用时间。相比纯前端本地存储，该方案能支持跨设备数据同步和服务端主动失效。",
            ),
            data_table(["流程", "说明"], data_rows, [3.0 * cm, 12.4 * cm]),
            p("4. 站内知识增强问答与检索", "h2"),
            p(
                "AI 问答与生图请求不直接暴露模型密钥，统一由 Spring Boot 后端代理调用火山方舟兼容模型服务。问答服务在模型直连失败时会自动构造站内知识上下文：系统从剧目、新闻和搜索条目中召回相关片段，使用领域词、语义扩展和 BM25 风格评分筛选内容，再把片段加入提示词，形成站内知识增强回答。",
            ),
            p(
                "站内知识增强的核心目标是让 AI 不只进行通用聊天，而是围绕平台已有内容回答。回答中会自然关联相关剧目、相关流派、相关人物或继续阅读入口。例如用户询问“梁祝为什么适合入门”时，系统会优先召回经典剧目、唱段说明和相关人物资料，再组织为结构化回答，并提示可继续进入剧目页或流派页阅读。",
            ),
            p(
                "搜索模块服务于全站知识索引。系统既能处理精确关键词，也通过领域词和语义扩展理解“我想看凄美爱情的越剧”“适合初学者看的唱段”“王文娟相关内容”等口语化问题；结果会按剧目、人物、流派、视频和新闻聚合，减少用户在不同页面之间反复查找的成本。",
            ),
            p("5. 多模态媒体理解", "h2"),
            p(
                "经典剧目页接入音视频智能分析结果。当前公开数据包括 6 条经典唱段音频和 6 个本地视频的全片特征曲线。系统通过前端 JSON 数据和 `/api/media-analyses` 展示字幕、关键词、关键时刻、唱腔说明、剧情节点和情绪曲线；离线脚本可对授权素材进行唱词校订、FunASR 关键词辅助、ffmpeg 音频抽取和 librosa 音频特征分析。",
            ),
            p(
                "其中，唱词字幕来自本地视频画面核对、联网唱词资料和人工校订，FunASR 仅用于关键词辅助，不把自动识别结果直接当最终字幕；音频能量、节奏密度和音高变化通过 librosa 归一化为唱腔情绪曲线。系统只对授权素材或站内自有素材进行分析，避免未经授权处理或传播素材。",
            ),
            p("6. 图像识别与服饰/舞台导览", "h2"),
            p(
                "平台已加入越剧图像识别导览能力。用户上传剧照、服饰、头面或舞台图片后，前端会进行格式和大小校验，并把图片发送到后端视觉接口。后端通过支持图片输入的视觉模型识别人物行当、服饰头面、水袖身段、舞台布景和画面文字；如果视觉模型暂未配置，则返回一份越剧图像观察框架，引导用户从行当、服饰、道具、字幕和舞台空间继续判断。",
            ),
            p("7. 安全与可维护性", "h2"),
            p(
                "认证采用数据库持久化 Token，服务端仅保存 Token 的 SHA-256 哈希。密码采用随机 salt 与 PBKDF2WithHmacSHA512 进行加盐哈希。AI Key 位于服务端环境变量，避免前端泄露。代码按组件、页面、服务、控制器和 DTO 分层，便于后续扩展后台管理、更多剧目素材和模型能力。",
            ),
            p(
                "项目同时保留 `.env.example`、本地启动脚本、部署说明和服务器打包产物，使开发、演示和部署之间保持一致。前端构建产物可由 Nginx 托管，后端作为 Spring Boot 服务运行，生产环境通过反向代理将 `/api` 请求转发到后端。",
            ),
        ],
    )


def division(anonymous: bool) -> list:
    if anonymous:
        rows = [
            ["成员A", "前端页面与交互设计", "负责首页、越剧长卷、经典剧目、名家流派、台前幕后等核心页面实现；完成响应式布局、页面动效、卡片系统、视频弹窗、登录弹窗、导航栏、页脚、回到顶部和用户操作反馈；参与视觉素材整理与页面测试。"],
            ["成员B", "后端接口与数据持久化", "负责 Spring Boot 后端、MySQL 表结构、数据库初始化、账号注册登录、Token 认证、剧目/新闻/搜索接口、互动数据、浏览历史、个人中心、统一错误处理和部署配置；参与联调与接口验证。"],
            ["成员C", "AI 与多模态能力整合", "负责 AI 问戏、AI 造梦工坊、站内知识增强问答、知识检索、媒体分析接口、音视频分析脚本、图像识别导览、关键词和情绪曲线数据结构、AI 历史记录保存；参与技术文档、测试材料与作品说明整理。"],
        ]
    else:
        rows = [
            ["韩一赫", "前端页面与交互设计", "负责首页、越剧长卷、经典剧目、名家流派、台前幕后等核心页面实现；完成响应式布局、页面动效、卡片系统、视频弹窗、登录弹窗、导航栏、页脚、回到顶部和用户操作反馈；参与视觉素材整理与页面测试。"],
            ["陶司宸", "后端接口与数据持久化", "负责 Spring Boot 后端、MySQL 表结构、数据库初始化、账号注册登录、Token 认证、剧目/新闻/搜索接口、互动数据、浏览历史、个人中心、统一错误处理和部署配置；参与联调与接口验证。"],
            ["史墨栋", "AI 与多模态能力整合", "负责 AI 问戏、AI 造梦工坊、站内知识增强问答、知识检索、媒体分析接口、音视频分析脚本、图像识别导览、关键词和情绪曲线数据结构、AI 历史记录保存；参与技术文档、测试材料与作品说明整理。"],
        ]
    return section(
        "三、团队分工",
        [
            p(
                "团队按照“前端体验、后端服务、智能能力”三条主线协作推进，并在内容整理、测试验证、部署演示和文档撰写环节共同参与。",
            ),
            p(
                "在开发过程中，团队采用模块拆分与阶段联调结合的方式推进：先完成静态页面和基础内容组织，再接入后端 API 与数据库；随后补充账号体系、互动记录和个人中心；最后加入站内知识增强问答、AI 生图、知识检索、音视频智能分析和图像识别导览，使平台从展示型页面逐步发展为可运行、可交互、可扩展的综合系统。",
            ),
            data_table(["成员", "主要方向", "工作内容"], rows, [2.2 * cm, 3.2 * cm, 10.0 * cm]),
            p("共同完成的工作包括：", "h2"),
            bullet_list(
                [
                    "共同确定作品主题、功能边界、页面结构和参赛材料框架。",
                    "共同整理越剧历史、剧目、流派、舞台美学、新闻资讯和 AI 示例内容。",
                    "共同进行前后端联调、登录状态同步、接口错误处理和功能验收。",
                    "共同完成本地运行、线上部署、作品说明书和提交材料整理。",
                ]
            ),
        ],
    )


def innovation_points() -> list:
    rows = [
        ["站内知识增强问答", "平台不是把 AI 作为独立聊天窗口，而是围绕越剧文化内容设计 AI 问戏。用户提问越剧历史、剧目、人物、流派、唱腔和舞台美学时，系统会召回站内知识片段并构造上下文；模型不可用时也能给出本地兜底回答，使智能问答与平台内容互相支撑。"],
        ["知识检索升级", "搜索从简单关键词匹配升级为领域词、语义扩展和 BM25 风格评分结合的站内知识检索。用户可以用自然语言描述需求，系统按剧目、人物、流派、唱腔、舞台、视频和新闻聚合返回结果，提升资料查找效率。"],
        ["多模态智能解析", "经典剧目页不仅播放视频，还展示同步唱词、关键词、唱腔情绪曲线、关键时刻和剧情节点。用户可以边看边理解唱词大意、情绪递进和舞台调度，使“看戏”转化为可学习、可分析、可回看的过程。"],
        ["越剧视觉生成", "AI 造梦工坊支持越剧海报、花旦角色、江南戏台、舞台灯光和服饰设计等风格，用户输入一句话即可生成具有越剧视觉意象的图片。该功能把传统戏曲元素转化为可参与的视觉创作入口。"],
        ["图像识别与导览", "平台支持上传剧照、服饰、头面和舞台图片，由视觉模型识别行当、服饰、水袖、布景和画面文字；未配置模型时也能提供导览式观察框架。"],
        ["用户练声评测", "经典剧目页支持用户上传自己的演唱音频，前端使用 Web Audio API 在本地生成音高、能量和情绪曲线，并与目标唱段进行相似度评分。"],
        ["文化内容的互动化表达", "平台通过首页小测、今日戏单、收藏、评论、分享、个人中心等机制，让用户从被动阅读变成主动参与。小测强化知识记忆，今日戏单建立每日推荐，个人中心沉淀用户的学习和互动轨迹。"],
        ["服务端安全代理与数据沉淀", "AI Key 不在前端暴露，密码和 Token 均进行哈希处理。AI 对话、生图、浏览、点赞、收藏和评论等行为进入数据库，为后续学习画像、推荐系统和文化传播效果分析提供基础数据。"],
        ["可扩展工程架构", "前后端分离、统一 API、数据库初始化、环境变量配置和部署脚本让项目可继续扩展后台管理、更多模型、更多剧目资源和移动端适配。媒体分析也采用 JSON 结果读取方式，未来切换数据库存储时前端无需大幅调整。"],
    ]
    return section(
        "四、创新点",
        [
            data_table(["创新方向", "具体体现"], rows, [4.1 * cm, 11.3 * cm]),
            p(
                "上述创新点的核心在于把越剧文化从“资料展示”推进到“智能理解”和“交互参与”。作品尝试用工程系统承载文化内容，用站内知识增强问答、知识检索、音视频分析和图像识别降低理解门槛，用多模态分析增强视听材料的可解释性，从而使传统戏曲在数字平台中获得新的传播方式。",
            ),
        ],
    )


def practical_points() -> list:
    practice_rows = [
        ["普通用户", "通过首页、长卷、剧目、流派、知识检索和 AI 问戏快速入门，降低越剧知识门槛。"],
        ["学生群体", "通过小测、时间线、剧目解析、智能字幕、知识出处和图像导览形成学习路径，适合课程展示和自主学习。"],
        ["教师/讲解员", "可使用时间线、剧目卡片、唱段分析、服饰舞台识别和剧情节点辅助课堂讲授或展陈讲解。"],
        ["文化机构", "可扩展为剧团官网、非遗资料库、线上导览平台或地方文化数字展厅原型。"],
        ["开发维护者", "前后端结构清晰，数据表和接口已具备扩展基础，便于继续加入后台管理、推荐系统和更多模型。"],
    ]
    return section(
        "五、实用点",
        [
            data_table(["使用对象", "实际价值"], practice_rows, [3.2 * cm, 12.2 * cm]),
            p("1. 面向普通观众的越剧入门工具", "h2"),
            p(
                "平台通过“越剧是什么”、历史节点、代表剧目、流派名家和台前幕后拆解，帮助不了解越剧的用户快速建立基础认知。用户不需要先阅读大量专业书籍，也可以通过页面入口逐步认识越剧的起源、代表作品、流派特征和舞台审美。首页小测和今日戏单进一步增强停留时间与复访动机。",
            ),
            p("2. 面向课堂和展陈的数字文化材料", "h2"),
            p(
                "作品可用于传统文化课程、校园展示、戏曲社团活动和地方文化传播场景。教师或讲解人员可借助时间线、剧目卡片、智能字幕、关键词、关键时刻、情绪曲线、服饰识别和舞台元素导览辅助讲授，让抽象的唱腔与舞台美学变得更直观。对于线下展览，也可以将平台作为触摸屏或扫码导览内容，让观众在观看剧照、服饰和视频片段时同步获得解释。",
            ),
            p("3. 面向文化机构的可扩展原型", "h2"),
            p(
                "后端已经具备内容读取、互动写入、账号数据、AI 代理、站内知识检索和媒体分析能力，后续可扩展为剧团官网、非遗传播平台、剧目资料库或线上导览系统。新闻资讯、搜索条目、知识片段和图像导览数据可由数据库维护，媒体分析结果可由授权音视频持续补充。若加入后台管理模块，运营人员可以持续更新剧目、新闻、演员资料和导览内容。",
            ),
            p("4. 面向用户数据沉淀的个性化入口", "h2"),
            p(
                "登录用户的收藏、点赞、评论、浏览历史、AI 对话与生图记录可跨设备保存，为后续个性化推荐、学习轨迹、戏单管理和用户画像分析提供基础。例如系统可以根据用户浏览过的剧目和收藏的流派，推荐相关唱段、新闻或艺术家资料，从而把平台从一次性展示工具扩展为长期学习入口。",
            ),
            p("5. 面向后续研发的落地基础", "h2"),
            p(
                "项目已经具备本地开发脚本、前端构建命令、后端打包方式、服务器部署说明和线上运行方案。常用验证包括前端构建、后端打包、健康检查、登录接口检查和数据库初始化检查。这些工程化准备使作品不仅可以展示，也可以继续迭代和维护。",
            ),
        ],
    )


def summary() -> list:
    return section(
        "六、总结",
        [
            p(
                f"《{WORK_TITLE}》以越剧文化为核心对象，将数字内容展示、Web 工程开发、数据库持久化和多模态 AI 技术结合起来，完成了从文化资料整理到可交互平台的建设。作品已经形成“内容展示—用户互动—数据保存—站内知识问答—知识检索—音视频与图像多模态解析”的完整闭环。",
            ),
            p(
                "从当前进度看，用户可以进入平台了解越剧、观看剧目片段、用自然语言检索站内知识、参与小测和互动、登录保存个人数据，并通过 AI 问答、生图、媒体解析、用户练声评测和图像导览获得更丰富的学习体验。前端页面、后端接口、数据库结构、认证机制、站内知识检索链路、AI 代理、媒体分析接口、图像识别导览和部署流程均已具备可演示状态。",
            ),
            p(
                "后续工作可从五个方向继续完善：第一，建立后台内容管理系统，支持剧目、新闻、人物、知识片段、图像导览和媒体分析数据在线维护；第二，补充更多经授权的音视频和图像素材，提高智能字幕、情绪曲线和服饰识别的实际样本量；第三，优化移动端交互细节和视频资源加载，让平台适配更多校园和展陈场景；第四，基于用户收藏、搜索和浏览历史实现个性化推荐；第五，继续加强版权合规、内容审核、AI 限流和模型输出安全控制。",
            ),
            p(
                "本作品的价值不只在于完成一个网站，更在于探索传统戏曲文化如何以更轻盈、更智能、更可参与的方式进入年轻用户和公共文化场景。通过工程化平台与 AI 能力的结合，越剧的“清音”可以从舞台延伸到屏幕，从资料阅读延伸到对话、创作与理解，为传统戏曲数字化传播提供具有实践意义的样例。",
            ),
        ],
    )


def build_pdf(path: Path, anonymous: bool) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    title = "参赛作品说明书"
    doc = YuejuDoc(path, title, anonymous)
    story: list = []
    story.extend(build_cover(anonymous))
    story.extend(common_intro(anonymous))
    story.extend(design_principles())
    story.extend(division(anonymous))
    story.extend(innovation_points())
    story.extend(practical_points())
    story.extend(summary())
    doc.build(story)


def assert_anonymous_clean(path: Path) -> None:
    from pypdf import PdfReader

    text = "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
    forbidden = [
        "中国传媒大学",
        "海南国际学院",
        "智能科学与技术",
        "韩一赫",
        "陶司宸",
        "史墨栋",
        "杜歆茜",
    ]
    found = [item for item in forbidden if item in text]
    if found:
        raise RuntimeError(f"匿名版包含禁止出现的信息：{', '.join(found)}")


def print_summary() -> None:
    from pypdf import PdfReader

    for pdf in [
        SIGNED_PDF,
        ANON_PDF,
        ROOT_SIGNED_PDF,
        ROOT_ANON_PDF,
        DESKTOP_SIGNED_PDF,
        DESKTOP_ANON_PDF,
        DESKTOP_SIGNED_NEW_PDF,
        DESKTOP_ANON_NEW_PDF,
        ROOT_SIGNED_DETAIL_PDF,
        ROOT_ANON_DETAIL_PDF,
    ]:
        if not pdf.exists():
            continue
        reader = PdfReader(str(pdf))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        print(f"{pdf}")
        print(f"  pages: {len(reader.pages)}")
        print(f"  size: {pdf.stat().st_size} bytes")
        print(f"  has_title: {bool(re.search('参赛作品说明书', text))}")


def copy_with_fallback(src: Path, dest: Path, fallback: Path) -> Path:
    shutil.copy2(src, fallback)
    try:
        shutil.copy2(src, dest)
        return dest
    except PermissionError:
        return fallback


if __name__ == "__main__":
    build_pdf(SIGNED_PDF, anonymous=False)
    build_pdf(ANON_PDF, anonymous=True)
    assert_anonymous_clean(ANON_PDF)
    copy_with_fallback(SIGNED_PDF, ROOT_SIGNED_PDF, ROOT_SIGNED_DETAIL_PDF)
    anon_root = copy_with_fallback(ANON_PDF, ROOT_ANON_PDF, ROOT_ANON_DETAIL_PDF)
    assert_anonymous_clean(anon_root)
    DESKTOP_DIR.mkdir(parents=True, exist_ok=True)
    desktop_signed = copy_with_fallback(SIGNED_PDF, DESKTOP_SIGNED_PDF, ROOT_SIGNED_DETAIL_PDF)
    desktop_anon = copy_with_fallback(ANON_PDF, DESKTOP_ANON_PDF, ROOT_ANON_DETAIL_PDF)
    desktop_signed_new = copy_with_fallback(SIGNED_PDF, DESKTOP_SIGNED_NEW_PDF, ROOT_SIGNED_DETAIL_PDF)
    desktop_anon_new = copy_with_fallback(ANON_PDF, DESKTOP_ANON_NEW_PDF, ROOT_ANON_DETAIL_PDF)
    assert_anonymous_clean(desktop_anon)
    assert_anonymous_clean(desktop_anon_new)
    print_summary()
