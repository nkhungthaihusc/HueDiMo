package com.huedimo.modules.place;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.place.dto.CreatePlaceRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceController {
    private final PlaceService placeService;

    @GetMapping
    public ApiResponse<List<Place>> getPlaces(@RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {
        return ApiResponse.success(placeService.getAllPlaces(category, status));
    }

    @GetMapping("/search")
    public ApiResponse<List<Place>> searchPlaces(
            @RequestParam(name = "q", required = false, defaultValue = "") String query) {
        return ApiResponse.success(placeService.searchPlaces(query));
    }

    @PostMapping
    public ApiResponse<Place> createPlace(@Valid @RequestBody CreatePlaceRequest request) {
        return ApiResponse.success("Đóng góp địa điểm thành công! Địa điểm đang được chờ Ban Quản Trị phê duyệt.",
                placeService.createPlace(request));
    }

    @GetMapping("/my")
    public ApiResponse<List<Place>> getMyPlaces() {
        return ApiResponse.success(placeService.getMyPlaces());
    }

    @GetMapping("/{id}")
    public ApiResponse<Place> getPlaceById(@PathVariable String id) {
        return ApiResponse.success(placeService.getPlaceById(id));
    }

}
