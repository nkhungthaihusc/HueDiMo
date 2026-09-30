package com.huedimo.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthResponse {
    private UUID id;
    private String email;
    private String name;
    private String avatarUrl;
    private String role;
    private String accessToken;
    private LocalDateTime expiresAccessToken;
    private String refreshToken;
    private LocalDateTime expiresRefreshToken;
}
