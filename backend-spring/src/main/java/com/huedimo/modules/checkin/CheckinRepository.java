package com.huedimo.modules.checkin;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CheckinRepository extends JpaRepository<Checkin, UUID> {

    boolean existsByUserIdAndPlaceIdAndCreatedAtGreaterThanEqual(UUID userId, String placeId, LocalDateTime startOfDay);

    @Query("SELECT DISTINCT c.placeId FROM Checkin c WHERE c.userId = :userId")
    List<String> findDistinctPlaceIdsByUserId(@Param("userId") UUID userId);

    List<Checkin> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
