package com.huedimo.modules.itinerary.bookmark;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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

import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.modules.user.User;
import com.huedimo.modules.itinerary.Itinerary;
import com.huedimo.modules.itinerary.ItineraryRepository;
import com.huedimo.modules.itinerary.bookmark.dto.response.BookmarkResponse;

@ExtendWith(MockitoExtension.class)
class ItineraryBookmarkServiceTest {

    @Mock
    private ItineraryBookmarkRepository bookmarkRepository;

    @Mock
    private ItineraryRepository itineraryRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private ItineraryBookmarkService bookmarkService;

    private User mockUser;
    private UUID itineraryId;
    private Itinerary mockItinerary;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(UUID.randomUUID())
                .email("tester@example.com")
                .name("Tester")
                .role("user")
                .build();

        itineraryId = UUID.randomUUID();
        mockItinerary = Itinerary.builder()
                .id(itineraryId)
                .userId(UUID.randomUUID())
                .title("Chuyến đi Huế")
                .bookmarksCount(2L)
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
    void toggleBookmark_whenNotBookmarked_shouldCreateBookmarkAndIncrementCount() {
        mockSecurityContext(mockUser);
        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(bookmarkRepository.findByItineraryIdAndUserId(itineraryId, mockUser.getId())).thenReturn(Optional.empty());

        BookmarkResponse response = bookmarkService.toggleBookmark(itineraryId);

        assertTrue(response.getIsBookmarked());
        assertEquals(3L, response.getBookmarksCount());
        verify(bookmarkRepository).save(any(ItineraryBookmark.class));
        verify(itineraryRepository).save(mockItinerary);
    }

    @Test
    void toggleBookmark_whenAlreadyBookmarked_shouldRemoveBookmarkAndDecrementCount() {
        mockSecurityContext(mockUser);
        ItineraryBookmark existingBookmark = ItineraryBookmark.builder()
                .id(UUID.randomUUID())
                .itineraryId(itineraryId)
                .userId(mockUser.getId())
                .build();

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(bookmarkRepository.findByItineraryIdAndUserId(itineraryId, mockUser.getId())).thenReturn(Optional.of(existingBookmark));

        BookmarkResponse response = bookmarkService.toggleBookmark(itineraryId);

        assertFalse(response.getIsBookmarked());
        assertEquals(1L, response.getBookmarksCount());
        verify(bookmarkRepository).delete(existingBookmark);
        verify(itineraryRepository).save(mockItinerary);
    }

    @Test
    void toggleBookmark_whenItineraryNotFound_shouldThrowNotFoundException() {
        mockSecurityContext(mockUser);
        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> bookmarkService.toggleBookmark(itineraryId));
        verify(bookmarkRepository, never()).save(any());
        verify(bookmarkRepository, never()).delete(any());
    }

    @Test
    void isBookmarkedByUser_shouldReturnCorrectResult() {
        when(bookmarkRepository.existsByItineraryIdAndUserId(itineraryId, mockUser.getId())).thenReturn(true);

        boolean result = bookmarkService.isBookmarkedByUser(itineraryId, mockUser.getId());
        assertTrue(result);

        assertFalse(bookmarkService.isBookmarkedByUser(itineraryId, null));
    }
}
