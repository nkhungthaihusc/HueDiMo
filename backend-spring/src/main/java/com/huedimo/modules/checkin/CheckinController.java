package com.huedimo.modules.checkin;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.modules.checkin.dto.request.CheckinRequest;
import com.huedimo.modules.checkin.dto.response.CheckinResponse;
import com.huedimo.modules.checkin.dto.response.MyCheckinsResponse;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/checkins")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CheckinController {

    CheckinService checkinService;

    /**
     * POST /api/checkins
     * Check-in địa điểm du lịch để nhận điểm thưởng (yêu cầu đăng nhập)
     */
    @PostMapping
    public ApiResponse<CheckinResponse> checkin(@Valid @RequestBody CheckinRequest request) {
        return ApiResponse.success("Check-in thành công", checkinService.checkin(request));
    }

    /**
     * GET /api/checkins/me
     * Lấy danh sách ID các địa điểm đã check-in của user hiện tại
     */
    @GetMapping("/me")
    public ApiResponse<MyCheckinsResponse> getMyCheckins() {
        return ApiResponse.success(checkinService.getMyCheckins());
    }
}
