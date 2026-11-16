package com.huedimo.modules.environment;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class EnvironmentController {
    private final RainfallService rainfall;
    private final ReverseGeocodeService geocoding;

    @GetMapping("/api/weather/rainfall")
    public ApiResponse<RainfallService.Report> rainfall() {
        return ApiResponse.success(rainfall.getRainfall());
    }

    @GetMapping("/api/reverse-geocode")
    public ApiResponse<ReverseGeocodeService.Address> reverse(@RequestParam double lat, @RequestParam double lng) {
        return ApiResponse.success(geocoding.reverse(lat, lng));
    }
}
