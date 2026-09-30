# Tasks: Public Shared Itineraries & Community

- [x] Task 1.1: Database Schema & Migration (PostgreSQL / Supabase)
  - Acceptance: Thêm các cột thống kê (`views_count`, `likes_count`, `bookmarks_count`, `forks_count`, `transport_mode`, `group_size`) vào bảng `itineraries`. Tạo bảng `itinerary_reactions`, `itinerary_bookmarks`, `itinerary_comments` với khóa ngoại ON DELETE CASCADE và index phù hợp.
  - Verify: Supabase execute_sql schema check.
  - Files: Database migration.

- [x] Task 2.1: Backend REST Endpoints Implementation
  - Acceptance: Đầy đủ endpoints `/api/itinerary` & `/api/itineraries`:
    - `GET /community` (lọc ngày, ngân sách, sort, pagination)
    - `GET /my` (danh sách của user)
    - `GET /:id` (chi tiết + tác giả + stats + trạng thái liked/bookmarked của user hiện tại)
    - `POST /save` & `POST /` (lưu hoặc cập nhật lịch trình)
    - `PATCH /:id/visibility` (bật/tắt public)
    - `POST /:id/reaction` (toggle tim)
    - `POST /:id/bookmark` (toggle bookmark)
    - `POST /:id/fork` (nhân bản tăng forks_count)
    - `GET /:id/comments` & `POST /:id/comments` & `DELETE /:id/comments/:commentId`
  - Verify: `npx tsc --noEmit` pass và test REST API trả về 200 OK.
  - Files: `back-end/src/controllers/itinerary.controller.ts`, `back-end/src/routes/itinerary.routes.ts`, `back-end/src/app.ts`.

- [x] Task 3.1: Frontend API Client & Data Models
  - Acceptance: Triển khai các hàm gọi API trong `front-end/lib/api/itineraries.ts` kèm cơ chế tự động làm mới token (refresh token) khi cần thiết.
  - Verify: `npx tsc --noEmit` tại `front-end` pass không lỗi.
  - Files: `front-end/lib/api/itineraries.ts`, `front-end/lib/itinerary/types.ts`.

- [x] Task 4.1: Social & Public Controls in Itinerary Result & History Panels
  - Acceptance: Có nút chuyển đổi trạng thái Công khai (Public Toggle), hiển thị badge "Cộng đồng" / "Riêng tư", hiển thị số tim và danh sách ý kiến/bình luận có thể gửi góp ý trực tiếp.
  - Verify: Cập nhật component `ItineraryResultPanel.tsx` và `SavedItinerariesPanel.tsx`.
  - Files: `front-end/components/home/ItineraryResultPanel.tsx`, `front-end/components/home/SavedItinerariesPanel.tsx`.

- [x] Task 5.1: Community Discovery Modal & Forking to Map
  - Acceptance: Tạo `CommunityItinerariesModal.tsx` với giao diện trực quan, thẻ lịch trình hiện đại, bộ lọc tìm kiếm theo số ngày, ngân sách, phương tiện. Nút "Sử dụng" sẽ nạp toàn bộ các điểm dừng lên bản đồ `MapView` và lưu vào tài khoản du khách.
  - Verify: Kiểm tra trọn vẹn luồng từ duyệt cộng đồng -> nạp bản đồ -> đi lại hành trình.
  - Files: `front-end/components/home/CommunityItinerariesModal.tsx`, `front-end/components/home/TopBar.tsx`, `front-end/components/home/HomeClient.tsx`.

- [x] Bugfix: Trùng lặp (Duplicate) lịch trình khi chuyển đổi Public / Private liên tục
  - Root cause: ID cục bộ ban đầu (`it-178...`) chưa được cập nhật thành UUID trả về từ Server; khi fetch từ server về, hàm merge ghép cả bản local cũ và bản cloud mới. Đồng thời hàm `saveItinerary` chưa lọc trùng theo nội dung ngày/địa điểm.
  - Fix: 
    1. Bổ sung hàm `getItinerarySignature` kiểm tra trùng lặp nội dung.
    2. Viết hàm `updateItineraryId` thay thế mã ID cục bộ thành UUID server trong localStorage ngay khi lưu/toggle.
    3. Thêm bộ lọc khử trùng hai chiều (ID + Signature) trong `SavedItinerariesPanel.tsx` và `logic.ts`.
  - Files: `front-end/lib/itinerary/logic.ts`, `front-end/components/home/SavedItinerariesPanel.tsx`, `front-end/components/home/ItineraryResultPanel.tsx`.

