package com.huedimo.modules.auth;

import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.huedimo.common.utils.SecurityUtils;
import com.huedimo.modules.auth.dto.AuthResponse;
import com.huedimo.modules.auth.dto.LoginRequest;
import com.huedimo.modules.auth.dto.RefreshTokenRequest;
import com.huedimo.modules.auth.dto.RegisterRequest;
import com.huedimo.modules.auth.dto.SendOtpRequest;
import com.huedimo.modules.auth.dto.UpdateProfileRequest;
import com.huedimo.modules.auth.dto.UserResponse;
import com.huedimo.modules.auth.dto.VerifyOtpRequest;
import com.huedimo.modules.auth.jwt.JwtService;
import com.huedimo.modules.auth.otp.OtpService;
import com.huedimo.modules.user.User;
import com.huedimo.modules.user.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthService {
    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    JwtService jwtService;
    OtpService otpService;

    public void sendOtp(SendOtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email này đã được đăng ký tài khoản!");
        }
        otpService.generateAndSendOtp(email);
    }

    public void verifyOtp(VerifyOtpRequest request) {
        otpService.verifyOtp(request.getEmail(), request.getOtp());
    }

    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email đã được sử dụng");
        }

        // Nếu client truyền kèm OTP thì validate trực tiếp, nếu không thì kiểm tra
        // trạng thái đã verify trước đó
        if (request.getOtp() != null && !request.getOtp().isBlank()) {
            otpService.validateOtp(email, request.getOtp());
        } else {
            otpService.consumeVerifiedOtpForRegistration(email);
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
        final User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
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

    public UserResponse getMe() {
        User user = SecurityUtils.getCurrentUser();

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .status(user.getStatus())
                .points(user.getPoints())
                .checkinCount(user.getCheckinCount())
                .build();
    }

    public AuthResponse refresh(RefreshTokenRequest request) {
        final UUID userId = UUID.fromString(jwtService.extractUserIdFromRefreshToken(request.getRefreshToken()));

        final User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Tài khoảng không tồn tại hoặc token không hợp lệ"));
        return AuthResponse.builder()
                .id(userId)
                .name(user.getName())
                .avatarUrl(user.getAvatarUrl())
                .accessToken(jwtService.generateAccessToken(user))
                .refreshToken(jwtService.generateRefreshToken(user))
                .expiresAccessToken(jwtService.getAccessTokenExpiry())
                .expiresRefreshToken(jwtService.getRefreshTokenExpiry())
                .role(user.getRole())
                .email(user.getEmail())
                .build();
    }

    public UserResponse updateUser(UpdateProfileRequest request) {
        User currentUser = SecurityUtils.getCurrentUser();

        // 1. Kiểm tra và cập nhật thông tin nếu có truyền lên
        if (request.getName() != null && !request.getName().isBlank()) {
            currentUser.setName(request.getName().trim());
        }
        if (request.getAvatarUrl() != null) {
            currentUser.setAvatarUrl(request.getAvatarUrl().trim());
        }
        // 2. Lưu xuống CSDL
        User savedUser = userRepository.save(currentUser);

        return UserResponse.builder()
                .id(savedUser.getId())
                .name(savedUser.getName())
                .email(savedUser.getEmail())
                .avatarUrl(savedUser.getAvatarUrl())
                .role(savedUser.getRole())
                .status(savedUser.getStatus())
                .points(savedUser.getPoints())
                .checkinCount(savedUser.getCheckinCount())
                .build();
    }
}
