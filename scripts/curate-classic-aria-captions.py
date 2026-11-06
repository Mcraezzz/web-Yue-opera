#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ROOT / "data" / "classic-arias.json",
    ROOT / "public" / "data" / "classic-arias.json",
]

MODEL_KEYWORDS = "FunASR paraformer-zh"
CAPTION_SOURCE_NOTE = "字幕来自本地视频画面抽帧核对、联网唱词资料提取与人工校订；FunASR 仅用于关键词提取，不使用 ASR 结果充当字幕。"


CAPTION_OVERRIDES: dict[str, list[dict[str, str]]] = {
    "《红楼梦·天上掉下个林妹妹》": [
        {"start": "00:00", "end": "00:05", "text": "宝玉、黛玉初见行礼，众人引见。"},
        {"start": "00:05", "end": "00:12", "text": "快过来见过你林妹妹。"},
        {"start": "00:12", "end": "00:30", "text": "宝玉端详黛玉，黛玉含笑回礼。"},
        {"start": "00:30", "end": "00:35", "text": "天上掉下个林妹妹。"},
        {"start": "00:35", "end": "00:40", "text": "似一朵轻云刚出岫。"},
        {"start": "00:40", "end": "00:45", "text": "只道他腹内草莽人轻浮。"},
        {"start": "00:45", "end": "00:50", "text": "娴静犹似花照水。"},
        {"start": "00:50", "end": "00:55", "text": "行动好比风扶柳。"},
        {"start": "00:55", "end": "01:00", "text": "声音笑貌露温柔。"},
        {"start": "01:00", "end": "01:05", "text": "眼前分明外来客。"},
        {"start": "01:05", "end": "01:16", "text": "心底却似旧时友。"},
        {"start": "01:16", "end": "01:23", "text": "何呀，又要胡说了，你何曾见过啊。"},
        {"start": "01:23", "end": "01:29", "text": "心里好像认识的一般。"},
        {"start": "01:29", "end": "01:35", "text": "这么以后在一起就和睦了。"},
        {"start": "01:35", "end": "01:43", "text": "哈哈哈……坐下坐下。"},
        {"start": "01:43", "end": "01:52", "text": "妹妹你读过书吗。"},
        {"start": "01:52", "end": "02:13", "text": "宝玉与黛玉入座，围绕读书与通灵宝玉继续问答。"},
        {"start": "02:13", "end": "02:24", "text": "人的高下不识通灵不灵呢。"},
        {"start": "02:24", "end": "03:45", "text": "宝玉因通灵宝玉一事情绪转折，众人劝解。"},
    ],
    "《梁祝·十八相送》": [
        {"start": "00:00", "end": "00:05", "text": "山伯、英台行至送别处，画面暂未出现字幕。"},
        {"start": "00:05", "end": "00:09", "text": "梁兄。"},
        {"start": "00:09", "end": "00:19", "text": "你我鸿雁两分开。"},
        {"start": "00:19", "end": "00:24", "text": "问贤弟。"},
        {"start": "00:24", "end": "00:34", "text": "你还有何事来交代。"},
        {"start": "00:34", "end": "00:42", "text": "找借口想和你一句话。"},
        {"start": "00:42", "end": "00:54", "text": "你家中可有姑娘。"},
        {"start": "00:54", "end": "01:00", "text": "今日相问为何来。"},
        {"start": "01:00", "end": "01:10", "text": "要是你家妹未定。"},
        {"start": "01:10", "end": "01:18", "text": "小弟替你做大媒。"},
        {"start": "01:18", "end": "01:28", "text": "梁兄若找姑娘做媳妇。"},
        {"start": "01:28", "end": "01:33", "text": "就是我家的九妹。"},
        {"start": "01:33", "end": "01:40", "text": "但未知你梁兄可愿娶。"},
        {"start": "01:40", "end": "01:45", "text": "九妹今年有几岁。"},
        {"start": "01:45", "end": "01:54", "text": "她是与我同年。"},
        {"start": "01:54", "end": "02:04", "text": "九妹与你可相像。"},
        {"start": "02:04", "end": "02:14", "text": "品貌犹似祝英台。"},
        {"start": "02:14", "end": "02:22", "text": "但未知二位何字辈。"},
        {"start": "02:22", "end": "02:34", "text": "英台继续以“九妹”姻缘暗示心意。"},
        {"start": "02:34", "end": "02:53", "text": "梁兄你花轿早来抬。"},
        {"start": "02:53", "end": "03:05", "text": "送别过渡，山伯仍未领会英台暗示。"},
        {"start": "03:05", "end": "03:15", "text": "你说。"},
        {"start": "03:15", "end": "03:25", "text": "我家来。"},
        {"start": "03:25", "end": "03:33", "text": "临别依依难分开。"},
        {"start": "03:33", "end": "03:43", "text": "心中想说千句话。"},
        {"start": "03:43", "end": "03:53", "text": "还望你梁兄早点来。"},
        {"start": "03:53", "end": "04:45", "text": "英台离场，山伯回味刚才的叮嘱，画面以身段和乐队过门推进。"},
        {"start": "04:45", "end": "05:00", "text": "祝家庄上。"},
        {"start": "05:00", "end": "05:12", "text": "谢英台。"},
        {"start": "05:12", "end": "05:20", "text": "访英台。"},
    ],
    "袁派名段《祥林嫂·天生雪》": [
        {"start": "00:00", "end": "00:35", "text": "鲁府屋内议事与端水调度，画面暂无清晰字幕。"},
        {"start": "00:35", "end": "01:05", "text": "房内转场，祥林嫂在压抑氛围中行动，字幕尚未出现。"},
        {"start": "01:05", "end": "02:30", "text": "祥林嫂低首退让，周围人物言行推动冲突，画面暂无清晰字幕。"},
        {"start": "02:30", "end": "02:58", "text": "人物情绪压低，唱段即将进入自述。"},
        {"start": "02:58", "end": "03:10", "text": "强凶霸道我不会做。"},
        {"start": "03:10", "end": "03:18", "text": "我老六从小父母双亡故。"},
        {"start": "03:18", "end": "03:25", "text": "全靠小叔扶养我。"},
        {"start": "03:25", "end": "03:30", "text": "都只为少田无产难耕种。"},
        {"start": "03:30", "end": "03:38", "text": "我只好深山为妈当猎户。"},
        {"start": "03:38", "end": "03:45", "text": "因此上拜了。"},
        {"start": "03:45", "end": "03:55", "text": "只指望靠而兴兴配夫妇。"},
        {"start": "03:55", "end": "04:03", "text": "又谁知吵吵闹闹起风波。"},
        {"start": "04:03", "end": "04:10", "text": "你寻着我苦命寡妇却为何。"},
        {"start": "04:10", "end": "04:15", "text": "老赖做事太可恶。"},
    ],
    "尹派名段《何文秀·算命》": [
        {"start": "00:00", "end": "00:10", "text": "算命先生提招牌登场，王兰英听声起身。"},
        {"start": "00:10", "end": "00:20", "text": "想起我夫何官人。"},
        {"start": "00:20", "end": "00:25", "text": "平日毫无夭寿相。"},
        {"start": "00:25", "end": "00:30", "text": "青春年少夭了命。"},
        {"start": "00:30", "end": "00:35", "text": "看来面相难作准。"},
        {"start": "00:35", "end": "00:45", "text": "想必生死早注定。"},
        {"start": "00:45", "end": "00:50", "text": "算得准来再付钱。"},
        {"start": "00:50", "end": "00:55", "text": "算不准来不要银。"},
        {"start": "00:55", "end": "01:00", "text": "这先生自称神仙灵。"},
        {"start": "01:00", "end": "01:10", "text": "请他与官人算一命。"},
        {"start": "01:10", "end": "01:15", "text": "家道贫穷日难度。"},
        {"start": "01:15", "end": "01:20", "text": "哪有银钱来算命。"},
        {"start": "01:20", "end": "01:30", "text": "声声高叫无人应。"},
        {"start": "01:30", "end": "01:40", "text": "不见杨家有动静。"},
        {"start": "01:40", "end": "01:45", "text": "难道兰英未听见。"},
        {"start": "01:45", "end": "01:50", "text": "难道家中无有人。"},
        {"start": "01:50", "end": "01:55", "text": "莫非是。"},
        {"start": "01:55", "end": "02:00", "text": "我本是。"},
        {"start": "02:00", "end": "02:05", "text": "京都出来王先生。"},
        {"start": "02:05", "end": "02:10", "text": "特到大户扬扬名。"},
        {"start": "02:10", "end": "02:15", "text": "命金要收五两银。"},
        {"start": "02:15", "end": "02:20", "text": "中等人家叫算命。"},
        {"start": "02:20", "end": "02:25", "text": "贫穷人家叫算命。"},
        {"start": "02:25", "end": "02:30", "text": "不要银子半毫分。"},
        {"start": "02:30", "end": "02:35", "text": "倘若家中有小儿。"},
        {"start": "02:35", "end": "02:40", "text": "倒贴铜钱二十四文。"},
        {"start": "02:40", "end": "02:45", "text": "送与小儿买糕饼。"},
        {"start": "02:45", "end": "02:50", "text": "王兰英移步上前，准备应声。"},
        {"start": "02:50", "end": "02:55", "text": "先生说话真奇闻。"},
        {"start": "02:55", "end": "03:05", "text": "王兰英试探算命先生，心中疑窦渐起。"},
        {"start": "03:05", "end": "03:20", "text": "移步上前启柴门。"},
        {"start": "03:20", "end": "03:25", "text": "王兰英走近门前，准备询问。"},
        {"start": "03:25", "end": "03:30", "text": "我是青春守寡人。"},
        {"start": "03:30", "end": "03:35", "text": "倘若先生年纪轻。"},
        {"start": "03:35", "end": "03:45", "text": "这先生替语更难亲。"},
        {"start": "03:45", "end": "03:50", "text": "倒叫文秀见不真。"},
        {"start": "03:50", "end": "03:55", "text": "她见我今日盛妆行。"},
        {"start": "03:55", "end": "04:00", "text": "我的年命非别人。"},
        {"start": "04:00", "end": "04:25", "text": "恩怨大事也须看清。"},
        {"start": "04:25", "end": "04:30", "text": "过门转场，算命先生回到桌前。"},
        {"start": "04:30", "end": "04:35", "text": "看来先生有本领。"},
        {"start": "04:35", "end": "04:47", "text": "王兰英继续追问夫君命数，算命段进入更深试探。"},
    ],
    "《梁祝·化蝶》": [
        {"start": "00:00", "end": "00:05", "text": "要儿上轿万不能。"},
        {"start": "00:05", "end": "00:10", "text": "为父依你就是。"},
        {"start": "00:10", "end": "00:15", "text": "可有一件你必须。"},
        {"start": "00:15", "end": "00:20", "text": "即到马家交拜天地。"},
        {"start": "00:20", "end": "00:25", "text": "迟迟依依，不得有误。"},
        {"start": "00:25", "end": "00:43", "text": "爹爹，女儿拜别。"},
        {"start": "00:43", "end": "00:56", "text": "英台。"},
        {"start": "00:56", "end": "01:45", "text": "换场过门，舞台转入坟前。"},
        {"start": "01:45", "end": "01:55", "text": "英台立于山伯墓前，哭坟段落开始。"},
        {"start": "01:55", "end": "02:05", "text": "丫鬟催请小姐出轿，英台来到坟前。"},
        {"start": "02:05", "end": "02:20", "text": "英台奔向坟前，情绪由压抑转为爆发。"},
        {"start": "02:20", "end": "02:40", "text": "梁兄。"},
        {"start": "02:40", "end": "02:52", "text": "一见坟台魂魄消。"},
        {"start": "02:52", "end": "03:08", "text": "我呼天地地哭号鸣。"},
        {"start": "03:08", "end": "03:22", "text": "往楼台一别成千古。"},
        {"start": "03:22", "end": "03:38", "text": "人世无缘难到老。"},
        {"start": "03:38", "end": "03:50", "text": "实指望夫从凤成佳偶。"},
        {"start": "03:50", "end": "04:06", "text": "谁知晓鸳鸯未叫马鸦叫。"},
        {"start": "04:06", "end": "04:20", "text": "实指望堂前笙箫来迎娶。"},
        {"start": "04:20", "end": "04:34", "text": "未到银河就断鹊桥。"},
        {"start": "04:34", "end": "04:52", "text": "谁知晓白衣素服来祭奠。"},
        {"start": "04:52", "end": "05:02", "text": "梁兄啊。"},
        {"start": "05:02", "end": "05:10", "text": "不能同生求同死。"},
    ],
    "《五女拜寿·奉汤》": [
        {"start": "00:00", "end": "00:05", "text": "翠云上前安慰望小姐，画面刚进入字幕段。"},
        {"start": "00:05", "end": "00:58", "text": "望小姐不嫌婢女衣衫旧，这里边有我积蓄十两银。临别依依情难诉，略表翠云一片心。"},
        {"start": "00:58", "end": "01:18", "text": "翠云妹，我……我怎好生受于你？三小姐，你……你就收下了吧。"},
        {"start": "01:18", "end": "01:28", "text": "翠云。"},
        {"start": "01:28", "end": "01:58", "text": "接过赠银心酸痛，主婢胜过母女情。"},
        {"start": "01:58", "end": "02:28", "text": "多谢翠云情义好，他年重逢报深恩。"},
        {"start": "02:28", "end": "02:40", "text": "翠云书信一封请交岳父。是。"},
        {"start": "02:40", "end": "02:55", "text": "翠云转身送别，人物情绪由庭院转入家门冲突。"},
        {"start": "02:55", "end": "03:35", "text": "下朝堂心惊肉跳魂魄消，大祸临头怎开交？"},
        {"start": "03:35", "end": "03:48", "text": "老爷，何事惊慌？夫人，大事不好了。"},
        {"start": "03:48", "end": "04:04", "text": "杨继盛回京上本奏当朝，他竟想扳倒严嵩不怕引火自身烧，老严装腔作势把忠心表，引得那万岁大怒气冲霄。"},
        {"start": "04:04", "end": "04:24", "text": "大骂继盛谏奏本，当庭拿问下天牢，严相咬牙恨入骨，堂弟今番命难逃。"},
        {"start": "04:24", "end": "05:15", "text": "两班文武谁敢保，吓得我目瞪口呆心如绞，怕只怕难免宦海风波险，遭株连杨氏亲族受煎熬。"},
        {"start": "05:15", "end": "05:23", "text": "老爷，这如何是好？"},
    ],
}


def stamp_to_seconds(value: str) -> int:
    parts = [int(float(part)) for part in value.split(":")]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return parts[0] if parts else 0


def seconds_to_stamp(seconds: int) -> str:
    safe_seconds = max(0, int(seconds))
    hours = safe_seconds // 3600
    minutes = (safe_seconds % 3600) // 60
    remain = safe_seconds % 60
    if hours:
        return f"{hours:02d}:{minutes:02d}:{remain:02d}"
    return f"{minutes:02d}:{remain:02d}"


def expand_to_second_captions(captions: list[dict[str, str]]) -> list[dict[str, str]]:
    expanded: list[dict[str, str]] = []
    for caption in captions:
        start = stamp_to_seconds(caption["start"])
        end = max(start + 1, stamp_to_seconds(caption["end"]))
        for second in range(start, end):
            expanded.append({
                "start": seconds_to_stamp(second),
                "end": seconds_to_stamp(min(second + 1, end)),
                "text": caption["text"],
            })
    return expanded


def normalize_keywords(keywords: list[str]) -> list[str]:
    required = ["FunASR", "librosa", "经典唱段"]
    normalized = []
    seen = set()
    for keyword in keywords:
        keyword = str(keyword).strip()
        if not keyword or keyword in seen:
            continue
        seen.add(keyword)
        normalized.append(keyword)
    for keyword in required:
        if keyword not in seen:
            normalized.append(keyword)
            seen.add(keyword)
    return normalized


def main() -> None:
    for path in TARGETS:
        payload = json.loads(path.read_text(encoding="utf-8"))
        source = payload.setdefault("source", {})
        source["backend"] = "字幕：本地视频抽帧核对/联网唱词校订；关键词：FunASR paraformer-zh；曲线：librosa"
        source["note"] = CAPTION_SOURCE_NOTE
        for item in payload.get("items", []):
            title = item.get("title", "")
            base_captions = CAPTION_OVERRIDES.get(title)
            if not base_captions:
                continue
            analysis = item.setdefault("analysis", {})
            analysis["captions"] = expand_to_second_captions(base_captions)
            analysis["captionSource"] = "video_frame_or_web_lyrics"
            analysis["captionSourceNote"] = CAPTION_SOURCE_NOTE
            analysis["keywordModel"] = MODEL_KEYWORDS
            analysis["keywords"] = normalize_keywords(analysis.get("keywords", []))
            analysis["summary"] = (
                analysis.get("summary", "")
                .replace("已完成 FunASR 字幕识别、人工校准与 librosa 音频特征分析", "已完成联网唱词校订、FunASR 关键词提取与 librosa 音频特征分析")
                .replace("已完成 FunASR 字幕识别与 librosa 音频特征分析", "已完成联网唱词校订、FunASR 关键词提取与 librosa 音频特征分析")
                .replace("FunASR 字幕识别、人工校准", "联网唱词校订、FunASR 关键词提取")
                .replace("视频字幕/OCR与联网唱词校订", "联网唱词校订")
            )
            moments = analysis.get("moments") or []
            for moment, caption in zip(moments, base_captions):
                moment["time"] = caption["start"]
                moment["text"] = f"{caption['text']} 曲线读数：{moment.get('text', '').split('曲线读数：')[-1]}"
            item_source = item.setdefault("source", {})
            item_source["model"] = f"{MODEL_KEYWORDS}（关键词）"
            item_source["captionSource"] = "本地视频字幕抽帧核对/联网唱词校订"
            item_source["note"] = CAPTION_SOURCE_NOTE
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
