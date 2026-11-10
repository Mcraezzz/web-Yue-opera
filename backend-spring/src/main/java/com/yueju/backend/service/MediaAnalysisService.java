package com.yueju.backend.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisRunRequest;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisRunResponse;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaCaption;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysis;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisItem;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaMoment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class MediaAnalysisService {

    private final ObjectMapper objectMapper;
    private final Path configuredAnalysisFile;
    private final Path configuredAnalysisScript;
    private final String pythonCommand;
    private final String defaultInputPath;
    private final java.util.concurrent.atomic.AtomicBoolean analysisRunning = new java.util.concurrent.atomic.AtomicBoolean();

    private static final List<MediaAnalysisItem> MEDIA_ANALYSES = List.of(
            new MediaAnalysisItem(
                    "《红楼梦·天上掉下个林妹妹》",
                    "video",
                    "03:45",
                    "BV1pQ4y1W7Wd",
                    new MediaAnalysis(
                            "宝黛初见的经典段落，画面语义集中在人物对视、礼仪动作和园林空间，适合展示越剧如何用唱腔表达“似曾相识”的细腻心理。",
                            "王派审美侧重含蓄、清雅和细腻咬字，旋律线条柔和，情绪从惊喜转向试探与怜惜。",
                            "可识别的视觉元素包括黛玉身段、宝玉折扇、园林布景、柔和侧光和古典服饰层次。",
                            "这段讲解建议使用温和、清晰的通用女性或中性音色，提示观众关注宝黛初见时的眼神、身段和唱腔转折。",
                            "",
                            List.of("宝黛初见", "王派韵味", "园林布景", "人物对视", "古典服饰"),
                            List.of(
                                    new MediaCaption("00:12", "00:34", "唱词大意：初见时心中惊讶，语气含蓄而带试探。"),
                                    new MediaCaption("01:08", "01:42", "唱词大意：人物情绪逐渐靠近，旋律线条转为柔和上行。"),
                                    new MediaCaption("02:36", "03:10", "唱词大意：惊喜被收束为怜惜，动作与声腔都趋于内敛。")
                            ),
                            List.of(
                                    new MediaMoment("00:12", "人物入场", "镜头建立园林空间，人物身段节奏较慢，强化初见前的含蓄气氛。"),
                                    new MediaMoment("01:08", "唱腔起句", "唱词进入人物心理，旋律以柔和上行为主，表现惊喜与试探。"),
                                    new MediaMoment("02:36", "情绪回收", "动作幅度收小，视线与身段转为内敛，适合讲解越剧的细腻抒情。")
                            ),
                            List.of(28, 42, 58, 73, 66, 54, 62, 48),
                            List.of("王派为什么适合表现林黛玉？", "宝黛初见的舞台调度有什么特点？", "这段唱腔如何表现人物心理？")
                    )
            ),
            new MediaAnalysisItem(
                    "《梁祝·十八相送》",
                    "video",
                    "05:20",
                    "BV1WJ411T777",
                    new MediaAnalysis(
                            "“十八相送”以送别路程串联情感递进，智能解析重点在二人行进路线、身段呼应和唱词中的隐喻表达。",
                            "唱腔以抒情和叙事交替推进，小生与旦角的声线形成问答式关系，情绪由明朗转向不舍。",
                            "画面中常见桥、水、路、书生行装等江南意象，可作为舞台空间与情感空间叠合的示例。",
                            "讲解员可用平稳的导览音色串联“起程、借景、离情”三段，帮助用户边听边理解唱词隐喻。",
                            "",
                            List.of("十八相送", "梁祝", "送别", "江南意象", "身段呼应"),
                            List.of(
                                    new MediaCaption("00:20", "00:50", "唱词大意：送别刚起程，二人情绪仍较明朗。"),
                                    new MediaCaption("02:18", "02:52", "唱词大意：借桥、水、路等意象表达不便明说的心事。"),
                                    new MediaCaption("04:42", "05:12", "唱词大意：离别临近，节奏放慢，不舍情绪明显加深。")
                            ),
                            List.of(
                                    new MediaMoment("00:20", "送别起程", "二人并行建立关系，步法和视线形成互相牵引。"),
                                    new MediaMoment("02:18", "隐喻递进", "唱词借景言情，语义识别重点落在桥、水、路等意象。"),
                                    new MediaMoment("04:42", "离情加深", "节奏趋缓，身体距离和唱腔停顿共同表现不舍。")
                            ),
                            List.of(36, 45, 51, 63, 70, 78, 72, 84),
                            List.of("十八相送为什么适合做越剧入门？", "梁祝中的江南意象有哪些？", "越剧如何用身段表现送别？")
                    )
            ),
            new MediaAnalysisItem(
                    "袁派名段《祥林嫂·天生雪》",
                    "audio",
                    "04:15",
                    "BV1Wx411u7N7",
                    new MediaAnalysis(
                            "该唱段适合做音频智能分析示例：不用画面也能通过声腔强弱、拖腔长度和节奏密度判断人物压抑处境。",
                            "袁派唱腔质朴醇厚，音色不追求外放华丽，而是通过稳定气口和低回旋律积累悲剧重量。",
                            "音频模式下可用声纹、能量和停顿自动生成“情绪章节”，再回连到《祥林嫂》的现实题材背景。",
                            "讲解员应避免模仿真实演员唱腔，只用授权通用音色解释“低声起势、拖腔加重、悲剧收束”的听点。",
                            "",
                            List.of("袁派", "祥林嫂", "现实题材", "悲剧意识", "音频识别"),
                            List.of(
                                    new MediaCaption("00:18", "00:48", "唱词大意：低声起势，人物处境压抑。"),
                                    new MediaCaption("01:46", "02:22", "唱词大意：拖腔加重，悲剧感持续累积。"),
                                    new MediaCaption("03:28", "04:00", "唱词大意：尾句力度回落，情绪转为沉郁收束。")
                            ),
                            List.of(
                                    new MediaMoment("00:18", "低声起势", "能量较低，适合标注人物压抑状态。"),
                                    new MediaMoment("01:46", "拖腔加重", "长音和停顿增多，情绪识别为沉郁上升。"),
                                    new MediaMoment("03:28", "悲剧收束", "尾句力度回落，形成命运感较强的结束。")
                            ),
                            List.of(24, 31, 49, 58, 76, 82, 69, 55),
                            List.of("袁派唱腔有什么特点？", "《祥林嫂》为什么是越剧改革重要作品？", "音频如何识别唱段情绪？")
                    )
            ),
            new MediaAnalysisItem(
                    "尹派名段《何文秀·算命》",
                    "audio",
                    "06:30",
                    "BV1ud4y1s7mJ",
                    new MediaAnalysis(
                            "该段适合展示小生音频分析：系统可从吐字、节奏和音区变化识别尹派儒雅、深沉、舒展的声腔气质。",
                            "尹派小生行腔流畅舒展，字头清晰，情绪不急不露，常以克制方式呈现人物机智与深情。",
                            "虽然是音频唱段，也可根据唱词主题提取“身份试探、机智应对、情节反转”等语义标签。",
                            "讲解员可采用沉稳的授权通用音色，重点解释小生唱段的字头、节奏和叙事推进，不进行真实演员声音复刻。",
                            "",
                            List.of("尹派", "小生", "何文秀", "算命", "节奏识别"),
                            List.of(
                                    new MediaCaption("00:36", "01:04", "唱词大意：先交代人物身份与处境，节奏较平稳。"),
                                    new MediaCaption("02:55", "03:34", "唱词大意：语速和字词密度增加，剧情进入试探。"),
                                    new MediaCaption("05:40", "06:12", "唱词大意：声线转为舒展，人物情绪由机变转向深情。")
                            ),
                            List.of(
                                    new MediaMoment("00:36", "叙事铺垫", "节奏较稳，语义重点在人物身份与处境交代。"),
                                    new MediaMoment("02:55", "机智试探", "字词密度增加，适合标记为剧情推进段。"),
                                    new MediaMoment("05:40", "情绪回望", "声线舒展，人物情绪由机变转向深情。")
                            ),
                            List.of(32, 38, 46, 62, 71, 65, 58, 68),
                            List.of("尹派小生和范派小生有什么区别？", "《何文秀》适合分析哪些唱腔特点？", "如何从节奏判断唱段情绪？")
                    )
            )
    );

    public MediaAnalysisService(
            @Value("${yueju.media.analysis-file:../data/media-analyses.json}") String analysisFile,
            @Value("${yueju.media.analysis-script:../scripts/generate-media-analysis.py}") String analysisScript,
            @Value("${yueju.media.python:python}") String pythonCommand,
            @Value("${yueju.media.default-input:public/videos/liangzhu.mp4}") String defaultInputPath
    ) {
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.configuredAnalysisFile = Path.of(analysisFile);
        this.configuredAnalysisScript = Path.of(analysisScript);
        this.pythonCommand = pythonCommand;
        this.defaultInputPath = defaultInputPath;
    }

    public List<MediaAnalysisItem> getMediaAnalyses() {
        List<MediaAnalysisItem> externalItems = readExternalMediaAnalyses();
        if (externalItems.isEmpty()) {
            return MEDIA_ANALYSES;
        }

        Map<String, MediaAnalysisItem> merged = new LinkedHashMap<>();
        for (MediaAnalysisItem item : externalItems) {
            merged.put(item.title(), item);
        }
        for (MediaAnalysisItem item : MEDIA_ANALYSES) {
            merged.putIfAbsent(item.title(), item);
        }
        return List.copyOf(merged.values());
    }

    public MediaAnalysisRunResponse analyzeLocalMedia(MediaAnalysisRunRequest request) {
        Path analysisFile = resolveAnalysisFile();
        Path script = resolveProjectPath(configuredAnalysisScript);
        Path logFile = analysisFile.getParent().resolve("media-analysis-run.log");
        String inputPath = textOrDefault(request.inputPath(), defaultInputPath);
        String title = textOrDefault(request.title(), "《梁山伯与祝英台》(吴凤花·陈飞)");
        String engine = textOrDefault(request.engine(), "funasr");
        int maxAsrSeconds = positiveOrDefault(request.maxAsrSeconds(), 300);
        int maxAudioSeconds = positiveOrDefault(request.maxAudioSeconds(), 600);
        int maxCaptions = positiveOrDefault(request.maxCaptions(), 12);

        if (!analysisRunning.compareAndSet(false, true)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "已有媒体分析任务正在运行");
        }
        Process process = null;
        try {
            Files.createDirectories(analysisFile.getParent());
            ProcessBuilder processBuilder = new ProcessBuilder(
                    pythonCommand,
                    script.toString(),
                    "--engine", engine,
                    "--input", inputPath,
                    "--title", title,
                    "--media-type", "video",
                    "--bvid", "BV1WJ411T777",
                    "--max-asr-seconds", String.valueOf(maxAsrSeconds),
                    "--max-audio-seconds", String.valueOf(maxAudioSeconds),
                    "--curve-bins", "16",
                    "--max-captions", String.valueOf(maxCaptions),
                    "--output", analysisFile.toString()
            );
            processBuilder.directory(projectRoot().toFile());
            processBuilder.redirectErrorStream(true);
            processBuilder.redirectOutput(ProcessBuilder.Redirect.to(logFile.toFile()));

            process = processBuilder.start();
            boolean finished = process.waitFor(20, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                return new MediaAnalysisRunResponse(false, "模型分析超过 20 分钟，已停止。", logFile.toString(), getMediaAnalyses());
            }
            if (process.exitValue() != 0) {
                return new MediaAnalysisRunResponse(false, "模型分析失败，详见日志：" + tailLog(logFile), logFile.toString(), getMediaAnalyses());
            }
            return new MediaAnalysisRunResponse(true, "模型分析完成，已生成字幕、时间轴、关键词与唱腔情绪曲线。", logFile.toString(), getMediaAnalyses());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return new MediaAnalysisRunResponse(false, "模型分析被中断。", logFile.toString(), getMediaAnalyses());
        } catch (Exception ex) {
            return new MediaAnalysisRunResponse(false, "模型分析启动失败：" + ex.getMessage(), logFile.toString(), getMediaAnalyses());
        } finally {
            if (process != null && process.isAlive()) process.destroyForcibly();
            analysisRunning.set(false);
        }
    }

    private List<MediaAnalysisItem> readExternalMediaAnalyses() {
        Path analysisFile = resolveAnalysisFile();
        if (!Files.isRegularFile(analysisFile)) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(analysisFile.toFile());
            List<MediaAnalysisItem> items = new ArrayList<>();
            if (root.has("items") && root.get("items").isArray()) {
                for (JsonNode itemNode : root.get("items")) {
                    items.add(objectMapper.treeToValue(itemNode, MediaAnalysisItem.class));
                }
            } else if (root.isArray()) {
                for (JsonNode itemNode : root) {
                    items.add(objectMapper.treeToValue(itemNode, MediaAnalysisItem.class));
                }
            } else if (root.has("title")) {
                items.add(objectMapper.treeToValue(root, MediaAnalysisItem.class));
            }
            return items.stream()
                    .filter(item -> item.title() != null && !item.title().isBlank())
                    .toList();
        } catch (IOException | IllegalArgumentException ex) {
            System.err.println("Failed to read media analysis file " + analysisFile + ": " + ex.getMessage());
            return List.of();
        }
    }

    private Path resolveAnalysisFile() {
        if (configuredAnalysisFile.isAbsolute()) {
            return configuredAnalysisFile.normalize();
        }

        Path cwd = Path.of("").toAbsolutePath();
        List<Path> candidates = List.of(
                cwd.resolve(configuredAnalysisFile).normalize(),
                cwd.resolve("data/media-analyses.json").normalize(),
                cwd.resolve("../data/media-analyses.json").normalize()
        );
        return candidates.stream()
                .filter(Files::isRegularFile)
                .findFirst()
                .orElse(candidates.get(0));
    }

    private Path resolveProjectPath(Path configuredPath) {
        if (configuredPath.isAbsolute()) {
            return configuredPath.normalize();
        }
        Path cwd = Path.of("").toAbsolutePath();
        return List.of(
                        cwd.resolve(configuredPath).normalize(),
                        projectRoot().resolve(configuredPath).normalize(),
                        projectRoot().resolve(configuredPath.getFileName()).normalize()
                ).stream()
                .filter(Files::isRegularFile)
                .findFirst()
                .orElse(cwd.resolve(configuredPath).normalize());
    }

    private Path projectRoot() {
        Path cwd = Path.of("").toAbsolutePath();
        if (cwd.getFileName() != null && "backend-spring".equals(cwd.getFileName().toString())) {
            return cwd.getParent();
        }
        return cwd;
    }

    private String textOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private int positiveOrDefault(Integer value, int fallback) {
        return value == null || value <= 0 ? fallback : value;
    }

    private String tailLog(Path logFile) {
        try {
            if (!Files.isRegularFile(logFile)) {
                return "";
            }
            List<String> lines = Files.readAllLines(logFile);
            return String.join(" ", lines.subList(Math.max(0, lines.size() - 6), lines.size()));
        } catch (Exception ex) {
            return "";
        }
    }
}
