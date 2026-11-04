package com.huedimo.modules.review;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.huedimo.common.utils.SecurityUtils;
import com.huedimo.modules.user.User;
import com.huedimo.modules.place.Place;
import com.huedimo.modules.place.PlaceRepository;
import com.huedimo.modules.review.dto.CreateReviewRequest;
import com.huedimo.modules.review.dto.ReviewResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewService {
    ReviewRepository reviewRepository;
    PlaceRepository placeRepository;

    public List<ReviewResponse> getPlaceReviews(String placeId) {
        return reviewRepository.findByPlaceIdOrderByCreatedAtDesc(placeId).stream()
                .map(this::toReviewResponse)
                .toList();
    }

    @Transactional
    public ReviewResponse createReview(String placeId, CreateReviewRequest request) {
        final User user = SecurityUtils.getCurrentUser();

        // 1. Kiểm tra địa điểm có tồn tại không
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa điểm với ID: " + placeId));

        // 2. Kiểm tra nếu người dùng đã đánh giá địa điểm này rồi thì không cho đánh giá lại
        if (reviewRepository.existsByPlaceIdAndUserId(placeId, user.getId())) {
            throw new RuntimeException("Bạn đã đánh giá địa điểm này rồi!");
        }

        // 3. Khởi tạo đối tượng Review bằng Builder
        String authorName = (user.getName() != null && !user.getName().isBlank())
                ? user.getName()
                : user.getEmail();

        Review review = Review.builder()
                .placeId(placeId)
                .userId(user.getId())
                .authorName(authorName)
                .rating(request.getRating())
                .comment(request.getComment())
                .images(request.getImages())
                .build();

        // Lưu review vào database
        Review savedReview = reviewRepository.saveAndFlush(review);

        // 4. Tính toán và cập nhật điểm rating trung bình cho Place
        Double avgRating = reviewRepository.calculateAverageRatingByPlaceId(placeId);
        if (avgRating != null) {
            place.setRating(avgRating);
            placeRepository.save(place);
        }

        return toReviewResponse(savedReview);
    }

    private ReviewResponse toReviewResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .placeId(review.getPlaceId())
                .userId(review.getUserId())
                .authorName(review.getAuthorName())
                .rating(review.getRating())
                .comment(review.getComment())
                .images(review.getImages())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
