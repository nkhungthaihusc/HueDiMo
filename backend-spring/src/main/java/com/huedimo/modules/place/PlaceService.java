package com.huedimo.modules.place;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.huedimo.common.utils.SecurityUtils;
import com.huedimo.modules.user.User;
import com.huedimo.modules.place.dto.CreatePlaceRequest;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlaceService {
    private final PlaceRepository placeRepository;

    public List<Place> getAllPlaces(String category, String status) {
        String targetStatus = (status != null && !status.trim().isEmpty()) ? status.trim() : "approved";
        if (category != null && !category.trim().isEmpty()) {
            return placeRepository.findByStatusAndCategory(targetStatus, category.trim());
        }
        return placeRepository.findByStatusOrderByRatingDesc(targetStatus);
    }

    public Place getPlaceById(String id) {
        return placeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đại điểm với ID: " + id));
    }

    public List<Place> searchPlaces(String keyword) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return placeRepository.searchPlaces(keyword);
        }
        return List.of();
    }

    public Place createPlace(CreatePlaceRequest request) {
        User currentUser = SecurityUtils.getCurrentUser();

        String finalImageUrl = request.getImageUrl();
        List<String> finalImages = request.getImages();
        if ((finalImageUrl == null || finalImageUrl.isBlank()) && finalImages != null && !finalImages.isEmpty()) {
            finalImageUrl = finalImages.get(0);
        } else if ((finalImages == null || finalImages.isEmpty()) && finalImageUrl != null && !finalImageUrl.isBlank()) {
            finalImages = List.of(finalImageUrl);
        }

        Place place = Place.builder()
                .id("place-" + UUID.randomUUID().toString().substring(0, 8))
                .name(request.getName())
                .category(request.getCategory())
                .lat(request.getLat())
                .lng(request.getLng())
                .address(request.getAddress())
                .price(request.getPrice())
                .description(request.getDescription())
                .imageUrl(finalImageUrl)
                .openingHours(request.getOpeningHours())
                .bestTimeToVisit(request.getBestTimeToVisit())
                .estimatedDurationMinutes(request.getEstimatedDurationMinutes())
                .status("pending")
                .isLocal(true)
                .images(finalImages)
                .highlights(request.getHighlights())
                .rating(0.0)
                .createdBy(currentUser.getId())
                .build();
        return placeRepository.save(place);
    }

    public List<Place> getMyPlaces() {
        User currentUser = SecurityUtils.getCurrentUser();
        return placeRepository.findByCreatedByOrderByCreatedAtDesc(currentUser.getId());
    }
}
