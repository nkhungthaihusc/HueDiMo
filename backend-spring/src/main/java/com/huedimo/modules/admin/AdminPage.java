package com.huedimo.modules.admin;

import java.util.List;

public record AdminPage<T>(List<T> items, Pagination pagination) {
    public record Pagination(int page, int limit, long total, long totalPages) {}
}
