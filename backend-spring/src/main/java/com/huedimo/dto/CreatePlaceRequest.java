package com.huedimo.dto;

import java.util.List;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CreatePlaceRequest {
    @NotBlank(message = "Tên địa điểm không đươc để trống")
    private String name;

    @NotBlank(message = "Danh mục không được để trống")
    private String category;

    @NotNull(message = "Không được để trống kinh độ")
    @DecimalMin(value = "14.9")
    @DecimalMax(value = "18.1")
    private Double lat;

    @NotNull(message = "Không được để trống vĩ độ")
    @DecimalMin(value = "105.9")
    @DecimalMax(value = "109.1")
    private Double lng;

    @Min(value = 0, message = "Giá tiền không được là số âm")
    private Long price;

    @NotBlank(message = "Địa chỉ không được để trống")
    private String address;

    private List<String> images;

    private List<String> highlights;

    private String description;

    private Long estimatedDurationMinutes;

    private String imageUrl;

    private String openingHours;

    private String bestTimeToVisit;
}
