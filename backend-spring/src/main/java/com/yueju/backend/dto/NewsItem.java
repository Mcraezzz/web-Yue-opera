package com.yueju.backend.dto;

public record NewsItem(
        long id,
        String title,
        String category,
        String summary,
        String sourceUrl,
        String date
) {
}
