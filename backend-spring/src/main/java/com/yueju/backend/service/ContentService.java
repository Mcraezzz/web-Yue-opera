package com.yueju.backend.service;

import com.yueju.backend.dto.NewsItem;
import com.yueju.backend.dto.PlayItem;
import com.yueju.backend.dto.SearchItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContentService {

    private static final String ALL_CATEGORY = "全部";
    private static final List<String> CATEGORIES = List.of(
            "全部", "剧目", "新闻", "流派", "演员", "历史", "唱腔", "舞台", "服饰", "视频"
    );

    private final JdbcTemplate jdbcTemplate;
    private final KnowledgeSearchService knowledgeSearchService;

    public ContentService(JdbcTemplate jdbcTemplate, KnowledgeSearchService knowledgeSearchService) {
        this.jdbcTemplate = jdbcTemplate;
        this.knowledgeSearchService = knowledgeSearchService;
    }

    public String databaseStatus() {
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        String database = jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
        return "mysql:" + database;
    }

    public List<PlayItem> getPlays() {
        return jdbcTemplate.query("""
                SELECT
                  id,
                  title,
                  category,
                  description,
                  image_key,
                  like_count,
                  collection_count
                FROM plays
                ORDER BY sort_order ASC, id ASC
                """, (rs, rowNum) -> new PlayItem(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("category"),
                rs.getString("description"),
                rs.getString("image_key"),
                rs.getInt("like_count"),
                rs.getInt("collection_count")
        ));
    }

    public List<NewsItem> getNews() {
        return jdbcTemplate.query("""
                SELECT
                  id,
                  title,
                  category,
                  summary,
                  source_url,
                  DATE_FORMAT(published_date, '%Y-%m-%d') AS published_date_text
                FROM news
                ORDER BY sort_order ASC, published_date DESC, id ASC
                """, (rs, rowNum) -> new NewsItem(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("category"),
                rs.getString("summary"),
                rs.getString("source_url"),
                rs.getString("published_date_text")
        ));
    }

    public List<String> getCategories() {
        return CATEGORIES;
    }

    public List<SearchItem> search(String keyword, String category) {
        return knowledgeSearchService.search(keyword, category, 30).stream()
                .map(hit -> new SearchItem(
                        hit.title(),
                        hit.category(),
                        hit.desc(),
                        hit.path(),
                        hit.score(),
                        hit.matchedBy(),
                        hit.source()
                ))
                .toList();
    }
}
