package com.huedimo.modules.admin;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.place.Place;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminPlaceController {
    private final AdminPlaceService service;

    @GetMapping("/stats")
    public ApiResponse<AdminPlaceService.Dashboard> stats() {
        return ApiResponse.success(service.stats());
    }

    @GetMapping("/places")
    public ApiResponse<AdminPage<Place>> places(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "all") String status) {
        return ApiResponse.success(service.list(page, limit, q, category, status));
    }

    @PatchMapping("/places/{id}/status")
    public ApiResponse<Place> updateStatus(@PathVariable String id, @Valid @RequestBody StatusRequest request) {
        return ApiResponse.success(service.updateStatus(id, request.status()));
    }

    public record StatusRequest(
            @NotNull(message = "Thiếu trạng thái địa điểm")
            @Pattern(regexp = "pending|approved|rejected", message = "Trạng thái địa điểm không hợp lệ")
            String status) {}
}
