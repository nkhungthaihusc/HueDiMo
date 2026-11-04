# 🚀 HueDiMo API Migration Checklist (Express -> Spring Boot)

Danh sách này đã được đối chiếu 100% với file `app.ts` và thư mục `routes` bên Express để đảm bảo không bỏ sót bất kỳ API nào.

- [x] : Đã hoàn thành bên Spring Boot
- [ ] : Chưa làm, cần code tiếp (Migrate từ Express)
- [✨] : Phát triển mới hoàn toàn (Chưa từng có ở Express)

---

## PHẦN 1: CÁC API CẦN MIGRATE TỪ EXPRESS SANG SPRING BOOT

### 1. 🔐 Authentication (`/api/auth`)
- [x] `POST /api/auth/send-otp` - Gửi mã OTP qua Email xác thực đăng ký (Mới ✨)
- [x] `POST /api/auth/verify-otp` - Xác thực mã OTP 6 số (Mới ✨)
- [x] `POST /api/auth/register` - Đăng ký tài khoản (kèm kiểm tra OTP đã xác thực)
- [x] `POST /api/auth/login` - Đăng nhập
- [x] `GET /api/auth/me` - Lấy Profile (yêu cầu token)
- [x] `POST /api/auth/refresh` - Refresh Token
- [x] `PATCH /api/auth/profile` - Cập nhật thông tin User
- [x] `POST /api/auth/logout` - Đăng xuất
- [ ] `POST /api/auth/oauth-login` - Đăng nhập Google/Facebook

### 2. 📍 Places (`/api/places`)
- [x] `GET /api/places` - Danh sách địa điểm đã duyệt
- [x] `GET /api/places/search` - Tìm kiếm địa điểm
- [x] `GET /api/places/{id}` - Chi tiết địa điểm
- [x] `POST /api/places` - Đóng góp địa điểm mới (kèm gán `createdBy`)
- [x] `GET /api/places/my` - Danh sách địa điểm tự đóng góp (đã hoàn thiện ✨)

### 3. ⭐ Reviews (`/api/places/{placeId}/reviews`)
- [x] `GET /api/places/{placeId}/reviews` - Lấy tất cả đánh giá của 1 địa điểm
- [x] `POST /api/places/{placeId}/reviews` - Viết bài đánh giá mới (tính rating)

### 4. 🗺️ Itinerary (`/api/itineraries` hoặc `/api/itinerary`)
- [x] `POST /api/itineraries/generate` - AI tự tạo lịch trình
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
- [ ] `GET /api/admin/stats` - Dashboard Statistics
- [ ] `GET /api/admin/places` - Quản lý tất cả địa điểm (CRUD & Duyệt)
- [ ] `PATCH /api/admin/places/{id}/status` - Duyệt địa điểm
- [ ] `PUT /api/admin/places/{id}` - Admin sửa địa điểm
- [ ] `DELETE /api/admin/places/{id}` - Admin xóa địa điểm
- [ ] `GET /api/admin/places/export-csv` - Xuất CSV
- [ ] `POST /api/admin/places/import-csv` - Nhập CSV
- [ ] `GET /api/admin/users` - Quản lý Users
- [ ] `PATCH /api/admin/users/{id}/role` - Cấp quyền Admin
- [ ] `PATCH /api/admin/users/{id}/status` - Khóa tài khoản
- [ ] `GET /api/admin/reviews` - Quản lý Review
- [ ] `DELETE /api/admin/reviews/{id}` - Xóa Review vi phạm
- [ ] `GET /api/admin/itineraries` - Quản lý lịch trình
- [ ] `DELETE /api/admin/itineraries/{id}` - Xóa lịch trình
- [ ] `GET /api/admin/logs` - Audit Logs
- [ ] `GET /api/admin/ai-settings` - Cấu hình AI Prompt

### 7. 🌤️ Utilities (`/api/...`)
- [ ] `POST /api/upload` - Upload ảnh (Supabase)
- [ ] `GET /api/weather/rainfall` - Thời tiết / Lượng mưa
- [ ] `GET /api/water-levels` - Cảnh báo ngập lụt
- [ ] `GET /api/reverse-geocode` - Chuyển đổi Tọa độ -> Tên đường

---

## PHẦN 2: 🚀 CÁC TÍNH NĂNG PHÁT TRIỂN MỚI TỪ CON SỐ 0 (CHƯA HỀ CÓ Ở EXPRESS)

- [✨] **Hệ thống Lập Dự Toán (Budgeting / Cost Estimation):** Tự động tính toán chi phí, phân bổ ngân sách cho chuyến đi (ăn ở, đi lại, vé tham quan).
- [✨] **Cộng tác lịch trình thời gian thực (Real-time Itinerary Collaboration)**.
