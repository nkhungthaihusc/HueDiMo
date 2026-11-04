package com.huedimo.common.exceptions.status503;

import org.springframework.stereotype.Component;

import com.huedimo.common.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ServiceUnavailableHandler {

    public ApiResponse<?> handle(Exception ex) {
        log.warn("Service unavailable: {}", ex.getMessage());
        return ApiResponse.error(ex.getMessage() != null
                ? ex.getMessage()
                : "Dịch vụ tạm thời không khả dụng hoặc đang bảo trì (503 Service Unavailable). Vui lòng thử lại sau!");
    }
}
