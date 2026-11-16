package com.huedimo.modules.place;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    String ADMIN_FILTERS = """
            FROM places
            WHERE (:keyword = '' OR name ILIKE concat('%', :keyword, '%')
                  OR address ILIKE concat('%', :keyword, '%') OR description ILIKE concat('%', :keyword, '%'))
              AND (:category = '' OR category = :category)
              AND (:status = '' OR status = :status)
            """;

    @Query(value = "SELECT * " + ADMIN_FILTERS + "ORDER BY created_at DESC NULLS LAST, name, id",
            countQuery = "SELECT count(*) " + ADMIN_FILTERS, nativeQuery = true)
    Page<Place> findForAdmin(String keyword, String category, String status, Pageable pageable);

    @Query(value = "SELECT * FROM places ORDER BY coalesce(updated_at, created_at) DESC NULLS LAST, id LIMIT 5",
            nativeQuery = true)
    List<Place> findRecentForAdmin();

    @Modifying
    @Query(value = """
            UPDATE places SET status = :status, updated_at = now() WHERE id = :id AND status IS DISTINCT FROM :status
            """, nativeQuery = true)
    int updateModerationStatus(String id, String status);
}
