package com.huedimo.common.exceptions.status409;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import com.huedimo.common.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ConflictHandler {

    public ApiResponse<?> handle(Exception ex) {
        if (ex instanceof DataIntegrityViolationException dataEx) {
            log.error("Data integrity violation: ", dataEx);
            String message = "Dữ liệu bị xung đột hoặc vi phạm ràng buộc toàn vẹn cơ sở dữ liệu!";
            if (dataEx.getMessage() != null && dataEx.getMessage().toLowerCase().contains("duplicate")) {
                message = "Dữ liệu đã tồn tại trong hệ thống (trùng lặp khóa duy nhất).";
            }
            return ApiResponse.error(message);
        }

        log.warn("Conflict exception: {}", ex.getMessage());
        return ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Xảy ra xung đột khi xử lý yêu cầu (409 Conflict)");
    }
}
