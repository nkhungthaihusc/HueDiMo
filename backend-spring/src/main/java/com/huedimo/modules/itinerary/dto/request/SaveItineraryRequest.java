package com.huedimo.modules.itinerary.dto.request;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SaveItineraryRequest {

    UUID id;

    @NotBlank(message = "Tiêu đề lịch trình không được để trống")
    String title;

    LocalDate startDate;

    LocalDate endDate;

    Double budget;

    Double totalEstimatedCost;

    String transportMode;

    Integer groupSize;

    String currentLocation;

    List<String> preferences;

    String summary;

    JsonNode days;

    Boolean isPublic;
}
