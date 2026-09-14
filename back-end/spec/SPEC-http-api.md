# Spec: HTTP API conventions & Endpoints (HueDiMo Backend)

Trạng thái: approved (9/2026). Tuân theo skill `api-and-interface-design` và `security-and-hardening`.

---

## 1. Envelope chung (mọi route handler bắt buộc)

Helper server: `src/utils/response.ts` (`sendSuccess` / `sendError`).

```
Thành công: 200/201                             { "data": T }
Thất bại  : 400/401/403/404/409/422/500/502     { "error": { "code", "message", "details?" } }
```

- `code`: chuỗi máy đọc được, UPPER_SNAKE (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`).
- `message`: chuỗi tiếng Việt cho người dùng, không lộ chi tiết nội bộ hoặc lỗi database.
- `details?`: context thêm khi hữu ích (vd: `{ field: "email" }`).

### Status → Code Mapping

| Status | Code | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_ERROR` | JSON hỏng / body không đọc được |
| 422 | `VALIDATION_ERROR` | Dữ liệu hợp lệ về cú pháp nhưng sai ngữ nghĩa / validation thất bại |
| 401 | `UNAUTHORIZED` | Chưa xác thực hoặc token không hợp lệ / hết hạn |
| 403 | `FORBIDDEN` | Không được phép truy cập |
| 404 | `NOT_FOUND` | Không tìm thấy tài nguyên |
| 409 | `CONFLICT` | Trùng lặp (vd: email đã được đăng ký) |
| 502 | `UPSTREAM_ERROR` | Lỗi dịch vụ ngoài (AI, dịch vụ bên thứ ba) |
| 500 | `INTERNAL_ERROR` | Lỗi server nội bộ, tuyệt đối KHÔNG lộ stack trace hay cấu hình |

---

## 2. Quy tắc bắt buộc theo skill

- **Validate ở biên (Boundary Validation)**: Route handler và Controller validate chặt chẽ input từ client (email regex, password length, v.v.). Không validate bên trong Model/Service khi kiểu dữ liệu đã được đảm bảo.
- **Swagger / OpenAPI bắt buộc**: Mọi API backend khi được tạo mới hoặc cập nhật bắt buộc phải viết kèm tài liệu Swagger chi tiết (summary, requestBody, schema response data/error, authentication) trong `src/docs/swagger.ts` và kiểm tra tương tác tại `/api/docs`.
- **Mã hóa an toàn**: Mật khẩu phải được băm với bcrypt (`bcryptjs`) salt rounds = 10. Không bao giờ trả về `password_hash` cho client.
- **Cơ chế Token kép (Dual Token & Rotation)**:
  - **Access Token**: Thời hạn **15 phút**, mang thông tin người dùng (`id`, `email`, `name`, `role`), gửi kèm header `Authorization: Bearer <accessToken>`.
  - **Refresh Token**: Thời hạn **30 ngày (1 tháng)**, lưu mã băm trong database `refresh_tokens`.
  - **Refresh Token Rotation**: Mỗi khi đổi token tại `POST /api/auth/refresh`, refresh token cũ bị thu hồi ngay lập tức và cấp cặp token mới. Nếu phát hiện token đã thu hồi bị gửi lại (Reuse Detection), hệ thống tự động hủy toàn bộ phiên của người dùng.
- **Cộng dồn thêm field**: Mọi field mới là optional, additive để đảm bảo tính tương thích ngược.
- **Naming**: Field dùng `camelCase`; enum/status dùng `UPPER_SNAKE`; boolean có tiền tố `is`/`has`/`can`.

---

## 3. Danh sách Endpoints hiện tại

### 3.1. Authentication (`/api/auth`)

- **`POST /api/auth/register`**:
  - Input: `{ name: string, email: string, password: string >= 6 ký tự }`
  - Output: `201` `{ data: { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } }`
  - Errors: `409` CONFLICT (email trùng), `422` VALIDATION_ERROR (dữ liệu sai).
- **`POST /api/auth/login`**:
  - Input: `{ email: string, password: string }`
  - Output: `200` `{ data: { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } }`
  - Errors: `401` UNAUTHORIZED (sai mật khẩu/email), `422` VALIDATION_ERROR.
- **`POST /api/auth/refresh`**:
  - Input: `{ refreshToken: string }`
  - Output: `200` `{ data: { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } }`
  - Errors: `401` UNAUTHORIZED (hết hạn hoặc token bị thu hồi), `422` VALIDATION_ERROR.
- **`GET /api/auth/me`**:
  - Header: `Authorization: Bearer <accessToken>`
  - Output: `200` `{ data: { user } }`
  - Errors: `401` UNAUTHORIZED (access token hết hạn -> client gọi /refresh).
- **`POST /api/auth/logout`**:
  - Body: `{ refreshToken?: string }` (tùy chọn)
  - Output: `200` `{ data: { message: "Đăng xuất thành công." } }`.

### 3.2. Places (`/api/places`)

- **`GET /api/places`**:
  - Query: `category?: string` (`ancient`, `temple`, `food`, `hotel`, `nature`, `culture`)
  - Output: `200` `{ data: Place[] }`

### 3.3. System & Docs

- **`GET /api/health`**:
  - Output: `200` `{ data: { status: "ok", database: "connected", timestamp, totalPlaces } }`
- **`GET /api/docs`**:
  - Giao diện tài liệu tương tác Swagger UI.
- **`GET /api/docs.json`**:
  - Đặc tả OpenAPI 3.0 dạng JSON.

---

## 4. Verification status

- [x] Envelope đồng nhất — `sendSuccess` / `sendError`
- [x] Validate ở biên — AuthController validate regex email, length password
- [x] UserModel riêng — tách biệt Data Access Layer khỏi Service và Controller
- [x] Swagger UI — kiểm tra trực tiếp tại `/api/docs`
- [x] Bộ test tự động — `npx tsx src/tests/auth.test.ts` đạt 10/10 PASS
