package com.yueju.backend.controller;

import com.yueju.backend.dto.MediaAnalysisDtos.MediaAnalysisResponse;
import com.yueju.backend.service.MediaAnalysisService;
import org.springframework.web.bind.annotation.GetMapping;
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

}
