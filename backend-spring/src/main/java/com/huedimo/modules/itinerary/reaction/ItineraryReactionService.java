package com.huedimo.modules.itinerary.reaction;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.common.utils.SecurityUtils;
import com.huedimo.modules.user.User;
import com.huedimo.modules.itinerary.Itinerary;
import com.huedimo.modules.itinerary.ItineraryRepository;
import com.huedimo.modules.itinerary.reaction.dto.response.ReactionResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ItineraryReactionService {

    ItineraryReactionRepository itineraryReactionRepository;
    ItineraryRepository itineraryRepository;

    @Transactional
    public ReactionResponse toggleReaction(UUID itineraryId) {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("User {} toggling reaction for itinerary {}", currentUser.getId(), itineraryId);

        Itinerary itinerary = itineraryRepository.findById(itineraryId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + itineraryId));

        Optional<ItineraryReaction> existingOpt = itineraryReactionRepository.findByItineraryIdAndUserId(itineraryId, currentUser.getId());
        boolean isLiked;
        if (existingOpt.isPresent()) {
            itineraryReactionRepository.delete(existingOpt.get());
            long count = Math.max(0L, (itinerary.getLikesCount() != null ? itinerary.getLikesCount() : 1L) - 1L);
            itinerary.setLikesCount(count);
            isLiked = false;
        } else {
            ItineraryReaction reaction = ItineraryReaction.builder()
                    .itineraryId(itineraryId)
                    .userId(currentUser.getId())
                    .reactionType("like")
                    .build();
            itineraryReactionRepository.save(reaction);
            long count = (itinerary.getLikesCount() != null ? itinerary.getLikesCount() : 0L) + 1L;
            itinerary.setLikesCount(count);
            isLiked = true;
        }

        itineraryRepository.save(itinerary);

        return ReactionResponse.builder()
                .isLiked(isLiked)
                .likesCount(itinerary.getLikesCount())
                .build();
    }

    public boolean isLikedByUser(UUID itineraryId, UUID userId) {
        if (userId == null) return false;
        return itineraryReactionRepository.existsByItineraryIdAndUserId(itineraryId, userId);
    }

    public long countByItineraryId(UUID itineraryId) {
        return itineraryReactionRepository.countByItineraryId(itineraryId);
    }

    @Transactional
    public void deleteByItineraryId(UUID itineraryId) {
        itineraryReactionRepository.deleteByItineraryId(itineraryId);
    }
}
