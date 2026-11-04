package com.huedimo.modules.auth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.auth.dto.AuthResponse;
import com.huedimo.modules.auth.dto.LoginRequest;
import com.huedimo.modules.auth.dto.RefreshTokenRequest;
import com.huedimo.modules.auth.dto.RegisterRequest;
import com.huedimo.modules.auth.dto.SendOtpRequest;
import com.huedimo.modules.auth.dto.UpdateProfileRequest;
import com.huedimo.modules.auth.dto.UserResponse;
import com.huedimo.modules.auth.dto.VerifyOtpRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/send-otp")
    public ApiResponse<Void> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendOtp(request);
        return ApiResponse.success("Mã xác thực OTP đã được gửi đến email của bạn");
    }

    @PostMapping("/verify-otp")
    public ApiResponse<Void> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyOtp(request);
        return ApiResponse.success("Xác thực mã OTP thành công");
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success("Đăng nhập thành công", authService.login(request));
    }

    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success("Đăng ký tài khoản thành công", authService.register(request));
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMe() {
        return ApiResponse.success(authService.getMe());
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.success("Làm mới token thành công", authService.refresh(request));
    }

    @PatchMapping("/profile")
    public ApiResponse<UserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.success("Cập nhật thông tin thành công", authService.updateUser(request));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        return ApiResponse.success("Đăng xuất thành công");
    }
}
