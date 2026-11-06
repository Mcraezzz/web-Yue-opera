package com.yueju.backend.dto;

import java.util.List;
import java.util.Map;

public final class MediaAnalysisDtos {

    private MediaAnalysisDtos() {
    }

    public record MediaAnalysisResponse(List<MediaAnalysisItem> items) {
    }

    public record MediaAnalysisRunRequest(
            String inputPath,
            String title,
            String engine,
            Integer maxAsrSeconds,
            Integer maxAudioSeconds,
            Integer maxCaptions
    ) {
    }

    public record MediaAnalysisRunResponse(
            boolean ok,
            String message,
            String logPath,
            List<MediaAnalysisItem> items
    ) {
    }

    public record MediaAnalysisItem(
            String title,
            String type,
            String duration,
            String bvid,
            MediaAnalysis analysis
    ) {
    }

    public record MediaAnalysis(
            String summary,
            String vocal,
            String scene,
            String narrator,
            String narratorVoiceUrl,
            List<String> keywords,
            List<MediaCaption> captions,
            List<MediaMoment> moments,
            List<Integer> emotionCurve,
            Map<String, Object> audioFeatures,
            List<String> askPrompts
    ) {
        public MediaAnalysis(
                String summary,
                String vocal,
                String scene,
                String narrator,
                String narratorVoiceUrl,
                List<String> keywords,
                List<MediaCaption> captions,
                List<MediaMoment> moments,
                List<Integer> emotionCurve,
                List<String> askPrompts
        ) {
            this(summary, vocal, scene, narrator, narratorVoiceUrl, keywords, captions, moments, emotionCurve, Map.of(), askPrompts);
        }
    }

    public record MediaCaption(
            String start,
            String end,
            String text
    ) {
    }

    public record MediaMoment(
            String time,
            String title,
            String text
    ) {
    }
}
