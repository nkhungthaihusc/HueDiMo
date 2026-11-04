package com.huedimo.modules.checkin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import com.huedimo.common.exceptions.status403.ForbiddenException;
import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.common.exceptions.status409.ConflictException;
import com.huedimo.modules.checkin.dto.request.CheckinRequest;
import com.huedimo.modules.checkin.dto.response.CheckinResponse;
import com.huedimo.modules.checkin.dto.response.LeaderboardUserResponse;
import com.huedimo.modules.checkin.dto.response.MyCheckinsResponse;
import com.huedimo.modules.place.Place;
import com.huedimo.modules.place.PlaceRepository;
import com.huedimo.modules.user.User;
import com.huedimo.modules.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class CheckinServiceTest {

    @Mock
    private CheckinRepository checkinRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private CheckinService checkinService;

    private User mockUser;
    private Place mockPlace;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(UUID.randomUUID())
                .email("traveler@example.com")
                .name("Du Khách")
                .role("user")
                .points(200)
                .checkinCount(2)
                .build();

        mockPlace = Place.builder()
                .id("dai-noi-hue")
                .name("Đại Nội Huế")
                .lat(16.4687)
                .lng(107.5786)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockSecurityContext(User user) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(user);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void checkin_whenValidWithoutGps_shouldAward100PointsAndIncrementCheckinCount() {
        mockSecurityContext(mockUser);
        when(placeRepository.findById("dai-noi-hue")).thenReturn(Optional.of(mockPlace));
        when(checkinRepository.existsByUserIdAndPlaceIdAndCreatedAtGreaterThanEqual(eq(mockUser.getId()), eq("dai-noi-hue"), any()))
                .thenReturn(false);

        Checkin savedCheckin = Checkin.builder()
                .id(UUID.randomUUID())
                .userId(mockUser.getId())
                .placeId("dai-noi-hue")
                .pointsEarned(100)
                .build();
        when(checkinRepository.save(any(Checkin.class))).thenReturn(savedCheckin);

        CheckinRequest request = CheckinRequest.builder()
                .placeId("dai-noi-hue")
                .note("Cảnh rất đẹp!")
                .build();

        CheckinResponse response = checkinService.checkin(request);

        assertNotNull(response);
        assertEquals("dai-noi-hue", response.getPlaceId());
        assertEquals(100, response.getPointsEarned());
        assertEquals(300, response.getTotalPoints());
        assertEquals(3, response.getTotalCheckins());
        verify(userRepository).save(mockUser);
        verify(checkinRepository).save(any(Checkin.class));
    }

    @Test
    void checkin_whenPlaceNotFound_shouldThrowNotFoundException() {
        mockSecurityContext(mockUser);
        when(placeRepository.findById("non-existent")).thenReturn(Optional.empty());

        CheckinRequest request = CheckinRequest.builder().placeId("non-existent").build();
        assertThrows(NotFoundException.class, () -> checkinService.checkin(request));
    }

    @Test
    void checkin_whenGpsTooFar_shouldThrowForbiddenException() {
        mockSecurityContext(mockUser);
        when(placeRepository.findById("dai-noi-hue")).thenReturn(Optional.of(mockPlace));

        // Tọa độ xa hơn 550m (ví dụ cách 10km)
        CheckinRequest request = CheckinRequest.builder()
                .placeId("dai-noi-hue")
                .userLat(16.5500)
                .userLng(107.6500)
                .build();

        assertThrows(ForbiddenException.class, () -> checkinService.checkin(request));
        verify(checkinRepository, never()).save(any());
    }

    @Test
    void checkin_whenGpsWithinRadius_shouldSucceed() {
        mockSecurityContext(mockUser);
        when(placeRepository.findById("dai-noi-hue")).thenReturn(Optional.of(mockPlace));
        when(checkinRepository.existsByUserIdAndPlaceIdAndCreatedAtGreaterThanEqual(eq(mockUser.getId()), eq("dai-noi-hue"), any()))
                .thenReturn(false);

        Checkin savedCheckin = Checkin.builder()
                .id(UUID.randomUUID())
                .userId(mockUser.getId())
                .placeId("dai-noi-hue")
                .pointsEarned(100)
                .build();
        when(checkinRepository.save(any(Checkin.class))).thenReturn(savedCheckin);

        // Tọa độ rất gần (~50m)
        CheckinRequest request = CheckinRequest.builder()
                .placeId("dai-noi-hue")
                .userLat(16.4688)
                .userLng(107.5787)
                .build();

        CheckinResponse response = checkinService.checkin(request);
        assertNotNull(response);
        assertEquals(300, response.getTotalPoints());
    }

    @Test
    void checkin_whenAlreadyCheckedInToday_shouldThrowConflictException() {
        mockSecurityContext(mockUser);
        when(placeRepository.findById("dai-noi-hue")).thenReturn(Optional.of(mockPlace));
        when(checkinRepository.existsByUserIdAndPlaceIdAndCreatedAtGreaterThanEqual(eq(mockUser.getId()), eq("dai-noi-hue"), any()))
                .thenReturn(true);

        CheckinRequest request = CheckinRequest.builder().placeId("dai-noi-hue").build();
        assertThrows(ConflictException.class, () -> checkinService.checkin(request));
        verify(checkinRepository, never()).save(any());
    }

    @Test
    void getMyCheckins_shouldReturnListOfCheckedPlaceIds() {
        mockSecurityContext(mockUser);
        when(checkinRepository.findDistinctPlaceIdsByUserId(mockUser.getId()))
                .thenReturn(List.of("dai-noi-hue", "chua-thien-mu"));

        MyCheckinsResponse response = checkinService.getMyCheckins();
        assertNotNull(response);
        assertEquals(2, response.getCheckedPlaceIds().size());
        assertTrue(response.getCheckedPlaceIds().contains("dai-noi-hue"));
    }

    @Test
    void getLeaderboard_shouldReturnUsersRanked() {
        User user1 = User.builder().id(UUID.randomUUID()).name("Top 1").points(1000).checkinCount(10).build();
        User user2 = User.builder().id(UUID.randomUUID()).name("Top 2").points(500).checkinCount(5).build();

        when(userRepository.findTopUsers(any(Pageable.class))).thenReturn(List.of(user1, user2));

        List<LeaderboardUserResponse> leaderboard = checkinService.getLeaderboard(20);

        assertEquals(2, leaderboard.size());
        assertEquals(1, leaderboard.get(0).getRank());
        assertEquals("Top 1", leaderboard.get(0).getName());
        assertEquals(2, leaderboard.get(1).getRank());
        assertEquals("Top 2", leaderboard.get(1).getName());
    }
}
