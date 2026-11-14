package com.huedimo.modules.itinerary.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
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
public class GenerateItineraryRequest {

    @NotBlank(message = "Ngày bắt đầu không được để trống")
    String startDate;

    @NotBlank(message = "Ngày kết thúc không được để trống")
    String endDate;

    @Positive(message = "Ngân sách phải là số dương")
    Double budget;

    @NotEmpty(message = "Chọn ít nhất một sở thích")
    List<String> preferences;

    String currentLocation;

    @Pattern(regexp = "motorbike|car|bicycle|walking", message = "Phương tiện di chuyển không hợp lệ")
    String transportMode;

    @Positive(message = "Số lượng người phải là số nguyên dương")
    Double groupSize;

    String startPlaceId;

    String endPlaceId;

    String notes;

    List<PlaceInputDto> places;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PlaceInputDto {
        String id;
        String name;
        Double lat;
        Double lng;
        String category;
        Long price;
        Double rating;
        String description;
    }
}
