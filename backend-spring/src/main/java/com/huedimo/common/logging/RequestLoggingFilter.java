package com.huedimo.common.logging;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.regex.Pattern;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Filter tự động đóng khung (Box/Frame) thông tin chi tiết từng HTTP Request & Response,
 * giúp lập trình viên quan sát trực quan trạng thái, thời gian phản hồi, payload và user gọi API.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss.SSS");
    private static final Pattern SENSITIVE_PATTERN = Pattern.compile("(\"(?:password|accessToken|refreshToken|token|secret)\"\\s*:\\s*\")[^\"]+(\")", Pattern.CASE_INSENSITIVE);
    private static final int MAX_BODY_DISPLAY_LENGTH = 350;

    // ANSI Color Codes
    private static final String RESET = "\u001B[0m";
    private static final String BOLD = "\u001B[1m";
    private static final String DIM = "\u001B[2m";
    private static final String GREEN = "\u001B[32m";
    private static final String YELLOW = "\u001B[33m";
    private static final String RED = "\u001B[31m";
    private static final String BLUE = "\u001B[34m";
    private static final String CYAN = "\u001B[36m";
    private static final String MAGENTA = "\u001B[35m";
    private static final String WHITE = "\u001B[37m";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/webjars")
                || path.endsWith(".ico")
                || path.endsWith(".html")
                || path.endsWith(".css")
                || path.endsWith(".js")
                || path.endsWith(".png")
                || path.endsWith(".jpg");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request, 1024 * 1024);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);

        long startTime = System.currentTimeMillis();
        String timeStr = LocalDateTime.now().format(TIME_FORMATTER);

        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            try {
                logRequestBox(wrappedRequest, wrappedResponse, timeStr, duration);
            } catch (Exception e) {
                // Đảm bảo logging không bao giờ làm gián đoạn response chính
            }
            wrappedResponse.copyBodyToResponse();
        }
    }

    private void logRequestBox(ContentCachingRequestWrapper req, ContentCachingResponseWrapper res, String timeStr, long duration) {
        String method = req.getMethod();
        String uri = req.getRequestURI();
        String queryString = req.getQueryString();
        String fullUrl = queryString != null ? uri + "?" + queryString : uri;
        int status = res.getStatus();

        String clientIp = extractClientIp(req);
        String authUser = extractAuthenticatedUser();

        String payload = extractBody(req.getContentAsByteArray(), req.getContentType());
        String responseBody = extractBody(res.getContentAsByteArray(), res.getContentType());

        // Color calculations
        String methodColor = getMethodColor(method);
        String statusColor = getStatusColor(status);
        String durationColor = getDurationColor(duration);

        String statusPhrase = getStatusText(status);
        String icon = status < 400 ? "🚀" : (status < 500 ? "⚠️" : "💥");

        StringBuilder sb = new StringBuilder();
        sb.append("\n");
        sb.append(CYAN).append("+==================================================================================================+").append(RESET).append("\n");
        sb.append(CYAN).append("| ").append(icon).append(" ").append(BOLD).append(methodColor).append(String.format("%-6s", method)).append(RESET)
          .append(WHITE).append(BOLD).append(" ").append(fullUrl).append(RESET)
          .append(DIM).append(" [").append(timeStr).append("]").append(RESET).append("\n");
        sb.append(CYAN).append("+--------------------------------------------------------------------------------------------------+").append(RESET).append("\n");

        sb.append(CYAN).append("| ").append(RESET).append(BOLD).append("• Status   : ").append(RESET)
          .append(statusColor).append(status).append(" ").append(statusPhrase).append(RESET)
          .append("  ").append(DIM).append("(").append(durationColor).append(duration).append(" ms").append(DIM).append(")").append(RESET).append("\n");

        sb.append(CYAN).append("| ").append(RESET).append(BOLD).append("• Client   : ").append(RESET)
          .append(BLUE).append(clientIp).append(RESET)
          .append("  |  ").append(BOLD).append("Auth: ").append(RESET)
          .append(authUser.equals("Anonymous") ? DIM + "Anonymous" + RESET : GREEN + BOLD + authUser + RESET).append("\n");

        if (payload != null && !payload.isBlank()) {
            sb.append(CYAN).append("| ").append(RESET).append(BOLD).append("• Payload  : ").append(RESET)
              .append(YELLOW).append(maskSensitiveData(payload)).append(RESET).append("\n");
        }

        if (status >= 400 && responseBody != null && !responseBody.isBlank()) {
            sb.append(CYAN).append("| ").append(RESET).append(BOLD).append("• Response : ").append(RESET)
              .append(RED).append(maskSensitiveData(responseBody)).append(RESET).append("\n");
        }

        sb.append(CYAN).append("+==================================================================================================+").append(RESET).append("\n");

        System.out.print(sb.toString());
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        String ip;
        if (xf != null && !xf.isBlank()) {
            ip = xf.split(",")[0].trim();
        } else {
            ip = request.getRemoteAddr();
        }
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            return "127.0.0.1 (Localhost)";
        }
        return ip;
    }

    private String extractAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        return "Anonymous";
    }

    private String extractBody(byte[] content, String contentType) {
        if (content == null || content.length == 0) {
            return null;
        }
        if (contentType != null && contentType.startsWith("multipart/")) {
            return "[Multipart/Form-Data File Upload]";
        }
        String body = new String(content, StandardCharsets.UTF_8).replaceAll("\\s+", " ").trim();
        if (body.length() > MAX_BODY_DISPLAY_LENGTH) {
            return body.substring(0, MAX_BODY_DISPLAY_LENGTH) + "... (truncated)";
        }
        return body;
    }

    private String maskSensitiveData(String text) {
        if (text == null) return null;
        return SENSITIVE_PATTERN.matcher(text).replaceAll("$1***$2");
    }

    private String getMethodColor(String method) {
        return switch (method) {
            case "GET" -> GREEN;
            case "POST" -> CYAN;
            case "PUT" -> YELLOW;
            case "DELETE" -> RED;
            case "PATCH" -> MAGENTA;
            default -> WHITE;
        };
    }

    private String getStatusColor(int status) {
        if (status < 300) return GREEN + BOLD;
        if (status < 400) return BLUE;
        if (status < 500) return YELLOW + BOLD;
        return RED + BOLD;
    }

    private String getDurationColor(long duration) {
        if (duration < 150) return GREEN;
        if (duration < 500) return YELLOW;
        return RED;
    }

    private String getStatusText(int status) {
        try {
            return HttpStatus.valueOf(status).getReasonPhrase();
        } catch (Exception e) {
            return "";
        }
    }
}
