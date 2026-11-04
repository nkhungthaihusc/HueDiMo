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
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LeaderboardUserResponse {
    UUID id;
    String name;
    String avatarUrl;
    String role;
    Integer points;
    Integer checkinCount;
    Integer rank;
}
