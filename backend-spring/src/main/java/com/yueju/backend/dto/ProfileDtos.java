package com.yueju.backend.dto;

import java.util.List;
import java.util.Map;

import com.yueju.backend.dto.AuthDtos.PublicUser;

public final class ProfileDtos {
    private ProfileDtos() {
    }

    public record ProfileItem(String title, String desc, String time, String path) {
    }

    public record HistoryRequest(String title, String desc, String path) {
    }

    public record ProfileResponse(PublicUser user, Map<String, List<ProfileItem>> activities) {
    }
}
