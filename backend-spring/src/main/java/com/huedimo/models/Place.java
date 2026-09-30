package com.huedimo.models;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "places")
public class Place {

    @Id
    private String id;

    private String name;

    private String category;

    private Double lat;

    private Double lng;

    private String address;

    private Long price;

    @Column(name = "is_local")
    private Boolean isLocal;

    @Column(name = "opening_hours")
    private String openingHours;

    @Column(name = "estimated_duration_minutes")
    private Long estimatedDurationMinutes;

    @Column(name = "best_time_to_visit")
    private String bestTimeToVisit;

    private Double rating;

    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "images", columnDefinition = "text[]")
    private List<String> images;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "highlights", columnDefinition = "text[]")
    private List<String> highlights;

    private String status;

    @Column(name = "created_by")
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

}
