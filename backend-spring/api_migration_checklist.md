# 🚀 HueDiMo API Migration Checklist (Express -> Spring Boot)

Checklist đối chiếu các route Express với Spring Boot.

- [x] : Đã có route hoặc chức năng tương đương bên Spring Boot
- [ ] : Còn thiếu route hoặc hành vi tương thích với Express
- [✨] : Phát triển mới hoàn toàn (Chưa từng có ở Express)

---

## PHẦN 1: CÁC API CẦN MIGRATE TỪ EXPRESS SANG SPRING BOOT

### 1. 🔐 Authentication (`/api/auth`)
- [x] `POST /api/auth/send-otp` - Gửi mã OTP đăng ký qua email (route riêng của Spring)
- [x] `POST /api/auth/verify-otp` - Xác thực mã OTP đăng ký (route riêng của Spring)
- [ ] `POST /api/auth/register/otp` - Route gửi OTP đăng ký của Express, có giới hạn lượt gửi
- [x] `POST /api/auth/register` - Đăng ký tài khoản (kèm kiểm tra OTP đã xác thực)
- [x] `POST /api/auth/login` - Đăng nhập
- [x] `GET /api/auth/me` - Lấy Profile (yêu cầu token)
- [ ] `POST /api/auth/refresh` - Spring đã cấp token mới, còn thiếu lưu và luân chuyển refresh token như Express
- [x] `PATCH /api/auth/profile` - Cập nhật thông tin User
- [ ] `POST /api/auth/logout` - Spring đã có route, còn thiếu thu hồi refresh token
- [ ] `POST /api/auth/password/reset/otp` - Gửi OTP đặt lại mật khẩu
- [ ] `POST /api/auth/password/reset/verify` - Xác thực OTP đặt lại mật khẩu
- [ ] `POST /api/auth/password/reset` - Đặt lại mật khẩu bằng OTP
- [ ] `POST /api/auth/password/otp` - Gửi OTP đổi mật khẩu cho người đã đăng nhập
- [ ] `PATCH /api/auth/password` - Đổi mật khẩu cho người đã đăng nhập
- [ ] `POST /api/auth/oauth-login` - Đăng nhập Google qua Supabase

### 2. 📍 Places (`/api/places`)
- [x] `GET /api/places` - Danh sách địa điểm đã duyệt
- [x] `GET /api/places/search` - Tìm kiếm địa điểm
- [x] `GET /api/places/{id}` - Chi tiết địa điểm (route riêng của Spring)
- [x] `POST /api/places` - Đóng góp địa điểm mới (kèm gán `createdBy`)
- [x] `GET /api/places/my` - Danh sách địa điểm tự đóng góp (đã hoàn thiện ✨)

### 3. ⭐ Reviews (`/api/places/{placeId}/reviews`)
- [x] `GET /api/places/{placeId}/reviews` - Lấy tất cả đánh giá của 1 địa điểm
- [x] `POST /api/places/{placeId}/reviews` - Viết bài đánh giá mới (tính rating)

### 4. 🗺️ Itinerary (`/api/itineraries` hoặc `/api/itinerary`)
- [x] `POST /api/itineraries/generate` - AI tự tạo lịch trình
- [ ] `POST /api/itineraries` và `POST /api/itinerary` - Route tương thích cũ của Express; chọn tạo lịch trình khi `places` là mảng, còn lại chuyển sang lưu
- [x] `POST /api/itineraries/save` - Lưu lịch trình vào DB
- [x] `GET /api/itineraries/my` - Lấy lịch trình của tôi
- [x] `GET /api/itineraries/community` - Khám phá lịch trình cộng đồng
- [x] `GET /api/itineraries/{id}` - Chi tiết lịch trình
- [x] `PATCH /api/itineraries/{id}/visibility` - Ẩn/Hiện với cộng đồng
- [x] `POST /api/itineraries/{id}/fork` - Nhân bản / Sao chép lịch trình cộng đồng
- [x] `POST /api/itineraries/{id}/reaction` - Like lịch trình
- [x] `POST /api/itineraries/{id}/bookmark` - Đánh dấu lưu trữ
- [x] `DELETE /api/itineraries/{id}` - Xóa lịch trình
- [x] `GET /api/itineraries/{id}/comments` - Lấy comment lịch trình
- [x] `POST /api/itineraries/{id}/comments` - Viết comment
- [x] `DELETE /api/itineraries/{id}/comments/{commentId}` - Xóa comment

### 5. 🏆 Gamification (`/api`)
- [x] `POST /api/checkins` - Check-in tại địa điểm
- [x] `GET /api/checkins/me` - Lịch sử check-in cá nhân
- [x] `GET /api/leaderboard` - Bảng xếp hạng User

### 6. 👑 Admin (`/api/admin`)
- [x] `GET /api/admin/stats` - Thống kê dashboard
- [x] `GET /api/admin/places` - Tìm kiếm, lọc và phân trang địa điểm
- [ ] `POST /api/admin/places` - Admin tạo địa điểm
- [x] `PATCH /api/admin/places/{id}/status` - Duyệt, từ chối hoặc đưa về chờ duyệt
- [ ] `PUT /api/admin/places/{id}` - Admin sửa địa điểm
- [ ] `DELETE /api/admin/places/{id}` - Admin xóa địa điểm
- [ ] `GET /api/admin/places/export-csv` - Xuất CSV
- [ ] `POST /api/admin/places/import-csv/preview` - Xem trước dữ liệu CSV
- [ ] `POST /api/admin/places/import-csv` - Nhập CSV
- [x] `GET /api/admin/users` - Tìm kiếm, lọc theo vai trò và phân trang tài khoản
- [x] `GET /api/admin/users/{id}` - Chi tiết tài khoản
- [x] `PATCH /api/admin/users/{id}/role` - Đổi vai trò
- [x] `PATCH /api/admin/users/{id}/status` - Khóa hoặc mở khóa tài khoản
- [ ] `GET /api/admin/reviews` - Quản lý Review
- [ ] `DELETE /api/admin/reviews/{id}` - Xóa Review vi phạm
- [ ] `GET /api/admin/itineraries` - Quản lý lịch trình
- [ ] `PATCH /api/admin/itineraries/{id}/visibility` - Đổi trạng thái công khai
- [ ] `DELETE /api/admin/itineraries/{id}` - Xóa lịch trình
- [ ] `GET /api/admin/itinerary-comments` - Danh sách bình luận lịch trình
- [ ] `DELETE /api/admin/itinerary-comments/{id}` - Xóa bình luận vi phạm
- [ ] `GET /api/admin/logs` - Audit Logs
- [ ] `DELETE /api/admin/logs` - Xóa nhật ký
- [ ] `GET /api/admin/ai-settings` - Cấu hình AI Prompt
- [ ] `PUT /api/admin/ai-settings` - Cập nhật cấu hình AI
- [ ] `POST /api/admin/ai-settings/test` - Kiểm tra cấu hình AI

### 7. 🌤️ Utilities (`/api/...`)
- [x] `POST /api/upload/presign` - Cấp URL tải ảnh trực tiếp lên Supabase Storage
- [x] `GET /api/weather/rainfall` - Lượng mưa từ Vrain, có dữ liệu dự phòng
- [ ] `GET /api/water-levels` - Cảnh báo ngập lụt
- [x] `GET /api/reverse-geocode` - Tra địa chỉ qua `GEOCODING_REVERSE_URL`; trả tọa độ khi thiếu cấu hình hoặc nhà cung cấp gặp lỗi
- [ ] `GET /api/map/**` - Proxy tài nguyên Goong cho bản đồ web
- [ ] `GET /api/health` - Kiểm tra kết nối cơ sở dữ liệu
- [x] Swagger UI và OpenAPI - Spring dùng `/swagger-ui/index.html` và `/v3/api-docs`. Express dùng `/api/docs` và `/api/docs.json`.

---

## PHẦN 2: 🚀 CÁC TÍNH NĂNG PHÁT TRIỂN MỚI TỪ CON SỐ 0 (CHƯA HỀ CÓ Ở EXPRESS)

- [✨] **Hệ thống Lập Dự Toán (Budgeting / Cost Estimation):** Tự động tính toán chi phí, phân bổ ngân sách cho chuyến đi (ăn ở, đi lại, vé tham quan).
- [✨] **Cộng tác lịch trình thời gian thực (Real-time Itinerary Collaboration)**.
