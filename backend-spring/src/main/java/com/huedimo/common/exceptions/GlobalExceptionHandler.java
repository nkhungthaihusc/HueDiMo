package com.huedimo.common.exceptions;

import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingPathVariableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.common.exceptions.status400.BadRequestException;
import com.huedimo.common.exceptions.status400.BadRequestHandler;
import com.huedimo.common.exceptions.status401.UnauthorizedException;
import com.huedimo.common.exceptions.status401.UnauthorizedHandler;
import com.huedimo.common.exceptions.status403.ForbiddenException;
import com.huedimo.common.exceptions.status403.ForbiddenHandler;
import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.common.exceptions.status404.NotFoundHandler;
import com.huedimo.common.exceptions.status405.MethodNotAllowedHandler;
import com.huedimo.common.exceptions.status409.ConflictException;
import com.huedimo.common.exceptions.status409.ConflictHandler;
import com.huedimo.common.exceptions.status500.ServerErrorException;
import com.huedimo.common.exceptions.status500.ServerErrorHandler;
import com.huedimo.common.exceptions.status503.ServiceUnavailableException;
import com.huedimo.common.exceptions.status503.ServiceUnavailableHandler;

import jakarta.validation.ConstraintViolationException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestControllerAdvice
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GlobalExceptionHandler {

    BadRequestHandler badRequestHandler;
    UnauthorizedHandler unauthorizedHandler;
    ForbiddenHandler forbiddenHandler;
    NotFoundHandler notFoundHandler;
    MethodNotAllowedHandler methodNotAllowedHandler;
    ConflictHandler conflictHandler;
    ServerErrorHandler serverErrorHandler;
    ServiceUnavailableHandler serviceUnavailableHandler;

    // ==========================================
    // 400: BAD REQUEST
    // ==========================================
    @ExceptionHandler({
        BadRequestException.class,
        MethodArgumentNotValidException.class,
        ConstraintViolationException.class,
        HandlerMethodValidationException.class,
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class,
        MissingPathVariableException.class,
        MaxUploadSizeExceededException.class,
        RuntimeException.class
    })
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<?> handleBadRequest(Exception ex) {
        return badRequestHandler.handle(ex);
    }

    // ==========================================
    // 401: UNAUTHORIZED
    // ==========================================
    @ExceptionHandler({
        UnauthorizedException.class,
        AuthenticationException.class
    })
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResponse<?> handleUnauthorized(Exception ex) {
        return unauthorizedHandler.handle(ex);
    }

    // ==========================================
    // 403: FORBIDDEN
    // ==========================================
    @ExceptionHandler({
        ForbiddenException.class,
        AccessDeniedException.class
    })
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<?> handleForbidden(Exception ex) {
        return forbiddenHandler.handle(ex);
    }

    // ==========================================
    // 404: NOT FOUND
    // ==========================================
    @ExceptionHandler({
        NotFoundException.class,
        NoResourceFoundException.class
    })
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<?> handleNotFound(Exception ex) {
        return notFoundHandler.handle(ex);
    }

    // ==========================================
    // 405: METHOD NOT ALLOWED
    // ==========================================
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public ApiResponse<?> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex) {
        return methodNotAllowedHandler.handle(ex);
    }

    // ==========================================
    // 409: CONFLICT
    // ==========================================
    @ExceptionHandler({
        ConflictException.class,
        DataIntegrityViolationException.class
    })
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<?> handleConflict(Exception ex) {
        return conflictHandler.handle(ex);
    }

    // ==========================================
    // 500: INTERNAL SERVER ERROR
    // ==========================================
    @ExceptionHandler({
        ServerErrorException.class,
        DataAccessException.class,
        Exception.class
    })
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<?> handleServerError(Exception ex) {
        return serverErrorHandler.handle(ex);
    }

    // ==========================================
    // 503: SERVICE UNAVAILABLE
    // ==========================================
    @ExceptionHandler(ServiceUnavailableException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ApiResponse<?> handleServiceUnavailable(ServiceUnavailableException ex) {
        return serviceUnavailableHandler.handle(ex);
    }
}
