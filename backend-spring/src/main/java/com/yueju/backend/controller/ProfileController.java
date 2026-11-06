package com.yueju.backend.controller;

import com.yueju.backend.dto.ProfileDtos.HistoryRequest;
import com.yueju.backend.dto.ProfileDtos.ProfileItem;
import com.yueju.backend.dto.ProfileDtos.ProfileResponse;
import com.yueju.backend.service.AuthService;
import com.yueju.backend.service.PlayInteractionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ProfileController {

    private final AuthService authService;
    private final PlayInteractionService interactionService;

    public ProfileController(AuthService authService, PlayInteractionService interactionService) {
        this.authService = authService;
        this.interactionService = interactionService;
    }

    @GetMapping("/api/profile")
    public ProfileResponse profile(HttpServletRequest request) {
        AuthService.StoredUser user = authService.requireUser(request);
        return new ProfileResponse(
                authService.publicUser(user),
                interactionService.profileActivities(user.id())
        );
    }

    @PostMapping("/api/history")
    public void recordHistory(@RequestBody HistoryRequest body, HttpServletRequest request) {
        AuthService.StoredUser user = authService.requireUser(request);
        interactionService.recordHistory(user.id(), body.title(), body.desc(), body.path());
    }

    @GetMapping("/api/history")
    public List<ProfileItem> browsingHistory(HttpServletRequest request) {
        AuthService.StoredUser user = authService.requireUser(request);
        return interactionService.browsingHistory(user.id());
    }

    @DeleteMapping("/api/history")
    public void clearHistory(HttpServletRequest request) {
        AuthService.StoredUser user = authService.requireUser(request);
        interactionService.clearHistory(user.id());
    }
}
