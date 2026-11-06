package com.yueju.backend.dto;

public record PlayItem(
        long id,
        String title,
        String category,
        String desc,
        String imageKey,
        int likeCount,
        int collectionCount
) {
}
