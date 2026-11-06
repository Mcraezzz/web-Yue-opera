# -*- coding: utf-8 -*-
from __future__ import annotations

from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "design_input"
OUT = ROOT / "design_output"
OUT.mkdir(exist_ok=True)

TEMPLATE = INPUT / "template.psd"
CUC_LOGO = INPUT / "cuc_logo.jpg"

POSTER_PNG = OUT / "越韵清音易拉宝-成品.png"
POSTER_JPG = OUT / "越韵清音易拉宝-成品.jpg"
POSTER_PDF = OUT / "越韵清音易拉宝-成品.pdf"
POSTER_PSD = OUT / "越韵清音易拉宝-可编辑分层.psd"
HOMEPAGE_SHOT = OUT / "越韵清音-首页截图.png"

W, H = 4724, 11811
WORK_TITLE = "越韵清音—越剧文化知识与多模态智能交互平台"

FONT_HEI = r"C:\Windows\Fonts\simhei.ttf"
FONT_SONG = r"C:\Windows\Fonts\simsun.ttc"
FONT_KAI = r"C:\Windows\Fonts\simkai.ttf"
FONT_YAHEI = r"C:\Windows\Fonts\msyh.ttc"

BLUE = (60, 108, 184)
DEEP_BLUE = (28, 76, 165)
GREEN_BG = (235, 246, 232)
SAGE = (166, 184, 102)
LEAF = (150, 186, 84)
INK = (26, 31, 30)
TEXT = (28, 40, 56)
GENERATED = ROOT / "src" / "assets" / "generated"


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
    *,
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
        pad = 10
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


def paste_round_logo(base: Image.Image, img: Image.Image, center: tuple[int, int], diameter: int, *, border: int = 18) -> None:
    x = center[0] - diameter // 2
    y = center[1] - diameter // 2
    plate_size = diameter + border * 2
    plate = Image.new("RGBA", (plate_size, plate_size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plate)
    pd.ellipse((0, 0, plate_size - 1, plate_size - 1), fill=(255, 255, 255, 255))
    pd.ellipse((8, 8, plate_size - 9, plate_size - 9), outline=(220, 206, 135, 255), width=8)
    base.alpha_composite(plate, (x - border, y - border))

    img = img.resize((diameter, diameter), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (diameter, diameter), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    base.paste(img, (x, y), mask)


def paste_feathered_background(base: Image.Image, src_box: tuple[int, int, int, int], dst_xy: tuple[int, int]) -> None:
    patch = base.crop(src_box)
    w, h = patch.size
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((28, 28, w - 29, h - 29), radius=130, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(42))
    base.paste(patch, dst_xy, mask)


def cover_soft(base: Image.Image, box: tuple[int, int, int, int], color: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    layer = Image.new("RGBA", (x2 - x1, y2 - y1), color)
    mask = Image.new("L", layer.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, layer.width - 1, layer.height - 1), radius=80, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(28))
    base.paste(layer, (x1, y1), mask)


def make_project_badge(size: int = 430) -> Image.Image:
    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(badge)
    d.ellipse((0, 0, size - 1, size - 1), fill=(184, 53, 67, 255))
    d.ellipse((24, 24, size - 25, size - 25), outline=(255, 239, 226, 230), width=9)
    d.text((size // 2, size // 2 - 8), "越", font=font(FONT_KAI, int(size * 0.47)), anchor="mm", fill=(255, 248, 232))
    return badge


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def crop_cover(img: Image.Image, target: tuple[int, int]) -> Image.Image:
    target_w, target_h = target
    scale = max(target_w / img.width, target_h / img.height)
    resized = img.resize((math.ceil(img.width * scale), math.ceil(img.height * scale)), Image.LANCZOS)
    x0 = (resized.width - target_w) // 2
    y0 = (resized.height - target_h) // 2
    return resized.crop((x0, y0, x0 + target_w, y0 + target_h))


def paste_rounded_image(base: Image.Image, img: Image.Image, box: tuple[int, int, int, int], radius: int) -> None:
    x1, y1, x2, y2 = box
    size = (x2 - x1, y2 - y1)
    img = crop_cover(img.convert("RGB"), size).convert("RGBA")
    shadow = Image.new("RGBA", (size[0] + 80, size[1] + 80), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((40, 40, size[0] + 40, size[1] + 40), radius=radius, fill=(25, 56, 82, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    base.alpha_composite(shadow, (x1 - 40, y1 - 30))
    mask = rounded_mask(size, radius)
    base.paste(img, (x1, y1), mask)
    ImageDraw.Draw(base).rounded_rectangle(box, radius=radius, outline=(69, 117, 182), width=5)


def generated_image(name: str) -> Image.Image:
    return Image.open(GENERATED / name).convert("RGB")


def make_homepage_screenshot() -> Image.Image:
    img_dir = ROOT / "src" / "assets" / "img"
    bg_path = next(img_dir.glob("*005125_918.jpg"))
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
    nav_items = ["首页", "越剧长卷", "经典剧目", "名家流派", "台前幕后", "新闻资讯", "AI入戏"]
    x = 820
    for index, item in enumerate(nav_items):
        d.text((x, 50), item, font=font(FONT_SONG, 21), anchor="mm", fill=(245, 245, 245))
        if index == 0:
            d.line((x - 25, 70, x + 25, 70), fill=(255, 255, 255), width=3)
        x += 118 if item != "越剧长卷" else 135
    d.text((1790, 50), "登录/注册", font=font(FONT_SONG, 20), anchor="lm", fill=(245, 245, 245))
    d.text((shot_w // 2, 365), "越 韵 清 音", font=font(FONT_KAI, 92), anchor="mm", fill=(245, 238, 222))
    d.text(
        (shot_w // 2, 520),
        "在江南水韵与婉转清音中，走近越剧的舞台、人物与故事",
        font=font(FONT_HEI, 30),
        anchor="mm",
        fill=(238, 238, 238),
    )
    for text, box, fill, text_color in [
        ("进入看戏", (704, 607, 900, 678), (184, 53, 67, 235), (255, 255, 255)),
        ("开始探索", (928, 607, 1126, 678), (30, 18, 18, 80), (190, 54, 65)),
        ("AI问戏", (1152, 607, 1334, 678), (255, 255, 255, 55), (235, 230, 220)),
    ]:
        d.rounded_rectangle(box, radius=3, fill=fill, outline=(255, 255, 255, 80))
        d.text(((box[0] + box[2]) // 2, 642), text, font=font(FONT_HEI, 22), anchor="mm", fill=text_color)
    HOMEPAGE_SHOT.parent.mkdir(exist_ok=True)
    shot.convert("RGB").save(HOMEPAGE_SHOT, quality=95)
    return shot


def draw_leaf(draw: ImageDraw.ImageDraw, center: tuple[int, int], scale: int = 1) -> None:
    cx, cy = center
    points = [
        (cx - 95 * scale, cy - 18 * scale),
        (cx - 8 * scale, cy - 82 * scale),
        (cx + 88 * scale, cy - 12 * scale),
        (cx + 4 * scale, cy + 80 * scale),
    ]
    draw.polygon(points, fill=(173, 204, 99))
    draw.line((cx - 68 * scale, cy - 26 * scale, cx + 55 * scale, cy + 46 * scale), fill=(120, 160, 71), width=max(3, 8 * scale))
    draw.line((cx - 10 * scale, cy - 10 * scale, cx + 22 * scale, cy + 35 * scale), fill=(130, 166, 80), width=max(2, 5 * scale))


def draw_section_heading(draw: ImageDraw.ImageDraw, x: int, y: int, title: str) -> int:
    draw_leaf(draw, (x + 72, y + 58), 1)
    draw.text((x + 190, y), f"{title}>>>", font=font(FONT_HEI, 158), fill=INK)
    return y + 205


def draw_pill(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, fill=(204, 220, 193)) -> None:
    draw.rounded_rectangle(box, radius=(box[3] - box[1]) // 2, fill=fill)
    draw.text(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2 + 4), text, font=font(FONT_HEI, 62), anchor="mm", fill=(54, 76, 55))


def draw_info_line(draw: ImageDraw.ImageDraw, label: str, value: str, x: int, y: int, max_width: int) -> int:
    label_font = font(FONT_HEI, 122)
    value_font = font(FONT_YAHEI, 104)
    draw.text((x, y), label, font=label_font, fill=BLUE)
    return draw_wrapped(draw, (x + 780, y + 6), value, value_font, BLUE, max_width, 130)


def draw_project_wordmark(base: Image.Image, y: int) -> int:
    d = ImageDraw.Draw(base)
    # Pastel water-sleeve strokes make the project mark read as Yueju, not only as a tech logo.
    sleeve_blue = [(950, y + 135), (1350, y + 40), (1810, y + 92), (2260, y + 35), (2730, y + 125)]
    sleeve_pink = [(1110, y + 410), (1580, y + 500), (2040, y + 438), (2500, y + 505), (3090, y + 410)]
    d.line(sleeve_blue, fill=(144, 194, 213), width=18, joint="curve")
    d.line(sleeve_pink, fill=(219, 158, 166), width=18, joint="curve")
    base.alpha_composite(make_project_badge(330), (620, y + 40))
    d.text((1040, y + 190), "越", font=font(FONT_KAI, 310), anchor="lm", fill=(28, 30, 28))
    d.text((1515, y + 190), "韵", font=font(FONT_KAI, 310), anchor="lm", fill=(80, 95, 82))
    d.text((1995, y + 190), "清", font=font(FONT_KAI, 310), anchor="lm", fill=SAGE)
    d.text((2475, y + 190), "音", font=font(FONT_KAI, 310), anchor="lm", fill=(58, 65, 58))
    d.text((W // 2, y + 545), "越剧文化知识与多模态智能交互平台", font=font(FONT_KAI, 92), anchor="mm", fill=(116, 132, 86))
    d.line((1120, y + 630, 3600, y + 630), fill=(206, 219, 190), width=4)

    tags = ["江南水韵", "水袖身段", "经典剧目", "名家流派", "AI问戏"]
    x = 820
    for tag in tags:
        w = text_width(d, tag, font(FONT_HEI, 52)) + 88
        d.rounded_rectangle((x, y + 668, x + w, y + 760), radius=46, fill=(214, 229, 203), outline=(184, 205, 160), width=3)
        d.text((x + w // 2, y + 714), tag, font=font(FONT_HEI, 52), anchor="mm", fill=(68, 92, 56))
        x += w + 42
    return y + 825


def draw_cultural_photo_strip(base: Image.Image, x: int, y: int, width: int) -> int:
    d = ImageDraw.Draw(base)
    cards = [
        ("经典剧目", "《红楼梦》《梁祝》", generated_image("hongloumeng-stage.jpg")),
        ("舞台美学", "水袖、花窗与江南园林", generated_image("liangzhu-stage.jpg")),
        ("台前幕后", "服饰、头面与妆造细节", generated_image("costume-display.jpg")),
    ]
    gap = 58
    card_w = (width - gap * 2) // 3
    card_h = 430
    for index, (title, subtitle, img) in enumerate(cards):
        xx = x + index * (card_w + gap)
        box = (xx, y, xx + card_w, y + card_h)
        paste_rounded_image(base, img, box, 36)
        overlay = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for yy in range(card_h):
            alpha = int(max(0, (yy - card_h * 0.46) / (card_h * 0.54)) * 150)
            if alpha:
                od.line((0, yy, card_w, yy), fill=(0, 0, 0, alpha))
        base.alpha_composite(overlay, (xx, y))
        d.text((xx + 58, y + card_h - 118), title, font=font(FONT_HEI, 58), fill=(255, 255, 245))
        d.text((xx + 58, y + card_h - 50), subtitle, font=font(FONT_SONG, 42), fill=(246, 246, 234))
    return y + card_h


def draw_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color=(70, 128, 198), width=8) -> None:
    draw.line((start[0], start[1], end[0], end[1]), fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    head = 34
    spread = math.pi / 7
    draw.polygon(
        [
            end,
            (int(end[0] - head * math.cos(angle - spread)), int(end[1] - head * math.sin(angle - spread))),
            (int(end[0] - head * math.cos(angle + spread)), int(end[1] - head * math.sin(angle + spread))),
        ],
        fill=color,
    )


def draw_arch_box(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    body: str,
    *,
    title_size: int = 58,
    body_size: int = 43,
) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=26, fill=(248, 253, 247), outline=(91, 145, 205), width=4)
    draw.text(((x1 + x2) // 2, y1 + 55), title, font=font(FONT_HEI, title_size), anchor="mm", fill=DEEP_BLUE)
    lines = wrap_text(draw, body, font(FONT_SONG, body_size), x2 - x1 - 86)
    yy = y1 + 115
    for line in lines[:3]:
        draw.text(((x1 + x2) // 2, yy), line, font=font(FONT_SONG, body_size), anchor="ma", fill=(42, 54, 75))
        yy += 52


def draw_architecture(draw: ImageDraw.ImageDraw, x: int, y: int, width: int) -> int:
    panel_h = 1260
    draw.rounded_rectangle((x, y, x + width, y + panel_h), radius=36, fill=(247, 252, 246), outline=(190, 216, 184), width=4)
    draw.text((x + 170, y + 92), "技术架构图", font=font(FONT_HEI, 78), fill=(60, 98, 59))

    user = (x + 1050, y + 125, x + 2610, y + 330)
    front = (x + 150, y + 500, x + 1605, y + 820)
    back = (x + 1995, y + 500, x + 3450, y + 820)
    data = (x + 190, y + 970, x + 1215, y + 1175)
    ai = (x + 1295, y + 970, x + 2320, y + 1175)
    media = (x + 2400, y + 970, x + 3425, y + 1175)

    draw_arch_box(draw, user, "用户访问", "浏览器 / 移动端 / 展示大屏", title_size=58, body_size=42)
    draw_arch_box(draw, front, "前端展示层", "React 19、Vite、TypeScript、HashRouter")
    draw_arch_box(draw, back, "后端服务层", "Spring Boot REST API：认证、内容、互动")
    draw_arch_box(draw, data, "数据持久化", "MySQL：用户、Token、收藏、评论、历史", title_size=50, body_size=36)
    draw_arch_box(draw, ai, "智能交互", "火山方舟兼容接口 + 站内知识检索", title_size=50, body_size=36)
    draw_arch_box(draw, media, "多模态分析", "ASR字幕、关键词、唱腔情绪曲线", title_size=50, body_size=36)

    draw_arrow(draw, ((user[0] + user[2]) // 2, user[3] + 8), ((front[0] + front[2]) // 2, front[1] - 18))
    draw_arrow(draw, (front[2] + 20, (front[1] + front[3]) // 2), (back[0] - 20, (back[1] + back[3]) // 2))
    for target in [data, ai, media]:
        draw_arrow(draw, ((back[0] + back[2]) // 2, back[3] + 18), ((target[0] + target[2]) // 2, target[1] - 18), width=7)
    draw.text((x + width // 2, y + 1222), "统一 /api 接口连接内容展示、用户互动、AI 服务与媒体分析结果", font=font(FONT_HEI, 50), anchor="mm", fill=DEEP_BLUE)
    return y + panel_h


def draw_callout(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, body: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=84, fill=(203, 220, 193))
    draw.text((x1 + 95, y1 + 72), title, font=font(FONT_HEI, 76), fill=(37, 55, 39))
    draw_wrapped(draw, (x1 + 95, y1 + 178), body, font(FONT_SONG, 56), TEXT, x2 - x1 - 190, 78, max_lines=4)


def build_poster() -> Image.Image:
    poster = Image.open(TEMPLATE).convert("RGBA")
    d = ImageDraw.Draw(poster)

    # Keep the original event header and format. Replace only the school emblem slot, as shown in the reference.
    paste_round_logo(poster, crop_logo(CUC_LOGO, 520), (630, 470), 500, border=80)

    # Restore the reference-style content panel.
    panel = (300, 2055, 4495, 11385)
    d.rounded_rectangle(panel, radius=360, fill=GREEN_BG)
    d.rounded_rectangle(panel, radius=360, outline=(221, 239, 215), width=8)

    # Redraw the original-looking tab so the panel fill does not disturb the template shape.
    tab = (650, 1815, 2020, 2143)
    tab_w, tab_h = tab[2] - tab[0], tab[3] - tab[1]
    tab_layer = Image.new("RGBA", (tab_w, tab_h), (0, 0, 0, 0))
    td = ImageDraw.Draw(tab_layer)
    for i in range(tab_h):
        t = i / tab_h
        color = (
            int(50 * (1 - t) + 40 * t),
            int(190 * (1 - t) + 112 * t),
            int(238 * (1 - t) + 218 * t),
            255,
        )
        td.line((0, i, tab_w, i), fill=color)
    tab_mask = rounded_mask((tab_w, tab_h), 45)
    poster.paste(tab_layer, (tab[0], tab[1]), tab_mask)
    d.rounded_rectangle(tab, radius=45, outline=(43, 136, 213), width=4)
    d.text(((tab[0] + tab[2]) // 2, (tab[1] + tab[3]) // 2 - 8), "作 品 简 介", font=font(FONT_KAI, 170), anchor="mm", fill=(255, 255, 255))

    left, right = 540, 4210
    y = 2365
    y = draw_info_line(d, "作品名称：", WORK_TITLE, left, y, right - left - 780) + 14
    y = draw_info_line(d, "作    者：", "韩一赫、陶司宸、史墨栋", left, y, right - left - 780) + 14
    y = draw_info_line(d, "指导老师：", "杜歆茜", left, y, right - left - 780) + 14
    y = draw_info_line(d, "所属院校：", "中国传媒大学海南国际学院", left, y, right - left - 780) + 30

    y = draw_project_wordmark(poster, y)
    y = draw_cultural_photo_strip(poster, left + 80, y + 25, right - left - 160) + 80

    y = draw_section_heading(d, left, y + 45, "项目概述")
    overview = (
        "本作品面向越剧文化传播、课程学习、校园展示和线上导览场景，构建集文化知识展示、经典剧目浏览、"
        "名家流派介绍、台前幕后知识、新闻资讯、用户互动、AI问答、AI生图与音视频智能分析于一体的数字平台。"
        "平台以更直观的页面叙事和更轻量的交互方式，帮助用户理解越剧的历史脉络、剧目故事、唱腔美学与舞台表达。"
    )
    y = draw_wrapped(d, (left + 185, y), overview, font(FONT_SONG, 78), TEXT, right - left - 250, 112) + 105

    y = draw_section_heading(d, left, y, "技术创新")
    y = draw_architecture(d, left + 130, y + 15, right - left - 260) + 80
    draw_callout(
        d,
        (left + 110, y, left + 1780, y + 500),
        "知识与内容融合",
        "将越剧长卷、剧目、流派、新闻与用户行为数据统一组织，为检索、收藏、评论和后续资料扩展提供基础。",
    )
    draw_callout(
        d,
        (left + 1970, y, right - 110, y + 500),
        "大模型智能交互",
        "通过AI问戏、AI造梦工坊和站内知识增强回答，把传统戏曲知识转化为可提问、可生成、可探索的体验。",
    )
    y += 620

    y = draw_section_heading(d, left, y, "功能演示")
    draw_pill(d, (left + 120, y + 10, left + 900, y + 150), "文化知识展示")
    draw_pill(d, (left + 1450, y + 10, left + 2230, y + 150), "AI 问戏交互")
    draw_pill(d, (left + 2780, y + 10, left + 3560, y + 150), "多模态分析")
    y += 220
    shot = make_homepage_screenshot()
    paste_rounded_image(poster, shot, (left + 80, y, right - 80, y + 1660), 42)
    y += 1815

    y = draw_section_heading(d, left, y, "创新性与实用性")
    draw_callout(
        d,
        (left + 110, y, left + 1780, y + 570),
        "创新性",
        "作品把越剧文化知识平台与多模态AI能力结合，既保留剧种知识的系统性，又引入智能问答、图像生成和媒体分析，增强学习与展示的沉浸感。",
    )
    draw_callout(
        d,
        (left + 1970, y, right - 110, y + 570),
        "实用性",
        "可服务于高校课程教学、竞赛路演、校园文化活动和非遗传播展示，后续可扩展剧目资料库、后台管理和更多授权音视频内容。",
    )
    y += 705

    y = draw_section_heading(d, left, y, "项目展示")
    summary = (
        "目前项目已完成前后端主要功能联调，具备首页展示、分类浏览、搜索、登录注册、用户互动、AI对话、生图记录、"
        "媒体分析结果展示等能力。后续将继续补充越剧知识数据、优化多模态分析效果，并推进真实场景部署与展示应用。"
    )
    draw_wrapped(d, (left + 185, y), summary, font(FONT_SONG, 76), TEXT, right - left - 250, 110)

    d.text((W // 2, 11262), "作品名称：越韵清音—越剧文化知识与多模态智能交互平台", font=font(FONT_HEI, 54), anchor="mm", fill=(77, 104, 74))
    return poster


def save_layered_psd(final_image: Image.Image) -> None:
    try:
        from psd_tools import PSDImage
    except Exception:
        return

    psd = PSDImage.new("RGB", final_image.size, (255, 255, 255))
    psd.create_pixel_layer(Image.open(TEMPLATE).convert("RGB"), name="Original official template")
    psd.create_pixel_layer(final_image.convert("RGBA"), name="Yueyun Qingyin finished poster")
    psd.save(POSTER_PSD, encoding="utf-8")


if __name__ == "__main__":
    poster = build_poster()
    poster_rgb = poster.convert("RGB")
    poster_rgb.save(POSTER_PNG)
    poster_rgb.save(POSTER_JPG, quality=95, subsampling=0)
    poster_rgb.save(POSTER_PDF, resolution=150.0)
    save_layered_psd(poster)
    print(POSTER_PNG)
    print(POSTER_JPG)
    print(POSTER_PDF)
    if POSTER_PSD.exists():
        print(POSTER_PSD)
