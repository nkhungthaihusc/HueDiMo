package com.huedimo.common.exceptions.status405;

import org.springframework.stereotype.Component;
import org.springframework.web.HttpRequestMethodNotSupportedException;

import com.huedimo.common.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class MethodNotAllowedHandler {

    public ApiResponse<?> handle(HttpRequestMethodNotSupportedException ex) {
        String msg = String.format("Phương thức HTTP '%s' không được hỗ trợ cho endpoint này (405 Method Not Allowed)", ex.getMethod());
        log.warn("Method not allowed: {}", msg);
        return ApiResponse.error(msg);
    }
}
