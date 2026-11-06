package com.yueju.backend.controller;

import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisResponse;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisRunRequest;
import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisRunResponse;
import com.yueju.backend.service.MediaAnalysisService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MediaAnalysisController {

    private final MediaAnalysisService mediaAnalysisService;

    public MediaAnalysisController(MediaAnalysisService mediaAnalysisService) {
        this.mediaAnalysisService = mediaAnalysisService;
    }

    @GetMapping("/api/media-analyses")
    public MediaAnalysisResponse mediaAnalyses() {
        return new MediaAnalysisResponse(mediaAnalysisService.getMediaAnalyses());
    }

    @PostMapping("/api/media-analyses/analyze-local")
    public MediaAnalysisRunResponse analyzeLocal(@RequestBody MediaAnalysisRunRequest request) {
        return mediaAnalysisService.analyzeLocalMedia(request);
    }
}
