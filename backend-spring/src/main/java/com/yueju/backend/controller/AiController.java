package com.yueju.backend.controller;

import com.yueju.backend.dto.AiDtos.ChatRequest;
import com.yueju.backend.dto.AiDtos.ChatHistoryResponse;
import com.yueju.backend.dto.AiDtos.ChatResponse;
import com.yueju.backend.dto.AiDtos.ImageHistoryResponse;
import com.yueju.backend.dto.AiDtos.ImageRequest;
import com.yueju.backend.dto.AiDtos.ImageResponse;
import com.yueju.backend.dto.AiDtos.VisionRequest;
import com.yueju.backend.service.AuthService;
import com.yueju.backend.service.AiService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
public class AiController {

    private final AiService aiService;
    private final AuthService authService;

    public AiController(AiService aiService, AuthService authService) {
        this.aiService = aiService;
        this.authService = authService;
    }

    @PostMapping("/api/ai/chat")
    public ChatResponse chat(@RequestBody ChatRequest request, HttpServletRequest servletRequest) {
        long userId = authService.requireUser(servletRequest).id();
        return new ChatResponse(aiService.chat(userId, request.message()));
    }

    @PostMapping(value = "/api/ai/chat/stream", produces = MediaType.TEXT_PLAIN_VALUE)
    public StreamingResponseBody streamChat(@RequestBody ChatRequest request, HttpServletRequest servletRequest) {
        long userId = authService.requireUser(servletRequest).id();
        return outputStream -> aiService.streamChat(userId, request.message(), outputStream);
    }

    @PostMapping("/api/ai/chat/vision")
    public ChatResponse vision(@RequestBody VisionRequest request, HttpServletRequest servletRequest) {
        long userId = authService.requireUser(servletRequest).id();
        return new ChatResponse(aiService.vision(
                userId,
                request.message(),
                request.imageDataUrl(),
                request.prompt()
        ));
    }

    @GetMapping("/api/ai/chat/history")
    public ChatHistoryResponse chatHistory(HttpServletRequest request) {
        long userId = authService.requireUser(request).id();
        return new ChatHistoryResponse(aiService.chatHistory(userId));
    }

    @DeleteMapping("/api/ai/chat/history")
    public void clearChatHistory(HttpServletRequest request) {
        long userId = authService.requireUser(request).id();
        aiService.clearChatHistory(userId);
    }

    @PostMapping("/api/ai/image")
    public ImageResponse image(@RequestBody ImageRequest request, HttpServletRequest servletRequest) {
        long userId = authService.requireUser(servletRequest).id();
        var result = aiService.image(userId, request.prompt(), request.displayPrompt());
        return new ImageResponse(result.imageUrl(), result.id());
    }

    @GetMapping("/api/ai/image/history")
    public ImageHistoryResponse imageHistory(HttpServletRequest request) {
        long userId = authService.requireUser(request).id();
        return new ImageHistoryResponse(aiService.imageHistory(userId));
    }

    @GetMapping("/api/ai/image/file/{fileName:.+}")
    public ResponseEntity<Resource> imageFile(@PathVariable String fileName) throws IOException {
        Path imagePath = aiService.resolveGeneratedImage(fileName);
        String contentType = Files.probeContentType(imagePath);
        MediaType mediaType = contentType == null ? MediaType.IMAGE_JPEG : MediaType.parseMediaType(contentType);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000")
                .body(new FileSystemResource(imagePath));
    }

    @DeleteMapping("/api/ai/image/history")
    public void clearImageHistory(HttpServletRequest request) {
        long userId = authService.requireUser(request).id();
        aiService.clearImageHistory(userId);
    }

    @DeleteMapping("/api/ai/image/history/{id}")
    public void deleteImageHistoryItem(@PathVariable long id, HttpServletRequest request) {
        long userId = authService.requireUser(request).id();
        aiService.deleteImageHistoryItem(userId, id);
    }
}
