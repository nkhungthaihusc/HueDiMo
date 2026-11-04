package com.huedimo.modules.itinerary.bookmark;

import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.itinerary.bookmark.dto.response.BookmarkResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/itineraries/{id}/bookmark")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ItineraryBookmarkController {

    ItineraryBookmarkService bookmarkService;

    /**
     * POST /api/itineraries/{id}/bookmark
     * Đánh dấu lưu trữ (Bookmark) / Hủy đánh dấu
     */
    @PostMapping
    public ApiResponse<BookmarkResponse> toggleBookmark(@PathVariable UUID id) {
        return ApiResponse.success("Cập nhật lưu trữ thành công", bookmarkService.toggleBookmark(id));
    }
}
