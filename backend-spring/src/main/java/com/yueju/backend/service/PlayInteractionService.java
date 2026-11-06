package com.yueju.backend.service;

import com.yueju.backend.dto.InteractionDtos.CollectionResponse;
import com.yueju.backend.dto.InteractionDtos.CommentResponse;
import com.yueju.backend.dto.InteractionDtos.LikeResponse;
import com.yueju.backend.dto.InteractionDtos.PlayComment;
import com.yueju.backend.dto.InteractionDtos.PlayInteraction;
import com.yueju.backend.dto.InteractionDtos.ShareResponse;
import com.yueju.backend.dto.InteractionDtos.TodayPlaylistRequest;
import com.yueju.backend.dto.InteractionDtos.TodayPlaylistResponse;
import com.yueju.backend.dto.ProfileDtos.ProfileItem;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PlayInteractionService {

    private final JdbcTemplate jdbcTemplate;
    private final ContentModerationService moderationService;

    public PlayInteractionService(JdbcTemplate jdbcTemplate, ContentModerationService moderationService) {
        this.jdbcTemplate = jdbcTemplate;
        this.moderationService = moderationService;
    }

    public PlayInteraction getInteraction(long playId, Optional<AuthService.StoredUser> user) {
        PlayCounts counts = findPlayCounts(playId);
        int shareCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM play_shares WHERE play_id = ?",
                Integer.class,
                playId
        );
        List<PlayComment> comments = commentsForPlay(playId);

        boolean liked = false;
        boolean collected = false;
        if (user.isPresent()) {
            long userId = user.get().id();
            liked = exists("SELECT COUNT(*) FROM play_likes WHERE user_id = ? AND play_id = ?", userId, playId);
            collected = exists("SELECT COUNT(*) FROM play_collections WHERE user_id = ? AND play_id = ?", userId, playId);
        }

        return new PlayInteraction(liked, collected, counts.likeCount(), counts.collectionCount(), shareCount, comments);
    }

    @Transactional
    public LikeResponse toggleLike(long userId, long playId) {
        findPlayCounts(playId);
        boolean existing = exists("SELECT COUNT(*) FROM play_likes WHERE user_id = ? AND play_id = ?", userId, playId);
        if (existing) {
            jdbcTemplate.update("DELETE FROM play_likes WHERE user_id = ? AND play_id = ?", userId, playId);
            jdbcTemplate.update("UPDATE plays SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?", playId);
        } else {
            jdbcTemplate.update("INSERT IGNORE INTO play_likes (user_id, play_id) VALUES (?, ?)", userId, playId);
            jdbcTemplate.update("UPDATE plays SET like_count = like_count + 1 WHERE id = ?", playId);
        }

        PlayInteraction interaction = getInteraction(playId, Optional.of(fakeUser(userId)));
        return new LikeResponse(interaction.liked(), interaction.likeCount());
    }

    @Transactional
    public CollectionResponse toggleCollection(long userId, long playId) {
        findPlayCounts(playId);
        boolean existing = exists("SELECT COUNT(*) FROM play_collections WHERE user_id = ? AND play_id = ?", userId, playId);
        if (existing) {
            jdbcTemplate.update("DELETE FROM play_collections WHERE user_id = ? AND play_id = ?", userId, playId);
            jdbcTemplate.update("UPDATE plays SET collection_count = GREATEST(collection_count - 1, 0) WHERE id = ?", playId);
        } else {
            jdbcTemplate.update("INSERT IGNORE INTO play_collections (user_id, play_id) VALUES (?, ?)", userId, playId);
            jdbcTemplate.update("UPDATE plays SET collection_count = collection_count + 1 WHERE id = ?", playId);
        }

        PlayInteraction interaction = getInteraction(playId, Optional.of(fakeUser(userId)));
        return new CollectionResponse(interaction.collected(), interaction.collectionCount());
    }

    public TodayPlaylistResponse todayPlaylistCollection(long userId, String recommendationKey) {
        String key = normalizeTodayPlaylistKey(recommendationKey);
        return new TodayPlaylistResponse(exists(
                "SELECT COUNT(*) FROM today_playlist_collections WHERE user_id = ? AND recommendation_key = ?",
                userId,
                key
        ));
    }

    @Transactional
    public TodayPlaylistResponse toggleTodayPlaylistCollection(long userId, TodayPlaylistRequest request) {
        String key = normalizeTodayPlaylistKey(request == null ? "" : request.recommendationKey());
        boolean existing = exists(
                "SELECT COUNT(*) FROM today_playlist_collections WHERE user_id = ? AND recommendation_key = ?",
                userId,
                key
        );
        if (existing) {
            jdbcTemplate.update(
                    "DELETE FROM today_playlist_collections WHERE user_id = ? AND recommendation_key = ?",
                    userId,
                    key
            );
            return new TodayPlaylistResponse(false);
        }

        String playTitle = cleanTodayPlaylistField(request == null ? "" : request.playTitle(), "越剧今日推荐", 160);
        String displayTitle = cleanTodayPlaylistField(request == null ? "" : request.displayTitle(), playTitle, 220);
        String performer = cleanTodayPlaylistField(request == null ? "" : request.performer(), "越剧演员", 220);
        String lyric = cleanTodayPlaylistField(request == null ? "" : request.lyric(), "今日唱词暂未记录", 700);
        jdbcTemplate.update("""
                INSERT INTO today_playlist_collections
                  (user_id, recommendation_key, play_title, display_title, performer, lyric)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  play_title = VALUES(play_title),
                  display_title = VALUES(display_title),
                  performer = VALUES(performer),
                  lyric = VALUES(lyric)
                """, userId, key, playTitle, displayTitle, performer, lyric);
        return new TodayPlaylistResponse(true);
    }

    @Transactional
    public CommentResponse addComment(long userId, long playId, String content) {
        findPlayCounts(playId);
        String normalized = moderationService.moderateComment(content);
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "评论内容不能为空");
        }

        jdbcTemplate.update(
                "INSERT INTO play_comments (user_id, play_id, content) VALUES (?, ?, ?)",
                userId,
                playId,
                normalized.substring(0, Math.min(normalized.length(), 1000))
        );
        Long id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        PlayComment comment = jdbcTemplate.query("""
                SELECT
                  c.id,
                  c.content,
                  DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at_text,
                  u.nickname
                FROM play_comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.id = ?
                """, (rs, rowNum) -> new PlayComment(
                rs.getLong("id"),
                rs.getString("content"),
                rs.getString("nickname"),
                rs.getString("created_at_text")
        ), id).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "评论保存失败"));
        return new CommentResponse(comment);
    }

    @Transactional
    public ShareResponse recordShare(long userId, long playId) {
        findPlayCounts(playId);
        jdbcTemplate.update("INSERT INTO play_shares (user_id, play_id) VALUES (?, ?)", userId, playId);
        int shareCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM play_shares WHERE play_id = ?",
                Integer.class,
                playId
        );
        return new ShareResponse(shareCount);
    }

    public Map<String, List<ProfileItem>> profileActivities(long userId) {
        Map<String, List<ProfileItem>> activities = new LinkedHashMap<>();
        activities.put("likes", profileItems("""
                SELECT p.title, p.description AS description, DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i') AS time_text
                FROM play_likes l
                JOIN plays p ON p.id = l.play_id
                WHERE l.user_id = ?
                ORDER BY l.created_at DESC
                """, userId));
        activities.put("collections", profileItems("""
                SELECT title, description, time_text, path
                FROM (
                  SELECT
                    p.title,
                    p.description AS description,
                    DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS time_text,
                    c.created_at AS sort_time,
                    '/repertoire' AS path
                  FROM play_collections c
                  JOIN plays p ON p.id = c.play_id
                  WHERE c.user_id = ?
                  UNION ALL
                  SELECT
                    CONCAT('今日戏单：', d.display_title) AS title,
                    CONCAT('推荐演员：', d.performer, '；今日唱词：', d.lyric) AS description,
                    DATE_FORMAT(d.created_at, '%Y-%m-%d %H:%i') AS time_text,
                    d.created_at AS sort_time,
                    '/repertoire' AS path
                  FROM today_playlist_collections d
                  WHERE d.user_id = ?
                ) combined
                ORDER BY sort_time DESC
                """, userId, userId));
        activities.put("comments", profileItems("""
                SELECT p.title, CONCAT('我的评论：', c.content) AS description, DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS time_text
                FROM play_comments c
                JOIN plays p ON p.id = c.play_id
                WHERE c.user_id = ?
                ORDER BY c.created_at DESC
                """, userId));
        activities.put("history", profileItems("""
                SELECT title, description, DATE_FORMAT(last_viewed_at, '%Y-%m-%d %H:%i') AS time_text, path
                FROM browsing_history
                WHERE user_id = ?
                ORDER BY last_viewed_at DESC
                LIMIT 50
                """, userId));
        return activities;
    }

    public List<ProfileItem> browsingHistory(long userId) {
        return profileItems("""
                SELECT title, description, DATE_FORMAT(last_viewed_at, '%Y-%m-%d %H:%i') AS time_text, path
                FROM browsing_history
                WHERE user_id = ?
                ORDER BY last_viewed_at DESC
                LIMIT 50
                """, userId);
    }

    public void recordHistory(long userId, String title, String desc, String path) {
        String normalizedTitle = title == null ? "" : title.trim();
        if (normalizedTitle.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "浏览记录标题不能为空");
        }
        String normalizedDesc = desc == null ? "" : desc.trim();
        String normalizedPath = path == null ? "" : path.trim();

        jdbcTemplate.update("""
                INSERT INTO browsing_history (user_id, title, description, path)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  description = VALUES(description),
                  view_count = view_count + 1,
                  last_viewed_at = CURRENT_TIMESTAMP
                """,
                userId,
                normalizedTitle.substring(0, Math.min(normalizedTitle.length(), 220)),
                normalizedDesc.substring(0, Math.min(normalizedDesc.length(), 1000)),
                normalizedPath.substring(0, Math.min(normalizedPath.length(), 500))
        );
    }

    public void clearHistory(long userId) {
        jdbcTemplate.update("DELETE FROM browsing_history WHERE user_id = ?", userId);
    }

    private List<ProfileItem> profileItems(String sql, Object... args) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> new ProfileItem(
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("time_text"),
                hasColumn(rs, "path") ? rs.getString("path") : null
        ), args);
    }

    private String normalizeTodayPlaylistKey(String value) {
        String key = value == null ? "" : value.trim();
        if (key.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "今日戏单标识不能为空");
        }
        return key.substring(0, Math.min(key.length(), 160));
    }

    private String cleanTodayPlaylistField(String value, String fallback, int maxLength) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty()) text = fallback;
        return text.substring(0, Math.min(text.length(), maxLength));
    }

    private boolean hasColumn(java.sql.ResultSet rs, String columnName) {
        try {
            rs.findColumn(columnName);
            return true;
        } catch (java.sql.SQLException ignored) {
            return false;
        }
    }

    private List<PlayComment> commentsForPlay(long playId) {
        return jdbcTemplate.query("""
                SELECT
                  c.id,
                  c.content,
                  DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at_text,
                  u.nickname
                FROM play_comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.play_id = ?
                ORDER BY c.created_at ASC, c.id ASC
                """, (rs, rowNum) -> new PlayComment(
                rs.getLong("id"),
                rs.getString("content"),
                rs.getString("nickname"),
                rs.getString("created_at_text")
        ), playId);
    }

    private PlayCounts findPlayCounts(long playId) {
        return jdbcTemplate.query("""
                SELECT like_count, collection_count
                FROM plays
                WHERE id = ?
                LIMIT 1
                """, (rs, rowNum) -> new PlayCounts(
                rs.getInt("like_count"),
                rs.getInt("collection_count")
        ), playId).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "剧目不存在"));
    }

    private boolean exists(String sql, Object... args) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return count != null && count > 0;
    }

    private AuthService.StoredUser fakeUser(long userId) {
        return new AuthService.StoredUser(userId, "", "", "", "");
    }

    private record PlayCounts(int likeCount, int collectionCount) {
    }
}
