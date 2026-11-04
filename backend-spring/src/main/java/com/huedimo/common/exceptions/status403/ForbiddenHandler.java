package com.huedimo.common.exceptions.status403;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import com.huedimo.common.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ForbiddenHandler {

    public ApiResponse<?> handle(Exception ex) {
        if (ex instanceof AccessDeniedException) {
            log.warn("Access denied: {}", ex.getMessage());
            return ApiResponse.error("Bạn không có quyền thực hiện hành động này!");
        }

        log.warn("Forbidden error: {}", ex.getMessage());
        return ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Máy chủ từ chối quyền truy cập (403 Forbidden)");
    }
}
