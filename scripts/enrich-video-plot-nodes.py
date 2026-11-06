#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PLOT_TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "梁山伯与祝英台": [
        {
            "ratio": 0.12,
            "title": "草桥结拜",
            "plot": "梁山伯与祝英台相遇结拜，情感关系开始建立。",
            "curve": "此处适合观察音高线条是否由平稳转向明亮，节奏不必很密，但情绪曲线通常会开始抬升。",
        },
        {
            "ratio": 0.34,
            "title": "十八相送",
            "plot": "送别路上反复借景传情，祝英台心意更明显，梁山伯仍在迟疑。",
            "curve": "若能量与节奏同步上行，说明唱腔从叙事转入抒情推进，是含蓄情感外化的关键段。",
        },
        {
            "ratio": 0.68,
            "title": "楼台会",
            "plot": "梁山伯得知祝英台婚约，二人重逢而不能相守，矛盾集中爆发。",
            "curve": "这里常出现情绪曲线高点，能量增强、音高波动扩大，适合作为悲剧情绪的核心观察点。",
        },
        {
            "ratio": 0.90,
            "title": "化蝶升华",
            "plot": "生死阻隔被化蝶意象转化，爱情悲剧完成诗意升华。",
            "curve": "尾声若能量回落而情绪保持高位，说明唱腔从冲突转为余韵和精神性表达。",
        },
    ],
    "红楼梦": [
        {
            "ratio": 0.12,
            "title": "宝黛初见",
            "plot": "宝玉与黛玉初见，似曾相识的情感基调被确立。",
            "curve": "音高线条若较柔和、能量不过分外放，能体现王派细腻、含蓄的心理表达。",
        },
        {
            "ratio": 0.34,
            "title": "共读西厢",
            "plot": "宝黛借书传情，人物关系从礼法边界走向心意互通。",
            "curve": "节奏密度上升时，可理解为人物心绪加快；能量不必最高，但情绪曲线应有明显推进。",
        },
        {
            "ratio": 0.56,
            "title": "黛玉葬花",
            "plot": "黛玉借落花自伤，个人命运与爱情悲剧逐渐重合。",
            "curve": "若音高下行或能量收束，正好对应悲意内化；若情绪高位，则说明唱腔在低回中蓄力。",
        },
        {
            "ratio": 0.80,
            "title": "焚稿断情",
            "plot": "黛玉焚稿，宝玉婚事与黛玉病势形成强烈反差。",
            "curve": "此处适合看能量峰值与节奏密集是否同现，通常对应情绪崩裂和剧情急转。",
        },
        {
            "ratio": 0.92,
            "title": "悲剧收束",
            "plot": "宝黛爱情归于破灭，全剧由个人哀伤转向家族悲剧。",
            "curve": "尾段情绪若高位回落，能表现悲剧落定后的空寂感。",
        },
    ],
    "西厢记": [
        {
            "ratio": 0.12,
            "title": "惊艳初遇",
            "plot": "张生与崔莺莺相遇，爱情线索由惊艳和试探展开。",
            "curve": "音高与能量的轻微抬升可对应人物心动，节奏较活跃时说明喜剧情境开始流动。",
        },
        {
            "ratio": 0.30,
            "title": "寺警退兵",
            "plot": "危机迫近又出现转机，张生得以介入局势。",
            "curve": "节奏密度和能量同时增强，往往对应外部冲突推动剧情加速。",
        },
        {
            "ratio": 0.52,
            "title": "琴心互诉",
            "plot": "人物以琴声和唱腔互通心意，内在情感更为明确。",
            "curve": "若音高起伏变细、能量中等，说明唱腔从戏剧冲突转向细腻抒情。",
        },
        {
            "ratio": 0.74,
            "title": "赖婚冲突",
            "plot": "老夫人阻隔婚事，人物愿望与礼法压力正面碰撞。",
            "curve": "此处若情绪和能量同时冲高，可作为全剧矛盾升级的听觉证据。",
        },
        {
            "ratio": 0.90,
            "title": "长亭送别",
            "plot": "离别将爱情推向最深处，情感由热烈转为不舍。",
            "curve": "尾段节奏可趋缓而情绪维持高位，适合观察越剧抒情拖腔的余韵。",
        },
    ],
    "祥林嫂": [
        {
            "ratio": 0.14,
            "title": "逃出婆家",
            "plot": "祥林嫂试图摆脱被安排的命运，人物反抗意识显现。",
            "curve": "低能量中的节奏波动能提示压抑环境下的挣扎感。",
        },
        {
            "ratio": 0.36,
            "title": "再嫁转折",
            "plot": "再嫁贺老六带来短暂安稳，也埋下新的悲剧转折。",
            "curve": "如果能量短暂回升，可理解为命运出现亮色；随后回落则形成反差。",
        },
        {
            "ratio": 0.58,
            "title": "阿毛遇难",
            "plot": "亲人失去使祥林嫂精神世界崩塌，悲剧重量骤然加深。",
            "curve": "此处应重点看情绪曲线高点和能量峰值，常对应人物痛苦外放。",
        },
        {
            "ratio": 0.78,
            "title": "捐门槛",
            "plot": "祥林嫂试图通过仪式获得救赎，却进一步陷入精神压迫。",
            "curve": "节奏密度若增强而音高不稳，能表现人物被社会规训反复撕扯。",
        },
        {
            "ratio": 0.92,
            "title": "风雪终局",
            "plot": "人物在风雪和冷漠中走向结局，现实题材的悲剧指向完成。",
            "curve": "尾声能量收低而情绪沉重，适合说明袁派悲剧表达的克制感。",
        },
    ],
    "碧玉簪": [
        {
            "ratio": 0.18,
            "title": "玉簪遗落",
            "plot": "碧玉簪成为误会源头，才子佳人的关系被疑云笼罩。",
            "curve": "节奏若由平稳转为活跃，说明情节从铺陈进入悬念。",
        },
        {
            "ratio": 0.36,
            "title": "洞房疑云",
            "plot": "新婚之夜误会加深，人物关系出现明显断裂。",
            "curve": "能量和情绪同步上扬时，可对应人物受屈与冲突升级。",
        },
        {
            "ratio": 0.56,
            "title": "秀英受屈",
            "plot": "李秀英含冤承受压力，内心委屈成为唱腔抒发重点。",
            "curve": "音高与能量的波动适合观察申诉型唱段中的委屈和坚持。",
        },
        {
            "ratio": 0.78,
            "title": "真相显露",
            "plot": "误会逐渐解开，剧情由压抑转向释疑。",
            "curve": "如果节奏密度升高而情绪转稳，说明剧情进入解释和反转段。",
        },
        {
            "ratio": 0.92,
            "title": "洗冤和解",
            "plot": "含冤得雪，人物关系重新修复，传统伦理秩序回到稳定。",
            "curve": "尾段若能量回落，情绪趋稳，可对应大团圆后的收束感。",
        },
    ],
    "追鱼": [
        {
            "ratio": 0.14,
            "title": "书馆相遇",
            "plot": "鲤鱼精与张珍的情缘开启，浪漫幻想色彩出现。",
            "curve": "音高和节奏若较灵动，能体现神话爱情的轻盈感。",
        },
        {
            "ratio": 0.34,
            "title": "真假牡丹",
            "plot": "真假身份造成错位，爱情与身份冲突逐渐明朗。",
            "curve": "节奏密度上升可对应误认、追问和喜剧化冲突。",
        },
        {
            "ratio": 0.54,
            "title": "花园定情",
            "plot": "二人情感确认，浪漫段落推向抒情核心。",
            "curve": "情绪曲线若升高而能量保持中高位，适合观察徐派小生与旦角的对唱呼应。",
        },
        {
            "ratio": 0.76,
            "title": "审鱼高潮",
            "plot": "身份秘密被推到台前，人物命运进入公开冲突。",
            "curve": "这里应关注能量峰值和节奏峰值，通常与舞台调度和剧情压力同步增强。",
        },
        {
            "ratio": 0.90,
            "title": "团圆升华",
            "plot": "爱情冲破阻隔，神话色彩转化为团圆和祝愿。",
            "curve": "尾段若情绪上扬后回落，能表现浪漫故事的圆满余韵。",
        },
    ],
}


def main() -> None:
    data_path = Path("data/video-feature-analyses.json")
    public_path = Path("public/data/video-feature-analyses.json")
    payload = json.loads(data_path.read_text(encoding="utf-8"))

    for item in payload.get("items", []):
        title = item.get("title", "")
        key = normalize_title(title)
        templates = PLOT_TEMPLATES.get(key)
        if not templates:
            continue
        analysis = item.setdefault("analysis", {})
        features = analysis.get("audioFeatures", {})
        points = features.get("points", [])
        if not points:
            continue
        duration = features.get("mediaDurationSeconds") or features.get("durationSeconds") or points[-1].get("end") or 0
        plot_nodes = [build_plot_node(template, points, duration) for template in templates]
        analysis["plotNodes"] = plot_nodes

    data_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    public_path.parent.mkdir(parents=True, exist_ok=True)
    public_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {data_path}")
    print(f"Wrote {public_path}")


def normalize_title(title: str) -> str:
    return (
        title.replace("《", "")
        .replace("》", "")
        .replace(" ", "")
        .replace("·", "")
    )


def build_plot_node(template: dict[str, Any], points: list[dict[str, Any]], duration: float) -> dict[str, Any]:
    target_time = float(duration) * float(template["ratio"])
    point = pick_curve_point(points, target_time, float(duration))
    energy = number(point.get("energy"))
    rhythm = number(point.get("rhythm"))
    emotion = number(point.get("emotion"))
    pitch = number(point.get("pitchHz"))
    tempo = number(point.get("tempoBpm"))
    intensity = describe_intensity(emotion, energy, rhythm)
    metrics = []
    if emotion is not None:
        metrics.append(f"情绪 {emotion:.0f}%")
    if energy is not None:
        metrics.append(f"能量 {energy:.0f}%")
    if rhythm is not None:
        metrics.append(f"节奏 {rhythm:.0f}%")
    if pitch is not None:
        metrics.append(f"音高 {pitch:.1f} Hz")
    metric_text = "，".join(metrics)
    curve_text = template["curve"]
    if metric_text:
        curve_text = f"{curve_text} 当前曲线读数：{metric_text}，整体呈现{intensity}。"

    return {
        "time": point.get("time", target_time),
        "end": point.get("end"),
        "timeLabel": point.get("timeLabel", seconds_to_stamp(target_time)),
        "title": template["title"],
        "plot": template["plot"],
        "curve": curve_text,
        "emotion": int(round(emotion)) if emotion is not None else None,
        "energy": round(energy, 2) if energy is not None else None,
        "rhythm": round(rhythm, 2) if rhythm is not None else None,
        "pitchHz": round(pitch, 2) if pitch is not None else None,
        "tempoBpm": round(tempo, 2) if tempo is not None else None,
    }


def pick_curve_point(points: list[dict[str, Any]], target_time: float, duration: float) -> dict[str, Any]:
    window = max(duration * 0.045, 120)
    candidates = [
        point for point in points
        if abs(float(point.get("time", 0)) - target_time) <= window
    ]
    if not candidates:
        candidates = sorted(points, key=lambda point: abs(float(point.get("time", 0)) - target_time))[:5]
    return max(candidates, key=curve_score)


def curve_score(point: dict[str, Any]) -> float:
    emotion = number(point.get("emotion")) or 0
    energy = number(point.get("energy")) or 0
    rhythm = number(point.get("rhythm")) or 0
    return emotion * 0.46 + energy * 0.34 + rhythm * 0.20


def describe_intensity(emotion: float | None, energy: float | None, rhythm: float | None) -> str:
    values = [value for value in (emotion, energy, rhythm) if value is not None]
    if not values:
        return "待分析"
    score = sum(values) / len(values)
    if score >= 78:
        return "高张力"
    if score >= 58:
        return "持续推进"
    if score >= 38:
        return "中等蓄势"
    return "低回铺垫"


def number(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None


def seconds_to_stamp(seconds: float) -> str:
    seconds = max(0, int(round(seconds)))
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    remain = seconds % 60
    if hours:
        return f"{hours:02d}:{minutes:02d}:{remain:02d}"
    return f"{minutes:02d}:{remain:02d}"


if __name__ == "__main__":
    main()
