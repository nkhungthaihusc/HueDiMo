package com.huedimo.modules.itinerary.comment;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ItineraryCommentRepository extends JpaRepository<ItineraryComment, UUID> {

    List<ItineraryComment> findByItineraryIdOrderByCreatedAtAsc(UUID itineraryId);

    long countByItineraryId(UUID itineraryId);

    @Query(value = "SELECT ROUND(AVG(rating)::numeric, 1) FROM itinerary_comments WHERE itinerary_id = :itineraryId AND rating IS NOT NULL", nativeQuery = true)
    Double calculateAverageRatingByItineraryId(@Param("itineraryId") UUID itineraryId);

    void deleteByItineraryId(UUID itineraryId);
}
