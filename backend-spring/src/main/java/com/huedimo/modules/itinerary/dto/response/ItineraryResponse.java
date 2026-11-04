package com.huedimo.modules.itinerary.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

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
public class ItineraryResponse {
    UUID id;
    UUID userId;
    String title;
    LocalDate startDate;
    LocalDate endDate;
    Integer daysCount;
    Double budget;
    Double totalEstimatedCost;
    String transportMode;
    Integer groupSize;
    String currentLocation;
    List<String> preferences;
    String summary;
    JsonNode days;
    Boolean isPublic;
    Long viewsCount;
    Long likesCount;
    Long bookmarksCount;
    Long forksCount;
    Double rating;
    String authorName;
    String authorAvatar;
    String authorRole;
    Boolean isLiked;
    Boolean isBookmarked;
    Long commentsCount;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
