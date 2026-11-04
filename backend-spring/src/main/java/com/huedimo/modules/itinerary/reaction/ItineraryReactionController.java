package com.huedimo.modules.itinerary.reaction;

import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.itinerary.reaction.dto.response.ReactionResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/itineraries/{id}/reaction")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ItineraryReactionController {

    ItineraryReactionService reactionService;

    /**
     * POST /api/itineraries/{id}/reaction
     * Thả tim (Like) / Hủy thả tim
     */
    @PostMapping
    public ApiResponse<ReactionResponse> toggleReaction(@PathVariable UUID id) {
        return ApiResponse.success("Cập nhật cảm xúc thành công", reactionService.toggleReaction(id));
    }
}
