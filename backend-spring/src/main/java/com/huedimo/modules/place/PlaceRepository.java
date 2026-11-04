package com.huedimo.modules.place;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlaceRepository extends JpaRepository<Place, String> {
    // Tìm theo ID
    Optional<Place> findById(String id);

    // Tìm theo status và sắp xếp theo rating giảm dầm
    List<Place> findByStatusOrderByRatingDesc(String status);

    // Tìm theo status và category
    List<Place> findByStatusAndCategory(String status, String category);

    // Lấy danh sách địa điểm do 1 user tạo, sắp xếp mới nhất lên đầu
    List<Place> findByCreatedByOrderByCreatedAtDesc(UUID createdBy);

    @Query(value = "select * from places where status = 'approved' " +
            "and (name ilike concat('%', :keyword, '%') " +
            "or address ilike concat('%', :keyword, '%') " +
            "or category ilike concat('%', :keyword, '%'))"

            , nativeQuery = true)
    List<Place> searchPlaces(@Param("keyword") String keyword);
}
