#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import librosa
import numpy as np


CATALOG: list[dict[str, Any]] = [
    {
        "title": "《梁山伯与祝英台》",
        "file": "liangzhu.mp4",
        "category": "爱情悲剧",
        "keywords": ["梁祝", "梁山伯", "祝英台", "吴凤花", "陈飞"],
        "vocalHint": "梁祝唱腔适合观察抒情线条、对唱呼应与情绪递进，能量高点通常对应矛盾推进或大段抒怀。",
    },
    {
        "title": "《红楼梦》",
        "file": "hongloumeng.mp4",
        "category": "文学名著改编",
        "keywords": ["红楼梦", "徐玉兰", "王文娟", "宝玉", "黛玉"],
        "vocalHint": "红楼唱腔重在细腻咬字和心理层次，音高线条与能量变化能辅助观察人物情绪的含蓄转折。",
    },
    {
        "title": "《西厢记》",
        "file": "xixiangji.mp4",
        "category": "古典爱情",
        "keywords": ["西厢记", "方亚芬", "钱惠丽", "张生", "崔莺莺"],
        "vocalHint": "西厢记兼具叙事与抒情，节奏密度变化能提示人物试探、互诉心意与情节推进。",
    },
    {
        "title": "《祥林嫂》",
        "file": "xianglinsao.mp4",
        "category": "现代题材",
        "keywords": ["祥林嫂", "袁雪芬", "金采风", "鲁迅", "祝福"],
        "vocalHint": "祥林嫂的声腔重心偏沉郁，适合结合低能量段、拖腔与节奏停顿观察悲剧重量。",
    },
    {
        "title": "《碧玉簪》",
        "file": "biyuzan.mp4",
        "category": "传统剧目",
        "keywords": ["碧玉簪", "金采风", "陈少春", "传统剧目", "才子佳人"],
        "vocalHint": "碧玉簪唱腔较重戏剧情节转折，可从节奏密度和能量峰值观察冲突、申诉与释疑段落。",
    },
    {
        "title": "《追鱼》",
        "file": "zhuiyu.mp4",
        "category": "神话传说",
        "keywords": ["追鱼", "徐玉兰", "王文娟", "鲤鱼精", "张珍"],
        "vocalHint": "追鱼带有浪漫和幻想色彩，音高起伏与节奏活跃度能帮助观察灵动、欢悦和深情段落。",
    },
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze local Yueju videos with librosa.")
    parser.add_argument("--video-dir", default="public/videos")
    parser.add_argument("--output", default="data/video-feature-analyses.json")
    parser.add_argument("--public-output", default="public/data/video-feature-analyses.json")
    parser.add_argument("--points", type=int, default=180)
    parser.add_argument("--sample-rate", type=int, default=11025)
    args = parser.parse_args()

    video_dir = Path(args.video_dir)
    items = []
    for index, meta in enumerate(CATALOG, 1):
        video_path = video_dir / meta["file"]
        if not video_path.exists():
            raise SystemExit(f"Video not found: {video_path}")
        print(f"[{index}/{len(CATALOG)}] analyzing {meta['title']} -> {video_path}")
        features = analyze_video(video_path, points=args.points, sample_rate=args.sample_rate)
        items.append(build_item(meta, features))

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "backend": "librosa",
            "sampleRate": args.sample_rate,
            "pointsPerVideo": args.points,
            "note": "音频特征从本地授权视频提取，仅用于站内听戏辅助与可视化展示。",
        },
        "items": items,
    }

    write_json(Path(args.output), payload)
    write_json(Path(args.public_output), payload)
    print(f"Wrote {args.output}")
    print(f"Wrote {args.public_output}")


def analyze_video(video_path: Path, points: int, sample_rate: int) -> dict[str, Any]:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    media_duration = probe_duration(ffmpeg, video_path)
    with tempfile.TemporaryDirectory(prefix="yueju-audio-") as temp_dir:
        wav_path = Path(temp_dir) / "audio.wav"
        extract_audio(ffmpeg, video_path, wav_path, sample_rate)
        y, sr = librosa.load(str(wav_path), sr=sample_rate, mono=True, dtype=np.float32)

    if y.size == 0:
        raise RuntimeError(f"No audio samples decoded from {video_path}")

    duration = float(librosa.get_duration(y=y, sr=sr))
    frame_length = 2048
    hop_length = 4096

    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    frame_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
    onset_env = fit_length(onset_env, len(rms))

    tempo = estimate_tempo(y, sr, hop_length, onset_env)
    pitch = estimate_pitch(y, sr, frame_length, hop_length, rms)
    pitch = fit_length(pitch, len(rms), fill=np.nan)

    energy_bins = aggregate(frame_times, rms, duration, points, reducer="mean")
    rhythm_bins = aggregate(frame_times, onset_env, duration, points, reducer="mean")
    pitch_bins = aggregate(frame_times, pitch, duration, points, reducer="median", nan=True)

    energy_norm = smooth(norm_series(energy_bins), 5)
    rhythm_norm = smooth(norm_series(rhythm_bins), 5)
    pitch_norm = smooth(norm_series(pitch_bins, nan=True), 5)
    pitch_motion = smooth(norm_series(np.abs(np.gradient(np.nan_to_num(pitch_norm)))), 5)
    emotion = np.clip(18 + energy_norm * 0.42 + rhythm_norm * 0.28 + pitch_norm * 0.18 + pitch_motion * 0.12, 12, 98)

    valid_pitch = pitch[np.isfinite(pitch)]
    pitch_mean = float(np.nanmean(valid_pitch)) if valid_pitch.size else None
    pitch_min = float(np.nanpercentile(valid_pitch, 10)) if valid_pitch.size else None
    pitch_max = float(np.nanpercentile(valid_pitch, 90)) if valid_pitch.size else None

    time_edges = np.linspace(0, duration, points + 1)
    feature_points = []
    for idx in range(points):
        current_pitch = finite_or_none(pitch_bins[idx])
        rhythm_bpm = tempo * (0.72 + 0.56 * rhythm_norm[idx] / 100) if tempo else None
        feature_points.append(
            {
                "time": round(float(time_edges[idx]), 2),
                "end": round(float(time_edges[idx + 1]), 2),
                "timeLabel": seconds_to_stamp(float(time_edges[idx])),
                "pitchHz": round(current_pitch, 2) if current_pitch else None,
                "pitchNorm": round(float(pitch_norm[idx]), 2),
                "tempoBpm": round(float(rhythm_bpm), 2) if rhythm_bpm else None,
                "rhythm": round(float(rhythm_norm[idx]), 2),
                "energy": round(float(energy_norm[idx]), 2),
                "emotion": int(round(float(emotion[idx]))),
            }
        )

    return {
        "durationSeconds": round(duration, 2),
        "mediaDurationSeconds": round(media_duration or duration, 2),
        "tempo": round(float(tempo), 2) if tempo else None,
        "pitchMeanHz": round(pitch_mean, 2) if pitch_mean else None,
        "pitchRangeHz": [
            round(pitch_min, 2) if pitch_min else None,
            round(pitch_max, 2) if pitch_max else None,
        ],
        "energyMean": round(float(np.nanmean(energy_norm)), 2),
        "energyPeak": round(float(np.nanmax(energy_norm)), 2),
        "points": feature_points,
        "backend": "librosa",
    }


def build_item(meta: dict[str, Any], features: dict[str, Any]) -> dict[str, Any]:
    points = features["points"]
    emotion_curve = [point["emotion"] for point in points]
    moments = build_moments(points)
    duration = features.get("mediaDurationSeconds") or features.get("durationSeconds") or 0
    tempo_text = metric(features.get("tempo"), "BPM")
    pitch_text = metric(features.get("pitchMeanHz"), "Hz")
    summary = (
        f"{meta['title']} 已完成 librosa 全片音频分析：抽取 {len(points)} 个时间点，"
        f"覆盖约 {seconds_to_stamp(duration)}。全局节奏约 {tempo_text}，平均音高约 {pitch_text}，"
        "并生成可随视频播放同步移动的音高、节奏密度、能量和唱腔情绪曲线。"
    )
    return {
        "title": meta["title"],
        "type": "video",
        "duration": seconds_to_stamp(duration),
        "bvid": "",
        "analysis": {
            "summary": summary,
            "vocal": meta["vocalHint"],
            "scene": "播放视频时，右侧图表会根据当前播放时间自动定位，辅助观察唱腔的音区变化、节奏活跃度、能量强弱和情绪推进。",
            "narrator": "数字讲解员可围绕图表高点、节奏密集段和能量回落段进行导览。讲解语音应使用授权或通用音色，不模仿真实演员声音。",
            "narratorVoiceUrl": "",
            "keywords": meta["keywords"] + [meta["category"], "librosa", "唱腔情绪曲线"],
            "captions": build_feature_captions(points),
            "moments": moments,
            "emotionCurve": emotion_curve,
            "audioFeatures": features,
            "askPrompts": [
                f"{meta['title']} 的唱腔情绪曲线怎么看？",
                f"{meta['title']} 中哪些段落能量最高？",
                "音高、节奏和能量如何辅助理解越剧唱腔？",
            ],
        },
    }


def build_feature_captions(points: list[dict[str, Any]]) -> list[dict[str, str]]:
    if not points:
        return []
    total = len(points)
    anchors = [0, total // 4, total // 2, (total * 3) // 4]
    labels = ["开场铺陈", "情绪推进", "唱腔展开", "尾声回收"]
    captions = []
    for label, idx in zip(labels, anchors):
        point = points[min(idx, total - 1)]
        end = points[min(idx + max(1, total // 16), total - 1)]
        captions.append(
            {
                "start": point["timeLabel"],
                "end": end["timeLabel"],
                "text": f"{label}：能量 {point['energy']:.0f}%，节奏密度 {point['rhythm']:.0f}%，情绪强度 {point['emotion']}%。",
            }
        )
    return captions


def build_moments(points: list[dict[str, Any]]) -> list[dict[str, str]]:
    if not points:
        return []
    highest_emotion = max(points, key=lambda item: item["emotion"])
    highest_energy = max(points, key=lambda item: item["energy"])
    highest_rhythm = max(points, key=lambda item: item["rhythm"])
    return [
        {
            "time": highest_emotion["timeLabel"],
            "title": "情绪高点",
            "text": f"综合情绪强度达到 {highest_emotion['emotion']}%，可重点观察唱腔张力和剧情推进。",
        },
        {
            "time": highest_energy["timeLabel"],
            "title": "能量峰值",
            "text": f"能量约 {highest_energy['energy']:.0f}%，通常对应较强声腔、合奏或舞台冲突。",
        },
        {
            "time": highest_rhythm["timeLabel"],
            "title": "节奏密集",
            "text": f"节奏密度约 {highest_rhythm['rhythm']:.0f}%，适合观察念白、过门或情节加速。",
        },
    ]


def extract_audio(ffmpeg: str, input_path: Path, wav_path: Path, sample_rate: int) -> None:
    command = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(input_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(sample_rate),
        "-sample_fmt",
        "s16",
        str(wav_path),
    ]
    subprocess.run(command, check=True)


def probe_duration(ffmpeg: str, input_path: Path) -> float:
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(input_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    text = result.stderr + result.stdout
    import re

    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", text)
    if not match:
        return 0.0
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def estimate_tempo(y: np.ndarray, sr: int, hop_length: int, onset_env: np.ndarray) -> float | None:
    try:
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length, onset_envelope=onset_env)
        value = float(np.asarray(tempo).reshape(-1)[0])
        return value if math.isfinite(value) and value > 0 else None
    except Exception:
        return None


def estimate_pitch(y: np.ndarray, sr: int, frame_length: int, hop_length: int, rms: np.ndarray) -> np.ndarray:
    try:
        pitch = librosa.yin(
            y,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C6"),
            sr=sr,
            frame_length=frame_length,
            hop_length=hop_length,
        )
    except Exception:
        return np.full(len(rms), np.nan)

    pitch = fit_length(pitch, len(rms), fill=np.nan)
    if rms.size:
        threshold = np.nanpercentile(rms, 35)
        pitch = pitch.astype(float)
        pitch[rms < threshold] = np.nan
    pitch[(pitch < 70) | (pitch > 1200)] = np.nan
    return pitch


def aggregate(
    times: np.ndarray,
    values: np.ndarray,
    duration: float,
    bins: int,
    reducer: str,
    nan: bool = False,
) -> np.ndarray:
    edges = np.linspace(0, duration, bins + 1)
    output = []
    for idx in range(bins):
        mask = (times >= edges[idx]) & (times < edges[idx + 1])
        chunk = values[mask]
        if chunk.size == 0:
            output.append(np.nan if nan else 0.0)
            continue
        if nan:
            chunk = chunk[np.isfinite(chunk)]
        if chunk.size == 0:
            output.append(np.nan if nan else 0.0)
        elif reducer == "median":
            output.append(float(np.nanmedian(chunk)))
        else:
            output.append(float(np.nanmean(chunk)))
    return np.asarray(output, dtype=float)


def norm_series(values: np.ndarray, nan: bool = False) -> np.ndarray:
    data = values.astype(float)
    if nan:
        finite = data[np.isfinite(data)]
        if finite.size == 0:
            return np.zeros_like(data)
        fill = float(np.nanmedian(finite))
        data = np.where(np.isfinite(data), data, fill)
    low = float(np.nanpercentile(data, 5))
    high = float(np.nanpercentile(data, 95))
    if math.isclose(low, high):
        return np.full_like(data, 50.0)
    return np.clip((data - low) / (high - low) * 100, 0, 100)


def smooth(values: np.ndarray, window: int) -> np.ndarray:
    if window <= 1 or values.size < window:
        return values
    kernel = np.ones(window, dtype=float) / window
    padded = np.pad(values, (window // 2, window // 2), mode="edge")
    return np.convolve(padded, kernel, mode="valid")[: values.size]


def fit_length(values: np.ndarray, size: int, fill: float = 0.0) -> np.ndarray:
    values = np.asarray(values, dtype=float)
    if values.size == size:
        return values
    if values.size > size:
        return values[:size]
    return np.pad(values, (0, size - values.size), constant_values=fill)


def finite_or_none(value: float) -> float | None:
    return float(value) if math.isfinite(float(value)) else None


def seconds_to_stamp(seconds: float) -> str:
    seconds = max(0, int(round(seconds)))
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    remain = seconds % 60
    if hours:
        return f"{hours:02d}:{minutes:02d}:{remain:02d}"
    return f"{minutes:02d}:{remain:02d}"


def metric(value: Any, unit: str) -> str:
    if isinstance(value, (int, float)) and math.isfinite(float(value)):
        return f"{float(value):.1f} {unit}"
    return "待分析"


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
