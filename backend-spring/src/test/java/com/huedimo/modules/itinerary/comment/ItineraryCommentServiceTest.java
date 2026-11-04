package com.huedimo.modules.itinerary.comment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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

import com.huedimo.common.exceptions.status400.BadRequestException;
import com.huedimo.common.exceptions.status403.ForbiddenException;
import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.modules.user.User;
import com.huedimo.modules.user.UserRepository;
import com.huedimo.modules.itinerary.Itinerary;
import com.huedimo.modules.itinerary.ItineraryRepository;
import com.huedimo.modules.itinerary.comment.dto.request.CreateCommentRequest;
import com.huedimo.modules.itinerary.comment.dto.response.ItineraryCommentResponse;

@ExtendWith(MockitoExtension.class)
class ItineraryCommentServiceTest {

    @Mock
    private ItineraryCommentRepository commentRepository;

    @Mock
    private ItineraryRepository itineraryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private ItineraryCommentService commentService;

    private User mockUser;
    private UUID itineraryId;
    private Itinerary mockItinerary;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(UUID.randomUUID())
                .email("commenter@example.com")
                .name("Commenter")
                .role("user")
                .avatarUrl("https://example.com/avatar.jpg")
                .build();

        itineraryId = UUID.randomUUID();
        mockItinerary = Itinerary.builder()
                .id(itineraryId)
                .userId(UUID.randomUUID())
                .title("Lộ trình ẩm thực")
                .rating(4.5)
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
    void getComments_whenItineraryExists_shouldReturnListWithAuthorInfo() {
        when(itineraryRepository.existsById(itineraryId)).thenReturn(true);

        ItineraryComment comment = ItineraryComment.builder()
                .id(UUID.randomUUID())
                .itineraryId(itineraryId)
                .userId(mockUser.getId())
                .content("Lịch trình rất hợp lý!")
                .rating(5)
                .createdAt(LocalDateTime.now())
                .build();

        when(commentRepository.findByItineraryIdOrderByCreatedAtAsc(itineraryId)).thenReturn(List.of(comment));
        when(userRepository.findAllById(Set.of(mockUser.getId()))).thenReturn(List.of(mockUser));

        List<ItineraryCommentResponse> response = commentService.getComments(itineraryId);

        assertEquals(1, response.size());
        assertEquals("Lịch trình rất hợp lý!", response.get(0).getContent());
        assertEquals(mockUser.getName(), response.get(0).getUserName());
        assertEquals(mockUser.getAvatarUrl(), response.get(0).getUserAvatar());
    }

    @Test
    void getComments_whenItineraryNotFound_shouldThrowNotFoundException() {
        when(itineraryRepository.existsById(itineraryId)).thenReturn(false);

        assertThrows(NotFoundException.class, () -> commentService.getComments(itineraryId));
    }

    @Test
    void addComment_withRating_shouldSaveCommentAndUpdateAverageRating() {
        mockSecurityContext(mockUser);
        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));

        CreateCommentRequest request = CreateCommentRequest.builder()
                .content("Trải nghiệm tuyệt vời")
                .rating(5)
                .build();

        ItineraryComment savedComment = ItineraryComment.builder()
                .id(UUID.randomUUID())
                .itineraryId(itineraryId)
                .userId(mockUser.getId())
                .content("Trải nghiệm tuyệt vời")
                .rating(5)
                .createdAt(LocalDateTime.now())
                .build();

        when(commentRepository.save(any(ItineraryComment.class))).thenReturn(savedComment);
        when(commentRepository.calculateAverageRatingByItineraryId(itineraryId)).thenReturn(4.8);

        ItineraryCommentResponse response = commentService.addComment(itineraryId, request);

        assertNotNull(response);
        assertEquals("Trải nghiệm tuyệt vời", response.getContent());
        assertEquals(5, response.getRating());
        assertEquals(4.8, mockItinerary.getRating());
        verify(itineraryRepository).save(mockItinerary);
    }

    @Test
    void deleteComment_byOwner_shouldDeleteAndRecalculateRating() {
        mockSecurityContext(mockUser);
        UUID commentId = UUID.randomUUID();

        ItineraryComment comment = ItineraryComment.builder()
                .id(commentId)
                .itineraryId(itineraryId)
                .userId(mockUser.getId())
                .content("Bình luận cần xóa")
                .rating(4)
                .build();

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.calculateAverageRatingByItineraryId(itineraryId)).thenReturn(5.0);

        commentService.deleteComment(itineraryId, commentId);

        verify(commentRepository).delete(comment);
        assertEquals(5.0, mockItinerary.getRating());
        verify(itineraryRepository).save(mockItinerary);
    }

    @Test
    void deleteComment_byAdmin_shouldAllowDeletion() {
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@example.com")
                .role("admin")
                .build();
        mockSecurityContext(adminUser);

        UUID commentId = UUID.randomUUID();
        ItineraryComment comment = ItineraryComment.builder()
                .id(commentId)
                .itineraryId(itineraryId)
                .userId(mockUser.getId())
                .content("Vi phạm nội dung")
                .build();

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        commentService.deleteComment(itineraryId, commentId);

        verify(commentRepository).delete(comment);
    }

    @Test
    void deleteComment_byUnauthorizedUser_shouldThrowForbiddenException() {
        User anotherUser = User.builder()
                .id(UUID.randomUUID())
                .email("other@example.com")
                .role("user")
                .build();
        mockSecurityContext(anotherUser);

        UUID commentId = UUID.randomUUID();
        ItineraryComment comment = ItineraryComment.builder()
                .id(commentId)
                .itineraryId(itineraryId)
                .userId(mockUser.getId())
                .content("Bình luận của mockUser")
                .build();

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThrows(ForbiddenException.class, () -> commentService.deleteComment(itineraryId, commentId));
        verify(commentRepository, never()).delete(any());
    }

    @Test
    void deleteComment_wrongItinerary_shouldThrowBadRequestException() {
        mockSecurityContext(mockUser);
        UUID commentId = UUID.randomUUID();
        UUID otherItineraryId = UUID.randomUUID();

        ItineraryComment comment = ItineraryComment.builder()
                .id(commentId)
                .itineraryId(otherItineraryId)
                .userId(mockUser.getId())
                .content("Bình luận thuộc lịch trình khác")
                .build();

        when(itineraryRepository.findById(itineraryId)).thenReturn(Optional.of(mockItinerary));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThrows(BadRequestException.class, () -> commentService.deleteComment(itineraryId, commentId));
        verify(commentRepository, never()).delete(any());
    }
}
