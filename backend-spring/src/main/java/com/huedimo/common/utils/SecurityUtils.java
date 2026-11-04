package com.huedimo.common.utils;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.huedimo.modules.user.User;

public final class SecurityUtils {

    private SecurityUtils() {
        // Utility class
    }

    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new RuntimeException("Chưa đăng nhập hoặc token không hợp lệ");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }

        throw new RuntimeException("Chưa đăng nhập hoặc phiên làm việc không hợp lệ");
    }

    public static java.util.Optional<User> getCurrentUserOptional() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return java.util.Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return java.util.Optional.of(user);
        }

        return java.util.Optional.empty();
    }
}
