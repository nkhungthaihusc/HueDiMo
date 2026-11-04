package com.huedimo.modules.itinerary;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huedimo.common.exceptions.status403.ForbiddenException;
import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.modules.user.User;
import com.huedimo.modules.user.UserRepository;
import com.huedimo.modules.itinerary.bookmark.ItineraryBookmarkService;
import com.huedimo.modules.itinerary.comment.ItineraryCommentService;
import com.huedimo.modules.itinerary.dto.request.SaveItineraryRequest;
import com.huedimo.modules.itinerary.dto.request.UpdateVisibilityRequest;
import com.huedimo.modules.itinerary.dto.response.ItineraryResponse;
import com.huedimo.modules.itinerary.reaction.ItineraryReactionService;
import com.huedimo.modules.place.PlaceRepository;

@ExtendWith(MockitoExtension.class)
class ItineraryServiceTest {

    @Mock
    private ItineraryRepository itineraryRepository;

    @Mock
    private ItineraryBookmarkService bookmarkService;

    @Mock
    private ItineraryReactionService reactionService;

    @Mock
    private ItineraryCommentService commentService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private ItineraryService itineraryService;

    private User mockUser;
    private UUID itineraryId;
    private Itinerary mockItinerary;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .name("Nguyễn Văn A")
                .role("user")
                .avatarUrl("https://example.com/avatar.jpg")
                .build();

        itineraryId = UUID.randomUUID();
        mockItinerary = Itinerary.builder()
                .id(itineraryId)
                .userId(mockUser.getId())
                .title("Hành trình Cố Đô")
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 3))
                .budget(1500000.0)
                .totalEstimatedCost(1200000.0)
                .transportMode("motorbike")
                .groupSize(2)
                .isPublic(true)
                .viewsCount(10L)
                .likesCount(5L)
                .bookmarksCount(2L)
                .forksCount(1L)
                .rating(4.8)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
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
    void saveItinerary_newItinerary_shouldCreateAndReturnResponse() {
        mockSecurityContext(mockUser);

        SaveItineraryRequest request = SaveItineraryRequest.builder()
                .title("Lộ trình mới")
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 2))
                .budget(500000.0)
                .transportMode("walking")
                .isPublic(false)
                .build();

        when(itineraryRepository.findFirstByUserIdAndTitleAndStartDateAndEndDateOrderByUpdatedAtDesc(
                mockUser.getId(), "Lộ trình mới", request.getStartDate(), request.getEndDate()))
                .thenReturn(Optional.empty());

        when(itineraryRepository.save(any(Itinerary.class))).thenAnswer(invocation -> {
            Itinerary it = invocation.getArgument(0);
            it.setId(UUID.randomUUID());
            return it;
        });

        ItineraryResponse response = itineraryService.saveItinerary(request);

        assertNotNull(response);
        assertEquals("Lộ trình mới", response.getTitle());
        assertEquals("walking", response.getTransportMode());
        assertEquals(2, response.getDaysCount());
        verify(itineraryRepository).save(any(Itinerary.class));
    }

    @Test
    void saveItinerary_updateExisting_whenOwner_shouldUpdateAndReturnResponse() {
        mockSecurityContext(mockUser);

        SaveItineraryRequest request = SaveItineraryRequest.builder()
                .id(itineraryId)
                .title("Hành trình Cố Đô (Đã chỉnh sửa)")
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 3))
                .budget(2000000.0)
                .transportMode("car")
                .build();

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(itineraryRepository.save(any(Itinerary.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ItineraryResponse response = itineraryService.saveItinerary(request);

        assertNotNull(response);
        assertEquals("Hành trình Cố Đô (Đã chỉnh sửa)", response.getTitle());
        assertEquals("car", response.getTransportMode());
        assertEquals(2000000.0, response.getBudget());
    }

    @Test
    void saveItinerary_updateExisting_whenNotOwnerAndNotAdmin_shouldThrowForbiddenException() {
        User anotherUser = User.builder()
                .id(UUID.randomUUID())
                .email("another@example.com")
                .role("user")
                .build();
        mockSecurityContext(anotherUser);

        SaveItineraryRequest request = SaveItineraryRequest.builder()
                .id(itineraryId)
                .title("Hack title")
                .build();

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));

        assertThrows(ForbiddenException.class, () -> itineraryService.saveItinerary(request));
        verify(itineraryRepository, never()).save(any());
    }

    @Test
    void getMyItineraries_shouldReturnUserItineraries() {
        mockSecurityContext(mockUser);
        when(itineraryRepository.findByUserIdOrderByCreatedAtDesc(mockUser.getId())).thenReturn(List.of(mockItinerary));

        List<ItineraryResponse> responses = itineraryService.getMyItineraries();

        assertEquals(1, responses.size());
        assertEquals("Hành trình Cố Đô", responses.get(0).getTitle());
        assertEquals(3, responses.get(0).getDaysCount());
    }

    @Test
    void getItineraryById_whenPublic_shouldIncrementViewsAndReturnResponse() {
        when(securityContext.getAuthentication()).thenReturn(null); // Anonymous user
        SecurityContextHolder.setContext(securityContext);

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(userRepository.findById(mockItinerary.getUserId())).thenReturn(Optional.of(mockUser));

        ItineraryResponse response = itineraryService.getItineraryById(itineraryId);

        assertNotNull(response);
        assertEquals(11L, mockItinerary.getViewsCount());
        verify(itineraryRepository).save(mockItinerary);
        assertEquals("Nguyễn Văn A", response.getAuthorName());
    }

    @Test
    void getItineraryById_whenPrivateAndNotOwner_shouldThrowForbiddenException() {
        mockItinerary.setIsPublic(false);

        User anotherUser = User.builder()
                .id(UUID.randomUUID())
                .email("other@example.com")
                .role("user")
                .build();
        mockSecurityContext(anotherUser);

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));

        assertThrows(ForbiddenException.class, () -> itineraryService.getItineraryById(itineraryId));
        verify(itineraryRepository, never()).save(any());
    }

    @Test
    void toggleVisibility_whenOwner_shouldUpdateIsPublic() {
        mockSecurityContext(mockUser);
        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(itineraryRepository.save(any(Itinerary.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateVisibilityRequest request = new UpdateVisibilityRequest(false);
        ItineraryResponse response = itineraryService.toggleVisibility(itineraryId, request);

        assertFalse(response.getIsPublic());
        assertFalse(mockItinerary.getIsPublic());
        verify(itineraryRepository).save(mockItinerary);
    }

    @Test
    void forkItinerary_shouldIncrementForksCountAndCreateCloneForUser() {
        User anotherUser = User.builder()
                .id(UUID.randomUUID())
                .email("forker@example.com")
                .role("user")
                .build();
        mockSecurityContext(anotherUser);

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(itineraryRepository.save(any(Itinerary.class))).thenAnswer(invocation -> {
            Itinerary it = invocation.getArgument(0);
            if (it.getId() == null) it.setId(UUID.randomUUID());
            return it;
        });

        ItineraryResponse response = itineraryService.forkItinerary(itineraryId);

        assertNotNull(response);
        assertTrue(response.getTitle().startsWith("[Bản sao]"));
        assertEquals(anotherUser.getId(), response.getUserId());
        assertFalse(response.getIsPublic());
        assertEquals(2L, mockItinerary.getForksCount());
    }

    @Test
    void deleteItinerary_whenOwner_shouldDeleteItineraryAndCascadeSubmodules() {
        mockSecurityContext(mockUser);
        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));

        itineraryService.deleteItinerary(itineraryId);

        verify(bookmarkService).deleteByItineraryId(itineraryId);
        verify(reactionService).deleteByItineraryId(itineraryId);
        verify(commentService).deleteByItineraryId(itineraryId);
        verify(itineraryRepository).delete(mockItinerary);
    }
}
