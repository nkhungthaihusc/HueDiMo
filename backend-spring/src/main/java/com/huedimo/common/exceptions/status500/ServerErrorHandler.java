package com.huedimo.common.exceptions.status500;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;

import com.huedimo.common.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ServerErrorHandler {

    public ApiResponse<?> handle(Exception ex) {
        if (ex instanceof DataAccessException dataEx) {
            log.error("Database connection/query error: ", dataEx);
            return ApiResponse.error("Lỗi cơ sở dữ liệu hoặc hệ thống. Vui lòng thử lại sau!");
        }

        log.error("Unhandled internal server error: ", ex);
        return ApiResponse.error("Đã xảy ra lỗi hệ thống không mong muốn (500 Internal Server Error). Vui lòng thử lại sau!");
    }
}
