package com.yueju.backend;

import com.yueju.backend.service.AuthService;
import com.yueju.backend.service.DemoAccountSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DemoAccountSeederTests {
    @Test
    void disabledSeedingNeverAccessesDatabase() {
        var jdbc = mock(JdbcTemplate.class);
        var auth = mock(AuthService.class);
        new DemoAccountSeeder(jdbc, auth, false, "").seed();
        verifyNoInteractions(jdbc, auth);
    }

    @Test
    void explicitSeedingRequiresStrongPasswordAndNeverUpdatesExistingCredentials() {
        var jdbc = mock(JdbcTemplate.class);
        var auth = mock(AuthService.class);
        assertThrows(IllegalArgumentException.class, () -> new DemoAccountSeeder(jdbc, auth, true, "123456"));
        when(auth.hashPassword("test-long-password")).thenReturn("hash");
        new DemoAccountSeeder(jdbc, auth, true, "test-long-password").seed();
        verify(jdbc).update(argThat((String sql) -> {
            String updateClause = sql.substring(sql.indexOf("ON DUPLICATE KEY UPDATE"));
            return !updateClause.contains("password_hash") && !updateClause.contains("nickname") && !updateClause.contains("bio");
        }), eq("demo"), eq("hash"), anyString(), anyString());
    }
}
