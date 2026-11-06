from __future__ import annotations

from pathlib import Path
import math
import textwrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "design_input"
OUT = ROOT / "design_output"
OUT.mkdir(parents=True, exist_ok=True)

TEMPLATE = INPUT / "intro_template_2026.png"
CUC_LOGO = INPUT / "cuc_logo_intro.jpg"
HOME_SCREENSHOT = Path(r"C:\Users\22672\AppData\Local\Temp\ScreenShot_2026-05-28_172335_307.png")
AI_SCREENSHOT = Path(r"C:\Users\22672\AppData\Local\Temp\ScreenShot_2026-05-28_172821_713.png")
ARCH_IMAGE = Path(r"C:\Users\22672\Downloads\ChatGPT Image 2026年5月28日 18_29_16.png")

OUT_PNG = OUT / "越韵清音-作品简介图-920x640.png"
OUT_JPG = OUT / "越韵清音-作品简介图-920x640.jpg"

W, H = 920, 640
BLUE = (45, 92, 177)
DEEP_BLUE = (35, 82, 166)
TEXT_BLUE = (57, 101, 184)
BLACK = (28, 31, 36)

FONT_HEI = r"C:\Windows\Fonts\simhei.ttf"
FONT_SONG = r"C:\Windows\Fonts\simsun.ttc"
FONT_KAI = r"C:\Windows\Fonts\simkai.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def crop_cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    scale = max(tw / img.width, th / img.height)
    nw, nh = math.ceil(img.width * scale), math.ceil(img.height * scale)
    resized = img.resize((nw, nh), Image.LANCZOS)
    x = (nw - tw) // 2
    y = (nh - th) // 2
    return resized.crop((x, y, x + tw, y + th))


def crop_contain(img: Image.Image, size: tuple[int, int], bg=(255, 255, 255)) -> Image.Image:
    tw, th = size
    scale = min(tw / img.width, th / img.height)
    nw, nh = math.ceil(img.width * scale), math.ceil(img.height * scale)
    resized = img.resize((nw, nh), Image.LANCZOS)
    resized = resized.filter(ImageFilter.UnsharpMask(radius=1.0, percent=120, threshold=3))
    out = Image.new("RGB", size, bg)
    out.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
    return out


def rounded_paste(base: Image.Image, img: Image.Image, box: tuple[int, int, int, int], radius: int, contain=False) -> None:
    x1, y1, x2, y2 = box
    size = (x2 - x1, y2 - y1)
    fitted = crop_contain(img.convert("RGB"), size) if contain else crop_cover(img.convert("RGB"), size)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    base.paste(fitted, (x1, y1), mask)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=radius, outline=(125, 160, 211), width=2)


def crop_logo(path: Path, size: int) -> Image.Image:
    logo = Image.open(path).convert("RGB")
    px = logo.load()
    xs, ys = [], []
    for y in range(logo.height):
        for x in range(logo.width):
            r, g, b = px[x, y]
            if min(r, g, b) < 248:
                xs.append(x)
                ys.append(y)
    if xs:
        pad = 6
        logo = logo.crop((max(0, min(xs) - pad), max(0, min(ys) - pad), min(logo.width, max(xs) + pad), min(logo.height, max(ys) + pad)))
    side = max(logo.width, logo.height)
    square = Image.new("RGB", (side, side), "white")
    square.paste(logo, ((side - logo.width) // 2, (side - logo.height) // 2))
    square = square.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(square.convert("RGBA"), (0, 0), mask)
    return out


def hcf_logo_from_template(size: int) -> Image.Image:
    template = Image.open(TEMPLATE).convert("RGB")
    # Crop the right logo from the official template and keep it unchanged.
    crop = template.crop((1080, 440, 1665, 1025))
    return crop_logo_from_image(crop, size)


def crop_logo_from_image(img: Image.Image, size: int) -> Image.Image:
    img = img.convert("RGB")
    px = img.load()
    xs, ys = [], []
    for y in range(img.height):
        for x in range(img.width):
            r, g, b = px[x, y]
            if not (r > 245 and g > 245 and b > 245):
                xs.append(x)
                ys.append(y)
    if xs:
        img = img.crop((max(0, min(xs) - 8), max(0, min(ys) - 8), min(img.width, max(xs) + 8), min(img.height, max(ys) + 8)))
    side = max(img.width, img.height)
    square = Image.new("RGB", (side, side), "white")
    square.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    square = square.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(square.convert("RGBA"), (0, 0), mask)
    return out


def draw_wrapped(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt, fill, width: int, line_h: int, max_lines: int | None = None) -> int:
    x, y = xy
    lines: list[str] = []
    current = ""
    for ch in text:
        trial = current + ch
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = ch
    if current:
        lines.append(current)
    if max_lines:
        lines = lines[:max_lines]
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def info_line(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, value: str, value_width: int) -> int:
    lf = font(FONT_HEI, 17)
    vf = font(FONT_HEI, 15)
    draw.text((x, y), f"{label}：", font=lf, fill=TEXT_BLUE)
    draw_wrapped(draw, (x + 78, y + 2), value, vf, TEXT_BLUE, value_width, 20, max_lines=2)
    return y + 24


def pill(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, body: str, accent: tuple[int, int, int], max_lines: int = 3) -> None:
    draw.rounded_rectangle(box, radius=10, fill=(245, 249, 255), outline=(196, 214, 238), width=1)
    x1, y1, x2, _ = box
    draw.rectangle((x1, y1, x1 + 5, box[3]), fill=accent)
    draw.text((x1 + 12, y1 + 8), title, font=font(FONT_HEI, 14), fill=DEEP_BLUE)
    draw_wrapped(draw, (x1 + 12, y1 + 30), body, font(FONT_SONG, 12), BLACK, x2 - x1 - 22, 17, max_lines=max_lines)


def build() -> None:
    canvas = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(canvas)

    # Template-like blue header/background.
    for y in range(H):
        ratio = y / H
        r = int(35 + 4 * ratio)
        g = int(77 + 18 * ratio)
        b = int(165 + 24 * ratio)
        d.line((0, y, W, y), fill=(r, g, b))
    for i, (x, y) in enumerate([(70, 105), (275, 70), (480, 120), (620, 56), (835, 96)]):
        d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=(0, 143, 210))
        if i:
            d.line((x, y, [70, 275, 480, 620][i - 1], [105, 70, 120, 56][i - 1]), fill=(74, 125, 198), width=1)

    canvas.alpha_composite(crop_logo(CUC_LOGO, 52), (62, 32))
    canvas.alpha_composite(hcf_logo_from_template(52), (126, 32))
    title_font = font(FONT_HEI, 28)
    d.text((44, 100), "2026中国高校计算机大赛-移动应用创新赛", font=title_font, fill="white")
    d.text((44, 132), "暨海峡两岸创新作品赛海南省赛", font=title_font, fill="white")

    panel = (34, 185, 886, 618)
    d.rounded_rectangle(panel, radius=38, fill="white")
    d.rounded_rectangle((126, 158, 407, 207), radius=9, fill=(20, 166, 224))
    d.text((266, 182), "作 品 简 介", font=font(FONT_KAI, 30), anchor="mm", fill="white")

    x0, y0 = 58, 214
    y0 = info_line(d, x0, y0, "作品名称", "越韵清音—越剧文化知识与多模态智能交互平台", 360)
    y0 = info_line(d, x0, y0, "所属院校", "中国传媒大学海南国际学院", 360)
    y0 = info_line(d, x0, y0, "作者", "韩一赫、陶司宸、史墨栋", 360)
    y0 = info_line(d, x0, y0, "指导老师", "杜歆茜", 360)

    # Project mark.
    d.ellipse((62, 318, 108, 364), fill=(184, 53, 67))
    d.text((85, 341), "越", font=font(FONT_KAI, 25), anchor="mm", fill=(255, 248, 232))
    d.text((122, 319), "越韵清音", font=font(FONT_KAI, 38), fill=(32, 43, 48))
    d.text((124, 360), "越剧文化知识与多模态智能交互平台", font=font(FONT_KAI, 16), fill=(92, 112, 78))

    home = Image.open(HOME_SCREENSHOT).convert("RGB")
    ai = Image.open(AI_SCREENSHOT).convert("RGB")
    arch = Image.open(ARCH_IMAGE).convert("RGB")
    rounded_paste(canvas, home, (462, 208, 850, 338), 8)
    rounded_paste(canvas, arch, (462, 360, 850, 494), 8, contain=True)
    d.text((462, 190), "作品相关照片 / 功能示意", font=font(FONT_HEI, 16), fill=TEXT_BLUE)

    pill(d, (58, 384, 244, 486), "设计目的", "以数字化方式传播越剧文化，降低剧目、唱腔、流派和舞台美学的理解门槛。", (73, 145, 207))
    rounded_paste(canvas, ai, (258, 384, 444, 486), 8)
    pill(d, (58, 500, 292, 584), "目前实现的功能", "首页、长卷、剧目、流派、台前幕后、新闻、登录注册、收藏评论、AI问戏、AI生图、语义搜索。", (184, 53, 67), max_lines=3)
    pill(d, (306, 500, 554, 584), "技术路线", "React/Vite/TypeScript 前端，Spring Boot/MySQL 后端，RAG、ASR、图像识别增强。", (73, 145, 207), max_lines=3)
    pill(d, (568, 500, 850, 584), "创新性与实用性特点", "RAG知识库问答、BM25+向量召回+Rerank、音视频智能分析、图像识别导览，适用于课堂教学、校园展陈和非遗传播。", (122, 166, 82), max_lines=3)

    d.text((58, 598), "待改进问题：继续补充授权音视频与图像素材，完善后台管理、移动端体验和模型输出审核。", font=font(FONT_SONG, 12), fill=BLACK)

    final = canvas.convert("RGB")
    final.save(OUT_PNG)
    final.save(OUT_JPG, quality=95)
    print(OUT_PNG.resolve())
    print(OUT_JPG.resolve())


if __name__ == "__main__":
    build()
