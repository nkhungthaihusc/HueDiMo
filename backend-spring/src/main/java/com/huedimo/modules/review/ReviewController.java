package com.huedimo.modules.review;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.review.dto.CreateReviewRequest;
import com.huedimo.modules.review.dto.ReviewResponse;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/places/{placeId}/reviews")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewController {
    ReviewService reviewService;

    @GetMapping
    public ApiResponse<List<ReviewResponse>> getPlaceReviews(@PathVariable String placeId) {
        return ApiResponse.success(reviewService.getPlaceReviews(placeId));
    }

    @PostMapping
    public ApiResponse<ReviewResponse> createReview(
            @PathVariable String placeId,
            @Valid @RequestBody CreateReviewRequest request) {
        return ApiResponse.success("Đánh giá địa điểm thành công!", reviewService.createReview(placeId, request));
    }
}
