package com.huedimo.common.exceptions.status404;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.huedimo.common.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class NotFoundHandler {

    public ApiResponse<?> handle(Exception ex) {
        if (ex instanceof NoResourceFoundException noResEx) {
            String msg = String.format("Đường dẫn '/%s' không tồn tại trên hệ thống (404 Not Found)", noResEx.getResourcePath());
            log.warn("Resource path not found: {}", msg);
            return ApiResponse.error(msg);
        }

        log.warn("Not found: {}", ex.getMessage());
        return ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Không tìm thấy tài nguyên yêu cầu (404 Not Found)");
    }
}
