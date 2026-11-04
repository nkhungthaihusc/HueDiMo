package com.huedimo.modules.itinerary.reaction;

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
@Table(name = "itinerary_reactions")
public class ItineraryReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id;

    @Column(name = "itinerary_id", nullable = false)
    UUID itineraryId;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "reaction_type")
    @Builder.Default
    String reactionType = "like";

    @CreationTimestamp
    @Column(name = "created_at")
    LocalDateTime createdAt;
}
