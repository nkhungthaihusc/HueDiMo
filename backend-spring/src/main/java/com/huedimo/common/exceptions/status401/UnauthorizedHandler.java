package com.huedimo.common.exceptions.status401;

import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;

import com.huedimo.common.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class UnauthorizedHandler {

    public ApiResponse<?> handle(Exception ex) {
        if (ex instanceof AuthenticationException) {
            log.warn("Authentication failed: {}", ex.getMessage());
            return ApiResponse.error("Xác thực thất bại! Thông tin đăng nhập không hợp lệ hoặc phiên làm việc đã hết hạn.");
        }

        log.warn("Unauthorized error: {}", ex.getMessage());
        return ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Yêu cầu cần có xác thực danh tính (401 Unauthorized)");
    }
}
