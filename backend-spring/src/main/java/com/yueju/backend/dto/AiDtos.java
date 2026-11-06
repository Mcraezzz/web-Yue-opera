package com.yueju.backend.dto;

import java.util.List;

public final class AiDtos {
    private AiDtos() {
    }

    public record ChatRequest(String message) {
    }

    public record VisionRequest(String message, String imageDataUrl, String prompt) {
    }

    public record ChatResponse(String reply) {
    }

    public record ChatMessage(String role, String content, String createdAt) {
    }

    public record ChatHistoryResponse(List<ChatMessage> items) {
    }

    public record ImageRequest(String prompt, String displayPrompt) {
    }

    public record ImageResponse(String imageUrl, Long id) {
    }

    public record ImageHistoryItem(Long id, String prompt, String imageUrl, String createdAt) {
    }

    public record ImageHistoryResponse(List<ImageHistoryItem> items) {
    }
}
