package com.huedimo.modules.itinerary;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ItineraryRepository extends JpaRepository<Itinerary, UUID>, JpaSpecificationExecutor<Itinerary> {

    List<Itinerary> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Itinerary> findByIsPublicTrueOrderByCreatedAtDesc();

    Optional<Itinerary> findFirstByUserIdAndTitleAndStartDateAndEndDateOrderByUpdatedAtDesc(
            UUID userId, String title, LocalDate startDate, LocalDate endDate);
}
