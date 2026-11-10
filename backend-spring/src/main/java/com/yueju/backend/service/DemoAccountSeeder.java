package com.yueju.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Optional demo data must never reset an existing user's credentials. */
@Component
public class DemoAccountSeeder {
    private final JdbcTemplate jdbc;
    private final AuthService auth;
    private final boolean enabled;
    private final String password;

    public DemoAccountSeeder(JdbcTemplate jdbc, AuthService auth,
            @Value("${yueju.demo.enabled:false}") boolean enabled,
            @Value("${yueju.demo.password:}") String password) {
        if (enabled && password.length() < 12) {
            throw new IllegalArgumentException("DEMO_PASSWORD must contain at least 12 characters when demo seeding is enabled");
        }
        this.jdbc = jdbc;
        this.auth = auth;
        this.enabled = enabled;
        this.password = password;
    }

    public void seed() {
        if (!enabled) return;
        jdbc.update("""
                INSERT INTO users (username, password_hash, nickname, bio) VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE username = username
                """, "demo", auth.hashPassword(password), "戏曲爱好者A8848",
                "愿在江南水韵与婉转清音中，寻一处心灵栖息地。");
    }
}
