package com.huedimo.modules.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

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
@Table(name = "checkins")
public class Checkin {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "place_id", nullable = false)
    String placeId;

    @Column(name = "points_earned")
    @Builder.Default
    Integer pointsEarned = 100;

    @Column(name = "note", columnDefinition = "text")
    String note;

    @CreationTimestamp
    @Column(name = "created_at")
    LocalDateTime createdAt;
}
