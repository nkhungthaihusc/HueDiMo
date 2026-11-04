package com.huedimo.modules.itinerary.bookmark;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.common.utils.SecurityUtils;
import com.huedimo.modules.user.User;
import com.huedimo.modules.itinerary.Itinerary;
import com.huedimo.modules.itinerary.ItineraryRepository;
import com.huedimo.modules.itinerary.bookmark.dto.response.BookmarkResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ItineraryBookmarkService {

    ItineraryBookmarkRepository itineraryBookmarkRepository;
    ItineraryRepository itineraryRepository;

    @Transactional
    public BookmarkResponse toggleBookmark(UUID itineraryId) {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("User {} toggling bookmark for itinerary {}", currentUser.getId(), itineraryId);

        Itinerary itinerary = itineraryRepository.findById(itineraryId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + itineraryId));

        Optional<ItineraryBookmark> existingOpt = itineraryBookmarkRepository.findByItineraryIdAndUserId(itineraryId, currentUser.getId());
        boolean isBookmarked;
        if (existingOpt.isPresent()) {
            itineraryBookmarkRepository.delete(existingOpt.get());
            long count = Math.max(0L, (itinerary.getBookmarksCount() != null ? itinerary.getBookmarksCount() : 1L) - 1L);
            itinerary.setBookmarksCount(count);
            isBookmarked = false;
        } else {
            ItineraryBookmark bookmark = ItineraryBookmark.builder()
                    .itineraryId(itineraryId)
                    .userId(currentUser.getId())
                    .build();
            itineraryBookmarkRepository.save(bookmark);
            long count = (itinerary.getBookmarksCount() != null ? itinerary.getBookmarksCount() : 0L) + 1L;
            itinerary.setBookmarksCount(count);
            isBookmarked = true;
        }

        itineraryRepository.save(itinerary);

        return BookmarkResponse.builder()
                .isBookmarked(isBookmarked)
                .bookmarksCount(itinerary.getBookmarksCount())
                .build();
    }

    public boolean isBookmarkedByUser(UUID itineraryId, UUID userId) {
        if (userId == null) return false;
        return itineraryBookmarkRepository.existsByItineraryIdAndUserId(itineraryId, userId);
    }

    public long countByItineraryId(UUID itineraryId) {
        return itineraryBookmarkRepository.countByItineraryId(itineraryId);
    }

    @Transactional
    public void deleteByItineraryId(UUID itineraryId) {
        itineraryBookmarkRepository.deleteByItineraryId(itineraryId);
    }
}
