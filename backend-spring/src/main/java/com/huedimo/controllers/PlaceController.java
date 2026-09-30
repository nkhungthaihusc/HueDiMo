package com.huedimo.controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.dto.ApiResponse;
import com.huedimo.dto.CreatePlaceRequest;
import com.huedimo.models.Place;
import com.huedimo.services.PlaceService;

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
        return ApiResponse.success(placeService.createPlace(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<Place> getPlaceById(@PathVariable String id) {
        return ApiResponse.success(placeService.getPlaceById(id));
    }

}
