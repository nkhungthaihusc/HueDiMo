package com.huedimo.modules.itinerary.reaction;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItineraryReactionRepository extends JpaRepository<ItineraryReaction, UUID> {

    Optional<ItineraryReaction> findByItineraryIdAndUserId(UUID itineraryId, UUID userId);

    boolean existsByItineraryIdAndUserId(UUID itineraryId, UUID userId);

    long countByItineraryId(UUID itineraryId);

    void deleteByItineraryIdAndUserId(UUID itineraryId, UUID userId);

    void deleteByItineraryId(UUID itineraryId);
}
