package com.huedimo.modules.checkin.dto.response;

import java.util.UUID;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CheckinResponse {
    UUID checkinId;
    String placeId;
    Integer pointsEarned;
    Integer totalPoints;
    Integer totalCheckins;
    String message;
}
