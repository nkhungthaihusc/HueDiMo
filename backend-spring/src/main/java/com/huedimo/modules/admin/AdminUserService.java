package com.huedimo.modules.admin;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.huedimo.common.exceptions.status400.BadRequestException;
import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.common.utils.SecurityUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminUserService {
    private static final String ACCOUNT_COLUMNS = """
            id, name, email, avatar_url, role, coalesce(status, 'active') AS status,
            provider, points, checkin_count, created_at, updated_at
            """;
    private static final String SEARCH_FILTERS = """
            FROM users
            WHERE (:keyword = '' OR name ILIKE concat('%', :keyword, '%') OR email ILIKE concat('%', :keyword, '%'))
              AND (:role = '' OR role = :role)
            """;

    private final JdbcClient jdbc;

    @Transactional(readOnly = true)
    public AdminPage<Account> list(int requestedPage, int requestedLimit, String query, String role) {
        int page = Math.max(1, requestedPage);
        int limit = Math.clamp(requestedLimit, 1, 100);
        String keyword = query.strip();
        String roleFilter = role.strip().toLowerCase(Locale.ROOT);
        long total = jdbc.sql("SELECT count(*) " + SEARCH_FILTERS)
                .param("keyword", keyword).param("role", roleFilter).query(Long.class).single();
        List<Account> users = jdbc.sql("SELECT " + ACCOUNT_COLUMNS + SEARCH_FILTERS
                + "ORDER BY created_at DESC NULLS LAST, id LIMIT :limit OFFSET :offset")
                .param("keyword", keyword).param("role", roleFilter)
                .param("limit", limit).param("offset", (page - 1L) * limit)
                .query(Account.class).list();
        return new AdminPage<>(users, new AdminPage.Pagination(page, limit, total, Math.ceilDiv(total, limit)));
    }

    public Account get(UUID id) {
        return requireAccount(jdbc.sql("SELECT " + ACCOUNT_COLUMNS + "FROM users WHERE id = :id").param("id", id));
    }

    @Transactional
    public Account updateRole(UUID id, String role) {
        if (id.equals(SecurityUtils.getCurrentUser().getId()) && !"admin".equals(role)) {
            throw new BadRequestException("Bạn không thể tự hạ quyền quản trị của chính mình.");
        }
        return requireAccount(jdbc.sql("UPDATE users SET role = :role, updated_at = now() WHERE id = :id RETURNING "
                + ACCOUNT_COLUMNS).param("role", role).param("id", id));
    }

    @Transactional
    public Account updateStatus(UUID id, String status) {
        if (id.equals(SecurityUtils.getCurrentUser().getId()) && "banned".equals(status)) {
            throw new BadRequestException("Bạn không thể tự khóa tài khoản của chính mình.");
        }
        return requireAccount(jdbc.sql("UPDATE users SET status = :status, updated_at = now() WHERE id = :id RETURNING "
                + ACCOUNT_COLUMNS).param("status", status).param("id", id));
    }

    private Account requireAccount(JdbcClient.StatementSpec statement) {
        return statement.query(Account.class).optional()
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng."));
    }

    public record Account(UUID id, String name, String email, @JsonProperty("avatar_url") String avatarUrl,
            String role, String status, String provider, Integer points,
            @JsonProperty("checkin_count") Integer checkinCount,
            @JsonProperty("created_at") LocalDateTime createdAt,
            @JsonProperty("updated_at") LocalDateTime updatedAt) {}
}
