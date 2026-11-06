package com.yueju.backend.service;

import com.yueju.backend.dto.AuthDtos.AuthRequest;
import com.yueju.backend.dto.AuthDtos.AuthResponse;
import com.yueju.backend.dto.AuthDtos.PublicUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class AuthService {

    private static final int HASH_ITERATIONS = 100_000;
    private static final int HASH_BITS = 512;
    private static final Duration TOKEN_TTL = Duration.ofDays(30);
    private static final String DEFAULT_BIO = "愿在江南水韵与婉转清音中，寻一处心灵栖息地。";

    private final JdbcTemplate jdbcTemplate;
    private final ContentModerationService moderationService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(JdbcTemplate jdbcTemplate, ContentModerationService moderationService) {
        this.jdbcTemplate = jdbcTemplate;
        this.moderationService = moderationService;
    }

    public AuthResponse register(AuthRequest request) {
        String username = moderationService.moderateUsername(request.username());
        String password = request.password() == null ? "" : request.password();
        String nickname = hasText(request.nickname()) ? moderationService.moderateNickname(request.nickname()) : username;

        if (!hasText(username) || password.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "用户名不能为空，密码至少 6 位");
        }

        try {
            jdbcTemplate.update(
                    "INSERT INTO users (username, password_hash, nickname, bio) VALUES (?, ?, ?, ?)",
                    username,
                    hashPassword(password),
                    nickname,
                    DEFAULT_BIO
            );
        } catch (DuplicateKeyException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该用户已存在");
        }

        StoredUser user = findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "用户创建失败"));
        return new AuthResponse(createToken(user.id()), publicUser(user));
    }

    public AuthResponse login(AuthRequest request) {
        String username = normalizeUsername(request.username());
        String password = request.password() == null ? "" : request.password();
        StoredUser user = findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码不正确"));

        if (!verifyPassword(password, user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码不正确");
        }

        return new AuthResponse(createToken(user.id()), publicUser(user));
    }

    public Optional<StoredUser> currentUser(HttpServletRequest request) {
        String token = bearerToken(request);
        if (token.isBlank()) {
            return Optional.empty();
        }

        String tokenHash = hashToken(token);
        Optional<StoredUser> user = jdbcTemplate.query("""
                SELECT u.id, u.username, u.password_hash, u.nickname, u.bio
                FROM auth_tokens t
                JOIN users u ON u.id = t.user_id
                WHERE t.token_hash = ?
                  AND t.expires_at > CURRENT_TIMESTAMP
                LIMIT 1
                """, (rs, rowNum) -> new StoredUser(
                rs.getLong("id"),
                rs.getString("username"),
                rs.getString("password_hash"),
                rs.getString("nickname"),
                rs.getString("bio")
        ), tokenHash).stream().findFirst();

        user.ifPresent(value -> jdbcTemplate.update(
                "UPDATE auth_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = ?",
                tokenHash
        ));
        return user;
    }

    public StoredUser requireUser(HttpServletRequest request) {
        return currentUser(request)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录后再操作"));
    }

    public void logout(HttpServletRequest request) {
        String token = bearerToken(request);
        if (!token.isBlank()) {
            jdbcTemplate.update("DELETE FROM auth_tokens WHERE token_hash = ?", hashToken(token));
        }
    }

    public Optional<StoredUser> findByUsername(String username) {
        String normalized = normalizeUsername(username);
        return jdbcTemplate.query("""
                SELECT id, username, password_hash, nickname, bio
                FROM users
                WHERE username = ?
                LIMIT 1
                """, (rs, rowNum) -> new StoredUser(
                rs.getLong("id"),
                rs.getString("username"),
                rs.getString("password_hash"),
                rs.getString("nickname"),
                rs.getString("bio")
        ), normalized).stream().findFirst();
    }

    public PublicUser publicUser(StoredUser user) {
        return new PublicUser(user.id(), user.username(), user.nickname(), user.bio());
    }

    public String hashPassword(String password) {
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        byte[] hash = pbkdf2(password, salt);
        return HexFormat.of().formatHex(salt) + ":" + HexFormat.of().formatHex(hash);
    }

    private boolean verifyPassword(String password, String storedHash) {
        String[] parts = storedHash == null ? new String[0] : storedHash.split(":");
        if (parts.length != 2) {
            return false;
        }

        byte[] salt = HexFormat.of().parseHex(parts[0]);
        byte[] expected = HexFormat.of().parseHex(parts[1]);
        byte[] actual = pbkdf2(password, salt);
        return MessageDigest.isEqual(expected, actual);
    }

    private byte[] pbkdf2(String password, byte[] salt) {
        try {
            KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, HASH_ITERATIONS, HASH_BITS);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512").generateSecret(spec).getEncoded();
        } catch (Exception ex) {
            throw new IllegalStateException("密码加密失败", ex);
        }
    }

    private String createToken(long userId) {
        jdbcTemplate.update("DELETE FROM auth_tokens WHERE expires_at <= CURRENT_TIMESTAMP");

        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = base64Url(tokenBytes);
        jdbcTemplate.update(
                """
                INSERT INTO auth_tokens (token_hash, user_id, expires_at)
                VALUES (?, ?, ?)
                """,
                hashToken(token),
                userId,
                java.sql.Timestamp.from(Instant.now().plus(TOKEN_TTL))
        );
        return token;
    }

    private String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return "";
        }
        return header.substring(7).trim();
    }

    private String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Token hash failed", ex);
        }
    }

    private String base64Url(byte[] bytes) {
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeUsername(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    public record StoredUser(long id, String username, String passwordHash, String nickname, String bio) {
    }
}
