package com.yueju.backend.controller;

import com.yueju.backend.dto.InteractionDtos.CollectionResponse;
import com.yueju.backend.dto.InteractionDtos.CommentRequest;
import com.yueju.backend.dto.InteractionDtos.CommentResponse;
import com.yueju.backend.dto.InteractionDtos.LikeResponse;
import com.yueju.backend.dto.InteractionDtos.PlayInteraction;
import com.yueju.backend.dto.InteractionDtos.ShareResponse;
import com.yueju.backend.dto.InteractionDtos.TodayPlaylistRequest;
import com.yueju.backend.dto.InteractionDtos.TodayPlaylistResponse;
import com.yueju.backend.service.AuthService;
import com.yueju.backend.service.PlayInteractionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PlayInteractionController {

    private final AuthService authService;
    private final PlayInteractionService interactionService;

    public PlayInteractionController(AuthService authService, PlayInteractionService interactionService) {
        this.authService = authService;
        this.interactionService = interactionService;
    }

    @GetMapping("/api/play-interactions")
    public PlayInteraction interaction(@RequestParam long playId, HttpServletRequest request) {
        return interactionService.getInteraction(playId, authService.currentUser(request));
    }

    @PostMapping("/api/play-interactions/{playId}/like")
    public LikeResponse like(@PathVariable long playId, HttpServletRequest request) {
        return interactionService.toggleLike(authService.requireUser(request).id(), playId);
    }

    @PostMapping("/api/play-interactions/{playId}/collection")
    public CollectionResponse collection(@PathVariable long playId, HttpServletRequest request) {
        return interactionService.toggleCollection(authService.requireUser(request).id(), playId);
    }

    @GetMapping("/api/today-playlist/collection")
    public TodayPlaylistResponse todayPlaylistCollection(
            @RequestParam String recommendationKey,
            HttpServletRequest request
    ) {
        return interactionService.todayPlaylistCollection(
                authService.requireUser(request).id(),
                recommendationKey
        );
    }

    @PostMapping("/api/today-playlist/collection")
    public TodayPlaylistResponse todayPlaylistCollection(
            @RequestBody TodayPlaylistRequest body,
            HttpServletRequest request
    ) {
        return interactionService.toggleTodayPlaylistCollection(
                authService.requireUser(request).id(),
                body
        );
    }

    @PostMapping("/api/play-interactions/{playId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse comment(
            @PathVariable long playId,
            @RequestBody CommentRequest body,
            HttpServletRequest request
    ) {
        return interactionService.addComment(authService.requireUser(request).id(), playId, body.content());
    }

    @PostMapping("/api/play-interactions/{playId}/share")
    @ResponseStatus(HttpStatus.CREATED)
    public ShareResponse share(@PathVariable long playId, HttpServletRequest request) {
        return interactionService.recordShare(authService.requireUser(request).id(), playId);
    }
}
