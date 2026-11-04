package com.huedimo.modules.itinerary;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "itineraries")
public class Itinerary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "title", nullable = false)
    String title;

    @Column(name = "start_date")
    LocalDate startDate;

    @Column(name = "end_date")
    LocalDate endDate;

    @Column(name = "budget")
    Double budget;

    @Column(name = "total_estimated_cost")
    Double totalEstimatedCost;

    @Column(name = "transport_mode")
    String transportMode;

    @Column(name = "group_size")
    Integer groupSize;

    @Column(name = "current_location")
    String currentLocation;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "preferences", columnDefinition = "text[]")
    List<String> preferences;

    @Column(name = "summary", columnDefinition = "text")
    String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "days", columnDefinition = "jsonb")
    JsonNode days;

    @Column(name = "is_public")
    @Builder.Default
    Boolean isPublic = false;

    @Column(name = "views_count")
    @Builder.Default
    Long viewsCount = 0L;

    @Column(name = "likes_count")
    @Builder.Default
    Long likesCount = 0L;

    @Column(name = "bookmarks_count")
    @Builder.Default
    Long bookmarksCount = 0L;

    @Column(name = "forks_count")
    @Builder.Default
    Long forksCount = 0L;

    @Column(name = "rating")
    Double rating;

    @CreationTimestamp
    @Column(name = "created_at")
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
