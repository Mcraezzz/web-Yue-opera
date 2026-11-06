package com.yueju.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yueju.backend.dto.AiDtos.ChatMessage;
import com.yueju.backend.dto.AiDtos.ImageHistoryItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.sql.Statement;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);
    private static final int CHAT_CACHE_LIMIT = 200;
    private static final int STREAM_TIMEOUT_SECONDS = 300;
    private static final String CHAT_INSTRUCTIONS = """
            你是“越韵清音”网站的越剧讲解助手。
            回答要准确、温和、自然，优先围绕越剧历史、经典剧目、流派、唱腔、舞台美学和网站功能。
            如果输入中包含“站内知识片段”，请优先依据这些片段回答；片段不足时说明“站内资料有限”，再补充通用常识。
            """;
    private static final String VISION_INSTRUCTIONS = """
            你是“越韵清音”网站的越剧图像识别与导览助手。
            识别图片时要优先观察越剧相关线索：人物行当、服饰头面、水袖身段、舞台布景、画面文字、可能剧目和流派气质。
            不能确定的剧目、演员或流派必须说明“仅为推测”，不要把不确定信息说成事实。
            回答要适合文化展示网站使用，结构清晰、语气温和，并给出用户可以继续追问的方向。
            """;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;
    private final String apiBase;
    private final String apiKey;
    private final String chatModel;
    private final String visionModel;
    private final String imageModel;
    private final Map<String, Object> thinkingOptions;
    private final int chatTimeoutSeconds;
    private final int visionTimeoutSeconds;
    private final long chatCacheSeconds;
    private final Path imageStorageDir;
    private final Map<String, CachedReply> chatCache = new ConcurrentHashMap<>();
    private final JdbcTemplate jdbcTemplate;
    private final KnowledgeSearchService knowledgeSearchService;

    public AiService(
            @Value("${yueju.ai.api-base}") String apiBase,
            @Value("${yueju.ai.api-key}") String apiKey,
            @Value("${yueju.ai.chat-model}") String chatModel,
            @Value("${yueju.ai.vision-model}") String visionModel,
            @Value("${yueju.ai.image-model}") String imageModel,
            @Value("${yueju.ai.thinking-type}") String thinkingType,
            @Value("${yueju.ai.chat-max-output-tokens}") int ignoredChatMaxOutputTokens,
            @Value("${yueju.ai.chat-timeout-seconds}") int chatTimeoutSeconds,
            @Value("${yueju.ai.vision-timeout-seconds}") int visionTimeoutSeconds,
            @Value("${yueju.ai.chat-cache-seconds}") long chatCacheSeconds,
            @Value("${yueju.ai.image-storage-dir}") String imageStorageDir,
            JdbcTemplate jdbcTemplate,
            KnowledgeSearchService knowledgeSearchService
    ) {
        this.apiBase = trimTrailingSlash(apiBase);
        this.apiKey = apiKey == null ? "" : apiKey;
        this.chatModel = chatModel;
        this.visionModel = visionModel == null || visionModel.isBlank() ? chatModel : visionModel;
        this.imageModel = imageModel;
        this.thinkingOptions = Map.of("type", normalizeThinkingType(thinkingType));
        this.chatTimeoutSeconds = Math.max(30, Math.min(chatTimeoutSeconds, 240));
        this.visionTimeoutSeconds = Math.max(60, Math.min(visionTimeoutSeconds, 360));
        this.chatCacheSeconds = Math.max(0, chatCacheSeconds);
        this.imageStorageDir = Path.of(imageStorageDir == null || imageStorageDir.isBlank() ? "generated-ai-images" : imageStorageDir)
                .toAbsolutePath()
                .normalize();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        this.jdbcTemplate = jdbcTemplate;
        this.knowledgeSearchService = knowledgeSearchService;
    }

    public String chat(long userId, String text) {
        String message = cleanMessage(text);
        String ragContext = knowledgeSearchService.buildEnhancedRagContext(message, 5);

        String reply = "";
        if (isConfigured()) {
            try {
                reply = callChatModel(message, ragContext);
            } catch (AiUpstreamException ex) {
                log.warn("RAG AI chat failed, using local knowledge fallback: {}", ex.getMessage());
                reply = localChatReply(message, ragContext);
            }
        } else {
            log.warn("AI chat skipped because VOLCENGINE_API_KEY is not configured");
        }

        String finalReply = reply == null || reply.isBlank()
                ? localChatReply(message, ragContext)
                : reply.trim();
        saveChat(userId, message, finalReply);
        return finalReply;
    }

    public void streamChat(long userId, String text, OutputStream outputStream) {
        String message = cleanMessage(text);
        String ragContext = knowledgeSearchService.buildEnhancedRagContext(message, 5);

        StringBuilder reply = new StringBuilder();
        if (isConfigured()) {
            try {
                streamRemoteChat(message, ragContext, outputStream, reply);
            } catch (AiUpstreamException ex) {
                log.warn("RAG AI stream failed, using local knowledge fallback: {}", ex.getMessage());
                appendStreamText(outputStream, reply, localChatReply(message, ragContext));
            }
        } else {
            log.warn("AI stream skipped because VOLCENGINE_API_KEY is not configured");
            appendStreamText(outputStream, reply, localChatReply(message, ragContext));
        }

        String finalReply = reply.toString().trim();
        if (finalReply.isBlank()) {
            appendStreamText(outputStream, reply, localChatReply(message, ragContext));
            finalReply = reply.toString().trim();
        }
        saveChat(userId, message, finalReply);
    }

    public String vision(long userId, String text, String imageDataUrl, String prompt) {
        String message = text == null || text.isBlank() ? "请识别这张越剧相关图片。" : text.trim();
        String image = cleanImageDataUrl(imageDataUrl);
        String frontPrompt = cleanVisionPrompt(prompt);

        String reply = "";
        if (isConfigured()) {
            try {
                reply = callVisionModel(message, image, frontPrompt);
            } catch (AiUpstreamException ex) {
                log.warn("AI vision request failed, using local fallback: {}", ex.getMessage());
            }
        } else {
            log.warn("AI vision skipped because VOLCENGINE_API_KEY is not configured");
        }

        String finalReply = reply == null || reply.isBlank()
                ? localVisionReply(message, frontPrompt)
                : reply.trim();
        saveChat(userId, "【上传图片识别】" + message, finalReply);
        return finalReply;
    }

    @SuppressWarnings("unchecked")
    public GeneratedImageResult image(long userId, String prompt, String displayPrompt) {
        String text = prompt == null ? "" : prompt.trim();
        if (text.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入图片描述");
        }
        ensureConfigured();

        Map<String, Object> payload = Map.of(
                "model", imageModel,
                "prompt", text,
                "sequential_image_generation", "disabled",
                "response_format", "url",
                "size", "2K",
                "stream", false,
                "watermark", true
        );

        Map<String, Object> data;
        try {
            data = callWithRetry("/images/generations", payload, 90, 2);
        } catch (AiUpstreamException ex) {
            log.warn("AI image request failed: {}", ex.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "AI 生图服务连接不稳定，请稍后重试，或先使用 AI 问答功能。"
            );
        }

        Object items = data.get("data");
        if (items instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> first) {
            Object url = ((Map<String, Object>) first).get("url");
            if (url instanceof String imageUrl && !imageUrl.isBlank()) {
                String savedPrompt = displayPrompt == null || displayPrompt.isBlank() ? text : displayPrompt.trim();
                String persistedImageUrl = persistGeneratedImage(imageUrl);
                KeyHolder keyHolder = new GeneratedKeyHolder();
                jdbcTemplate.update(connection -> {
                    var statement = connection.prepareStatement(
                            "INSERT INTO ai_image_generations (user_id, prompt, final_prompt, image_url) VALUES (?, ?, ?, ?)",
                            Statement.RETURN_GENERATED_KEYS
                    );
                    statement.setLong(1, userId);
                    statement.setString(2, savedPrompt);
                    statement.setString(3, text);
                    statement.setString(4, persistedImageUrl);
                    return statement;
                }, keyHolder);
                Number key = keyHolder.getKey();
                return new GeneratedImageResult(key == null ? null : key.longValue(), persistedImageUrl);
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 生图服务暂未返回图片，请稍后重试。");
    }

    public List<ChatMessage> chatHistory(long userId) {
        return jdbcTemplate.query("""
                SELECT role, content, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
                FROM (
                  SELECT id, role, content, created_at
                  FROM ai_chat_messages
                  WHERE user_id = ?
                  ORDER BY created_at DESC, id DESC
                  LIMIT 100
                ) recent
                ORDER BY created_at ASC, id ASC
                """, (rs, rowNum) -> new ChatMessage(
                rs.getString("role"),
                rs.getString("content"),
                rs.getString("created_at")
        ), userId);
    }

    public void clearChatHistory(long userId) {
        jdbcTemplate.update("DELETE FROM ai_chat_messages WHERE user_id = ?", userId);
    }

    public List<ImageHistoryItem> imageHistory(long userId) {
        return jdbcTemplate.query("""
                SELECT id, prompt, image_url, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
                FROM ai_image_generations
                WHERE user_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 50
                """, (rs, rowNum) -> new ImageHistoryItem(
                rs.getLong("id"),
                rs.getString("prompt"),
                rs.getString("image_url"),
                rs.getString("created_at")
        ), userId);
    }

    public void clearImageHistory(long userId) {
        List<String> imageUrls = jdbcTemplate.queryForList(
                "SELECT image_url FROM ai_image_generations WHERE user_id = ?",
                String.class,
                userId
        );
        jdbcTemplate.update("DELETE FROM ai_image_generations WHERE user_id = ?", userId);
        imageUrls.forEach(this::deletePersistedImage);
    }

    public void deleteImageHistoryItem(long userId, long imageId) {
        List<String> imageUrls = jdbcTemplate.queryForList(
                "SELECT image_url FROM ai_image_generations WHERE user_id = ? AND id = ? LIMIT 1",
                String.class,
                userId,
                imageId
        );
        if (imageUrls.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "图片历史记录不存在");
        }

        int deleted = jdbcTemplate.update(
                "DELETE FROM ai_image_generations WHERE user_id = ? AND id = ?",
                userId,
                imageId
        );
        if (deleted > 0) {
            deletePersistedImage(imageUrls.get(0));
        }
    }

    public Path resolveGeneratedImage(String fileName) {
        String safeName = fileName == null ? "" : fileName.trim();
        if (!safeName.matches("[a-zA-Z0-9._-]+")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "图片不存在");
        }

        Path imagePath = imageStorageDir.resolve(safeName).normalize();
        if (!imagePath.startsWith(imageStorageDir) || !Files.isRegularFile(imagePath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "图片不存在");
        }
        return imagePath;
    }

    private String persistGeneratedImage(String remoteUrl) {
        try {
            Files.createDirectories(imageStorageDir);
            HttpRequest request = HttpRequest.newBuilder(URI.create(remoteUrl))
                    .timeout(Duration.ofSeconds(45))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300 || response.body().length == 0) {
                log.warn("AI image download failed with status {}, using remote url", response.statusCode());
                return remoteUrl;
            }

            String contentType = response.headers().firstValue("content-type").orElse("");
            String extension = imageExtension(contentType, remoteUrl);
            String fileName = "ai-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10) + extension;
            Files.write(imageStorageDir.resolve(fileName), response.body());
            return "/api/ai/image/file/" + fileName;
        } catch (Exception ex) {
            log.warn("AI image persistence failed, using remote url: {}", ex.getMessage());
            return remoteUrl;
        }
    }

    private String imageExtension(String contentType, String imageUrl) {
        String normalizedType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (normalizedType.contains("png")) return ".png";
        if (normalizedType.contains("webp")) return ".webp";
        if (normalizedType.contains("gif")) return ".gif";
        if (normalizedType.contains("jpeg") || normalizedType.contains("jpg")) return ".jpg";

        String path = URI.create(imageUrl).getPath().toLowerCase(Locale.ROOT);
        if (path.endsWith(".png")) return ".png";
        if (path.endsWith(".webp")) return ".webp";
        if (path.endsWith(".gif")) return ".gif";
        return ".jpg";
    }

    private void deletePersistedImage(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith("/api/ai/image/file/")) return;
        String fileName = imageUrl.substring("/api/ai/image/file/".length()).trim();
        if (!fileName.matches("[a-zA-Z0-9._-]+")) return;

        try {
            Path imagePath = imageStorageDir.resolve(fileName).normalize();
            if (imagePath.startsWith(imageStorageDir)) {
                Files.deleteIfExists(imagePath);
            }
        } catch (IOException ex) {
            log.warn("Failed to delete generated image file {}: {}", fileName, ex.getMessage());
        }
    }

    public record GeneratedImageResult(Long id, String imageUrl) {
    }

    private String callChatWithRagFallback(String message) {
        String ragContext = knowledgeSearchService.buildEnhancedRagContext(message, 5);
        try {
            return callChatModel(message, ragContext);
        } catch (AiUpstreamException ex) {
            log.warn("RAG AI chat failed, using local knowledge fallback: {}", ex.getMessage());
            return localChatReply(message, ragContext);
        }
    }

    private void streamChatWithRagFallback(String message, OutputStream outputStream, StringBuilder reply) {
        String ragContext = knowledgeSearchService.buildEnhancedRagContext(message, 5);
        if (!reply.isEmpty()) {
            appendStreamText(outputStream, reply, "\n\n（模型连接中断，以下根据站内知识继续补充。）\n");
        }
        try {
            streamRemoteChat(message, ragContext, outputStream, reply);
        } catch (AiUpstreamException ex) {
            log.warn("RAG AI stream failed, using local knowledge fallback: {}", ex.getMessage());
            String fallback = localChatReply(message, ragContext);
            if (!reply.isEmpty()) {
                appendStreamText(outputStream, reply, "\n\n");
            }
            appendStreamText(outputStream, reply, fallback);
        }
    }

    private void streamLocalReply(String message, OutputStream outputStream, StringBuilder reply) {
        String ragContext = knowledgeSearchService.buildEnhancedRagContext(message, 5);
        appendStreamText(outputStream, reply, localChatReply(message, ragContext));
    }

    private String callChatModel(String message, String ragContext) {
        String inputText = buildUserFirstRagPrompt(message, ragContext);
        Map<String, Object> responsesPayload = Map.of(
                "model", chatModel,
                "instructions", CHAT_INSTRUCTIONS,
                "input", List.of(Map.of(
                        "role", "user",
                        "content", List.of(Map.of("type", "input_text", "text", inputText))
                )),
                "thinking", thinkingOptions
        );

        try {
            String reply = pickText(callWithRetry("/responses", responsesPayload, chatTimeoutSeconds, 1));
            if (reply != null && !reply.isBlank()) {
                return reply;
            }
            log.warn("AI responses endpoint returned empty text");
        } catch (AiUpstreamException ex) {
            log.warn("AI responses endpoint failed: {}", ex.getMessage());
        }

        Map<String, Object> completionsPayload = Map.of(
                "model", chatModel,
                "messages", List.of(
                        Map.of("role", "system", "content", CHAT_INSTRUCTIONS),
                        Map.of("role", "user", "content", inputText)
                ),
                "temperature", 0.7,
                "thinking", thinkingOptions
        );

        return pickText(callWithRetry("/chat/completions", completionsPayload, chatTimeoutSeconds, 1));
    }

    private String callVisionModel(String message, String imageDataUrl, String frontPrompt) {
        String inputText = buildVisionPrompt(message, frontPrompt);
        Map<String, Object> responsesPayload = Map.of(
                "model", visionModel,
                "instructions", VISION_INSTRUCTIONS,
                "input", List.of(Map.of(
                        "role", "user",
                        "content", List.of(
                                Map.of("type", "input_text", "text", inputText),
                                Map.of("type", "input_image", "image_url", imageDataUrl)
                        )
                )),
                "thinking", thinkingOptions
        );

        try {
            String reply = pickText(callWithRetry("/responses", responsesPayload, visionTimeoutSeconds, 1));
            if (reply != null && !reply.isBlank()) {
                return reply;
            }
            log.warn("AI vision responses endpoint returned empty text");
        } catch (AiUpstreamException ex) {
            log.warn("AI vision responses endpoint failed: {}", ex.getMessage());
        }

        Map<String, Object> completionsPayload = Map.of(
                "model", visionModel,
                "messages", List.of(
                        Map.of("role", "system", "content", VISION_INSTRUCTIONS),
                        Map.of(
                                "role", "user",
                                "content", List.of(
                                        Map.of("type", "text", "text", inputText),
                                        Map.of("type", "image_url", "image_url", Map.of("url", imageDataUrl))
                                )
                        )
                ),
                "temperature", 0.35,
                "thinking", thinkingOptions
        );

        return pickText(callWithRetry("/chat/completions", completionsPayload, visionTimeoutSeconds, 1));
    }

    private void streamRemoteChat(
            String message,
            String ragContext,
            OutputStream outputStream,
            StringBuilder reply
    ) {
        String inputText = buildUserFirstRagPrompt(message, ragContext);
        Map<String, Object> payload = Map.of(
                "model", chatModel,
                "messages", List.of(
                        Map.of("role", "system", "content", CHAT_INSTRUCTIONS),
                        Map.of("role", "user", "content", inputText)
                ),
                "temperature", 0.7,
                "thinking", thinkingOptions,
                "stream", true
        );

        HttpResponse<java.io.InputStream> response = sendStreamRequest("/chat/completions", payload);
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String errorBody = readBody(response.body());
            throw new AiUpstreamException(extractError(parseErrorBody(errorBody)), isRetryableStatus(response.statusCode()));
        }

        boolean sawText = false;
        boolean finished = false;
        String eventName = "";
        StringBuilder eventData = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) {
                    StreamEventResult result = handleStreamEvent(eventName, eventData.toString(), outputStream, reply);
                    sawText = sawText || result.sawText();
                    if (result.done()) {
                        finished = true;
                        break;
                    }
                    eventName = "";
                    eventData.setLength(0);
                    continue;
                }

                if (trimmed.startsWith(":")) {
                    continue;
                }

                if (trimmed.startsWith("event:")) {
                    eventName = trimmed.substring(6).trim();
                    continue;
                }

                if (trimmed.startsWith("data:")) {
                    if (!eventData.isEmpty()) {
                        eventData.append('\n');
                    }
                    eventData.append(trimmed.substring(5).trim());
                }
            }

            if (!finished && (!eventName.isBlank() || !eventData.isEmpty())) {
                StreamEventResult result = handleStreamEvent(eventName, eventData.toString(), outputStream, reply);
                sawText = sawText || result.sawText();
            }
        } catch (AiUpstreamException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiUpstreamException("AI 流式响应解析失败", true);
        }

        if (!sawText) {
            throw new AiUpstreamException("AI 流式响应为空", true);
        }
    }

    private HttpResponse<java.io.InputStream> sendStreamRequest(String pathname, Map<String, Object> payload) {
        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder(URI.create(apiBase + pathname))
                    .timeout(Duration.ofSeconds(STREAM_TIMEOUT_SECONDS))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            return httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        } catch (HttpTimeoutException ex) {
            throw new AiUpstreamException("AI 服务响应超时", true);
        } catch (IOException ex) {
            throw new AiUpstreamException("AI 服务暂时无法连接", true);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new AiUpstreamException("AI 请求被中断", false);
        } catch (Exception ex) {
            throw new AiUpstreamException("AI 流式请求失败", true);
        }
    }

    private String buildRagPrompt(String message, String ragContext) {
        if (ragContext == null || ragContext.isBlank()) {
            return "用户问题：" + message;
        }
        return """
                站内知识片段：
                %s

                用户问题：%s

                请先依据站内知识片段回答。若答案涉及片段中的剧目、人物、流派或新闻，可自然提示对应站内入口。
                """.formatted(ragContext, message);
    }

    private String buildUserFirstRagPrompt(String message, String ragContext) {
        if (ragContext == null || ragContext.isBlank()) {
            return "用户问题：" + message;
        }
        return """
                站内资料（用于核验、引用和入口推荐，不要在正文开头照抄）：
                %s

                用户问题：
                %s

                请严格按以下顺序回答：
                1. 先输出【AI 综合回答】，用自然、完整的聊天式回答直接回答用户问题，要有归纳、解释或判断；不要以“我先根据站内知识库”“根据资料显示”开头，也不要照抄资料第一条。
                2. 正文回答之后追加【站内资料引用】，列出 1-3 条最相关资料，格式为“【出处：标题/来源】说明该资料支持了哪一点”。
                3. 再追加【相关入口】，列出对应站内路径，并说明入口用途，例如 /repertoire（经典剧目与唱段）、/schools（名家流派）、/scroll（越剧长卷）、/news（新闻资讯）。
                4. 如果资料中出现相关剧目或流派，再追加【相关剧目】和【相关流派】；没有明确资料时写“暂无明确资料”。
                5. 不要编造未出现在站内资料中的出处、演员、流派或入口。
                """.formatted(ragContext, message);
    }

    private String buildEnhancedRagPrompt(String message, String ragContext) {
        if (ragContext == null || ragContext.isBlank()) {
            return "用户问题：" + message;
        }
        return """
                站内知识库检索结果：
                %s

                用户问题：%s

                请优先依据“站内知识库检索结果”回答，不要只泛泛聊天。
                回答要求：
                1. 先用自然语言回答用户问题；
                2. 重要事实后用【出处：标题/来源】标明依据；
                3. 文末固定给出三栏：
                   【相关剧目】列出最相关剧目，没有就写“暂无明确剧目”；
                   【相关流派】列出相关流派或行当，没有就写“暂无明确流派”；
                   【继续阅读】列出站内入口路径，例如 /repertoire、/schools、/scroll、/news。
                """.formatted(ragContext, message);
    }

    private String buildVisionPrompt(String message, String frontPrompt) {
        return """
                前置 Prompt：
                %s

                用户问题：
                %s

                请结合图片内容输出：
                1. 画面中可确认的主要内容；
                2. 可能的越剧元素，包括行当、服饰、头面、身段、舞台布景或画面文字；
                3. 可推测但不确定的剧目、流派或表演场景；
                4. 一段适合网站“AI 问戏”界面的文化导览说明。
                """.formatted(frontPrompt, message);
    }

    private Map<String, Object> callWithRetry(
            String pathname,
            Map<String, Object> payload,
            int timeoutSeconds,
            int attempts
    ) {
        int maxAttempts = Math.max(1, attempts);
        AiUpstreamException lastError = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return callOnce(pathname, payload, timeoutSeconds);
            } catch (AiUpstreamException ex) {
                lastError = ex;
                if (attempt >= maxAttempts || !ex.retryable()) {
                    throw ex;
                }
                sleepBeforeRetry(attempt);
            }
        }
        throw lastError == null ? new AiUpstreamException("AI 服务请求失败", false) : lastError;
    }

    private Map<String, Object> callOnce(String pathname, Map<String, Object> payload, int timeoutSeconds) {
        String body;
        try {
            body = objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            throw new AiUpstreamException("AI 请求参数生成失败", false);
        }

        HttpRequest request = HttpRequest.newBuilder(URI.create(apiBase + pathname))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (HttpTimeoutException ex) {
            throw new AiUpstreamException("AI 服务响应超时", false);
        } catch (IOException ex) {
            throw new AiUpstreamException("AI 服务暂时无法连接", true);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new AiUpstreamException("AI 请求被中断", false);
        }

        Map<String, Object> data = parseResponseBody(response.body(), response.statusCode());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new AiUpstreamException(extractError(data), isRetryableStatus(response.statusCode()));
        }
        return data;
    }

    private Map<String, Object> parseResponseBody(String body, int statusCode) {
        if (body == null || body.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(body, new TypeReference<>() {
            });
        } catch (Exception ex) {
            String type = body.trim().startsWith("<") ? "HTML" : "非 JSON";
            throw new AiUpstreamException("AI 服务返回了" + type + "响应，状态码 " + statusCode, isRetryableStatus(statusCode));
        }
    }

    private Map<String, Object> parseErrorBody(String body) {
        if (body == null || body.isBlank()) {
            return Map.of("message", "AI 服务请求失败");
        }
        try {
            return objectMapper.readValue(body, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return Map.of("message", limitError(body));
        }
    }

    private String readBody(java.io.InputStream body) {
        if (body == null) return "";
        try {
            return new String(body.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return "";
        }
    }

    private void saveChat(long userId, String message, String reply) {
        jdbcTemplate.update(
                "INSERT INTO ai_chat_messages (user_id, role, content) VALUES (?, ?, ?), (?, ?, ?)",
                userId, "user", message,
                userId, "assistant", reply
        );
    }

    private String cleanMessage(String text) {
        String message = text == null ? "" : text.trim();
        if (message.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入问题");
        }
        return message;
    }

    private String normalizeThinkingType(String value) {
        String type = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (type) {
            case "enabled", "auto" -> type;
            default -> "disabled";
        };
    }

    private String cleanImageDataUrl(String imageDataUrl) {
        String image = imageDataUrl == null ? "" : imageDataUrl.trim();
        if (image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请先上传图片");
        }
        if (!image.startsWith("data:image/") || !image.contains(";base64,")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "图片格式不正确，请上传 JPG、PNG 或 WebP 图片");
        }
        if (image.length() > 12_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "图片过大，请压缩到 8MB 以内后再上传");
        }
        return image;
    }

    private String cleanVisionPrompt(String prompt) {
        String value = prompt == null ? "" : prompt.trim();
        if (value.isEmpty()) {
            return "请作为越剧文化图像识别助手，识别图片中的人物、服饰、头面、水袖身段、舞台布景、文字字幕、可能剧目与流派线索；先说明能确认的内容，再说明不确定推测。";
        }
        return value.length() > 1200 ? value.substring(0, 1200) : value;
    }

    private String cacheKey(String message) {
        return message.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
    }

    private String cachedReply(String cacheKey) {
        if (chatCacheSeconds <= 0) return null;
        CachedReply cached = chatCache.get(cacheKey);
        if (cached == null) return null;
        if (cached.expiresAt().isBefore(Instant.now())) {
            chatCache.remove(cacheKey);
            return null;
        }
        return cached.reply();
    }

    private void cacheReply(String cacheKey, String reply) {
        if (chatCacheSeconds <= 0 || reply == null || reply.isBlank()) return;
        if (chatCache.size() >= CHAT_CACHE_LIMIT) {
            chatCache.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(Instant.now()));
            if (chatCache.size() >= CHAT_CACHE_LIMIT) {
                chatCache.clear();
            }
        }
        chatCache.put(cacheKey, new CachedReply(reply, Instant.now().plusSeconds(chatCacheSeconds)));
    }

    @SuppressWarnings("unchecked")
    private String pickText(Map<String, Object> data) {
        Object outputText = data.get("output_text");
        if (outputText instanceof String text) {
            return text;
        }

        Object choices = data.get("choices");
        if (choices instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> first) {
            Object message = ((Map<String, Object>) first).get("message");
            if (message instanceof Map<?, ?> messageMap) {
                Object content = ((Map<String, Object>) messageMap).get("content");
                if (content instanceof String text) {
                    return text;
                }
            }
        }

        Object output = data.get("output");
        if (output instanceof List<?> outputList) {
            for (Object item : outputList) {
                if (item instanceof Map<?, ?> itemMap) {
                    Object content = ((Map<String, Object>) itemMap).get("content");
                    if (content instanceof String text) {
                        return text;
                    }
                    if (content instanceof List<?> contentList) {
                        for (Object part : contentList) {
                            if (part instanceof Map<?, ?> partMap) {
                                Object text = ((Map<String, Object>) partMap).get("text");
                                if (text instanceof String value) {
                                    return value;
                                }
                                Object partContent = ((Map<String, Object>) partMap).get("content");
                                if (partContent instanceof String value) {
                                    return value;
                                }
                            }
                        }
                    }
                }
            }
        }
        return "";
    }

    private StreamEventResult handleStreamEvent(
            String eventName,
            String dataText,
            OutputStream outputStream,
            StringBuilder reply
    ) {
        String event = eventName == null ? "" : eventName.trim();
        String payload = dataText == null ? "" : dataText.trim();
        if (payload.isBlank()) {
            return new StreamEventResult(isTerminalSseEvent(event), false);
        }
        if ("[DONE]".equals(payload)) {
            return new StreamEventResult(true, false);
        }

        Map<String, Object> data;
        try {
            data = objectMapper.readValue(payload, new TypeReference<>() {
            });
        } catch (Exception ex) {
            if (payload.startsWith("{") || payload.startsWith("[")) {
                throw new AiUpstreamException("AI 流式响应 JSON 解析失败", true);
            }
            return new StreamEventResult(isTerminalSseEvent(event), false);
        }

        String error = extractStreamError(data);
        if (!error.isBlank()) {
            throw new AiUpstreamException(error, true);
        }

        String delta = pickStreamDelta(data, event);
        boolean sawText = false;
        if (delta != null && !delta.isEmpty()) {
            appendStreamText(outputStream, reply, delta);
            sawText = true;
        }
        return new StreamEventResult(isTerminalSseEvent(event) || isTerminalPayload(data), sawText);
    }

    private boolean isTerminalSseEvent(String eventName) {
        String event = eventName == null ? "" : eventName.trim().toLowerCase(Locale.ROOT);
        return event.equals("done")
                || event.equals("message_stop")
                || event.equals("response.done")
                || event.equals("response.completed");
    }

    @SuppressWarnings("unchecked")
    private boolean isTerminalPayload(Map<String, Object> data) {
        String type = stringValue(data.get("type")).toLowerCase(Locale.ROOT);
        if (type.equals("done") || type.equals("message_stop") || type.equals("response.done") || type.equals("response.completed")) {
            return true;
        }

        Object choices = data.get("choices");
        if (choices instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> first) {
            Object finishReason = ((Map<String, Object>) first).get("finish_reason");
            return finishReason instanceof String reason && !reason.isBlank() && !"null".equalsIgnoreCase(reason);
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private String pickStreamDelta(Map<String, Object> data, String eventName) {
        Object choices = data.get("choices");
        if (choices instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> first) {
            Object delta = ((Map<String, Object>) first).get("delta");
            if (delta instanceof Map<?, ?> deltaMap) {
                String content = pickTextContent(((Map<String, Object>) deltaMap).get("content"));
                if (!content.isBlank()) {
                    return content;
                }
            }

            String deltaText = pickTextContent(delta);
            if (!deltaText.isBlank()) {
                return deltaText;
            }

            Object message = ((Map<String, Object>) first).get("message");
            if (message instanceof Map<?, ?> messageMap) {
                String content = pickTextContent(((Map<String, Object>) messageMap).get("content"));
                if (!content.isBlank()) {
                    return content;
                }
            }
        }

        String marker = ((eventName == null ? "" : eventName) + " " + stringValue(data.get("type"))).toLowerCase(Locale.ROOT);
        String directDelta = pickTextContent(data.get("delta"));
        if (!directDelta.isBlank()) {
            return directDelta;
        }

        if (marker.contains("delta")) {
            String text = pickTextContent(data.get("text"));
            if (!text.isBlank()) {
                return text;
            }
            String content = pickTextContent(data.get("content"));
            if (!content.isBlank()) {
                return content;
            }
            String outputText = pickTextContent(data.get("output_text"));
            if (!outputText.isBlank()) {
                return outputText;
            }
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private String pickTextContent(Object value) {
        if (value instanceof String text) {
            return text;
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> typedMap = (Map<String, Object>) map;
            String text = pickTextContent(typedMap.get("text"));
            if (!text.isBlank()) {
                return text;
            }
            String content = pickTextContent(typedMap.get("content"));
            if (!content.isBlank()) {
                return content;
            }
            String valueText = pickTextContent(typedMap.get("value"));
            if (!valueText.isBlank()) {
                return valueText;
            }
        }
        if (value instanceof List<?> list) {
            StringBuilder builder = new StringBuilder();
            for (Object item : list) {
                String text = pickTextContent(item);
                if (!text.isBlank()) {
                    builder.append(text);
                }
            }
            return builder.toString();
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private String extractStreamError(Map<String, Object> data) {
        Object error = data.get("error");
        if (error instanceof Map<?, ?> errorMap) {
            Object message = ((Map<String, Object>) errorMap).get("message");
            if (message instanceof String value && !value.isBlank()) {
                return limitError(value);
            }
            Object code = ((Map<String, Object>) errorMap).get("code");
            if (code instanceof String value && !value.isBlank()) {
                return limitError(value);
            }
        }
        if (error instanceof String value && !value.isBlank()) {
            return limitError(value);
        }

        String type = stringValue(data.get("type")).toLowerCase(Locale.ROOT);
        if (type.contains("error")) {
            String message = stringValue(data.get("message"));
            return message.isBlank() ? "AI 流式服务返回错误" : limitError(message);
        }
        return "";
    }

    private String stringValue(Object value) {
        return value instanceof String text ? text : "";
    }

    @SuppressWarnings("unchecked")
    private String extractError(Map<String, Object> data) {
        Object error = data.get("error");
        if (error instanceof Map<?, ?> errorMap) {
            Object message = ((Map<String, Object>) errorMap).get("message");
            if (message instanceof String value && !value.isBlank()) {
                return limitError(value);
            }
        }
        Object message = data.get("message");
        if (message instanceof String value && !value.isBlank()) {
            return limitError(value);
        }
        return "AI 服务请求失败";
    }

    private String localChatReply(String message, String ragContext) {
        if (ragContext != null && !ragContext.isBlank()) {
            return buildLocalUserFirstRagReply(message, ragContext);
        }

        if (ragContext != null && !ragContext.isBlank()) {
            String[] lines = ragContext.split("\\R+");
            StringBuilder builder = new StringBuilder("我先根据站内知识库为你回答：");
            int count = 0;
            for (String line : lines) {
                if (!line.isBlank()) {
                    builder.append(count == 0 ? "" : "；").append(line.replaceFirst("^\\d+\\.\\s*", ""));
                    count++;
                    if (count >= 2) break;
                }
            }
            builder.append("。你也可以继续追问具体唱段、流派或舞台美学。");
            return builder.toString();
        }

        String normalized = message.toLowerCase(Locale.ROOT);
        String answer;
        if (containsAny(normalized, "梁祝", "梁山伯", "祝英台")) {
            answer = "《梁山伯与祝英台》是越剧最具代表性的经典剧目之一，重点可看剧情情感递进、经典唱段和“化蝶”意象。";
        } else if (containsAny(normalized, "红楼梦", "宝玉", "黛玉")) {
            answer = "越剧《红楼梦》以宝黛爱情为主线，唱腔婉转、情绪层次细密，是越剧文学性和抒情性的代表作品。";
        } else if (containsAny(normalized, "流派", "袁派", "尹派", "范派", "傅派", "徐派", "王派")) {
            answer = "越剧流派主要体现在唱腔音色、行腔节奏、人物气质和表演处理上。袁派柔婉深情，尹派儒雅清朗，范派醇厚稳健。";
        } else if (containsAny(normalized, "唱腔", "唱段", "身段")) {
            answer = "越剧唱腔以抒情见长，常通过柔和旋律、细腻咬字和情绪递进表现人物内心；身段讲究含蓄、圆润和水袖韵味。";
        } else if (containsAny(normalized, "历史", "起源", "发展", "江南")) {
            answer = "越剧发源于浙江嵊州一带，后在上海等城市发展成熟，以江南审美、女子越剧传统和抒情唱腔著称。";
        } else {
            answer = "越剧适合从三条线理解：经典剧目看《梁祝》《红楼梦》，名家流派看袁派、尹派、范派等，舞台审美看唱腔、水袖、服饰与江南意象。";
        }
        return "我先用站内知识为你回答：" + answer;
    }

    private String buildLocalUserFirstRagReply(String message, String ragContext) {
        List<String> entries = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String rawLine : ragContext.split("\\R+")) {
            String line = rawLine.trim();
            if (line.isBlank()) {
                continue;
            }
            if (line.matches("^\\d+\\.\\s+.*")) {
                if (!current.isEmpty()) {
                    entries.add(current.toString());
                }
                current.setLength(0);
                current.append(line.replaceFirst("^\\d+\\.\\s*", ""));
            } else if (!current.isEmpty()) {
                current.append("\n").append(line);
            }
        }
        if (!current.isEmpty()) {
            entries.add(current.toString());
        }

        StringBuilder builder = new StringBuilder();
        builder.append("【AI 综合回答】\n");
        builder.append(buildLocalRagSynthesis(message, entries, ragContext)).append("\n\n");
        builder.append("【站内资料引用】\n");
        for (int i = 0; i < Math.min(3, entries.size()); i++) {
            builder.append(i + 1).append(". ").append(entries.get(i)).append("\n");
        }
        builder.append("\n【相关入口】\n");
        Set<String> paths = new LinkedHashSet<>();
        Set<String> relatedPlays = new LinkedHashSet<>();
        Set<String> relatedSchools = new LinkedHashSet<>();
        for (String entry : entries) {
            collectRagField(entry, "相关剧目：", relatedPlays);
            collectRagField(entry, "相关流派：", relatedSchools);
            int index = entry.indexOf("继续阅读入口：");
            if (index >= 0) {
                String path = entry.substring(index + "继续阅读入口：".length()).split("[；\\s]", 2)[0].trim();
                if (!path.isBlank()) {
                    paths.add(path);
                }
            }
        }
        if (paths.isEmpty()) {
            builder.append("- 暂无明确入口");
        } else {
            for (String path : paths) {
                builder.append("- ").append(path).append("（站内继续阅读）\n");
            }
        }
        builder.append("\n【相关剧目】\n");
        builder.append(relatedPlays.isEmpty() ? "暂无明确资料\n" : String.join("、", relatedPlays) + "\n");
        builder.append("\n【相关流派】\n");
        builder.append(relatedSchools.isEmpty() ? "暂无明确资料" : String.join("、", relatedSchools));
        return builder.toString().trim();
    }

    private String buildLocalRagSynthesis(String message, List<String> entries, String ragContext) {
        String normalized = message == null ? "" : message.toLowerCase(Locale.ROOT);
        String firstTitle = entries.isEmpty() ? "站内资料" : extractEntryTitle(entries.get(0));
        String firstSummary = entries.isEmpty() ? ragContext.trim() : summarizeRagEntry(entries.get(0));
        String secondTitle = entries.size() > 1 ? extractEntryTitle(entries.get(1)) : "";
        String secondSummary = entries.size() > 1 ? summarizeRagEntry(entries.get(1)) : "";

        if (containsAny(normalized, "影响", "作用", "意义")) {
            return "可以把这个问题理解为舞台形态和审美重心的一次转变。" +
                    firstSummary +
                    (secondSummary.isBlank() ? "" : " 同时，" + secondSummary) +
                    " 综合来看，它的影响不只是演员性别的变化，还推动了唱腔气质、人物塑造和剧目建设向更细腻、更抒情、更适合现代剧场观看的方向发展。";
        }
        if (containsAny(normalized, "区别", "不同", "对比", "比较")) {
            return "这几类内容的差别，可以从来源、唱腔气质和舞台表达三个角度看。" +
                    firstSummary +
                    (secondSummary.isBlank() ? "" : " 作为参照，" + secondSummary) +
                    " 因此阅读时不宜只看名称，更要结合角色行当、唱段处理和具体剧目来判断。";
        }
        if (containsAny(normalized, "入口", "哪里", "查看", "阅读", "相关")) {
            return "站内可以先从最相关的内容页进入，再顺着剧目、唱段和流派继续看。" +
                    " 当前检索最贴近的是“" + firstTitle + "”。" +
                    (secondTitle.isBlank() ? "" : " 还可以继续参考“" + secondTitle + "”。") +
                    " 下面的入口已整理成可点击路径，适合继续展开阅读。";
        }
        if (containsAny(normalized, "为什么", "原因", "怎么")) {
            return "核心原因可以从历史环境、演出主体和观众审美三方面理解。" +
                    firstSummary +
                    (secondSummary.isBlank() ? "" : " 进一步看，" + secondSummary) +
                    " 这些资料合在一起说明，越剧的发展不是单一事件，而是地域文化、城市剧场和表演传统共同作用的结果。";
        }

        return "这个问题可以先抓住一个主线：站内资料中最相关的是“" + firstTitle + "”。" +
                firstSummary +
                (secondSummary.isBlank() ? "" : " 另外，“" + secondTitle + "”也补充了相关背景：" + secondSummary) +
                " 综合来看，建议把它放在剧目、流派和舞台审美三个层面一起理解。";
    }

    private String extractEntryTitle(String entry) {
        String firstLine = entry.split("\\R+", 2)[0].trim();
        int titleStart = firstLine.indexOf('】');
        int titleEnd = firstLine.indexOf('：');
        if (titleStart >= 0 && titleEnd > titleStart) {
            return firstLine.substring(titleStart + 1, titleEnd).trim();
        }
        if (titleEnd > 0) {
            return firstLine.substring(0, titleEnd).replaceFirst("^【[^】]+】", "").trim();
        }
        return firstLine.replaceFirst("^【[^】]+】", "").trim();
    }

    private String summarizeRagEntry(String entry) {
        String firstLine = entry.split("\\R+", 2)[0].trim();
        int summaryStart = firstLine.indexOf('：');
        String summary = summaryStart >= 0 ? firstLine.substring(summaryStart + 1).trim() : firstLine;
        summary = summary.replaceFirst("^【[^】]+】", "").trim();
        if (summary.length() > 120) {
            summary = summary.substring(0, 120) + "…";
        }
        if (summary.isBlank()) {
            return "";
        }
        return summary.endsWith("。") || summary.endsWith("！") || summary.endsWith("？") ? summary : summary + "。";
    }

    private void collectRagField(String entry, String label, Set<String> target) {
        int index = entry.indexOf(label);
        if (index < 0) {
            return;
        }
        String value = entry.substring(index + label.length()).split("[；\\n]", 2)[0].trim();
        if (value.isBlank() || value.contains("暂无明确")) {
            return;
        }
        for (String item : value.split("[、,，]")) {
            String cleaned = item.trim();
            if (!cleaned.isBlank()) {
                target.add(cleaned);
            }
        }
    }

    private String localVisionReply(String message, String frontPrompt) {
        return """
                我已收到图片，但当前后端视觉模型暂未完成真实图像识别，先按“越剧图像导览”的方式给你一份识别框架：

                1. 可先观察人物行当：小生、花旦、老生、老旦等，重点看妆容、头面、服装色彩和人物姿态。
                2. 再看舞台与服饰线索：水袖、云肩、褶子、扇子、桥亭水榭、月洞门、字幕或题签都可能指向具体剧目。
                3. 如果画面来自越剧视频截图，建议结合字幕、角色关系和唱段时间点判断是否属于《梁祝》《红楼梦》《五女拜寿》《何文秀》等剧目。
                4. 你设置的前置 Prompt 是：%s

                要获得真正的图片识别结果，请确认后端已配置支持图片输入的 VISION_MODEL 和 VOLCENGINE_API_KEY，然后重新上传识别。
                """.formatted(frontPrompt);
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private boolean isRetryableStatus(int statusCode) {
        return statusCode == 408 || statusCode == 409 || statusCode == 425 || statusCode == 429 || statusCode >= 500;
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(Math.min(1200, 350L * attempt));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    private void appendStreamText(OutputStream outputStream, StringBuilder reply, String text) {
        reply.append(text);
        writeText(outputStream, text);
    }

    private void writeText(OutputStream outputStream, String text) {
        try {
            outputStream.write(text.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (IOException ex) {
            throw new AiUpstreamException("浏览器连接已断开", false);
        }
    }

    private String limitError(String message) {
        String value = message == null ? "" : message.trim();
        return value.length() > 180 ? value.substring(0, 180) + "..." : value;
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "请先在 .env 中配置 VOLCENGINE_API_KEY");
        }
    }

    private boolean isConfigured() {
        return !apiKey.isBlank() && !apiKey.contains("replace-with");
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://ark.cn-beijing.volces.com/api/v3";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record CachedReply(String reply, Instant expiresAt) {
    }

    private record StreamEventResult(boolean done, boolean sawText) {
    }

    private static final class AiUpstreamException extends RuntimeException {
        private final boolean retryable;

        private AiUpstreamException(String message, boolean retryable) {
            super(message == null || message.isBlank() ? "AI 服务请求失败" : message);
            this.retryable = retryable;
        }

        private boolean retryable() {
            return retryable;
        }
    }
}
