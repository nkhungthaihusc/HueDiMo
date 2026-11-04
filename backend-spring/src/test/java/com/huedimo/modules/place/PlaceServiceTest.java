package com.huedimo.modules.place;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import com.huedimo.modules.user.User;
import com.huedimo.modules.place.dto.CreatePlaceRequest;

@ExtendWith(MockitoExtension.class)
class PlaceServiceTest {

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private PlaceService placeService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .name("Tester")
                .role("user")
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getMyPlaces_whenAuthenticated_shouldReturnPlacesForCurrentUser() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(mockUser);
        SecurityContextHolder.setContext(securityContext);

        Place p1 = Place.builder().id("place-1").name("Place 1").createdBy(mockUser.getId()).build();
        when(placeRepository.findByCreatedByOrderByCreatedAtDesc(mockUser.getId())).thenReturn(List.of(p1));

        List<Place> result = placeService.getMyPlaces();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("place-1", result.get(0).getId());
        verify(placeRepository).findByCreatedByOrderByCreatedAtDesc(mockUser.getId());
    }

    @Test
    void getMyPlaces_whenNotAuthenticated_shouldThrowException() {
        SecurityContextHolder.clearContext();

        RuntimeException ex = assertThrows(RuntimeException.class, () -> placeService.getMyPlaces());
        assertTrue(ex.getMessage().contains("Chưa đăng nhập"));
    }

    @Test
    void createPlace_whenAuthenticated_shouldSavePlaceWithCreatedByAndPendingStatus() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(mockUser);
        SecurityContextHolder.setContext(securityContext);

        CreatePlaceRequest request = CreatePlaceRequest.builder()
                .name("Cà phê Muối Rùa")
                .category("cafe")
                .lat(16.4673)
                .lng(107.5905)
                .address("142 Đặng Thái Thân")
                .price(35000L)
                .description("Cà phê ngon")
                .images(List.of("https://example.com/img1.jpg"))
                .build();

        when(placeRepository.save(any(Place.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Place created = placeService.createPlace(request);

        assertNotNull(created);
        assertEquals("Cà phê Muối Rùa", created.getName());
        assertEquals("pending", created.getStatus());
        assertTrue(created.getIsLocal());
        assertEquals(mockUser.getId(), created.getCreatedBy());
        assertEquals("https://example.com/img1.jpg", created.getImageUrl());
        verify(placeRepository).save(any(Place.class));
    }
}
