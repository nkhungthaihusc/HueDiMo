package com.huedimo.modules.itinerary.comment.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ItineraryCommentResponse {
    UUID id;
    UUID itineraryId;
    UUID userId;
    String userName;
    String userAvatar;
    String userRole;
    String content;
    Integer rating;
    LocalDateTime createdAt;
}
