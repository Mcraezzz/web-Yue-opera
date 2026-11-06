package com.yueju.backend.dto;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record AuthRequest(String username, String password, String nickname) {
    }

    public record PublicUser(long id, String username, String nickname, String bio) {
    }

    public record AuthResponse(String token, PublicUser user) {
    }
}
