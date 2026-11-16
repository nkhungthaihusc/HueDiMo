package com.huedimo.modules.admin;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.modules.place.Place;
import com.huedimo.modules.place.PlaceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminPlaceService {
    private final PlaceRepository places;
    private final JdbcClient jdbc;

    @Transactional(readOnly = true)
    public Dashboard stats() {
        Overview overview = jdbc.sql("""
                SELECT
                    (SELECT count(*) FROM places) AS total_places,
                    (SELECT count(*) FROM places WHERE status = 'pending') AS pending_places,
                    (SELECT count(*) FROM users) AS total_users,
                    (SELECT count(*) FROM reviews) AS total_reviews,
                    (SELECT coalesce(round(avg(rating)::numeric, 1), 0) FROM reviews) AS avg_rating,
                    (SELECT count(*) FROM itineraries) AS total_itineraries,
                    (SELECT count(*) FROM itineraries WHERE is_public = true) AS public_itineraries,
                    (SELECT count(*) FROM itinerary_comments) AS total_itinerary_comments
                """).query(Overview.class).single();
        List<CategoryCount> categoryDistribution = jdbc.sql("""
                SELECT category, count(*) AS count FROM places GROUP BY category ORDER BY count DESC, category
                """).query(CategoryCount.class).list();
        return new Dashboard(overview, categoryDistribution, places.findRecentForAdmin());
    }

    @Transactional(readOnly = true)
    public AdminPage<Place> list(int page, int limit, String q, String category, String status) {
        int pageNumber = Math.max(1, page);
        int pageSize = Math.clamp(limit, 1, 100);
        String statusFilter = "all".equals(status.strip()) ? "" : status.strip();
        var result = places.findForAdmin(q.strip(), category.strip(), statusFilter,
                PageRequest.of(pageNumber - 1, pageSize));
        return new AdminPage<>(result.getContent(),
                new AdminPage.Pagination(pageNumber, pageSize, result.getTotalElements(), result.getTotalPages()));
    }

    @Transactional
    public Place updateStatus(String id, String status) {
        places.updateModerationStatus(id, status);
        return places.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy địa điểm với ID: " + id));
    }

    public record Dashboard(Overview overview, List<CategoryCount> categoryDistribution, List<Place> recentPlaces) {}
    public record Overview(long totalPlaces, long pendingPlaces, long totalUsers, long totalReviews,
            BigDecimal avgRating, long totalItineraries, long publicItineraries, long totalItineraryComments) {}
    public record CategoryCount(String category, long count) {}
}
