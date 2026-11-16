package com.huedimo.modules.admin;

import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {
    private final AdminUserService service;

    @GetMapping
    public ApiResponse<AdminPage<AdminUserService.Account>> users(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String role) {
        return ApiResponse.success(service.list(page, limit, q, role));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdminUserService.Account> user(@PathVariable UUID id) {
        return ApiResponse.success(service.get(id));
    }

    @PatchMapping("/{id}/role")
    public ApiResponse<AdminUserService.Account> updateRole(@PathVariable UUID id, @Valid @RequestBody RoleRequest request) {
        return ApiResponse.success(service.updateRole(id, request.role()));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<AdminUserService.Account> updateStatus(@PathVariable UUID id,
            @Valid @RequestBody StatusRequest request) {
        return ApiResponse.success(service.updateStatus(id, request.status()));
    }

    public record RoleRequest(@NotNull @Pattern(regexp = "admin|user") String role) {}
    public record StatusRequest(@NotNull @Pattern(regexp = "active|banned") String status) {}
}
