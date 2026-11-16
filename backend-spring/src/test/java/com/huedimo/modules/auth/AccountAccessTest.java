package com.huedimo.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.huedimo.common.exceptions.status403.ForbiddenException;
import com.huedimo.modules.auth.dto.LoginRequest;
import com.huedimo.modules.auth.dto.RefreshTokenRequest;
import com.huedimo.modules.auth.jwt.JwtAuthenticationFilter;
import com.huedimo.modules.auth.jwt.JwtService;
import com.huedimo.modules.auth.otp.OtpService;
import com.huedimo.modules.user.User;
import com.huedimo.modules.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class AccountAccessTest {
    @Mock private UserRepository users;
    @Mock private PasswordEncoder passwords;
    @Mock private JwtService tokens;
    @Mock private OtpService otp;

    private final User banned = User.builder().id(UUID.randomUUID()).email("banned@example.test")
            .passwordHash("encoded").role("admin").status("banned").build();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void bannedAccountWithCorrectPasswordCannotLogIn() {
        when(users.findByEmail(banned.getEmail())).thenReturn(Optional.of(banned));
        when(passwords.matches("correct", banned.getPasswordHash())).thenReturn(true);
        var service = new AuthService(users, passwords, tokens, otp);

        assertThatThrownBy(() -> service.login(new LoginRequest(banned.getEmail(), "correct")))
                .isInstanceOf(ForbiddenException.class);
        verifyNoMoreInteractions(tokens);
    }

    @Test
    void bannedAccountCannotRefreshATokenIssuedBeforeTheBan() {
        when(tokens.extractUserIdFromRefreshToken("refresh")).thenReturn(banned.getId().toString());
        when(users.findById(banned.getId())).thenReturn(Optional.of(banned));
        var service = new AuthService(users, passwords, tokens, otp);

        assertThatThrownBy(() -> service.refresh(new RefreshTokenRequest("refresh")))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void accessTokenCannotAuthenticateABannedAdmin() throws Exception {
        when(tokens.extractUserIdFromAccessToken("access")).thenReturn(banned.getId().toString());
        when(users.findById(banned.getId())).thenReturn(Optional.of(banned));
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer access");
        var filter = new JwtAuthenticationFilter(tokens, users);

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) ->
                assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull());
    }
}
