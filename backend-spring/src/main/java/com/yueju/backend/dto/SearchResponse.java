package com.yueju.backend.dto;

import java.util.List;

public record SearchResponse(List<String> categories, List<SearchItem> items) {
}
