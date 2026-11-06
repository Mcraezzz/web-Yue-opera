package com.yueju.backend.dto;

public record SearchItem(
        String title,
        String category,
        String desc,
        String path,
        double score,
        String matchedBy,
        String source
) {
    public SearchItem(String title, String category, String desc) {
        this(title, category, desc, "", 0, "关键词匹配", "");
    }
}
