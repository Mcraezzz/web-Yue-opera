# -*- coding: utf-8 -*-
from __future__ import annotations

from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "design_input"
OUT = ROOT / "design_output"
ASSETS = OUT / "photoshop_assets"
ASSETS.mkdir(parents=True, exist_ok=True)

TEMPLATE = INPUT / "template.psd"
CUC_LOGO = INPUT / "cuc_logo.jpg"
GENERATED = ROOT / "src" / "assets" / "generated"
IMG_DIR = ROOT / "src" / "assets" / "img"

USER_HOME_SCREENSHOT = Path(r"C:\Users\22672\AppData\Local\Temp\ScreenShot_2026-05-28_172335_307.png")
USER_REPERTOIRE_SCREENSHOT = Path(r"C:\Users\22672\AppData\Local\Temp\ScreenShot_2026-05-28_172642_873.png")
USER_BACKSTAGE_SCREENSHOT = Path(r"C:\Users\22672\AppData\Local\Temp\ScreenShot_2026-05-28_172808_683.png")
USER_AI_SCREENSHOT = Path(r"C:\Users\22672\AppData\Local\Temp\ScreenShot_2026-05-28_172821_713.png")
USER_ARCHITECTURE = Path(r"C:\Users\22672\Downloads\ChatGPT Image 2026年5月28日 18_29_16.png")

OVERLAY = ASSETS / "yueyun_qingyin_content_overlay.png"
TOP_LOGO = ASSETS / "cuc_logo_replacement.png"
JSX = OUT / "photoshop_remake_yueyun_qingyin.jsx"

OUT_PSD = OUT / "越韵清音易拉宝-PS重制.psd"
OUT_PNG = OUT / "越韵清音易拉宝-PS重制.png"
OUT_JPG = OUT / "越韵清音易拉宝-PS重制.jpg"
OUT_PDF = OUT / "越韵清音易拉宝-PS重制.pdf"

W, H = 4724, 11811
WORK_TITLE = "越韵清音—越剧文化知识与多模态智能交互平台"

FONT_HEI = r"C:\Windows\Fonts\simhei.ttf"
FONT_SONG = r"C:\Windows\Fonts\simsun.ttc"
FONT_KAI = r"C:\Windows\Fonts\simkai.ttf"
FONT_YAHEI = r"C:\Windows\Fonts\msyh.ttc"

BLUE = (62, 112, 190)
DEEP_BLUE = (34, 82, 168)
INK = (27, 31, 32)
TEXT = (34, 44, 60)
SAGE = (166, 184, 102)
SOFT_GREEN = (216, 229, 206)
LEAF = (158, 192, 82)
RED = (184, 53, 67)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def text_width(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont) -> int:
    box = draw.textbbox((0, 0), text, font=font_obj)
    return box[2] - box[0]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        if char == "\n":
            lines.append(current)
            current = ""
            continue
        trial = current + char
        if text_width(draw, trial, font_obj) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font_obj: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    max_width: int,
    line_height: int,
    max_lines: int | None = None,
) -> int:
    x, y = xy
    lines = wrap_text(draw, text, font_obj, max_width)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        draw.text((x, y), line, font=font_obj, fill=fill)
        y += line_height
    return y


def crop_cover(img: Image.Image, target: tuple[int, int]) -> Image.Image:
    target_w, target_h = target
    scale = max(target_w / img.width, target_h / img.height)
    resized = img.resize((math.ceil(img.width * scale), math.ceil(img.height * scale)), Image.LANCZOS)
    x0 = (resized.width - target_w) // 2
    y0 = (resized.height - target_h) // 2
    return resized.crop((x0, y0, x0 + target_w, y0 + target_h))


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def paste_rounded_image(base: Image.Image, img: Image.Image, box: tuple[int, int, int, int], radius: int) -> None:
    x1, y1, x2, y2 = box
    size = (x2 - x1, y2 - y1)
    img = crop_cover(img.convert("RGB"), size).convert("RGBA")
    shadow = Image.new("RGBA", (size[0] + 70, size[1] + 70), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((35, 35, size[0] + 35, size[1] + 35), radius=radius, fill=(20, 45, 70, 66))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    base.alpha_composite(shadow, (x1 - 35, y1 - 28))
    base.paste(img, (x1, y1), rounded_mask(size, radius))
    ImageDraw.Draw(base).rounded_rectangle(box, radius=radius, outline=(76, 126, 190, 210), width=5)


def paste_rounded_fit_image(
    base: Image.Image,
    img: Image.Image,
    box: tuple[int, int, int, int],
    radius: int,
    background: tuple[int, int, int, int] = (255, 255, 255, 255),
) -> None:
    x1, y1, x2, y2 = box
    size = (x2 - x1, y2 - y1)
    source = img.convert("RGB")
    scale = min(size[0] / source.width, size[1] / source.height)
    resized = source.resize((math.ceil(source.width * scale), math.ceil(source.height * scale)), Image.LANCZOS)
    resized = resized.filter(ImageFilter.UnsharpMask(radius=1.1, percent=115, threshold=3)).convert("RGBA")

    canvas = Image.new("RGBA", size, background)
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))

    shadow = Image.new("RGBA", (size[0] + 70, size[1] + 70), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((35, 35, size[0] + 35, size[1] + 35), radius=radius, fill=(20, 45, 70, 58))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(shadow, (x1 - 35, y1 - 28))
    base.paste(canvas, (x1, y1), rounded_mask(size, radius))
    ImageDraw.Draw(base).rounded_rectangle(box, radius=radius, outline=(76, 126, 190, 210), width=5)


def open_user_image(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def crop_logo(path: Path, target: int) -> Image.Image:
    logo = Image.open(path).convert("RGB")
    px = logo.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(logo.height):
        for x in range(logo.width):
            r, g, b = px[x, y]
            if min(r, g, b) < 248:
                xs.append(x)
                ys.append(y)
    if xs:
        pad = 8
        logo = logo.crop(
            (
                max(0, min(xs) - pad),
                max(0, min(ys) - pad),
                min(logo.width, max(xs) + pad),
                min(logo.height, max(ys) + pad),
            )
        )
    side = max(logo.width, logo.height)
    square = Image.new("RGB", (side, side), "white")
    square.paste(logo, ((side - logo.width) // 2, (side - logo.height) // 2))
    return square.resize((target, target), Image.LANCZOS)


def make_top_logo() -> None:
    diameter = 477
    logo = crop_logo(CUC_LOGO, diameter).convert("RGBA")
    mask = Image.new("L", (diameter, diameter), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    out = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    out.paste(logo, (0, 0), mask)
    TOP_LOGO.parent.mkdir(parents=True, exist_ok=True)
    out.save(TOP_LOGO)


def make_project_badge(size: int = 320) -> Image.Image:
    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(badge)
    d.ellipse((0, 0, size - 1, size - 1), fill=RED)
    d.ellipse((22, 22, size - 23, size - 23), outline=(255, 238, 224, 230), width=8)
    d.text((size // 2, size // 2 - 7), "越", font=font(FONT_KAI, int(size * 0.47)), anchor="mm", fill=(255, 248, 232))
    return badge


def generated_image(name: str) -> Image.Image:
    return Image.open(GENERATED / name).convert("RGB")


def make_homepage_screenshot() -> Image.Image:
    bg_path = next(IMG_DIR.glob("*005125_918.jpg"))
    bg = Image.open(bg_path).convert("RGB")
    shot_w, shot_h = 2048, 984
    shot = crop_cover(bg, (shot_w, shot_h)).convert("RGBA")
    overlay = Image.new("RGBA", shot.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, shot_w, shot_h), fill=(0, 0, 0, 78))
    od.rectangle((0, 0, shot_w, 96), fill=(18, 12, 10, 168))
    for y in range(shot_h):
        alpha = int(max(0, (y - shot_h * 0.56) / (shot_h * 0.44)) * 150)
        if alpha:
            od.line((0, y, shot_w, y), fill=(0, 0, 0, alpha))
    shot.alpha_composite(overlay)
    d = ImageDraw.Draw(shot)
    shot.alpha_composite(make_project_badge(62), (218, 18))
    d.text((296, 48), "越韵清音", font=font(FONT_SONG, 30), anchor="lm", fill=(255, 255, 255))
    x = 820
    for index, item in enumerate(["首页", "越剧长卷", "经典剧目", "名家流派", "台前幕后", "新闻资讯", "AI入戏"]):
        d.text((x, 50), item, font=font(FONT_SONG, 21), anchor="mm", fill=(245, 245, 245))
        if index == 0:
            d.line((x - 25, 70, x + 25, 70), fill=(255, 255, 255), width=3)
        x += 118 if item != "越剧长卷" else 135
    d.text((1790, 50), "登录/注册", font=font(FONT_SONG, 20), anchor="lm", fill=(245, 245, 245))
    d.text((shot_w // 2, 365), "越 韵 清 音", font=font(FONT_KAI, 92), anchor="mm", fill=(245, 238, 222))
    d.text((shot_w // 2, 520), "在江南水韵与婉转清音中，走近越剧的舞台、人物与故事", font=font(FONT_HEI, 30), anchor="mm", fill=(238, 238, 238))
    for text, box, fill, text_color in [
        ("进入看戏", (704, 607, 900, 678), (184, 53, 67, 235), (255, 255, 255)),
        ("开始探索", (928, 607, 1126, 678), (30, 18, 18, 80), (190, 54, 65)),
        ("AI问戏", (1152, 607, 1334, 678), (255, 255, 255, 55), (235, 230, 220)),
    ]:
        d.rounded_rectangle(box, radius=3, fill=fill, outline=(255, 255, 255, 80))
        d.text(((box[0] + box[2]) // 2, 642), text, font=font(FONT_HEI, 22), anchor="mm", fill=text_color)
    return shot.convert("RGB")


def draw_leaf(draw: ImageDraw.ImageDraw, center: tuple[int, int]) -> None:
    cx, cy = center
    points = [(cx - 92, cy - 18), (cx - 8, cy - 82), (cx + 88, cy - 12), (cx + 5, cy + 78)]
    draw.polygon(points, fill=LEAF)
    draw.line((cx - 62, cy - 28, cx + 58, cy + 48), fill=(121, 158, 70), width=7)
    draw.line((cx - 6, cy - 8, cx + 25, cy + 35), fill=(129, 166, 78), width=4)


def draw_section_heading(draw: ImageDraw.ImageDraw, x: int, y: int, title: str) -> int:
    draw_leaf(draw, (x + 72, y + 55))
    draw.text((x + 190, y), f"{title}>>>", font=font(FONT_HEI, 142), fill=INK)
    return y + 188


def draw_info_value(draw: ImageDraw.ImageDraw, value: str, x: int, y: int, max_width: int, size: int = 74) -> int:
    value_font = font(FONT_HEI, size)
    return draw_wrapped(draw, (x, y), value, value_font, BLUE, max_width, int(size * 1.28))


def draw_project_wordmark(base: Image.Image, y: int) -> int:
    d = ImageDraw.Draw(base)
    d.line([(910, y + 132), (1340, y + 38), (1810, y + 92), (2260, y + 42), (2750, y + 126)], fill=(145, 195, 213, 160), width=17, joint="curve")
    d.line([(1120, y + 386), (1580, y + 472), (2040, y + 418), (2500, y + 486), (3060, y + 402)], fill=(220, 158, 166, 160), width=17, joint="curve")
    base.alpha_composite(make_project_badge(300), (565, y + 40))
    d.text((960, y + 172), "越", font=font(FONT_KAI, 300), anchor="lm", fill=(28, 30, 28))
    d.text((1435, y + 172), "韵", font=font(FONT_KAI, 300), anchor="lm", fill=(80, 95, 82))
    d.text((1910, y + 172), "清", font=font(FONT_KAI, 300), anchor="lm", fill=SAGE)
    d.text((2385, y + 172), "音", font=font(FONT_KAI, 300), anchor="lm", fill=(58, 65, 58))
    d.text((W // 2, y + 505), "越剧文化知识与多模态智能交互平台", font=font(FONT_KAI, 80), anchor="mm", fill=(116, 132, 86))
    d.line((1100, y + 588, 3600, y + 588), fill=(204, 215, 190, 210), width=4)
    tags = ["江南水韵", "水袖身段", "经典剧目", "名家流派", "AI问戏"]
    x = 790
    for tag in tags:
        tag_font = font(FONT_HEI, 42)
        w = text_width(d, tag, tag_font) + 80
        d.rounded_rectangle((x, y + 620, x + w, y + 695), radius=38, fill=SOFT_GREEN, outline=(184, 205, 160), width=3)
        d.text((x + w // 2, y + 658), tag, font=tag_font, anchor="mm", fill=(68, 92, 56))
        x += w + 36
    return y + 735


def draw_cultural_photo_strip(base: Image.Image, x: int, y: int, width: int) -> int:
    cards = [
        open_user_image(USER_REPERTOIRE_SCREENSHOT),
        open_user_image(USER_BACKSTAGE_SCREENSHOT),
        open_user_image(USER_AI_SCREENSHOT),
    ]
    gap = 56
    card_w = (width - gap * 2) // 3
    card_h = 555
    for index, img in enumerate(cards):
        xx = x + index * (card_w + gap)
        box = (xx, y, xx + card_w, y + card_h)
        paste_rounded_fit_image(base, img, box, 32)
    return y + card_h


def draw_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color=(70, 128, 198), width=7) -> None:
    draw.line((start[0], start[1], end[0], end[1]), fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    head = 30
    spread = math.pi / 7
    draw.polygon(
        [
            end,
            (int(end[0] - head * math.cos(angle - spread)), int(end[1] - head * math.sin(angle - spread))),
            (int(end[0] - head * math.cos(angle + spread)), int(end[1] - head * math.sin(angle + spread))),
        ],
        fill=color,
    )


def draw_arch_box(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, body: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=24, fill=(252, 254, 255, 238), outline=(91, 145, 205, 230), width=4)
    draw.text(((x1 + x2) // 2, y1 + 48), title, font=font(FONT_HEI, 50), anchor="mm", fill=DEEP_BLUE)
    yy = y1 + 102
    for line in wrap_text(draw, body, font(FONT_SONG, 35), x2 - x1 - 76)[:3]:
        draw.text(((x1 + x2) // 2, yy), line, font=font(FONT_SONG, 35), anchor="ma", fill=(42, 54, 75))
        yy += 46


def draw_architecture(base: Image.Image, x: int, y: int, width: int) -> int:
    img = open_user_image(USER_ARCHITECTURE)
    panel_h = round(width * img.height / img.width)
    paste_rounded_fit_image(base, img, (x, y, x + width, y + panel_h), 26)
    return y + panel_h


def draw_callout(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, body: str, accent: tuple[int, int, int]) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=76, fill=(220, 233, 212, 230))
    draw.rounded_rectangle((x1, y1, x1 + 18, y2), radius=9, fill=accent)
    draw.text((x1 + 82, y1 + 58), title, font=font(FONT_HEI, 66), fill=(42, 62, 42))
    draw_wrapped(draw, (x1 + 82, y1 + 145), body, font(FONT_SONG, 49), TEXT, x2 - x1 - 160, 68, max_lines=4)


def draw_audio_visual_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=48, fill=(245, 250, 255, 235), outline=(193, 218, 242), width=4)
    draw.text((x1 + 60, y1 + 58), "音视频智能分析", font=font(FONT_HEI, 62), fill=DEEP_BLUE)
    base_y = y1 + 210
    for i in range(26):
        h = int(42 + 95 * abs(math.sin(i * 0.55)))
        xx = x1 + 70 + i * 34
        draw.rounded_rectangle((xx, base_y - h // 2, xx + 16, base_y + h // 2), radius=8, fill=(85, 153, 207))
    pts = []
    for i in range(12):
        xx = x1 + 700 + i * 70
        yy = y1 + 245 - int(80 * math.sin(i * 0.75))
        pts.append((xx, yy))
    draw.line(pts, fill=RED, width=7, joint="curve")
    draw.rounded_rectangle((x1 + 60, y1 + 350, x2 - 60, y1 + 432), radius=24, fill=(232, 242, 230))
    draw.text((x1 + 92, y1 + 392), "ASR字幕 / 关键词 / 关键时刻 / 唱腔情绪曲线", font=font(FONT_HEI, 42), anchor="lm", fill=(62, 82, 62))


def draw_ai_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=48, fill=(245, 250, 255, 235), outline=(193, 218, 242), width=4)
    draw.text((x1 + 60, y1 + 58), "AI多模态交互", font=font(FONT_HEI, 62), fill=DEEP_BLUE)
    draw.rounded_rectangle((x1 + 70, y1 + 135, x1 + 670, y1 + 235), radius=38, fill=(226, 238, 248))
    draw.text((x1 + 115, y1 + 185), "越剧《梁祝》的水袖表达什么情绪？", font=font(FONT_SONG, 38), anchor="lm", fill=TEXT)
    draw.rounded_rectangle((x1 + 330, y1 + 258, x2 - 70, y1 + 392), radius=38, fill=(224, 232, 212))
    draw_wrapped(draw, (x1 + 375, y1 + 292), "AI问戏结合站内知识，回答剧目、流派、唱腔与舞台美学问题。", font(FONT_SONG, 37), TEXT, x2 - x1 - 500, 48, max_lines=2)
    draw.rounded_rectangle((x1 + 70, y1 + 300, x1 + 295, y1 + 470), radius=28, fill=(191, 216, 226))
    draw.text((x1 + 182, y1 + 385), "AI\n生图", font=font(FONT_HEI, 45), anchor="mm", fill=(255, 255, 255))


def draw_overlay() -> None:
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # Photoshop trims transparent PNG bounds when placing. These imperceptible
    # anchor pixels preserve the full canvas coordinate system.
    overlay.putpixel((0, 0), (255, 255, 255, 1))
    overlay.putpixel((W - 1, 0), (255, 255, 255, 1))
    overlay.putpixel((0, H - 1), (255, 255, 255, 1))
    overlay.putpixel((W - 1, H - 1), (255, 255, 255, 1))
    d = ImageDraw.Draw(overlay)
    left, right = 520, 4200
    value_x = 1435
    draw_info_value(d, WORK_TITLE, value_x, 2350, right - value_x, 130)
    draw_info_value(d, "韩一赫、陶司宸、史墨栋", value_x, 2620, right - value_x, 230)
    draw_info_value(d, "杜歆茜", value_x, 2895, right - value_x, 230)
    draw_info_value(d, "中国传媒大学海南国际学院", value_x, 3170, right - value_x, 230)

    y = draw_project_wordmark(overlay, 3525)
    y = draw_cultural_photo_strip(overlay, left + 80, y + 25, right - left - 160) + 80

    y = draw_section_heading(d, left, y, "项目概述")
    overview = (
        "本作品以越剧文化知识传播为核心，围绕“越剧长卷、经典剧目、名家流派、台前幕后、新闻资讯、AI入戏”构建沉浸式数字平台。"
        "用户可在江南水韵与舞台影像中理解越剧的历史脉络、剧目故事、唱腔身段、服饰头面和舞台美学，并通过互动功能持续学习与收藏。"
    )
    y = draw_wrapped(d, (left + 185, y), overview, font(FONT_SONG, 78), TEXT, right - left - 230, 106) + 60

    y = draw_section_heading(d, left, y, "技术创新")
    y = draw_architecture(overlay, left + 105, y, right - left - 210) + 45
    draw_callout(
        d,
        (left + 110, y, left + 1780, y + 435),
        "音视频智能分析",
        "对经典唱段进行ASR字幕、关键词、关键时刻与唱腔情绪曲线分析，让观众从“看热闹”进入“听懂唱腔、看懂情绪”。",
        (78, 150, 210),
    )
    draw_callout(
        d,
        (left + 1970, y, right - 110, y + 435),
        "AI多模态交互",
        "以AI问戏、AI造梦工坊和生图历史为核心，支持越剧知识问答、舞台图像生成与个性化学习记录。",
        RED,
    )
    y += 540

    y = draw_section_heading(d, left, y, "功能演示")
    draw_audio_visual_card(d, (left + 90, y, left + 1805, y + 520))
    draw_ai_card(d, (left + 1910, y, right - 90, y + 520))
    y += 635
    shot = open_user_image(USER_HOME_SCREENSHOT)
    paste_rounded_fit_image(overlay, shot, (left + 90, y, right - 90, y + 1500), 40)
    y += 1620

    y = draw_section_heading(d, left, y, "项目展示")
    summary = (
        "平台已完成前后端主要功能联调，具备首页展示、分类浏览、剧目互动、登录注册、浏览历史、AI对话、生图记录与媒体分析结果展示能力。"
        "后续将继续补充越剧知识数据，优化多模态分析效果，并面向课程教学、校园文化展示和非遗传播场景持续扩展。"
    )
    y = draw_wrapped(d, (left + 185, y), summary, font(FONT_SONG, 74), TEXT, right - left - 230, 100) + 35

    labels = [("课堂教学", "辅助讲解越剧历史、剧目与唱腔"), ("校园展示", "用于竞赛路演与文化活动展陈"), ("非遗传播", "让传统戏曲内容更易理解与分享")]
    card_w = 1130
    for i, (title, body) in enumerate(labels):
        x = left + 120 + i * (card_w + 95)
        d.rounded_rectangle((x, y, x + card_w, y + 270), radius=38, fill=(245, 250, 255, 230), outline=(200, 222, 245), width=3)
        d.text((x + 58, y + 66), title, font=font(FONT_HEI, 62), fill=DEEP_BLUE)
        draw_wrapped(d, (x + 58, y + 150), body, font(FONT_SONG, 50), TEXT, card_w - 116, 66, max_lines=2)

    d.text((W // 2, 11485), "越剧文化知识展示 · 音视频智能分析 · AI多模态交互", font=font(FONT_HEI, 48), anchor="mm", fill=(78, 101, 72))
    overlay.save(OVERLAY)


def js_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "/")


def write_jsx() -> None:
    script = f'''#target photoshop
app.displayDialogs = DialogModes.NO;

var templateFile = new File("{js_path(TEMPLATE)}");
var logoFile = new File("{js_path(TOP_LOGO)}");
var overlayFile = new File("{js_path(OVERLAY)}");
var outPsd = new File("{js_path(OUT_PSD)}");
var outPng = new File("{js_path(OUT_PNG)}");
var outJpg = new File("{js_path(OUT_JPG)}");
var outPdf = new File("{js_path(OUT_PDF)}");

function hideLayerByName(container, targetName) {{
    for (var i = 0; i < container.layers.length; i++) {{
        var layer = container.layers[i];
        if (layer.name == targetName) {{
            layer.visible = false;
        }}
        if (layer.typename == "LayerSet") {{
            hideLayerByName(layer, targetName);
        }}
    }}
}}

function placeFile(fileObj, layerName, left, top) {{
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), fileObj);
    desc.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcsa"));
    executeAction(charIDToTypeID("Plc "), desc, DialogModes.NO);
    var layer = app.activeDocument.activeLayer;
    layer.name = layerName;
    var b = layer.bounds;
    var currentLeft = b[0].value;
    var currentTop = b[1].value;
    layer.translate(left - currentLeft, top - currentTop);
    return layer;
}}

function placeFileSized(fileObj, layerName, left, top, targetWidth, targetHeight) {{
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), fileObj);
    desc.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcsa"));
    executeAction(charIDToTypeID("Plc "), desc, DialogModes.NO);
    var layer = app.activeDocument.activeLayer;
    layer.name = layerName;
    var b = layer.bounds;
    var currentWidth = b[2].value - b[0].value;
    var currentHeight = b[3].value - b[1].value;
    layer.resize((targetWidth / currentWidth) * 100, (targetHeight / currentHeight) * 100, AnchorPosition.TOPLEFT);
    b = layer.bounds;
    layer.translate(left - b[0].value, top - b[1].value);
    return layer;
}}

var doc = app.open(templateFile);
app.activeDocument = doc;
var oldUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
hideLayerByName(doc, "图层 8");
hideLayerByName(doc, "作品简介正文填写");

placeFileSized(logoFile, "中国传媒大学校徽", 402, 487, 477, 477);
placeFileSized(overlayFile, "越韵清音项目内容", 0, 0, 4724, 11811);

var psdOptions = new PhotoshopSaveOptions();
psdOptions.layers = true;
doc.saveAs(outPsd, psdOptions, true, Extension.LOWERCASE);

var exportDoc = doc.duplicate("越韵清音易拉宝-导出", true);
exportDoc.flatten();
exportDoc.changeMode(ChangeMode.RGB);

var jpgOptions = new JPEGSaveOptions();
jpgOptions.quality = 12;
exportDoc.saveAs(outJpg, jpgOptions, true, Extension.LOWERCASE);

var pngOptions = new PNGSaveOptions();
exportDoc.saveAs(outPng, pngOptions, true, Extension.LOWERCASE);

var pdfOptions = new PDFSaveOptions();
pdfOptions.preserveEditing = false;
exportDoc.saveAs(outPdf, pdfOptions, true, Extension.LOWERCASE);

exportDoc.close(SaveOptions.DONOTSAVECHANGES);
doc.close(SaveOptions.DONOTSAVECHANGES);
app.preferences.rulerUnits = oldUnits;
'''
    JSX.write_text(script, encoding="utf-8-sig")


if __name__ == "__main__":
    make_top_logo()
    draw_overlay()
    write_jsx()
    print(JSX)
    print(TOP_LOGO)
    print(OVERLAY)
