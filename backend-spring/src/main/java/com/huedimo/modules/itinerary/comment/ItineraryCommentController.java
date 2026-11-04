package com.huedimo.modules.itinerary.comment;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.itinerary.comment.dto.request.CreateCommentRequest;
import com.huedimo.modules.itinerary.comment.dto.response.ItineraryCommentResponse;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/itineraries/{id}/comments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ItineraryCommentController {

    ItineraryCommentService commentService;

    /**
     * GET /api/itineraries/{id}/comments
     * Lấy danh sách bình luận / góp ý của lịch trình
     */
    @GetMapping
    public ApiResponse<List<ItineraryCommentResponse>> getComments(@PathVariable UUID id) {
        return ApiResponse.success(commentService.getComments(id));
    }

    /**
     * POST /api/itineraries/{id}/comments
     * Viết bình luận / đánh giá mới cho lịch trình
     */
    @PostMapping
    public ApiResponse<ItineraryCommentResponse> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCommentRequest request) {
        return ApiResponse.success("Gửi bình luận thành công!", commentService.addComment(id, request));
    }

    /**
     * DELETE /api/itineraries/{id}/comments/{commentId}
     * Xóa bình luận
     */
    @DeleteMapping("/{commentId}")
    public ApiResponse<Void> deleteComment(
            @PathVariable UUID id,
            @PathVariable UUID commentId) {
        commentService.deleteComment(id, commentId);
        return ApiResponse.success("Xóa bình luận thành công");
    }
}
