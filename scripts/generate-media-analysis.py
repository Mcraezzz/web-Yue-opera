#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path
from typing import Any


MEDIA_SUFFIXES = {".aac", ".flac", ".m4a", ".mov", ".mp3", ".mp4", ".ogg", ".wav", ".webm"}
DOMAIN_TERMS = [
    "红楼梦", "梁祝", "梁山伯与祝英台", "梁山伯", "祝英台", "十八相送", "祥林嫂", "何文秀", "西厢记", "碧玉簪", "追鱼",
    "王派", "袁派", "尹派", "范派", "傅派", "戚派", "吴凤花", "陈飞", "小生", "旦角",
    "宝黛初见", "江南意象", "送别", "拖腔", "行腔", "咬字", "身段", "水袖",
    "园林布景", "现实题材", "悲剧意识", "节奏", "音高", "能量", "唱腔",
]


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).expanduser()
    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    segments = run_asr(args, input_path)
    audio_features = analyze_audio(input_path, bins=args.curve_bins, max_seconds=args.max_audio_seconds)
    transcript = " ".join(segment["text"] for segment in segments if not segment.get("placeholder")).strip()
    keywords = extract_keywords(args.title, transcript)
    emotion_curve = audio_features.get("emotionCurve") or make_curve_from_segments(segments, args.curve_bins)
    media_duration = audio_features.get("mediaDurationSeconds") or audio_features.get("durationSeconds") or last_segment_end(segments)
    captions = [
        {
            "start": seconds_to_stamp(segment["start"]),
            "end": seconds_to_stamp(segment["end"]),
            "text": segment["text"],
        }
        for segment in segments[: args.max_captions]
    ]
    moments = build_moments(segments, has_transcript=bool(transcript))
    narrator = args.narrator_text or build_narrator_text(args.title, keywords, has_transcript=bool(transcript))

    item = {
        "title": args.title,
        "type": args.media_type,
        "duration": seconds_to_stamp(media_duration),
        "bvid": args.bvid,
        "analysis": {
            "summary": build_summary(args.title, keywords, audio_features, bool(transcript)),
            "vocal": build_vocal_hint(keywords, audio_features),
            "scene": build_scene_hint(input_path, bool(transcript)),
            "narrator": narrator,
            "narratorVoiceUrl": args.narrator_voice_url,
            "keywords": keywords,
            "captions": captions,
            "moments": moments,
            "emotionCurve": emotion_curve,
            "audioFeatures": audio_features,
            "askPrompts": build_ask_prompts(args.title, keywords),
        },
        "source": {
            "engine": args.engine,
            "inputPath": str(input_path),
            "analysisWindowSeconds": args.max_audio_seconds or None,
            "audioFeatures": audio_features,
            "note": "字幕请仅用于已获授权的音视频素材；CosyVoice 讲解音色应使用授权或通用音色，不模仿真实演员声音。",
        },
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote media analysis JSON: {output}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate Yueju media-assistance JSON from authorized audio/video assets."
    )
    parser.add_argument("--input", required=True, help="Authorized audio/video file, transcript text, or transcript JSON.")
    parser.add_argument("--title", required=True, help="Display title, for example 《梁山伯与祝英台》(吴凤花·陈飞).")
    parser.add_argument("--output", default="dist/media-analysis.json", help="Output JSON path.")
    parser.add_argument(
        "--engine",
        choices=["media-only", "funasr", "whisper", "whisperx", "transcript-only"],
        default="media-only",
        help="media-only extracts audio features without ASR; use an ASR engine after installing its model dependencies.",
    )
    parser.add_argument("--media-type", choices=["audio", "video"], default="audio")
    parser.add_argument("--language", default="zh")
    parser.add_argument("--model", default="small", help="Whisper/WhisperX model name; ignored by FunASR.")
    parser.add_argument("--device", default="cpu", help="WhisperX device, for example cpu or cuda.")
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--bvid", default="")
    parser.add_argument("--transcript", default="", help="Optional transcript file when --input is an audio/video file.")
    parser.add_argument("--curve-bins", type=int, default=8)
    parser.add_argument("--max-captions", type=int, default=8)
    parser.add_argument("--max-audio-seconds", type=float, default=0, help="Analyze only the first N seconds; 0 means full media.")
    parser.add_argument("--max-asr-seconds", type=float, default=0, help="Transcribe only the first N seconds; 0 means full media.")
    parser.add_argument("--narrator-text", default="", help="CosyVoice narrator script text.")
    parser.add_argument("--narrator-voice-url", default="", help="Public URL/path of generated CosyVoice audio.")
    return parser.parse_args()


def run_asr(args: argparse.Namespace, input_path: Path) -> list[dict[str, Any]]:
    transcript_path = Path(args.transcript).expanduser() if args.transcript else None
    if transcript_path:
        return transcript_to_segments(transcript_path)
    if args.engine == "media-only":
        return placeholder_segments(args.title, input_path)
    if args.engine == "transcript-only":
        if input_path.suffix.lower() in MEDIA_SUFFIXES:
            return placeholder_segments(args.title, input_path)
        return transcript_to_segments(input_path)
    if args.engine == "funasr":
        return run_funasr(input_path, args.max_asr_seconds)
    if args.engine == "whisper":
        return run_whisper(input_path, args.model, args.language)
    if args.engine == "whisperx":
        return run_whisperx(input_path, args.model, args.language, args.device, args.batch_size)
    raise ValueError(f"Unsupported ASR engine: {args.engine}")


def run_funasr(input_path: Path, max_seconds: float) -> list[dict[str, Any]]:
    try:
        from funasr import AutoModel
    except ImportError as exc:
        raise SystemExit("Install FunASR first: pip install funasr modelscope") from exc

    with tempfile.TemporaryDirectory(prefix="yueju-asr-") as temp_dir:
        temp_path = Path(temp_dir)
        ensure_ffmpeg_command(temp_path)
        asr_input = prepare_wav_for_asr(input_path, temp_path / "asr.wav", max_seconds)
        model = AutoModel(model="paraformer-zh", vad_model="fsmn-vad", punc_model="ct-punc", device="cpu", disable_update=True)
        result = model.generate(input=str(asr_input))
    rows = result if isinstance(result, list) else [result]
    segments: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        text = str(row.get("text", "")).strip() if isinstance(row, dict) else str(row).strip()
        if not text:
            continue
        sentence_segments = row_to_sentence_segments(row) if isinstance(row, dict) else []
        if sentence_segments:
            segments.extend(sentence_segments)
            continue
        start, end = timestamps_to_range(row.get("timestamp") or row.get("timestamps")) if isinstance(row, dict) else (index * 20.0, (index + 1) * 20.0)
        segments.extend(split_timed_text(text, start, max(end, start + 1.0)))
    return segments or [{"start": 0.0, "end": 1.0, "text": ""}]


def prepare_wav_for_asr(input_path: Path, output_path: Path, max_seconds: float) -> Path:
    if input_path.suffix.lower() == ".wav" and not max_seconds:
        return input_path

    ffmpeg = resolve_ffmpeg()
    if not ffmpeg:
        return input_path

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
        "16000",
    ]
    if max_seconds and max_seconds > 0:
        command += ["-t", str(max_seconds)]
    command += ["-f", "wav", str(output_path)]
    subprocess.run(command, check=True)
    return output_path


def ensure_ffmpeg_command(temp_dir: Path) -> None:
    if shutil.which("ffmpeg"):
        return
    ffmpeg = resolve_ffmpeg()
    if not ffmpeg:
        return
    target = temp_dir / "ffmpeg.exe"
    shutil.copy2(ffmpeg, target)
    os.environ["PATH"] = str(temp_dir) + os.pathsep + os.environ.get("PATH", "")


def row_to_sentence_segments(row: dict[str, Any]) -> list[dict[str, Any]]:
    sentence_info = row.get("sentence_info")
    if not isinstance(sentence_info, list):
        return []
    segments = []
    for index, sentence in enumerate(sentence_info):
        if not isinstance(sentence, dict):
            continue
        text = str(sentence.get("text", "")).strip()
        if not text:
            continue
        start = parse_seconds(sentence.get("start"), index * 20.0, milliseconds=True)
        end = parse_seconds(sentence.get("end"), start + 20.0, milliseconds=True)
        segments.append({"start": start, "end": max(end, start + 1.0), "text": text})
    return segments


def split_timed_text(text: str, start: float, end: float, max_chars: int = 42) -> list[dict[str, Any]]:
    parts = [part.strip() for part in re.split(r"(?<=[。！？!?，,；;])", text) if part.strip()]
    chunks: list[str] = []
    for part in parts or [text]:
        while len(part) > max_chars:
            chunks.append(part[:max_chars])
            part = part[max_chars:]
        if part:
            chunks.append(part)
    if not chunks:
        return [{"start": start, "end": end, "text": text}]

    total_chars = sum(max(1, len(chunk)) for chunk in chunks)
    duration = max(1.0, end - start)
    cursor = start
    segments = []
    for index, chunk in enumerate(chunks):
        if index == len(chunks) - 1:
            chunk_end = end
        else:
            chunk_end = cursor + duration * (max(1, len(chunk)) / total_chars)
        segments.append({"start": cursor, "end": max(chunk_end, cursor + 0.5), "text": chunk})
        cursor = chunk_end
    return segments


def run_whisper(input_path: Path, model_name: str, language: str) -> list[dict[str, Any]]:
    try:
        import whisper
    except ImportError as exc:
        raise SystemExit("Install Whisper first: pip install openai-whisper") from exc

    model = whisper.load_model(model_name)
    result = model.transcribe(str(input_path), language=language, task="transcribe")
    return normalize_segments(result.get("segments", []), result.get("text", ""))


def run_whisperx(input_path: Path, model_name: str, language: str, device: str, batch_size: int) -> list[dict[str, Any]]:
    try:
        import whisperx
    except ImportError as exc:
        raise SystemExit("Install WhisperX first: pip install whisperx") from exc

    audio = whisperx.load_audio(str(input_path))
    model = whisperx.load_model(model_name, device=device, language=language)
    result = model.transcribe(audio, batch_size=batch_size, language=language)
    try:
        align_model, metadata = whisperx.load_align_model(language_code=language, device=device)
        result = whisperx.align(result["segments"], align_model, metadata, audio, device, return_char_alignments=False)
    except Exception as exc:
        print(f"WhisperX alignment skipped: {exc}", file=sys.stderr)
    return normalize_segments(result.get("segments", []), "")


def transcript_to_segments(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise SystemExit(f"Transcript/input file not found: {path}")
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        rows = data.get("segments") or data.get("captions") or data.get("items") or []
        if isinstance(rows, list) and rows:
            return normalize_segments(rows, data.get("text", ""))
        if data.get("text"):
            return split_text_to_segments(data["text"])
    return split_text_to_segments(path.read_text(encoding="utf-8"))


def normalize_segments(rows: list[Any], fallback_text: str) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        text = str(row.get("text", "")).strip()
        if not text:
            continue
        start = parse_seconds(row.get("start") or row.get("startTime") or row.get("begin"), index * 20.0)
        end = parse_seconds(row.get("end") or row.get("endTime") or row.get("finish"), start + 20.0)
        segments.append({"start": start, "end": max(end, start + 1.0), "text": text})
    if segments:
        return segments
    return split_text_to_segments(fallback_text)


def split_text_to_segments(text: str) -> list[dict[str, Any]]:
    chunks = [chunk.strip() for chunk in re.split(r"[\n。！？!?]+", text) if chunk.strip()]
    if not chunks and text.strip():
        chunks = [text.strip()]
    segments = []
    for index, chunk in enumerate(chunks):
        start = float(index * 20)
        segments.append({"start": start, "end": start + 18.0, "text": chunk[:120]})
    return segments or [{"start": 0.0, "end": 1.0, "text": ""}]


def placeholder_segments(title: str, input_path: Path) -> list[dict[str, Any]]:
    duration = probe_media_duration(input_path) or 180.0
    anchors = [0.0, max(20.0, duration * 0.35), max(40.0, duration * 0.7)]
    labels = [
        f"已导入本地视频{display_title(title)}，当前完成音频能量、节奏和音高的自动分析。",
        "字幕待转写：安装 FunASR paraformer-zh、Whisper 或 WhisperX 后可生成逐句字幕和更细时间戳。",
        "讲解员音频待生成：可用 CosyVoice 授权通用音色生成导览，不模仿真实演员声音。",
    ]
    return [
        {"start": anchor, "end": min(duration, anchor + 30.0), "text": text, "placeholder": True}
        for anchor, text in zip(anchors, labels)
    ]


def analyze_audio(input_path: Path, bins: int, max_seconds: float) -> dict[str, Any]:
    if input_path.suffix.lower() in {".txt", ".json"}:
        return {"durationSeconds": 0, "mediaDurationSeconds": 0, "tempo": None, "pitchMeanHz": None, "emotionCurve": []}

    media_duration = probe_media_duration(input_path)
    try:
        return analyze_with_librosa(input_path, bins=bins, max_seconds=max_seconds, media_duration=media_duration)
    except ImportError:
        return analyze_with_ffmpeg_numpy(input_path, bins=bins, max_seconds=max_seconds, media_duration=media_duration)
    except Exception as exc:
        print(f"librosa analysis failed, falling back to ffmpeg/numpy: {exc}", file=sys.stderr)
        return analyze_with_ffmpeg_numpy(input_path, bins=bins, max_seconds=max_seconds, media_duration=media_duration)


def analyze_with_librosa(input_path: Path, bins: int, max_seconds: float, media_duration: float) -> dict[str, Any]:
    import librosa
    import numpy as np

    with tempfile.TemporaryDirectory(prefix="yueju-librosa-") as temp_dir:
        load_path = input_path
        load_duration = max_seconds or None
        if input_path.suffix.lower() in MEDIA_SUFFIXES and (input_path.suffix.lower() != ".wav" or max_seconds):
            converted_path = prepare_wav_for_asr(input_path, Path(temp_dir) / "audio.wav", max_seconds)
            if converted_path != input_path:
                load_path = converted_path
                load_duration = None

        y, sr = librosa.load(str(load_path), sr=None, mono=True, duration=load_duration)
    duration = float(librosa.get_duration(y=y, sr=sr))
    rms = librosa.feature.rms(y=y)[0]
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    f0, _, _ = librosa.pyin(y, fmin=librosa.note_to_hz("C3"), fmax=librosa.note_to_hz("C6"))
    pitch_mean = float(np.nanmean(f0)) if not np.all(np.isnan(f0)) else None
    return {
        "durationSeconds": round(duration, 2),
        "mediaDurationSeconds": round(media_duration or duration, 2),
        "tempo": round(float(np.asarray(tempo).reshape(-1)[0]), 2),
        "pitchMeanHz": round(pitch_mean, 2) if pitch_mean else None,
        "emotionCurve": normalize_bins(rms, bins),
        "backend": "librosa",
    }


def analyze_with_ffmpeg_numpy(input_path: Path, bins: int, max_seconds: float, media_duration: float) -> dict[str, Any]:
    try:
        import numpy as np
    except ImportError:
        print("numpy not installed; audio curve falls back to transcript timing.", file=sys.stderr)
        return {"durationSeconds": 0, "mediaDurationSeconds": media_duration, "tempo": None, "pitchMeanHz": None, "emotionCurve": []}

    ffmpeg = resolve_ffmpeg()
    if not ffmpeg:
        print("ffmpeg not found. Install imageio-ffmpeg or put ffmpeg on PATH for media analysis.", file=sys.stderr)
        return {"durationSeconds": 0, "mediaDurationSeconds": media_duration, "tempo": None, "pitchMeanHz": None, "emotionCurve": []}

    with tempfile.TemporaryDirectory(prefix="yueju-media-") as temp_dir:
        wav_path = Path(temp_dir) / "audio.wav"
        command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(input_path), "-vn", "-ac", "1", "-ar", "16000"]
        if max_seconds and max_seconds > 0:
            command += ["-t", str(max_seconds)]
        command += ["-f", "wav", str(wav_path)]
        subprocess.run(command, check=True)
        with wave.open(str(wav_path), "rb") as wav_file:
            sample_rate = wav_file.getframerate()
            frames = wav_file.readframes(wav_file.getnframes())

    samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    if samples.size == 0:
        return {"durationSeconds": 0, "mediaDurationSeconds": media_duration, "tempo": None, "pitchMeanHz": None, "emotionCurve": []}

    duration = float(samples.size / sample_rate)
    frame_size = max(512, sample_rate // 10)
    usable = samples[: (samples.size // frame_size) * frame_size]
    if usable.size == 0:
        rms = np.array([float(np.sqrt(np.mean(samples * samples)))])
    else:
        frames_2d = usable.reshape(-1, frame_size)
        rms = np.sqrt(np.mean(frames_2d * frames_2d, axis=1))

    return {
        "durationSeconds": round(duration, 2),
        "mediaDurationSeconds": round(media_duration or duration, 2),
        "tempo": estimate_tempo(rms, frame_rate=sample_rate / frame_size),
        "pitchMeanHz": estimate_pitch(samples, sample_rate),
        "emotionCurve": normalize_bins(rms, bins),
        "backend": "ffmpeg-numpy",
    }


def resolve_ffmpeg() -> str | None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        return ffmpeg
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return None


def probe_media_duration(input_path: Path) -> float:
    ffmpeg = resolve_ffmpeg()
    if not ffmpeg or input_path.suffix.lower() not in MEDIA_SUFFIXES:
        return 0.0
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(input_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    text = (result.stderr or "") + (result.stdout or "")
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", text)
    if not match:
        return 0.0
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def normalize_bins(values: Any, bins: int) -> list[int]:
    import numpy as np

    array = np.asarray(values, dtype=float)
    if array.size == 0:
        return []
    chunks = np.array_split(array, bins)
    means = np.array([float(np.nanmean(chunk)) if chunk.size else 0.0 for chunk in chunks])
    low = float(np.nanmin(means))
    high = float(np.nanmax(means))
    if math.isclose(low, high):
        return [45 for _ in range(bins)]
    return [int(18 + ((value - low) / (high - low)) * 72) for value in means]


def estimate_tempo(rms: Any, frame_rate: float) -> float | None:
    import numpy as np

    values = np.asarray(rms, dtype=float)
    if values.size < 20:
        return None
    threshold = float(np.mean(values) + np.std(values) * 0.35)
    peaks = []
    for index in range(1, values.size - 1):
        if values[index] > threshold and values[index] >= values[index - 1] and values[index] >= values[index + 1]:
            peaks.append(index)
    if len(peaks) < 2:
        return None
    intervals = np.diff(peaks) / frame_rate
    intervals = intervals[(intervals > 0.25) & (intervals < 2.5)]
    if intervals.size == 0:
        return None
    return round(float(60.0 / np.median(intervals)), 2)


def estimate_pitch(samples: Any, sample_rate: int) -> float | None:
    import numpy as np

    if samples.size < sample_rate:
        return None
    step = max(1, samples.size // (sample_rate * 18))
    sample = samples[::step][: sample_rate * 18]
    window_size = min(sample_rate, sample.size)
    pitches = []
    for offset in range(0, max(1, sample.size - window_size), window_size):
        frame = sample[offset: offset + window_size]
        if frame.size < window_size // 2 or np.sqrt(np.mean(frame * frame)) < 0.01:
            continue
        frame = frame - np.mean(frame)
        corr = np.correlate(frame, frame, mode="full")[frame.size - 1:]
        min_lag = max(1, int(sample_rate / 800))
        max_lag = min(len(corr) - 1, int(sample_rate / 80))
        if max_lag <= min_lag:
            continue
        lag = int(np.argmax(corr[min_lag:max_lag]) + min_lag)
        if lag > 0:
            pitches.append(sample_rate / lag)
    if not pitches:
        return None
    return round(float(np.median(pitches)), 2)


def extract_keywords(title: str, transcript: str) -> list[str]:
    haystack = title + " " + transcript
    found = [term for term in DOMAIN_TERMS if term in haystack]
    if len(found) < 6:
        candidates = re.findall(r"[\u4e00-\u9fff]{2,6}", haystack)
        for token in candidates:
            if token not in found and token not in {"这段", "可以", "一个", "我们", "他们", "人物"}:
                found.append(token)
            if len(found) >= 8:
                break
    return found[:8] or ["越剧", "唱腔", "听戏辅助"]


def build_moments(segments: list[dict[str, Any]], has_transcript: bool) -> list[dict[str, str]]:
    if not has_transcript:
        return [
            {"time": seconds_to_stamp(segments[0]["start"]), "title": "本地视频导入", "text": "已读取本地 MP4，页面可展示这份分析结果。"},
            {"time": seconds_to_stamp(segments[1]["start"]), "title": "唱腔情绪曲线", "text": "已从音频能量、节奏峰值和粗略音高估计生成情绪走势。"},
            {"time": seconds_to_stamp(segments[2]["start"]), "title": "字幕待转写", "text": "安装 FunASR、Whisper 或 WhisperX 后，可替换为真实逐句字幕和关键词。"},
        ]

    indexes = sorted({0, len(segments) // 2, max(0, len(segments) - 1)})
    titles = ["唱段起势", "唱腔推进", "情绪收束"]
    moments = []
    for label, index in zip(titles, indexes):
        segment = segments[index]
        moments.append({
            "time": seconds_to_stamp(segment["start"]),
            "title": label,
            "text": f"字幕内容提示：{segment['text'][:54]}",
        })
    return moments


def build_summary(title: str, keywords: list[str], features: dict[str, Any], has_transcript: bool) -> str:
    analyzed = features.get("durationSeconds")
    total = features.get("mediaDurationSeconds")
    tempo = features.get("tempo")
    parts = [f"{title} 已接入本地视频分析。"]
    if analyzed and total and analyzed < total:
        parts.append(f"当前分析前 {seconds_to_stamp(analyzed)}，全片约 {seconds_to_stamp(total)}。")
    elif total:
        parts.append(f"全片约 {seconds_to_stamp(total)}。")
    if tempo:
        parts.append(f"节奏峰值估计约 {tempo} BPM。")
    if has_transcript:
        parts.append("已生成字幕、时间轴和关键词。")
    else:
        parts.append("当前已生成音频特征、情绪曲线和待转写时间轴；安装 ASR 后可补全真实字幕。")
    parts.append(f"关键词：{'、'.join(keywords[:5])}。")
    return "".join(parts)


def display_title(title: str) -> str:
    return title if title.startswith("《") else f"《{title}》"


def build_vocal_hint(keywords: list[str], features: dict[str, Any]) -> str:
    pitch = features.get("pitchMeanHz")
    pitch_text = f"粗略平均音高约 {pitch} Hz，" if pitch else ""
    backend = features.get("backend") or "音频特征"
    return f"{pitch_text}当前由 {backend} 计算能量曲线与节奏峰值；后续可结合拖腔长度、字词密度和流派标签判断唱腔走向。"


def build_scene_hint(input_path: Path, has_transcript: bool) -> str:
    asr_text = "字幕和语义标签已可参与剧情节点划分。" if has_transcript else "字幕尚未转写，先以本地文件名、剧目标题和音频特征生成导览。"
    return f"本地素材：{input_path.name}。{asr_text}后续还可接入镜头语义识别，识别服饰、身段、舞台调度与场景变化。"


def build_narrator_text(title: str, keywords: list[str], has_transcript: bool) -> str:
    suffix = "本段导览将围绕字幕、唱腔和情绪变化展开。" if has_transcript else "当前讲解先基于音频曲线和剧目信息生成，待字幕转写后可自动补充唱词讲解。"
    return f"欢迎收听{title}。本段关注{'、'.join(keywords[:4])}。{suffix}讲解员应使用授权或通用音色，不模仿真实演员声音。"


def build_ask_prompts(title: str, keywords: list[str]) -> list[str]:
    first = keywords[0] if keywords else "这段唱腔"
    return [
        f"{title} 的听戏重点是什么？",
        f"{first} 和唱腔情绪有什么关系？",
        "这段视频的节奏和能量曲线该怎么看？",
    ]


def make_curve_from_segments(segments: list[dict[str, Any]], bins: int) -> list[int]:
    if not segments:
        return [40 for _ in range(bins)]
    lengths = [len(segment["text"]) for segment in segments]
    while len(lengths) < bins:
        lengths.extend(lengths)
    return normalize_plain_values(lengths[:bins])


def normalize_plain_values(values: list[int]) -> list[int]:
    low = min(values)
    high = max(values)
    if low == high:
        return [45 for _ in values]
    return [int(24 + ((value - low) / (high - low)) * 60) for value in values]


def timestamps_to_range(timestamps: Any) -> tuple[float, float]:
    if not timestamps:
        return (0.0, 20.0)
    if isinstance(timestamps, list) and timestamps and isinstance(timestamps[0], list):
        return (parse_seconds(timestamps[0][0], 0.0, milliseconds=True), parse_seconds(timestamps[-1][-1], 20.0, milliseconds=True))
    if isinstance(timestamps, list) and len(timestamps) >= 2:
        return (parse_seconds(timestamps[0], 0.0, milliseconds=True), parse_seconds(timestamps[-1], 20.0, milliseconds=True))
    return (0.0, 20.0)


def parse_seconds(value: Any, default: float, milliseconds: bool = False) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number / 1000.0 if milliseconds and number > 100 else number


def seconds_to_stamp(seconds: float) -> str:
    seconds = max(0, float(seconds or 0))
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    remain = int(round(seconds % 60))
    if remain == 60:
        minutes += 1
        remain = 0
    if minutes == 60:
        hours += 1
        minutes = 0
    if hours:
        return f"{hours:02d}:{minutes:02d}:{remain:02d}"
    return f"{minutes:02d}:{remain:02d}"


def last_segment_end(segments: list[dict[str, Any]]) -> float:
    return max((float(segment.get("end", 0)) for segment in segments), default=0.0)


if __name__ == "__main__":
    main()
