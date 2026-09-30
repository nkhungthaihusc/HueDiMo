# Implementation Plan: Public Shared Itineraries & Social Community

## Overview
Xây dựng tính năng chia sẻ công khai lịch trình du lịch (Public Itineraries) cho cộng đồng HueDiMo, cho phép người khác xem, thả cảm xúc (❤️ like), đánh dấu (bookmark), bình luận/góp ý (comments) và sử dụng lại lộ trình (fork/use) trên bản đồ.

## Architecture Decisions
- **Database**: Sử dụng Supabase PostgreSQL bảng `itineraries` hiện có, bổ sung các trường thống kê (`views_count`, `likes_count`, `bookmarks_count`, `forks_count`) và 3 bảng liên kết: `itinerary_reactions`, `itinerary_bookmarks`, `itinerary_comments`.
- **Backend API**: Thiết kế module `itinerary.controller.ts` & `itinerary.routes.ts` mở rộng các endpoint cộng đồng, xác thực qua JWT Auth middleware.
- **Frontend Client**: Tạo module API `front-end/lib/api/itineraries.ts` đồng bộ giữa local state và cloud backend.
- **Frontend UI**:
  - Tích hợp nút Public Switch và cụm tương tác vào `ItineraryResultPanel` & `SavedItinerariesPanel`.
  - Xây dựng Modal/Panel **"🌍 Lịch trình Cộng đồng" (Community Itineraries Modal)** với bộ lọc đa chiều (ngân sách, số ngày, phương tiện, độ phổ biến).
  - Tích hợp tính năng **"Sử dụng lộ trình này"** để đưa các điểm dừng và tuyến đường vào Map và Builder cá nhân.

## Task List

### Phase 1: Database Migration & Backend Schema
- [ ] Task 1.1: Tạo bảng và cột bổ sung trong PostgreSQL bằng Supabase execute_sql.
  - Acceptance: Bảng `itinerary_reactions`, `itinerary_bookmarks`, `itinerary_comments` được tạo; bảng `itineraries` có các cột thống kê.
  - Verify: Chạy query kiểm tra `information_schema.tables` và `information_schema.columns`.
  - Files: Database migration qua Supabase SQL.

### Phase 2: Backend Models, Controller & Routes
- [ ] Task 2.1: Xây dựng Model/Queries cho Itinerary CRUD, Public Community, Reactions, Bookmarks, Comments và Fork.
  - Acceptance: Hỗ trợ lưu lịch trình (gán `user_id`, `is_public`), lấy danh sách public có filter/sort/pagination, toggle like, toggle bookmark, add/delete comment, fork lộ trình.
  - Verify: Chạy unit/integration test gọi các endpoints bằng curl hoặc script kiểm thử.
  - Files: `back-end/src/controllers/itinerary.controller.ts`, `back-end/src/routes/itinerary.routes.ts`.

### Phase 3: Frontend API & Types Integration
- [ ] Task 3.1: Xây dựng `front-end/lib/api/itineraries.ts` và types hỗ trợ kết nối backend.
  - Acceptance: Các hàm `getCommunityItineraries`, `getItineraryById`, `saveItineraryToServer`, `toggleReaction`, `toggleBookmark`, `addComment`, `deleteComment`, `forkItinerary`.
  - Verify: TypeScript check `npx tsc --noEmit`.
  - Files: `front-end/lib/api/itineraries.ts`, `front-end/lib/itinerary/types.ts`.

### Phase 4: Frontend UI - Sharing & Social Interactions
- [ ] Task 4.1: Cập nhật `ItineraryResultPanel` & `SavedItinerariesPanel` với nút Công khai (Public Switch), Thả tim ❤️, Đánh dấu 🔖 và Danh sách bình luận 💬.
  - Acceptance: Người dùng có thể bật/tắt công khai lịch trình của mình; xem số lượt tim, bình luận và phản hồi ý kiến.
  - Verify: Kiểm tra render component và tương tác state.
  - Files: `front-end/components/home/ItineraryResultPanel.tsx`, `front-end/components/home/SavedItinerariesPanel.tsx`.

### Phase 5: Frontend UI - Community Discovery Modal & Forking
- [ ] Task 5.1: Xây dựng component `CommunityItinerariesModal.tsx` và gắn nút mở trên `TopBar.tsx`.
  - Acceptance: Modal hiển thị danh sách lịch trình cộng đồng với bộ lọc (số ngày, ngân sách, phương tiện, sắp xếp); cho phép bấm vào xem chi tiết, thả tim, và bấm "Sử dụng lộ trình này" để đưa lên bản đồ.
  - Verify: End-to-end flow khám phá và sử dụng lộ trình.
  - Files: `front-end/components/home/CommunityItinerariesModal.tsx`, `front-end/components/home/TopBar.tsx`, `front-end/components/home/HomeClient.tsx`.
