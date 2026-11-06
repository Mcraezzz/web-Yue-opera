# 听戏辅助音视频智能化方案

本方案用于“经典剧目页”的 B 站视频与音频唱段：先对已获授权的素材做离线分析，再把结果写入后端接口 `/api/media-analyses`，前端直接展示字幕、时间轴、关键词、唱腔情绪曲线和数字讲解员文案。

## 处理流程

1. 素材准备
   - 使用已获授权的音视频文件，或仅处理站内自有/可二次加工的片段。
   - B 站嵌入视频可以继续用于播放，但字幕转写、二次讲解音频和完整唱词展示要确认版权边界。

2. ASR 字幕与关键词
   - 中文唱段优先试 `FunASR paraformer-zh`，适合普通话中文转写。
   - 需要多语言或英文混杂时可试 `Whisper`。
   - 需要更细粒度时间戳时可试 `WhisperX`，它侧重词级时间戳和对齐。
   - 输出内容包括 `captions`、`moments`、`keywords`，可直接进入页面“智能唱词时间轴”。

3. librosa 音频分析
   - 使用 `librosa.feature.rms` 分析能量。
   - 使用 `librosa.beat.beat_track` 估计节奏。
   - 使用 `librosa.pyin` 估计音高走向。
   - 将能量、节奏密度、音高变化归一化为 8 段 `emotionCurve`，用于“唱腔情绪曲线”。

4. CosyVoice 数字讲解员
   - 讲解员只做文化导览、剧情提示、听点说明，不复制真实演员的声线。
   - 只使用授权音色、站内自有音色或通用合成音色。
   - 生成后的音频地址写入 `narratorVoiceUrl`，页面会自动显示播放器。

## 本地生成示例

先用文字稿验证数据结构：

```bash
python scripts/generate-media-analysis.py \
  --engine transcript-only \
  --input ./authorized-transcript.txt \
  --title "《梁祝·十八相送》" \
  --media-type video \
  --bvid BV1WJ411T777 \
  --output ./dist/liangzhu-media-analysis.json
```

对本地 MP4 先做轻量音频分析，不安装大模型也能生成页面可读的数据：

```bash
python scripts/generate-media-analysis.py \
  --engine media-only \
  --input "C:/Users/22672/Downloads/梁山伯与祝英台(吴凤花.陈飞).mp4" \
  --title "《梁山伯与祝英台》(吴凤花·陈飞)" \
  --media-type video \
  --bvid BV1WJ411T777 \
  --max-audio-seconds 600 \
  --output ./data/media-analyses.json
```

接 FunASR：

```bash
pip install funasr modelscope librosa soundfile numpy
python scripts/generate-media-analysis.py \
  --engine funasr \
  --input ./authorized-liangzhu.wav \
  --title "《梁祝·十八相送》" \
  --media-type audio \
  --output ./dist/liangzhu-media-analysis.json
```

接 Whisper 或 WhisperX：

```bash
pip install openai-whisper librosa soundfile numpy
python scripts/generate-media-analysis.py --engine whisper --model small --input ./authorized.wav --title "《红楼梦·天上掉下个林妹妹》"

pip install whisperx librosa soundfile numpy
python scripts/generate-media-analysis.py --engine whisperx --model small --device cpu --input ./authorized.wav --title "袁派名段《祥林嫂·天生雪》"
```

## 推荐开源项目

- FunASR: https://github.com/modelscope/FunASR
- Whisper: https://github.com/openai/whisper
- WhisperX: https://github.com/m-bain/whisperX
- librosa: https://librosa.org/doc/latest/index.html
- CosyVoice: https://github.com/FunAudioLLM/CosyVoice

## 与当前代码的衔接

- 后端当前接口：`backend-spring/src/main/java/com/yueju/backend/controller/MediaAnalysisController.java`
- 数据结构：`backend-spring/src/main/java/com/yueju/backend/dto/MediaAnalysisDtos.java`
- 页面入口：`src/pages/Repertoire.tsx`
- 离线脚本：`scripts/generate-media-analysis.py`
- 本地生成数据：`data/media-analyses.json`

后端会优先读取 `data/media-analyses.json`，再合并内置示例数据。后续如果接数据库，可以把 `MediaAnalysisService` 中的 JSON 文件读取替换为表结构，前端不需要调整。
