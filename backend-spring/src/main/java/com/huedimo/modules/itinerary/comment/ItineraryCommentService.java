package com.huedimo.modules.itinerary.comment;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.huedimo.common.exceptions.status400.BadRequestException;
import com.huedimo.common.exceptions.status403.ForbiddenException;
import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.common.utils.SecurityUtils;
import com.huedimo.modules.user.User;
import com.huedimo.modules.user.UserRepository;
import com.huedimo.modules.itinerary.Itinerary;
import com.huedimo.modules.itinerary.ItineraryRepository;
import com.huedimo.modules.itinerary.comment.dto.request.CreateCommentRequest;
import com.huedimo.modules.itinerary.comment.dto.response.ItineraryCommentResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ItineraryCommentService {

    ItineraryCommentRepository itineraryCommentRepository;
    ItineraryRepository itineraryRepository;
    UserRepository userRepository;

    /**
     * Lấy danh sách bình luận / đánh giá của lịch trình
     */
    public List<ItineraryCommentResponse> getComments(UUID itineraryId) {
        log.info("Fetching comments for itinerary {}", itineraryId);

        if (!itineraryRepository.existsById(itineraryId)) {
            throw new NotFoundException("Không tìm thấy lịch trình với ID: " + itineraryId);
        }

        List<ItineraryComment> comments = itineraryCommentRepository.findByItineraryIdOrderByCreatedAtAsc(itineraryId);
        if (comments.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> userIds = comments.stream().map(ItineraryComment::getUserId).collect(Collectors.toSet());
        Map<UUID, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return comments.stream()
                .map(comment -> {
                    User user = userMap.get(comment.getUserId());
                    String userName = user != null
                            ? (user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getEmail())
                            : "Người dùng";
                    return ItineraryCommentResponse.builder()
                            .id(comment.getId())
                            .itineraryId(comment.getItineraryId())
                            .userId(comment.getUserId())
                            .userName(userName)
                            .userAvatar(user != null ? user.getAvatarUrl() : null)
                            .userRole(user != null ? user.getRole() : "user")
                            .content(comment.getContent())
                            .rating(comment.getRating())
                            .createdAt(comment.getCreatedAt())
                            .build();
                })
                .toList();
    }

    /**
     * Viết bình luận / đánh giá sao mới cho lịch trình
     */
    @Transactional
    public ItineraryCommentResponse addComment(UUID itineraryId, CreateCommentRequest request) {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("User {} adding comment to itinerary {}: {}", currentUser.getId(), itineraryId, request.getContent());

        Itinerary itinerary = itineraryRepository.findById(itineraryId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + itineraryId));

        ItineraryComment comment = ItineraryComment.builder()
                .itineraryId(itineraryId)
                .userId(currentUser.getId())
                .content(request.getContent().trim())
                .rating(request.getRating())
                .build();
        ItineraryComment savedComment = itineraryCommentRepository.save(comment);

        if (request.getRating() != null) {
            Double avgRating = itineraryCommentRepository.calculateAverageRatingByItineraryId(itineraryId);
            itinerary.setRating(avgRating);
            itineraryRepository.save(itinerary);
        }

        String userName = currentUser.getName() != null && !currentUser.getName().isBlank()
                ? currentUser.getName()
                : currentUser.getEmail();

        return ItineraryCommentResponse.builder()
                .id(savedComment.getId())
                .itineraryId(savedComment.getItineraryId())
                .userId(savedComment.getUserId())
                .userName(userName)
                .userAvatar(currentUser.getAvatarUrl())
                .userRole(currentUser.getRole())
                .content(savedComment.getContent())
                .rating(savedComment.getRating())
                .createdAt(savedComment.getCreatedAt())
                .build();
    }

    /**
     * Xóa bình luận (chỉ chủ bình luận hoặc admin mới có quyền)
     */
    @Transactional
    public void deleteComment(UUID itineraryId, UUID commentId) {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("User {} deleting comment {} from itinerary {}", currentUser.getId(), commentId, itineraryId);

        Itinerary itinerary = itineraryRepository.findById(itineraryId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + itineraryId));

        ItineraryComment comment = itineraryCommentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bình luận với ID: " + commentId));

        if (!comment.getItineraryId().equals(itineraryId)) {
            throw new BadRequestException("Bình luận không thuộc lịch trình này");
        }

        boolean isOwner = comment.getUserId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() != null && "admin".equalsIgnoreCase(currentUser.getRole());
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền xóa bình luận này");
        }

        itineraryCommentRepository.delete(comment);

        if (comment.getRating() != null) {
            Double avgRating = itineraryCommentRepository.calculateAverageRatingByItineraryId(itineraryId);
            itinerary.setRating(avgRating);
            itineraryRepository.save(itinerary);
        }
    }

    public long countByItineraryId(UUID itineraryId) {
        return itineraryCommentRepository.countByItineraryId(itineraryId);
    }

    public Double calculateAverageRating(UUID itineraryId) {
        return itineraryCommentRepository.calculateAverageRatingByItineraryId(itineraryId);
    }

    @Transactional
    public void deleteByItineraryId(UUID itineraryId) {
        itineraryCommentRepository.deleteByItineraryId(itineraryId);
    }
}
