package com.huedimo.modules.checkin;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.huedimo.common.exceptions.status403.ForbiddenException;
import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.common.exceptions.status409.ConflictException;
import com.huedimo.common.utils.SecurityUtils;
import com.huedimo.modules.checkin.dto.request.CheckinRequest;
import com.huedimo.modules.checkin.dto.response.CheckinResponse;
import com.huedimo.modules.checkin.dto.response.LeaderboardUserResponse;
import com.huedimo.modules.checkin.dto.response.MyCheckinsResponse;
import com.huedimo.modules.place.Place;
import com.huedimo.modules.place.PlaceRepository;
import com.huedimo.modules.user.User;
import com.huedimo.modules.user.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CheckinService {

    CheckinRepository checkinRepository;
    UserRepository userRepository;
    PlaceRepository placeRepository;

    /**
     * Thực hiện Check-in tại một địa điểm du lịch
     * Cộng 100 điểm khám phá, kiểm tra bán kính GPS <= 550m và chống spam trong ngày
     */
    @Transactional
    public CheckinResponse checkin(CheckinRequest request) {
        User currentUser = SecurityUtils.getCurrentUser();
        String placeId = request.getPlaceId().trim();
        log.info("User {} checking in at place {}", currentUser.getId(), placeId);

        // 1. Kiểm tra địa điểm có tồn tại hay không
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy địa điểm với ID: " + placeId));

        // 2. Xác thực vị trí địa lý nếu client truyền tọa độ
        if (request.getUserLat() != null && request.getUserLng() != null) {
            Double pLat = place.getLat();
            Double pLng = place.getLng();
            if (pLat != null && pLng != null) {
                double dist = calculateDistanceMeters(request.getUserLat(), request.getUserLng(), pLat, pLng);
                final double MAX_CHECKIN_RADIUS_METERS = 550.0; // 500m + 50m buffer sai số GPS
                if (dist > MAX_CHECKIN_RADIUS_METERS) {
                    throw new ForbiddenException(String.format(
                            "Bạn đang cách %s khoảng %.1f km (%dm). Bạn cần có mặt trong bán kính 500m của địa điểm để có thể check-in!",
                            place.getName(), dist / 1000.0, Math.round(dist)));
                }
            }
        }

        // 3. Kiểm tra chống spam: Trong ngày hôm nay đã check-in địa điểm này chưa
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        boolean alreadyCheckedIn = checkinRepository.existsByUserIdAndPlaceIdAndCreatedAtGreaterThanEqual(
                currentUser.getId(), placeId, startOfDay);
        if (alreadyCheckedIn) {
            throw new ConflictException("Bạn đã check-in địa điểm này trong ngày hôm nay rồi!");
        }

        // 4. Lưu bản ghi check-in mới
        final int POINTS_PER_CHECKIN = 100;
        Checkin checkin = Checkin.builder()
                .userId(currentUser.getId())
                .placeId(placeId)
                .pointsEarned(POINTS_PER_CHECKIN)
                .note(request.getNote() != null ? request.getNote().trim() : null)
                .build();
        Checkin savedCheckin = checkinRepository.save(checkin);

        // 5. Cập nhật điểm tích lũy và số lượt check-in của user
        int currentPoints = currentUser.getPoints() != null ? currentUser.getPoints() : 0;
        int currentCheckinCount = currentUser.getCheckinCount() != null ? currentUser.getCheckinCount() : 0;
        int newPoints = currentPoints + POINTS_PER_CHECKIN;
        int newCheckinCount = currentCheckinCount + 1;

        currentUser.setPoints(newPoints);
        currentUser.setCheckinCount(newCheckinCount);
        userRepository.save(currentUser);

        return CheckinResponse.builder()
                .checkinId(savedCheckin.getId())
                .placeId(savedCheckin.getPlaceId())
                .pointsEarned(POINTS_PER_CHECKIN)
                .totalPoints(newPoints)
                .totalCheckins(newCheckinCount)
                .message(String.format("Chúc mừng bạn đã check-in thành công và nhận được +%d điểm khám phá Huế! 🎉", POINTS_PER_CHECKIN))
                .build();
    }

    /**
     * Lấy danh sách ID các địa điểm du khách hiện tại đã từng check-in
     */
    public MyCheckinsResponse getMyCheckins() {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("Fetching check-in history for user {}", currentUser.getId());

        List<String> placeIds = checkinRepository.findDistinctPlaceIdsByUserId(currentUser.getId());
        return MyCheckinsResponse.builder()
                .checkedPlaceIds(placeIds)
                .build();
    }

    /**
     * Lấy danh sách bảng xếp hạng du khách (Top điểm số và lượt check-in cao nhất)
     */
    public List<LeaderboardUserResponse> getLeaderboard(int limit) {
        int sanitizedLimit = Math.min(50, Math.max(5, limit > 0 ? limit : 20));
        log.info("Fetching leaderboard with limit {}", sanitizedLimit);

        Pageable pageable = PageRequest.of(0, sanitizedLimit);
        List<User> topUsers = userRepository.findTopUsers(pageable);

        List<LeaderboardUserResponse> responses = new ArrayList<>();
        for (int i = 0; i < topUsers.size(); i++) {
            User u = topUsers.get(i);
            responses.add(LeaderboardUserResponse.builder()
                    .id(u.getId())
                    .name(u.getName())
                    .avatarUrl(u.getAvatarUrl() != null ? u.getAvatarUrl() : "")
                    .role(u.getRole())
                    .points(u.getPoints() != null ? u.getPoints() : 0)
                    .checkinCount(u.getCheckinCount() != null ? u.getCheckinCount() : 0)
                    .rank(i + 1)
                    .build());
        }
        return responses;
    }

    /**
     * Tính khoảng cách giữa hai tọa độ địa lý bằng công thức Haversine (đơn vị: mét)
     */
    private double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371e3; // Bán kính trái đất (mét)
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double a = Math.sin(deltaPhi / 2.0) * Math.sin(deltaPhi / 2.0)
                + Math.cos(phi1) * Math.cos(phi2)
                * Math.sin(deltaLambda / 2.0) * Math.sin(deltaLambda / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

        return R * c;
    }
}
