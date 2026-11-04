package com.huedimo.modules.checkin;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.checkin.dto.response.LeaderboardUserResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LeaderboardController {

    CheckinService checkinService;

    /**
     * GET /api/leaderboard?limit=20
     * Lấy danh sách Top bảng xếp hạng du khách (công khai)
     */
    @GetMapping
    public ApiResponse<List<LeaderboardUserResponse>> getLeaderboard(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.success(checkinService.getLeaderboard(limit));
    }
}
