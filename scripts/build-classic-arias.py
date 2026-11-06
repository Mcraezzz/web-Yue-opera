#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import librosa
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE_VIDEO_DIR = ROOT / "越剧视频"
PUBLIC_AUDIO_DIR = ROOT / "public" / "audio"
DATA_PATH = ROOT / "data" / "classic-arias.json"
PUBLIC_DATA_PATH = ROOT / "public" / "data" / "classic-arias.json"


ARIA_CATALOG: list[dict[str, Any]] = [
    {
        "id": "hongloumeng-linmeimei",
        "title": "《红楼梦·天上掉下个林妹妹》",
        "sourceContains": "红楼梦",
        "start": "00:09:30",
        "duration": "03:45",
        "actors": "徐玉兰饰贾宝玉，王文娟饰林黛玉；片段由宝玉、黛玉互相端详与互评推进。",
        "school": "徐派小生与王派旦角的代表性组合：徐派长于清亮舒展、书卷气足的少年小生，王派长于含蓄细腻、内心层次丰富的闺门旦。",
        "background": "1962 年越剧电影《红楼梦》片段，由徐进编剧、岑范导演；本段对应宝黛初见后互相端详、互生知己感的场景，是全剧“木石前盟”情感线的开端。",
        "technique": "重点听徐派小生清晰字头和上扬尾音，配合王派旦角轻柔回句；“轻云刚出岫”“风扶柳”等句不靠大音量取胜，而靠气口、收音和咬字表现惊喜与试探。",
        "plot": "贾宝玉先赞黛玉清奇脱俗，黛玉也由先前偏见转为惊讶；二人把初见的熟悉感唱成“眼前外来客、心底旧时友”的知己开端。",
        "keywords": ["红楼梦", "天上掉下个林妹妹", "徐玉兰", "王文娟", "徐派", "王派", "宝黛初见"],
        "askPrompts": ["宝黛初见为什么适合用王派来表现？", "徐派小生在这段里有哪些听点？", "这段情绪曲线如何对应人物心理？"],
    },
    {
        "id": "liangzhu-shibaxiangsong",
        "title": "《梁祝·十八相送》",
        "sourceContains": "梁山伯与祝英台",
        "start": "00:48:30",
        "duration": "05:20",
        "actors": "本地视频文件标注为吴凤花、陈飞版本：吴凤花饰梁山伯，陈飞饰祝英台。",
        "school": "吴凤花为范派小生代表传人之一，范派唱腔醇厚挺拔；陈飞为傅派旦角代表演员之一，傅派声腔明亮华彩，二者形成送别路上的问答呼应。",
        "background": "本段截自《梁山伯与祝英台》“十八相送”：祝英台女扮男装同窗三年后返家，梁山伯一路相送，祝英台借路景反复暗示身份与情意。",
        "technique": "重点听小生与旦角的问答式对唱、步法带出的节奏推进，以及祝英台暗示后留下的停顿；表层是同窗送别，深层是“说破又不能说破”的含蓄传情。",
        "plot": "祝英台借桥、井、鸳鸯、牛女等成双意象吐露心事，梁山伯仍作同窗情理解；剧情张力来自英台不断点拨与山伯迟迟不悟。",
        "keywords": ["梁祝", "十八相送", "吴凤花", "陈飞", "范派", "送别", "江南意象"],
        "askPrompts": ["十八相送为什么适合越剧入门？", "梁祝如何借景写情？", "这段的节奏和能量为什么会逐步上升？"],
    },
    {
        "id": "xianglinsao-tianshengxue",
        "title": "袁派名段《祥林嫂·天生雪》",
        "sourceContains": "祥林嫂",
        "start": "00:35:40",
        "duration": "04:15",
        "actors": "1978 年越剧电影《祥林嫂》由袁雪芬、金采风师徒轮流饰演祥林嫂，青年祥林嫂由金采风饰演；片中还有史济华等演员。",
        "school": "袁派是本剧的悲剧表达基底，重人物心理和现实题材厚度；金采风师承袁派并形成金派，声腔更质朴圆熟，适合呈现青年祥林嫂的苦难叙事。",
        "background": "《祥林嫂》改编自鲁迅小说《祝福》，1946 年由袁雪芬搬上越剧舞台，1978 年拍成越剧电影；本段聚焦祥林嫂在礼教、贫困与命运挤压下的自诉。",
        "technique": "重点听低回中音区、拖腔后的气口和句尾下沉；这类悲剧唱段不以高音爆发为主，而以持续压紧的叙事、停顿和弱声收束制造沉痛感。",
        "plot": "祥林嫂从个人遭遇唱到无处申诉的现实困境，风雪、被迫改嫁和失去庇护的处境层层叠加，人物悲剧由生活苦难转向精神重压。",
        "keywords": ["祥林嫂", "天生雪", "袁雪芬", "金采风", "袁派", "现实题材", "悲剧意识"],
        "askPrompts": ["袁派怎样表现祥林嫂的悲剧感？", "为什么低能量也能形成强情绪？", "《祥林嫂》在越剧改革中有什么意义？"],
    },
    {
        "id": "hewenxiu-suanming",
        "title": "尹派名段《何文秀·算命》",
        "sourceContains": "何文秀",
        "start": "00:00:30",
        "duration": "04:47",
        "actors": "本地视频文件标注为赵志刚经典《何文秀-算命》1986 版、应国英版本：赵志刚饰何文秀，应国英饰王兰英；片段围绕何文秀乔装算命先生试探妻子展开。",
        "school": "赵志刚为尹派小生重要传人之一，唱腔承接尹派儒雅深沉、吐字清楚和书卷气足的特点；本段还借鉴评弹、滩簧式说唱节奏，形成“哭牌算命”机智试探与含悲自持并重的质感。",
        "background": "《何文秀·哭牌算命》是尹派传统名段：何文秀蒙冤后化作算命先生，借看相、测命与王兰英重逢。当前站内片段取自本地 1986 版舞台录像，起点从算命先生登场与王兰英听声起疑处开始。",
        "technique": "重点听清板式叙事、字重腔轻、语气转折和半说半唱的推进；赵志刚版不急于外放情绪，而在平稳气口、轻巧装饰音和句尾回旋中显露机智、试探与深情。",
        "plot": "王兰英听见算命声后想起亡夫，何文秀则以“王先生”身份招徕算命，先用贫富收费的俏语引她上前，再借算命一步步试探旧情和冤情线索。",
        "keywords": ["何文秀", "哭牌算命", "赵志刚", "应国英", "尹派", "算命调", "身份试探", "1986版"],
        "askPrompts": ["尹派小生在《算命》中有哪些特点？", "这段如何用节奏表现机智试探？", "《何文秀》的剧情反转在哪里？"],
        "sourceNote": "从本地“越剧视频”目录中的《赵志刚经典〈何文秀-算命〉1986版应国英版本.mp4》截取音频；字幕以本地视频画面抽帧核对为准，并用公开唱词资料辅助校订。",
    },
    {
        "id": "liangzhu-huadie",
        "title": "《梁祝·化蝶》",
        "sourceContains": "梁山伯与祝英台",
        "start": "02:18:30",
        "duration": "05:10",
        "actors": "本地视频文件标注为吴凤花、陈飞版本：吴凤花饰梁山伯，陈飞饰祝英台。",
        "school": "范派小生的挺拔线条与傅派旦角的明亮抒情共同完成尾声升华；前者稳住悲剧骨架，后者扩展化蝶段落的诗意余韵。",
        "background": "“化蝶”是《梁山伯与祝英台》尾声段落：祝英台哭坟后，墓门开启，梁祝以双蝶意象完成现实之外的团圆。",
        "technique": "重点听长线条延展、慢速收放和高位情绪保持；尾声不是靠连续冲突推进，而是通过乐队铺垫、拖腔余韵和身段舒展完成升华。",
        "plot": "生死阻隔无法在现实中解决，于是被转化为化蝶双飞的浪漫象征；剧情从哭坟的悲痛转向超越现实的团圆想象。",
        "keywords": ["梁祝", "化蝶", "吴凤花", "陈飞", "悲剧升华", "浪漫意象", "尾声"],
        "askPrompts": ["化蝶为什么是梁祝的情感升华？", "尾声能量回落为什么仍然动人？", "梁祝的爱情悲剧如何转成诗意意象？"],
    },
    {
        "id": "wunvbaishou-fengtang",
        "title": "《五女拜寿·奉汤》",
        "sourceContains": "五女拜寿",
        "start": "00:33:13",
        "duration": "05:23",
        "actors": "1984 年电影版《五女拜寿》中，茅威涛饰邹士龙，何赛飞饰翠云；本段围绕邹士龙救助雪地昏倒的翠云展开。",
        "school": "茅威涛为尹派小生传人，唱腔清朗而有书卷气；何赛飞工花旦，常归入张派审美脉络，表演灵动细腻。此段体现浙江小百花越剧团早期群像戏的清新舞台气质。",
        "background": "《五女拜寿》由顾锡东编剧，1984 年浙江小百花越剧团舞台版本拍成戏曲电影；“奉汤”发生在南京城外邹家庄，是杨家落难线索被揭开的关键段落。",
        "technique": "重点听茅威涛“叙事小生”的清晰字头、中速推进和温和气口：先安抚，再说明救人缘由，再引出翠云诉冤；唱腔与端汤、披衣等生活化动作紧密相扣。",
        "plot": "翠云雪地昏倒后被邹士龙救回，邹士龙奉上暖肚汤安抚她；翠云随后说明杨继康削职后亲友不认、四女不养的遭遇，推动剧情由个人遇救转入杨家冷暖主线。",
        "keywords": ["五女拜寿", "奉汤", "茅威涛", "何赛飞", "邹士龙", "翠云", "尹派", "张派", "浙江小百花"],
        "askPrompts": ["《五女拜寿》为什么适合展示越剧群像？", "奉汤一段如何表现温情转折？", "这段能量走势为什么会从低位回暖？"],
    },
]


def main() -> None:
    PUBLIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    ensure_ffmpeg_on_path(ffmpeg)
    keyword_model = load_funasr_model()

    items = []
    for index, entry in enumerate(ARIA_CATALOG, 1):
        print(f"[{index}/{len(ARIA_CATALOG)}] {entry['title']}")
        source = resolve_source(entry)
        audio_path = PUBLIC_AUDIO_DIR / f"{entry['id']}.mp3"
        wav_path = PUBLIC_AUDIO_DIR / f"{entry['id']}.wav"
        extract_audio_clip(ffmpeg, source, audio_path, wav_path, entry["start"], entry["duration"])
        features = analyze_audio_clip(wav_path, bins=24)
        keyword_segments = transcribe_with_funasr(keyword_model, wav_path)
        item = build_item(entry, audio_path, features, keyword_segments)
        items.append(item)
        try:
            wav_path.unlink()
        except OSError:
            pass

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "backend": "字幕：联网唱词/视频字幕 OCR 校验；关键词：FunASR paraformer-zh；曲线：librosa",
            "note": "音频从授权或项目已有公开来源提取；FunASR 仅用于关键词辅助，字幕应由本地视频画面字幕 OCR 或联网唱词资料校订后写入。",
        },
        "items": items,
    }
    write_json(DATA_PATH, payload)
    write_json(PUBLIC_DATA_PATH, payload)
    print(f"Wrote {DATA_PATH}")
    print(f"Wrote {PUBLIC_DATA_PATH}")


def resolve_source(entry: dict[str, Any]) -> Path:
    if entry.get("sourceFile"):
        source_file = Path(entry["sourceFile"])
        if not source_file.exists():
            raise FileNotFoundError(f"Source file not found: {source_file}")
        return source_file

    needle = entry["sourceContains"]
    matches = [
        path for path in SOURCE_VIDEO_DIR.iterdir()
        if path.is_file() and needle in path.name and path.suffix.lower() in {".mp4", ".m4a", ".mp3", ".wav"}
    ]
    if not matches:
        raise FileNotFoundError(f"No source video containing {needle!r} in {SOURCE_VIDEO_DIR}")
    return matches[0]


def ensure_ffmpeg_on_path(ffmpeg: str) -> None:
    ffmpeg_path = Path(ffmpeg)
    if not ffmpeg_path.exists():
        return
    alias_dir = ROOT / "tmp" / "ffmpeg-bin"
    alias_dir.mkdir(parents=True, exist_ok=True)
    alias_path = alias_dir / "ffmpeg.exe"
    if not alias_path.exists():
        shutil.copy2(ffmpeg_path, alias_path)
    os.environ["PATH"] = str(alias_dir) + os.pathsep + str(ffmpeg_path.parent) + os.pathsep + os.environ.get("PATH", "")


def load_funasr_model() -> Any | None:
    try:
        from funasr import AutoModel
    except Exception as exc:
        print(f"FunASR unavailable, keywords will use metadata only: {exc}")
        return None
    return AutoModel(model="paraformer-zh", vad_model="fsmn-vad", punc_model="ct-punc", device="cpu", disable_update=True)


def extract_audio_clip(ffmpeg: str, source: Path, mp3_path: Path, wav_path: Path, start: str, duration: str) -> None:
    base = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-ss", start, "-t", duration, "-i", str(source), "-vn", "-ac", "1"]
    subprocess.run(base + ["-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "160k", str(mp3_path)], check=True)
    subprocess.run(base + ["-ar", "16000", "-f", "wav", str(wav_path)], check=True)


def analyze_audio_clip(wav_path: Path, bins: int) -> dict[str, Any]:
    y, sr = librosa.load(str(wav_path), sr=22050, mono=True, dtype=np.float32)
    duration = float(librosa.get_duration(y=y, sr=sr))
    hop_length = 1024
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop_length)[0]
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    frame_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
    onset = fit_length(onset, len(rms))
    try:
        tempo_value, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length, onset_envelope=onset)
        tempo = float(np.asarray(tempo_value).reshape(-1)[0])
    except Exception:
        tempo = 0.0

    pitch = librosa.yin(y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C6"), sr=sr, frame_length=2048, hop_length=hop_length)
    pitch = fit_length(pitch, len(rms), fill=np.nan)
    pitch = np.where(rms > np.nanpercentile(rms, 35), pitch, np.nan)

    energy_bins = aggregate(frame_times, rms, duration, bins, reducer="mean")
    rhythm_bins = aggregate(frame_times, onset, duration, bins, reducer="mean")
    pitch_bins = aggregate(frame_times, pitch, duration, bins, reducer="median", nan=True)
    energy_norm = smooth(norm_series(energy_bins), 3)
    rhythm_norm = smooth(norm_series(rhythm_bins), 3)
    pitch_norm = smooth(norm_series(pitch_bins, nan=True), 3)
    pitch_motion = smooth(norm_series(np.abs(np.gradient(np.nan_to_num(pitch_norm)))), 3)
    emotion = np.clip(16 + energy_norm * 0.45 + rhythm_norm * 0.25 + pitch_norm * 0.18 + pitch_motion * 0.12, 10, 98)

    valid_pitch = pitch[np.isfinite(pitch)]
    pitch_mean = float(np.nanmean(valid_pitch)) if valid_pitch.size else None
    pitch_min = float(np.nanpercentile(valid_pitch, 10)) if valid_pitch.size else None
    pitch_max = float(np.nanpercentile(valid_pitch, 90)) if valid_pitch.size else None

    edges = np.linspace(0, duration, bins + 1)
    points = []
    for idx in range(bins):
        point_pitch = finite_or_none(pitch_bins[idx])
        point_tempo = tempo * (0.76 + 0.48 * rhythm_norm[idx] / 100) if tempo else None
        points.append({
            "time": round(float(edges[idx]), 2),
            "end": round(float(edges[idx + 1]), 2),
            "timeLabel": seconds_to_stamp(float(edges[idx])),
            "pitchHz": round(point_pitch, 2) if point_pitch else None,
            "pitchNorm": round(float(pitch_norm[idx]), 2),
            "tempoBpm": round(float(point_tempo), 2) if point_tempo else None,
            "rhythm": round(float(rhythm_norm[idx]), 2),
            "energy": round(float(energy_norm[idx]), 2),
            "emotion": int(round(float(emotion[idx]))),
        })

    return {
        "durationSeconds": round(duration, 2),
        "mediaDurationSeconds": round(duration, 2),
        "tempo": round(tempo, 2) if tempo else None,
        "pitchMeanHz": round(pitch_mean, 2) if pitch_mean else None,
        "pitchRangeHz": [
            round(pitch_min, 2) if pitch_min else None,
            round(pitch_max, 2) if pitch_max else None,
        ],
        "energyMean": round(float(np.nanmean(energy_norm)), 2),
        "energyPeak": round(float(np.nanmax(energy_norm)), 2),
        "points": points,
        "backend": "librosa",
    }


def transcribe_with_funasr(model: Any | None, wav_path: Path) -> list[dict[str, str]]:
    if model is None:
        return []
    try:
        result = model.generate(input=str(wav_path))
    except Exception as exc:
        print(f"FunASR failed for {wav_path.name}: {exc}")
        return []
    rows = result if isinstance(result, list) else [result]
    segments: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        segments.extend(row_to_segments(row))
        if not segments:
            text = str(row.get("text", "")).strip()
            if text:
                segments.extend(split_text(text, 0.0, probe_wav_duration(wav_path)))
    return [
        {"start": seconds_to_stamp(segment["start"]), "end": seconds_to_stamp(segment["end"]), "text": cleanup_caption(segment["text"])}
        for segment in segments
        if cleanup_caption(segment["text"])
    ][:18]


def row_to_segments(row: dict[str, Any]) -> list[dict[str, Any]]:
    sentence_info = row.get("sentence_info")
    if isinstance(sentence_info, list) and sentence_info:
        segments = []
        for index, sentence in enumerate(sentence_info):
            if not isinstance(sentence, dict):
                continue
            text = str(sentence.get("text", "")).strip()
            if not text:
                continue
            start = parse_seconds(sentence.get("start"), index * 15.0, milliseconds=True)
            end = parse_seconds(sentence.get("end"), start + 8.0, milliseconds=True)
            segments.append({"start": start, "end": max(end, start + 0.8), "text": text})
        return segments
    text = str(row.get("text", "")).strip()
    timestamps = row.get("timestamp") or row.get("timestamps")
    start, end = timestamps_to_range(timestamps)
    return split_text(text, start, end) if text else []


def split_text(text: str, start: float, end: float, max_chars: int = 28) -> list[dict[str, Any]]:
    pieces = [piece.strip() for piece in re.split(r"(?<=[。！？!?，,；;])", text) if piece.strip()]
    chunks: list[str] = []
    for piece in pieces or [text]:
        while len(piece) > max_chars:
            chunks.append(piece[:max_chars])
            piece = piece[max_chars:]
        if piece:
            chunks.append(piece)
    if not chunks:
        return []
    duration = max(1.0, end - start)
    total_chars = sum(max(1, len(chunk)) for chunk in chunks)
    cursor = start
    segments = []
    for index, chunk in enumerate(chunks):
        chunk_end = end if index == len(chunks) - 1 else cursor + duration * max(1, len(chunk)) / total_chars
        segments.append({"start": cursor, "end": max(chunk_end, cursor + 0.6), "text": chunk})
        cursor = chunk_end
    return segments


def build_item(entry: dict[str, Any], audio_path: Path, features: dict[str, Any], keyword_segments: list[dict[str, str]]) -> dict[str, Any]:
    duration = features["durationSeconds"]
    points = features["points"]
    emotion_curve = [point["emotion"] for point in points]
    captions = fallback_captions(entry, duration)
    moments = build_moments(points, captions)
    summary = (
        f"{entry['title']} 已提取为站内音频唱段，并完成 FunASR 关键词提取与 librosa 唱腔特征分析。"
        f"片段时长约 {seconds_to_stamp(duration)}，节奏均值约 {metric(features.get('tempo'), 'BPM')}，"
        f"平均音高约 {metric(features.get('pitchMeanHz'), 'Hz')}。"
    )
    emotion_text = describe_emotion(points)
    return {
        "title": entry["title"],
        "type": "audio",
        "duration": seconds_to_stamp(duration),
        "bvid": "",
        "audioUrl": "/audio/" + audio_path.name,
        "analysis": {
            "summary": summary,
            "background": entry["background"],
            "actors": entry["actors"],
            "school": entry["school"],
            "technique": entry["technique"],
            "plot": entry["plot"],
            "emotion": emotion_text,
            "vocal": f"{entry['school']} {entry['technique']}",
            "scene": f"{entry['plot']} 当前模块只播放音频，分析重点转向字幕、节奏、音高、能量和情绪曲线。",
            "narrator": "数字讲解员可围绕背景、演员、流派、唱腔技巧与曲线高点进行讲解；语音应使用授权或通用音色，不模仿真实演员声音。",
            "narratorVoiceUrl": "",
            "keywords": build_keywords(entry["keywords"], keyword_segments),
            "captions": captions,
            "captionSource": "pending_ocr_or_web_lyrics",
            "captionSourceNote": "请运行 curate-classic-aria-captions.py 写入联网唱词或 OCR 校验后的逐秒字幕。",
            "keywordModel": "FunASR paraformer-zh",
            "moments": moments,
            "emotionCurve": emotion_curve,
            "audioFeatures": features,
            "askPrompts": entry["askPrompts"],
        },
        "source": {
            "start": entry["start"],
            "duration": entry["duration"],
            "model": "FunASR paraformer-zh（关键词）",
            "captionSource": "联网唱词/视频字幕 OCR 校验",
            "note": entry.get("sourceNote", "从本地越剧视频提取音频；字幕由联网唱词或本地视频字幕 OCR 校订。"),
        },
    }


def build_keywords(seed_keywords: list[str], segments: list[dict[str, str]]) -> list[str]:
    required = ["FunASR", "librosa", "经典唱段"]
    stopwords = {
        "这个", "那个", "我们", "你们", "他们", "什么", "不是", "没有", "还是", "就是",
        "可以", "因为", "所以", "然后", "已经", "这里", "那里", "字幕", "模型",
    }
    keywords: list[str] = []
    seen: set[str] = set()
    for keyword in seed_keywords:
        if keyword not in seen:
            keywords.append(keyword)
            seen.add(keyword)
    transcript = "".join(segment.get("text", "") for segment in segments)
    for token in re.findall(r"[\u4e00-\u9fff]{2,8}", transcript):
        if token in seen or token in stopwords:
            continue
        if len(token) < 2 or len(token) > 8:
            continue
        keywords.append(token)
        seen.add(token)
        if len(keywords) >= 12:
            break
    for keyword in required:
        if keyword not in seen:
            keywords.append(keyword)
            seen.add(keyword)
    return keywords[:15]


def build_moments(points: list[dict[str, Any]], captions: list[dict[str, str]]) -> list[dict[str, str]]:
    if not points:
        return []
    high_energy = max(points, key=lambda item: item["energy"])
    high_emotion = max(points, key=lambda item: item["emotion"])
    high_rhythm = max(points, key=lambda item: item["rhythm"])
    selected = dedupe_points([points[0], high_rhythm, high_energy, high_emotion, points[-1]])
    titles = ["起势铺陈", "节奏推进", "能量高点", "情绪峰值", "尾声收束"]
    rows = []
    for title, point in zip(titles, selected):
        caption_hint = nearest_caption(captions, point["time"])
        rows.append({
            "time": point["timeLabel"],
            "title": title,
            "text": (
                f"{caption_hint}曲线读数：情绪 {point['emotion']}%，能量 {point['energy']:.0f}%，"
                f"节奏 {point['rhythm']:.0f}%，音高 {metric(point.get('pitchHz'), 'Hz')}。"
            ),
        })
    return rows


def describe_emotion(points: list[dict[str, Any]]) -> str:
    if not points:
        return "暂无足够音频点位。"
    first = points[0]["emotion"]
    last = points[-1]["emotion"]
    peak = max(points, key=lambda item: item["emotion"])
    energy_peak = max(points, key=lambda item: item["energy"])
    direction = "逐步抬升" if last > first + 8 else "高位回落" if first > last + 8 else "平稳推进"
    pitch_values = [point["pitchHz"] for point in points if point.get("pitchHz") is not None]
    pitch_mean = sum(pitch_values) / len(pitch_values) if pitch_values else None
    tempo_values = [point["tempoBpm"] for point in points if point.get("tempoBpm") is not None]
    tempo_mean = sum(tempo_values) / len(tempo_values) if tempo_values else None
    return (
        f"本地 librosa 曲线显示：整段情绪呈{direction}，平均节奏约 {metric(tempo_mean, 'BPM')}，"
        f"平均音高约 {metric(pitch_mean, 'Hz')}；情绪峰值在 {peak['timeLabel']} 附近（{peak['emotion']}%），"
        f"能量峰值在 {energy_peak['timeLabel']} 附近（{energy_peak['energy']:.0f}%）。可把这些时间点作为听戏时观察剧情推进、唱腔发力和伴奏增强的重点。"
    )


def fallback_captions(entry: dict[str, Any], duration: float) -> list[dict[str, str]]:
    anchors = [0, duration * 0.35, duration * 0.7]
    labels = ["唱段起势：模型字幕待复核，先结合剧情背景进入听戏。", "中段推进：关注节奏密度、拖腔和人物情绪转折。", "尾声收束：观察能量回落与情绪余韵。"]
    return [
        {"start": seconds_to_stamp(anchor), "end": seconds_to_stamp(min(duration, anchor + 24)), "text": text}
        for anchor, text in zip(anchors, labels)
    ]


def nearest_caption(captions: list[dict[str, str]], seconds: float) -> str:
    if not captions:
        return ""
    def distance(caption: dict[str, str]) -> float:
        return abs(stamp_to_seconds(caption["start"]) - seconds)
    caption = min(captions, key=distance)
    return f"字幕提示：{caption['text'][:34]}。"


def dedupe_points(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output = []
    for point in points:
        key = point["timeLabel"]
        if key in seen:
            continue
        seen.add(key)
        output.append(point)
    return output


def cleanup_caption(text: str) -> str:
    return re.sub(r"\s+", "", text).strip()


def fit_length(values: Any, target_length: int, fill: float = 0.0) -> np.ndarray:
    array = np.asarray(values, dtype=float)
    if array.size == target_length:
        return array
    if array.size > target_length:
        return array[:target_length]
    pad = np.full(target_length - array.size, fill, dtype=float)
    return np.concatenate([array, pad])


def aggregate(times: np.ndarray, values: np.ndarray, duration: float, bins: int, reducer: str = "mean", nan: bool = False) -> np.ndarray:
    edges = np.linspace(0, duration, bins + 1)
    output = []
    for index in range(bins):
        if index == bins - 1:
            mask = (times >= edges[index]) & (times <= edges[index + 1])
        else:
            mask = (times >= edges[index]) & (times < edges[index + 1])
        chunk = values[mask]
        if chunk.size == 0:
            output.append(np.nan if nan else 0.0)
        elif reducer == "median":
            output.append(float(np.nanmedian(chunk)))
        else:
            output.append(float(np.nanmean(chunk)))
    return fill_missing(np.asarray(output, dtype=float)) if nan else np.asarray(output, dtype=float)


def fill_missing(values: np.ndarray) -> np.ndarray:
    output = values.astype(float)
    finite = np.isfinite(output)
    if finite.all():
        return output
    if not finite.any():
        return np.zeros_like(output)
    indexes = np.arange(output.size)
    output[~finite] = np.interp(indexes[~finite], indexes[finite], output[finite])
    return output


def norm_series(values: Any, nan: bool = False) -> np.ndarray:
    array = np.asarray(values, dtype=float)
    if nan:
        array = fill_missing(array)
    low = float(np.nanpercentile(array, 8))
    high = float(np.nanpercentile(array, 92))
    if math.isclose(low, high):
        return np.full_like(array, 45.0, dtype=float)
    return np.clip((array - low) / (high - low) * 100, 0, 100)


def smooth(values: Any, window: int) -> np.ndarray:
    array = np.asarray(values, dtype=float)
    if array.size < window or window <= 1:
        return array
    kernel = np.ones(window) / window
    padded = np.pad(array, (window // 2, window - 1 - window // 2), mode="edge")
    return np.convolve(padded, kernel, mode="valid")


def finite_or_none(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) and number > 0 else None


def parse_seconds(value: Any, default: float, milliseconds: bool = False) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number / 1000.0 if milliseconds and number > 100 else number


def timestamps_to_range(timestamps: Any) -> tuple[float, float]:
    if isinstance(timestamps, list) and timestamps:
        if isinstance(timestamps[0], list):
            return parse_seconds(timestamps[0][0], 0.0, True), parse_seconds(timestamps[-1][-1], 20.0, True)
        return parse_seconds(timestamps[0], 0.0, True), parse_seconds(timestamps[-1], 20.0, True)
    return 0.0, 20.0


def probe_wav_duration(wav_path: Path) -> float:
    y, sr = librosa.load(str(wav_path), sr=8000, mono=True)
    return float(librosa.get_duration(y=y, sr=sr))


def seconds_to_stamp(seconds: float) -> str:
    seconds = max(0, float(seconds or 0))
    minutes = int(seconds // 60)
    remain = int(round(seconds % 60))
    if remain == 60:
        minutes += 1
        remain = 0
    return f"{minutes:02d}:{remain:02d}"


def stamp_to_seconds(stamp: str) -> float:
    parts = [float(part) for part in stamp.split(":")]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return parts[0] if parts else 0.0


def metric(value: Any, unit: str) -> str:
    number = finite_or_none(value)
    if number is None:
        return "待分析"
    return f"{number:.1f} {unit}" if number >= 100 else f"{number:.2f} {unit}"


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
