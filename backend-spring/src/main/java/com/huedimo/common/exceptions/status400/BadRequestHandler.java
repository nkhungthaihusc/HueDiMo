package com.huedimo.common.exceptions.status400;

import java.util.stream.Collectors;

import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingPathVariableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.huedimo.common.dto.ApiResponse;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class BadRequestHandler {

    public ApiResponse<?> handle(Exception ex) {
        if (ex instanceof MethodArgumentNotValidException validEx) {
            String errorMsg = validEx.getBindingResult().getFieldErrors().stream()
                    .map(DefaultMessageSourceResolvable::getDefaultMessage)
                    .collect(Collectors.joining("; "));
            if (errorMsg.isBlank()) {
                errorMsg = "Dữ liệu yêu cầu không hợp lệ";
            }
            log.warn("Validation error: {}", errorMsg);
            return ApiResponse.error(errorMsg);
        }

        if (ex instanceof ConstraintViolationException constraintEx) {
            String errorMsg = constraintEx.getConstraintViolations().stream()
                    .map(ConstraintViolation::getMessage)
                    .collect(Collectors.joining("; "));
            log.warn("Constraint violation: {}", errorMsg);
            return ApiResponse.error(errorMsg.isBlank() ? "Tham số yêu cầu không hợp lệ" : errorMsg);
        }

        if (ex instanceof HandlerMethodValidationException) {
            log.warn("Handler method validation error: {}", ex.getMessage());
            return ApiResponse.error("Dữ liệu tham số phương thức không thỏa mãn điều kiện hợp lệ");
        }

        if (ex instanceof HttpMessageNotReadableException) {
            log.warn("Malformed JSON request: {}", ex.getMessage());
            return ApiResponse.error("Dữ liệu JSON gửi lên không hợp lệ hoặc sai định dạng");
        }

        if (ex instanceof MethodArgumentTypeMismatchException mismatchEx) {
            String requiredType = mismatchEx.getRequiredType() != null ? mismatchEx.getRequiredType().getSimpleName() : "hợp lệ";
            String msg = String.format("Tham số '%s' nhận giá trị '%s' không đúng định dạng (%s)",
                    mismatchEx.getName(), mismatchEx.getValue(), requiredType);
            log.warn("Argument type mismatch: {}", msg);
            return ApiResponse.error(msg);
        }

        if (ex instanceof MissingServletRequestParameterException paramEx) {
            String msg = String.format("Thiếu tham số bắt buộc trong URL query: '%s'", paramEx.getParameterName());
            log.warn("Missing parameter: {}", msg);
            return ApiResponse.error(msg);
        }

        if (ex instanceof MissingPathVariableException pathEx) {
            String msg = String.format("Thiếu biến đường dẫn bắt buộc: '%s'", pathEx.getVariableName());
            log.warn("Missing path variable: {}", msg);
            return ApiResponse.error(msg);
        }

        if (ex instanceof MaxUploadSizeExceededException) {
            log.warn("Upload size exceeded: {}", ex.getMessage());
            return ApiResponse.error("Kích thước tệp tin tải lên vượt quá giới hạn tối đa cho phép!");
        }

        // BadRequestException hoặc RuntimeException thông thường
        log.warn("Bad request exception: {}", ex.getMessage());
        return ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Yêu cầu không hợp lệ (400 Bad Request)");
    }
}
