package com.huedimo.modules.itinerary.dto.request;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommunityFilterRequest {
    String search;
    String transportMode;
    Integer daysCount;
    Double maxBudget;

    @Builder.Default
    String sort = "newest";

    @Builder.Default
    Integer page = 1;

    @Builder.Default
    Integer limit = 12;
}
