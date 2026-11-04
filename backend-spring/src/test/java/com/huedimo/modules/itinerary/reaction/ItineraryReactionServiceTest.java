package com.huedimo.modules.itinerary.reaction;

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
import com.huedimo.modules.itinerary.reaction.dto.response.ReactionResponse;

@ExtendWith(MockitoExtension.class)
class ItineraryReactionServiceTest {

    @Mock
    private ItineraryReactionRepository reactionRepository;

    @Mock
    private ItineraryRepository itineraryRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private ItineraryReactionService reactionService;

    private User mockUser;
    private UUID itineraryId;
    private Itinerary mockItinerary;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(UUID.randomUUID())
                .email("liker@example.com")
                .name("Liker")
                .role("user")
                .build();

        itineraryId = UUID.randomUUID();
        mockItinerary = Itinerary.builder()
                .id(itineraryId)
                .userId(UUID.randomUUID())
                .title("Lộ trình di sản")
                .likesCount(5L)
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
    void toggleReaction_whenNotLiked_shouldAddReactionAndIncrementLikes() {
        mockSecurityContext(mockUser);
        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(reactionRepository.findByItineraryIdAndUserId(itineraryId, mockUser.getId())).thenReturn(Optional.empty());

        ReactionResponse response = reactionService.toggleReaction(itineraryId);

        assertTrue(response.getIsLiked());
        assertEquals(6L, response.getLikesCount());
        verify(reactionRepository).save(any(ItineraryReaction.class));
        verify(itineraryRepository).save(mockItinerary);
    }

    @Test
    void toggleReaction_whenAlreadyLiked_shouldRemoveReactionAndDecrementLikes() {
        mockSecurityContext(mockUser);
        ItineraryReaction existing = ItineraryReaction.builder()
                .id(UUID.randomUUID())
                .itineraryId(itineraryId)
                .userId(mockUser.getId())
                .reactionType("like")
                .build();

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(reactionRepository.findByItineraryIdAndUserId(itineraryId, mockUser.getId())).thenReturn(Optional.of(existing));

        ReactionResponse response = reactionService.toggleReaction(itineraryId);

        assertFalse(response.getIsLiked());
        assertEquals(4L, response.getLikesCount());
        verify(reactionRepository).delete(existing);
        verify(itineraryRepository).save(mockItinerary);
    }

    @Test
    void toggleReaction_whenItineraryNotFound_shouldThrowNotFoundException() {
        mockSecurityContext(mockUser);
        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> reactionService.toggleReaction(itineraryId));
        verify(reactionRepository, never()).save(any());
        verify(reactionRepository, never()).delete(any());
    }

    @Test
    void isLikedByUser_shouldReturnCorrectResult() {
        when(reactionRepository.existsByItineraryIdAndUserId(itineraryId, mockUser.getId())).thenReturn(true);

        boolean result = reactionService.isLikedByUser(itineraryId, mockUser.getId());
        assertTrue(result);

        assertFalse(reactionService.isLikedByUser(itineraryId, null));
    }
}
