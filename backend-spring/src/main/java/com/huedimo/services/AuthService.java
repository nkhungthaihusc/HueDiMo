package com.huedimo.services;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.huedimo.dto.AuthResponse;
import com.huedimo.dto.LoginRequest;
import com.huedimo.dto.RegisterRequest;
import com.huedimo.models.User;
import com.huedimo.repositories.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng");
        }
        String encodePassword = passwordEncoder.encode(request.getPassword());

        final User user = User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(encodePassword)
                .avatarUrl(request.getAvatarUrl())
                .role("user")
                .status("active")
                .points(0)
                .checkinCount(0)
                .provider("local")
                .build();
        User saveUser = userRepository.save(user);
        final AuthResponse newUser = AuthResponse.builder()
                .id(saveUser.getId())
                .email(saveUser.getEmail())
                .name(saveUser.getName())
                .avatarUrl(saveUser.getAvatarUrl())
                .role(saveUser.getRole())
                .accessToken(jwtService.generateAccessToken(saveUser))
                .refreshToken(jwtService.generateRefreshToken(saveUser))
                .expiresAccessToken(jwtService.getAccessTokenExpiry())
                .expiresRefreshToken(jwtService.getRefreshTokenExpiry())
                .build();
        return newUser;

    }

    public AuthResponse login(LoginRequest request) {
        final User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Tài khoảng không tồn tại"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu không chính xác!");
        }
        return AuthResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .accessToken(jwtService.generateAccessToken(user))
                .refreshToken(jwtService.generateRefreshToken(user))
                .expiresAccessToken(jwtService.getAccessTokenExpiry())
                .expiresRefreshToken(jwtService.getRefreshTokenExpiry())
                .build();
    }
}
