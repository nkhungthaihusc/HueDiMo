package com.huedimo.modules.review;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    // Lấy danh sách đánh giá của 1 địa điểm, sắp xếp mới nhất lên đầu
    List<Review> findByPlaceIdOrderByCreatedAtDesc(String placeId);

    // Tính điểm trung bình rating của 1 địa điểm (làm tròn 1 chữ số thập phân)
    @Query(value = "SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE place_id = :placeId", nativeQuery = true)
    Double calculateAverageRatingByPlaceId(@Param("placeId") String placeId);

    // Kiểm tra xem người dùng đã đánh giá địa điểm này chưa (nếu cần giới hạn 1 review/user)
    boolean existsByPlaceIdAndUserId(String placeId, UUID userId);
}
