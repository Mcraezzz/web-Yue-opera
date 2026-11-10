package com.yueju.backend.controller;

import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisRunRequest;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisRunResponse;
import com.yueju.backend.service.MediaAnalysisService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** An opt-in operator endpoint, separate from the public read API. */
@RestController
@ConditionalOnProperty(name = "yueju.media.local-analysis-enabled", havingValue = "true")
public class MediaAnalysisAdminController {
    private final MediaAnalysisService service;
    private final byte[] operatorKey;

    public MediaAnalysisAdminController(MediaAnalysisService service,
            @Value("${yueju.media.operator-key:}") String operatorKey) {
        if (operatorKey.length() < 32) {
            throw new IllegalArgumentException("MEDIA_OPERATOR_KEY must contain at least 32 characters when local analysis is enabled");
        }
        this.service = service;
        this.operatorKey = operatorKey.getBytes(StandardCharsets.UTF_8);
    }

    @PostMapping("/api/media-analyses/analyze-local")
    public MediaAnalysisRunResponse analyzeLocal(@RequestBody MediaAnalysisRunRequest request,
            @RequestHeader(value = "X-Media-Operator-Key", defaultValue = "") String key) {
        if (!MessageDigest.isEqual(operatorKey, key.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "需要媒体运维凭证");
        }
        return service.analyzeLocalMedia(request);
    }
}
