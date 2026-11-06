package com.yueju.backend.dto;

import java.util.List;

public final class InteractionDtos {
    private InteractionDtos() {
    }

    public record PlayComment(long id, String content, String nickname, String createdAt) {
    }

    public record PlayInteraction(
            boolean liked,
            boolean collected,
            int likeCount,
            int collectionCount,
            int shareCount,
            List<PlayComment> comments
    ) {
    }

    public record LikeResponse(boolean liked, int likeCount) {
    }

    public record CollectionResponse(boolean collected, int collectionCount) {
    }

    public record TodayPlaylistRequest(
            String recommendationKey,
            String playTitle,
            String displayTitle,
            String performer,
            String lyric
    ) {
    }

    public record TodayPlaylistResponse(boolean collected) {
    }

    public record ShareResponse(int shareCount) {
    }

    public record CommentRequest(String content) {
    }

    public record CommentResponse(PlayComment comment) {
    }
}
