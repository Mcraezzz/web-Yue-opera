package com.yueju.backend.controller;

import com.yueju.backend.dto.ApiListResponse;
import com.yueju.backend.dto.HealthResponse;
import com.yueju.backend.dto.NewsItem;
import com.yueju.backend.dto.PlayItem;
import com.yueju.backend.dto.SearchResponse;
import com.yueju.backend.service.ContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/api/health")
    public HealthResponse health() {
        return new HealthResponse(true, contentService.databaseStatus());
    }

    @GetMapping("/api/plays")
    public ApiListResponse<PlayItem> plays() {
        return new ApiListResponse<>(contentService.getPlays());
    }

    @GetMapping("/api/news")
    public ApiListResponse<NewsItem> news() {
        return new ApiListResponse<>(contentService.getNews());
    }

    @GetMapping("/api/search")
    public SearchResponse search(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "全部") String category
    ) {
        return new SearchResponse(contentService.getCategories(), contentService.search(keyword, category));
    }
}
