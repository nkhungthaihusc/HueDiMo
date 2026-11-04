package com.huedimo.modules.itinerary;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.itinerary.dto.request.CommunityFilterRequest;
import com.huedimo.modules.itinerary.dto.request.GenerateItineraryRequest;
import com.huedimo.modules.itinerary.dto.request.SaveItineraryRequest;
import com.huedimo.modules.itinerary.dto.request.UpdateVisibilityRequest;
import com.huedimo.modules.itinerary.dto.response.CommunityItineraryListResponse;
import com.huedimo.modules.itinerary.dto.response.ItineraryResponse;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/itineraries")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ItineraryController {

    ItineraryService itineraryService;

    /**
     * POST /api/itineraries/generate
     * AI tự tạo lịch trình du lịch thông minh
     */
    @PostMapping("/generate")
    public ApiResponse<Object> generate(@Valid @RequestBody GenerateItineraryRequest request) {
        return ApiResponse.success("Khởi tạo lịch trình AI thành công", itineraryService.generateItinerary(request));
    }

    /**
     * POST /api/itineraries/save
     * Lưu hoặc cập nhật lịch trình cá nhân vào DB
     */
    @PostMapping("/save")
    public ApiResponse<ItineraryResponse> save(@Valid @RequestBody SaveItineraryRequest request) {
        return ApiResponse.success("Lưu lịch trình thành công", itineraryService.saveItinerary(request));
    }

    /**
     * GET /api/itineraries/my
     * Lấy danh sách lịch trình cá nhân của người dùng hiện tại
     */
    @GetMapping("/my")
    public ApiResponse<List<ItineraryResponse>> getMyItineraries() {
        return ApiResponse.success(itineraryService.getMyItineraries());
    }

    /**
     * GET /api/itineraries/community
     * Khám phá danh sách lịch trình cộng đồng (có bộ lọc đa chiều)
     */
    @GetMapping("/community")
    public ApiResponse<CommunityItineraryListResponse> getCommunity(@ModelAttribute CommunityFilterRequest filter) {
        return ApiResponse.success(itineraryService.getCommunityItineraries(filter));
    }

    /**
     * GET /api/itineraries/{id}
     * Xem chi tiết 1 lịch trình
     */
    @GetMapping("/{id}")
    public ApiResponse<ItineraryResponse> getById(@PathVariable UUID id) {
        return ApiResponse.success(itineraryService.getItineraryById(id));
    }

    /**
     * PATCH /api/itineraries/{id}/visibility
     * Bật/tắt trạng thái công khai (Public / Private)
     */
    @PatchMapping("/{id}/visibility")
    public ApiResponse<ItineraryResponse> toggleVisibility(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVisibilityRequest request) {
        return ApiResponse.success("Cập nhật trạng thái hiển thị thành công", itineraryService.toggleVisibility(id, request));
    }

    /**
     * POST /api/itineraries/{id}/fork
     * Nhân bản / Sử dụng lộ trình cộng đồng về tài khoản cá nhân
     */
    @PostMapping("/{id}/fork")
    public ApiResponse<ItineraryResponse> forkItinerary(@PathVariable UUID id) {
        return ApiResponse.success("Đã nạp lộ trình vào danh sách chuyến đi của bạn!", itineraryService.forkItinerary(id));
    }

    /**
     * DELETE /api/itineraries/{id}
     * Xóa lịch trình
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteItinerary(@PathVariable UUID id) {
        itineraryService.deleteItinerary(id);
        return ApiResponse.success("Xóa lịch trình thành công");
    }
}
