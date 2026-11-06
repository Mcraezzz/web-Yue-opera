package com.yueju.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class KnowledgeSearchService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeSearchService.class);

    private static final String ALL_CATEGORY = "全部";

    private static final List<String> DOMAIN_TERMS = List.of(
            "越剧", "落地唱书", "江南", "嵊州", "嵊县", "上海", "女班", "女子越剧",
            "梁山伯与祝英台", "梁祝", "十八相送", "化蝶", "红楼梦", "宝玉", "黛玉",
            "天上掉下个林妹妹", "西厢记", "张生", "崔莺莺", "祥林嫂", "祝福",
            "碧玉簪", "追鱼", "鲤鱼精", "何文秀", "五女拜寿", "玉堂春", "孔雀东南飞",
            "陆游与唐琬", "孟丽君", "九斤姑娘", "袁派", "尹派", "范派", "傅派", "徐派",
            "王派", "吕派", "金派", "张派", "戚派", "袁雪芬", "尹桂芳", "范瑞娟", "傅全香", "徐玉兰",
            "王文娟", "吕瑞英", "茅威涛", "赵志刚", "钱惠丽", "单仰萍", "何赛飞",
            "方亚芬", "小生", "旦角", "花旦", "唱腔", "唱段", "水袖", "身段",
            "尺调腔", "弦下调", "四工调", "越剧男调", "清板", "慢板", "头面", "戏服",
            "云肩", "折扇", "妆容", "纹样", "圆场", "舞台", "灯光", "美学", "江南意象",
            "环境式越剧", "智能字幕", "唱腔情绪曲线", "画面语义识别", "唱段时间轴",
            "剧目", "流派", "演员", "服饰", "视频", "音频", "青春越剧", "新龙门客栈"
    );

    private static final Map<String, List<String>> SEMANTIC_EXPANSIONS = Map.ofEntries(
            Map.entry("爱情", List.of("梁祝", "梁山伯与祝英台", "红楼梦", "西厢记", "碧玉簪", "追鱼", "才子佳人", "悲剧")),
            Map.entry("梁祝", List.of("梁山伯与祝英台", "十八相送", "化蝶", "爱情悲剧", "经典剧目", "梁祝经典片段")),
            Map.entry("梁山伯与祝英台", List.of("梁祝", "十八相送", "化蝶", "爱情悲剧", "经典剧目", "视频", "唱段")),
            Map.entry("凄美", List.of("梁祝", "化蝶", "红楼梦", "黛玉", "爱情悲剧", "抒情")),
            Map.entry("入门", List.of("经典剧目", "梁祝", "红楼梦", "越剧历史", "流派", "唱腔")),
            Map.entry("初学", List.of("入门", "经典剧目", "梁祝", "红楼梦", "名家流派")),
            Map.entry("推荐", List.of("经典剧目", "梁祝", "红楼梦", "西厢记", "追鱼")),
            Map.entry("男角", List.of("小生", "尹派", "范派", "徐派", "赵志刚")),
            Map.entry("小生", List.of("尹派", "范派", "徐派", "徐玉兰", "赵志刚")),
            Map.entry("女角", List.of("旦角", "花旦", "袁派", "王派", "傅派", "袁雪芬", "王文娟")),
            Map.entry("旦角", List.of("袁派", "王派", "傅派", "花旦", "王文娟", "傅全香")),
            Map.entry("服装", List.of("戏服", "云肩", "水袖", "头面", "服饰纹样", "舞台美学")),
            Map.entry("服饰", List.of("戏服", "云肩", "水袖", "头面", "折扇", "妆容", "纹样")),
            Map.entry("造型", List.of("戏服", "头面", "花旦", "云肩", "妆容", "舞台美学")),
            Map.entry("舞美", List.of("舞台", "美学", "江南", "水袖", "灯光", "服饰", "环境式越剧")),
            Map.entry("音乐", List.of("唱腔", "唱段", "尺调腔", "弦下调", "四工调", "流派")),
            Map.entry("声音", List.of("唱腔", "唱段", "音频", "流派", "清板", "慢板")),
            Map.entry("唱腔", List.of("尺调腔", "弦下调", "四工调", "男调", "清板", "慢板", "流派")),
            Map.entry("腔调", List.of("尺调腔", "弦下调", "四工调", "越剧男调")),
            Map.entry("水袖", List.of("身段", "舞台", "服饰", "戏曲程式", "情绪表达")),
            Map.entry("头面", List.of("服饰", "造型", "珠翠", "妆容", "花旦")),
            Map.entry("历史", List.of("起源", "落地唱书", "嵊州", "女班", "上海", "改革", "越剧电影", "120年")),
            Map.entry("起源", List.of("历史", "落地唱书", "嵊州", "嵊县")),
            Map.entry("现代", List.of("改革", "祥林嫂", "青春越剧", "新龙门客栈", "环境式越剧", "当代创新")),
            Map.entry("沉浸", List.of("环境式越剧", "新龙门客栈", "现代舞台", "年轻化传播")),
            Map.entry("视频", List.of("唱段", "全剧", "智能字幕", "画面语义识别", "唱段时间轴", "梁祝经典片段", "天上掉下个林妹妹")),
            Map.entry("看戏", List.of("视频", "经典剧目", "唱段", "全剧", "智能解析")),
            Map.entry("字幕", List.of("智能字幕", "唱段时间轴", "ASR", "唱词")),
            Map.entry("识别", List.of("画面语义识别", "智能字幕", "音频识别", "服饰头面", "舞台美学")),
            Map.entry("情绪曲线", List.of("唱腔情绪曲线", "音频能量", "节奏密度", "唱段情绪"))
    );

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;
    private final JdbcTemplate jdbcTemplate;
    private final boolean ragServiceEnabled;
    private final String ragServiceUrl;
    private final int ragTimeoutSeconds;
    private final int ragSearchMaxWaitMillis;

    public KnowledgeSearchService(
            JdbcTemplate jdbcTemplate,
            @Value("${yueju.rag.enabled:true}") boolean ragServiceEnabled,
            @Value("${yueju.rag.service-url:http://127.0.0.1:8091}") String ragServiceUrl,
            @Value("${yueju.rag.timeout-seconds:45}") int ragTimeoutSeconds,
            @Value("${yueju.rag.search-max-wait-ms:600}") int ragSearchMaxWaitMillis
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.ragServiceEnabled = ragServiceEnabled;
        this.ragServiceUrl = trimTrailingSlash(ragServiceUrl);
        this.ragTimeoutSeconds = Math.max(3, Math.min(ragTimeoutSeconds, 120));
        this.ragSearchMaxWaitMillis = Math.max(200, Math.min(ragSearchMaxWaitMillis, this.ragTimeoutSeconds * 1000));
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public List<KnowledgeHit> search(String keyword, String category, int limit) {
        List<KnowledgeChunk> chunks = loadChunks();
        String normalizedCategory = StringUtils.hasText(category) ? category.trim() : ALL_CATEGORY;
        String normalizedKeyword = normalize(keyword);
        int safeLimit = Math.max(1, Math.min(limit, 50));

        List<KnowledgeChunk> categoryFiltered = chunks.stream()
                .filter(chunk -> matchesCategory(chunk.category(), normalizedCategory))
                .toList();

        if (!StringUtils.hasText(normalizedKeyword)) {
            return categoryFiltered.stream()
                    .limit(safeLimit)
                    .map(chunk -> toHit(chunk, 0, "精选内容"))
                    .toList();
        }

        List<KnowledgeHit> localHits = localSearch(categoryFiltered, normalizedKeyword, safeLimit);
        Set<String> exactAliases = exactWorkAliases(normalizedKeyword);
        if (!exactAliases.isEmpty()) {
            List<KnowledgeHit> exactHits = localHits.stream()
                    .filter(hit -> containsAnyAlias(hit, exactAliases))
                    .limit(safeLimit)
                    .toList();
            if (!exactHits.isEmpty()) {
                return exactHits;
            }
        }

        boolean strongLocalMatch = !localHits.isEmpty() && localHits.get(0).score() >= 4.0;
        if (strongLocalMatch) {
            return localHits;
        }

        List<KnowledgeHit> semanticHits = semanticSearch(normalizedKeyword, normalizedCategory, safeLimit, ragSearchMaxWaitMillis);
        return semanticHits.isEmpty() ? localHits : mergeHits(semanticHits, localHits, safeLimit);
    }

    private List<KnowledgeHit> localSearch(List<KnowledgeChunk> categoryFiltered, String normalizedKeyword, int safeLimit) {
        QueryProfile query = buildQueryProfile(normalizedKeyword);
        Map<KnowledgeChunk, Set<String>> documentTokens = new LinkedHashMap<>();
        Map<String, Integer> documentFrequency = new HashMap<>();

        for (KnowledgeChunk chunk : categoryFiltered) {
            Set<String> tokens = new HashSet<>(tokenize(chunk.searchText()));
            documentTokens.put(chunk, tokens);
            for (String token : tokens) {
                documentFrequency.merge(token, 1, Integer::sum);
            }
        }

        int documentCount = Math.max(1, documentTokens.size());
        double averageLength = documentTokens.values().stream().mapToInt(Set::size).average().orElse(1);

        return categoryFiltered.stream()
                .map(chunk -> scoreChunk(chunk, query, documentTokens.getOrDefault(chunk, Set.of()), documentFrequency, documentCount, averageLength))
                .filter(hit -> hit.score() > 0.05)
                .sorted(Comparator.comparingDouble(KnowledgeHit::score).reversed()
                        .thenComparing(KnowledgeHit::title))
                .limit(safeLimit)
                .toList();
    }

    private List<KnowledgeHit> semanticSearch(String keyword, String category, int limit, int timeoutMillis) {
        if (!StringUtils.hasText(ragServiceUrl)) {
            return List.of();
        }

        try {
            String semanticCategory = ALL_CATEGORY.equals(category) ? "全部" : category;
            String body = objectMapper.writeValueAsString(Map.of(
                    "query", keyword,
                    "category", semanticCategory,
                    "limit", limit
            ));
            HttpRequest request = HttpRequest.newBuilder(URI.create(ragServiceUrl + "/search"))
                    .version(HttpClient.Version.HTTP_1_1)
                    .timeout(Duration.ofMillis(timeoutMillis))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return List.of();
            }

            Map<String, Object> data = objectMapper.readValue(response.body(), new TypeReference<>() {
            });
            Object items = data.get("items");
            if (!(items instanceof List<?> list)) {
                return List.of();
            }

            List<KnowledgeHit> hits = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    hits.add(new KnowledgeHit(
                            stringValue(map.get("title")),
                            stringValue(map.get("category")),
                            stringValue(map.get("desc")),
                            stringValue(map.get("path")),
                            doubleValue(map.get("score")),
                            StringUtils.hasText(stringValue(map.get("matchedBy"))) ? stringValue(map.get("matchedBy")) : "bge-m3 向量召回",
                            StringUtils.hasText(stringValue(map.get("source"))) ? stringValue(map.get("source")) : "站内知识库"
                    ));
                }
            }
            return hits;
        } catch (Exception ex) {
            log.debug("RAG semantic search missed fast window, using local index fallback: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<KnowledgeHit> mergeHits(List<KnowledgeHit> semanticHits, List<KnowledgeHit> localHits, int safeLimit) {
        Map<String, KnowledgeHit> merged = new LinkedHashMap<>();
        for (KnowledgeHit hit : semanticHits) {
            merged.put(hit.category() + "\u0000" + hit.title(), hit);
        }
        for (KnowledgeHit hit : localHits) {
            merged.putIfAbsent(hit.category() + "\u0000" + hit.title(), hit);
        }
        return merged.values().stream().limit(safeLimit).toList();
    }

    private Set<String> exactWorkAliases(String keyword) {
        if (keyword.contains("梁山伯与祝英台") || keyword.contains("梁祝")) {
            return Set.of("梁山伯与祝英台", "梁祝");
        }
        if (keyword.contains("红楼梦")) {
            return Set.of("红楼梦", "宝玉", "黛玉", "林妹妹");
        }
        if (keyword.contains("西厢记")) {
            return Set.of("西厢记", "张生", "崔莺莺");
        }
        if (keyword.contains("五女拜寿")) {
            return Set.of("五女拜寿", "奉汤");
        }
        if (keyword.contains("何文秀")) {
            return Set.of("何文秀", "算命");
        }
        return Set.of();
    }

    private boolean containsAnyAlias(KnowledgeHit hit, Set<String> aliases) {
        String text = normalize(hit.title() + " " + hit.desc() + " " + hit.source());
        for (String alias : aliases) {
            String normalizedAlias = normalize(alias);
            if (StringUtils.hasText(normalizedAlias) && text.contains(normalizedAlias)) {
                return true;
            }
        }
        return false;
    }

    public String buildRagContext(String keyword, int limit) {
        List<KnowledgeHit> hits = search(keyword, ALL_CATEGORY, limit);
        if (hits.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < hits.size(); i++) {
            KnowledgeHit hit = hits.get(i);
            builder.append(i + 1)
                    .append(". 【")
                    .append(hit.category())
                    .append("】")
                    .append(hit.title())
                    .append("：")
                    .append(limitText(hit.desc(), 180));
            if (StringUtils.hasText(hit.path())) {
                builder.append("（站内入口：").append(hit.path()).append("）");
            }
            builder.append("\n");
        }
        return builder.toString().trim();
    }

    public String buildEnhancedRagContext(String keyword, int limit) {
        List<KnowledgeHit> hits = search(keyword, ALL_CATEGORY, limit);
        if (hits.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < hits.size(); i++) {
            KnowledgeHit hit = hits.get(i);
            builder.append(i + 1)
                    .append(". 【")
                    .append(hit.category())
                    .append("】")
                    .append(hit.title())
                    .append("：")
                    .append(limitText(hit.desc(), 260))
                    .append("\n   出处：")
                    .append(StringUtils.hasText(hit.source()) ? hit.source() : "站内知识库")
                    .append("；匹配方式：")
                    .append(hit.matchedBy())
                    .append("；相关剧目：")
                    .append(joinOrDefault(relatedPlays(hit), "暂无明确剧目"))
                    .append("；相关流派：")
                    .append(joinOrDefault(relatedSchools(hit), "暂无明确流派"));
            if (StringUtils.hasText(hit.path())) {
                builder.append("；继续阅读入口：").append(hit.path());
            }
            builder.append("\n");
        }
        return builder.toString().trim();
    }

    private KnowledgeHit scoreChunk(
            KnowledgeChunk chunk,
            QueryProfile query,
            Set<String> chunkTokens,
            Map<String, Integer> documentFrequency,
            int documentCount,
            double averageLength
    ) {
        double score = 0;
        double k1 = 1.35;
        double b = 0.72;
        int docLength = Math.max(1, chunkTokens.size());
        String text = normalize(chunk.searchText());

        for (Map.Entry<String, Double> entry : query.weightedTokens().entrySet()) {
            String token = entry.getKey();
            if (!chunkTokens.contains(token) && !text.contains(token)) {
                continue;
            }

            int tf = text.contains(token) ? Math.max(1, countOccurrences(text, token)) : 1;
            int df = Math.max(1, documentFrequency.getOrDefault(token, 1));
            double idf = Math.log(1 + (documentCount - df + 0.5) / (df + 0.5));
            double bm25 = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLength / averageLength));
            score += bm25 * entry.getValue();
        }

        String queryText = query.original();
        if (normalize(chunk.title()).contains(queryText) || queryText.contains(normalize(chunk.title()))) {
            score += 5.0;
        }
        if (normalize(chunk.category()).contains(queryText)) {
            score += 1.8;
        }
        if (text.contains(queryText)) {
            score += 2.0;
        }

        String matchedBy = score >= 4 ? "语义强相关" : score >= 1.4 ? "语义相关" : "弱相关";
        return toHit(chunk, roundScore(score), matchedBy);
    }

    private QueryProfile buildQueryProfile(String keyword) {
        Map<String, Double> tokens = new LinkedHashMap<>();
        for (String token : tokenize(keyword)) {
            tokens.merge(token, 1.0, Double::sum);
        }

        for (Map.Entry<String, List<String>> entry : SEMANTIC_EXPANSIONS.entrySet()) {
            String key = normalize(entry.getKey());
            if (keyword.contains(key) || tokens.containsKey(key)) {
                for (String expanded : entry.getValue()) {
                    for (String token : tokenize(expanded)) {
                        tokens.merge(token, 0.52, Double::sum);
                    }
                }
            }
        }

        return new QueryProfile(keyword, tokens);
    }

    private List<KnowledgeChunk> loadChunks() {
        List<KnowledgeChunk> chunks = new ArrayList<>();

        chunks.addAll(jdbcTemplate.query("""
                SELECT title, '剧目' AS category, description AS description
                FROM plays
                ORDER BY sort_order ASC, id ASC
                """, (rs, rowNum) -> new KnowledgeChunk(
                "play-" + rowNum,
                rs.getString("title"),
                rs.getString("category"),
                rs.getString("description"),
                "/repertoire",
                "剧目库"
        )));

        chunks.addAll(jdbcTemplate.query("""
                SELECT title, category, summary AS description, source_url
                FROM news
                ORDER BY sort_order ASC, published_date DESC, id ASC
                """, (rs, rowNum) -> new KnowledgeChunk(
                "news-" + rowNum,
                rs.getString("title"),
                "新闻",
                rs.getString("description"),
                "/news",
                "新闻资讯·" + normalizeCategory(rs.getString("category"))
        )));

        chunks.addAll(jdbcTemplate.query("""
                SELECT title, category, description
                FROM search_items
                ORDER BY sort_order ASC, id ASC
                """, (rs, rowNum) -> {
            String category = normalizeCategory(rs.getString("category"));
            String title = rs.getString("title");
            return new KnowledgeChunk(
                    "search-" + rowNum,
                    title,
                    category,
                    rs.getString("description"),
                    routeFor(category, title),
                    "知识条目"
            );
        }));

        return chunks;
    }

    private KnowledgeHit toHit(KnowledgeChunk chunk, double score, String matchedBy) {
        return new KnowledgeHit(
                chunk.title(),
                chunk.category(),
                chunk.description(),
                chunk.path(),
                score,
                matchedBy,
                chunk.source()
        );
    }

    private List<String> relatedPlays(KnowledgeHit hit) {
        return relatedTerms(hit, List.of(
                "梁山伯与祝英台", "梁祝", "红楼梦", "西厢记", "祥林嫂", "碧玉簪", "追鱼", "五女拜寿", "何文秀", "玉堂春"
        ));
    }

    private List<String> relatedSchools(KnowledgeHit hit) {
        return relatedTerms(hit, List.of(
                "袁派", "尹派", "范派", "傅派", "徐派", "王派", "吕派", "金派", "张派", "戚派", "小生", "旦角", "花旦"
        ));
    }

    private List<String> relatedTerms(KnowledgeHit hit, List<String> terms) {
        String text = hit.title() + " " + hit.category() + " " + hit.desc() + " " + hit.source();
        Set<String> values = new LinkedHashSet<>();
        for (String term : terms) {
            if (text.contains(term)) {
                values.add(term);
            }
        }
        return values.stream().limit(5).toList();
    }

    private String joinOrDefault(List<String> values, String fallback) {
        return values == null || values.isEmpty() ? fallback : String.join("、", values);
    }

    private String stringValue(Object value) {
        return value instanceof String text ? text.trim() : "";
    }

    private double doubleValue(Object value) {
        if (value instanceof Number number) {
            return Math.round(number.doubleValue() * 100.0) / 100.0;
        }
        if (value instanceof String text) {
            try {
                return Math.round(Double.parseDouble(text) * 100.0) / 100.0;
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private List<String> tokenize(String value) {
        String normalized = normalize(value);
        if (!StringUtils.hasText(normalized)) return List.of();

        List<String> tokens = new ArrayList<>();
        for (String term : DOMAIN_TERMS) {
            String normalizedTerm = normalize(term);
            if (StringUtils.hasText(normalizedTerm) && normalized.contains(normalizedTerm)) {
                tokens.add(normalizedTerm);
            }
        }

        StringBuilder cjkBuffer = new StringBuilder();
        StringBuilder latinBuffer = new StringBuilder();

        for (int i = 0; i < normalized.length(); i++) {
            char ch = normalized.charAt(i);
            if (isCjk(ch)) {
                flushLatin(latinBuffer, tokens);
                cjkBuffer.append(ch);
            } else if (Character.isLetterOrDigit(ch)) {
                flushCjk(cjkBuffer, tokens);
                latinBuffer.append(ch);
            } else {
                flushCjk(cjkBuffer, tokens);
                flushLatin(latinBuffer, tokens);
            }
        }

        flushCjk(cjkBuffer, tokens);
        flushLatin(latinBuffer, tokens);
        return tokens.stream().filter(token -> token.length() > 1).toList();
    }

    private void flushCjk(StringBuilder buffer, List<String> tokens) {
        if (buffer.isEmpty()) return;
        String text = buffer.toString();
        if (text.length() <= 2) {
            tokens.add(text);
        } else {
            for (int size = 2; size <= 3; size++) {
                for (int i = 0; i <= text.length() - size; i++) {
                    tokens.add(text.substring(i, i + size));
                }
            }
        }
        buffer.setLength(0);
    }

    private void flushLatin(StringBuilder buffer, List<String> tokens) {
        if (buffer.isEmpty()) return;
        tokens.add(buffer.toString());
        buffer.setLength(0);
    }

    private boolean matchesCategory(String itemCategory, String selectedCategory) {
        return selectedCategory.equals(ALL_CATEGORY) || normalizeCategory(itemCategory).equals(selectedCategory);
    }

    private String normalizeCategory(String category) {
        return category == null ? "" : category.trim();
    }

    private String routeFor(String category, String title) {
        if ("剧目".equals(category) || title.contains("梁祝") || title.contains("林妹妹")) return "/repertoire";
        if ("新闻".equals(category)) return "/news";
        if ("流派".equals(category)) return "/schools";
        if ("演员".equals(category)) return "/schools#artists";
        if ("历史".equals(category)) return "/scroll";
        if ("唱腔".equals(category)) return "/schools";
        if ("舞台".equals(category) || "服饰".equals(category)) return "/backstage";
        if ("视频".equals(category)) return "/repertoire";
        return "/";
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT)
                .replace('，', ' ')
                .replace('。', ' ')
                .replace('、', ' ')
                .replace('《', ' ')
                .replace('》', ' ')
                .replace('“', ' ')
                .replace('”', ' ')
                .trim();
    }

    private boolean isCjk(char ch) {
        Character.UnicodeScript script = Character.UnicodeScript.of(ch);
        return script == Character.UnicodeScript.HAN;
    }

    private int countOccurrences(String text, String token) {
        if (!StringUtils.hasText(token)) return 0;
        int count = 0;
        int index = text.indexOf(token);
        while (index >= 0) {
            count++;
            index = text.indexOf(token, index + token.length());
        }
        return count;
    }

    private double roundScore(double score) {
        return Math.round(score * 100.0) / 100.0;
    }

    private String trimTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private String limitText(String value, int maxLength) {
        if (value == null) return "";
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength) + "...";
    }

    public record KnowledgeHit(
            String title,
            String category,
            String desc,
            String path,
            double score,
            String matchedBy,
            String source
    ) {
    }

    private record KnowledgeChunk(
            String id,
            String title,
            String category,
            String description,
            String path,
            String source
    ) {
        private String searchText() {
            return title + " " + category + " " + description + " " + source;
        }
    }

    private record QueryProfile(String original, Map<String, Double> weightedTokens) {
    }
}
