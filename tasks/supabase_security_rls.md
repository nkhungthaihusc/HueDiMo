# 🛡️ Supabase Security & RLS Migration Script (Đã hiệu chỉnh)

Tài liệu này chứa toàn bộ script SQL đã được tối ưu và sửa lỗi logic bảo mật trên Supabase:
- **Đánh giá địa điểm (Reviews)**: Bắt buộc người dùng **phải đăng nhập** mới được đánh giá (`user_id` bắt buộc, khớp với `auth.uid()`). Ai cũng có thể đọc danh sách review công khai.
- **Bổ sung các Policy SELECT còn thiếu**: Bổ sung quyền đọc cho `categories`, `places`, `reviews`, `profiles` để tránh lỗi trả về danh sách rỗng (`[]`) sau khi bật RLS.
- **Bảo mật tuyệt đối**: Khóa `otps`, `refresh_tokens`, bảo vệ `password_hash` và các trường nhạy cảm của `users`.

---

## 📜 Kịch bản SQL hoàn chỉnh để chạy trên Supabase SQL Editor

```sql
BEGIN;

-- ============================================================================
-- 1. BẬT RLS (ROW LEVEL SECURITY) CHO TOÀN BỘ CÁC BẢNG
-- ============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. KHÓA CÁC BẢNG NHẠY CẢM (CHỈ CHO PHÉP BACKEND TRUY CẬP)
-- Backend kết nối qua JDBC (user postgres) hoặc service_role sẽ tự động bypass RLS.
-- Phía Client (anon/authenticated) sẽ bị chặn 100%.
-- ============================================================================

-- 2.1. Bảng `refresh_tokens`
DROP POLICY IF EXISTS "Allow server manage refresh_tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Allow public read refresh_tokens" ON public.refresh_tokens;
-- Không tạo policy cho public/authenticated -> Chặn 100% từ Client

-- 2.2. Bảng `otps`
DROP POLICY IF EXISTS "Allow public read otps" ON public.otps;
-- Không tạo policy cho public/authenticated -> Chặn 100% từ Client


-- ============================================================================
-- 3. BẢO MẬT BẢNG `users` & `profiles`
-- ============================================================================

-- 3.1. Phân quyền cấp độ cột (Column-Level Security):
REVOKE SELECT (password_hash) ON TABLE public.users FROM anon, authenticated;
REVOKE UPDATE (password_hash, role, points, checkin_count, status, created_at) 
ON TABLE public.users FROM anon, authenticated;

-- 3.2. Policies cho bảng `users`
DROP POLICY IF EXISTS "Allow read users basic info" ON public.users;
DROP POLICY IF EXISTS "Allow update own user" ON public.users;
DROP POLICY IF EXISTS "Allow public read users safe info" ON public.users;
DROP POLICY IF EXISTS "Allow users update own account" ON public.users;

CREATE POLICY "Allow public read users safe info"
ON public.users FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow users update own account"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3.3. Policies cho bảng `profiles`
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;

CREATE POLICY "Allow public read profiles"
ON public.profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow users update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- ============================================================================
-- 4. BẢNG `categories` & `places` (DANH MỤC & ĐỊA ĐIỂM)
-- ============================================================================

-- 4.1. Bảng `categories` (Bổ sung policy xem công khai)
DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;

CREATE POLICY "Allow public read categories"
ON public.categories FOR SELECT
TO public
USING (true);

-- 4.2. Bảng `places`
DROP POLICY IF EXISTS "Allow read places" ON public.places;
DROP POLICY IF EXISTS "Allow public read places" ON public.places;
DROP POLICY IF EXISTS "Allow insert places" ON public.places;
DROP POLICY IF EXISTS "Allow update own places" ON public.places;
DROP POLICY IF EXISTS "Allow authenticated insert places" ON public.places;
DROP POLICY IF EXISTS "Allow owners update own places" ON public.places;

-- Xem công khai các địa điểm đã duyệt HOẶC địa điểm do chính mình tạo (kể cả pending)
CREATE POLICY "Allow public read places"
ON public.places FOR SELECT
TO public
USING (status = 'approved' OR (auth.uid() IS NOT NULL AND auth.uid() = created_by));

-- Đăng nhập mới được đóng góp địa điểm
CREATE POLICY "Allow authenticated insert places"
ON public.places FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Chủ sở hữu được sửa địa điểm của mình
CREATE POLICY "Allow owners update own places"
ON public.places FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);


-- ============================================================================
-- 5. BẢNG `reviews` (CHỈ ĐƯỢC ĐÁNH GIÁ KHI ĐÃ ĐĂNG NHẬP)
-- ============================================================================
DROP POLICY IF EXISTS "Allow read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow authenticated insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow owners update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow owners delete own reviews" ON public.reviews;

-- Cho phép tất cả mọi người đọc danh sách review của địa điểm
CREATE POLICY "Allow public read reviews"
ON public.reviews FOR SELECT
TO public
USING (true);

-- BẮT BUỘC: Chỉ người dùng đã đăng nhập mới được tạo review (user_id = auth.uid())
CREATE POLICY "Allow authenticated insert reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Chỉ chính chủ mới được sửa bài đánh giá của mình
CREATE POLICY "Allow owners update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Chỉ chính chủ mới được xóa bài đánh giá của mình
CREATE POLICY "Allow owners delete own reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ============================================================================
-- 6. BẢNG `itineraries` (LỊCH TRÌNH DU LỊCH)
-- ============================================================================
DROP POLICY IF EXISTS "Allow insert itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Allow read itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Allow read public or own itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Allow update own itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Allow delete own itineraries" ON public.itineraries;

-- Xem lịch trình công khai hoặc lịch trình của chính mình
CREATE POLICY "Allow read public or own itineraries"
ON public.itineraries FOR SELECT
TO public
USING ((is_public = true) OR (auth.uid() = user_id));

-- Tạo lịch trình: bắt buộc gắn với tài khoản đăng nhập (hoặc khách nếu hỗ trợ)
CREATE POLICY "Allow insert itineraries"
ON public.itineraries FOR INSERT
TO public
WITH CHECK ((auth.uid() = user_id) OR (auth.uid() IS NULL AND user_id IS NULL));

-- Sửa / Xóa lịch trình của mình
CREATE POLICY "Allow update own itineraries"
ON public.itineraries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own itineraries"
ON public.itineraries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ============================================================================
-- 7. CÁC BẢNG TƯƠNG TÁC (CHECKINS, REACTIONS, BOOKMARKS, COMMENTS, SETTINGS)
-- ============================================================================

-- 7.1. Check-in
DROP POLICY IF EXISTS "Allow users read own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Allow users insert own checkins" ON public.checkins;

CREATE POLICY "Allow users read own checkins"
ON public.checkins FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow users insert own checkins"
ON public.checkins FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7.2. Thả cảm xúc lịch trình (Reactions)
DROP POLICY IF EXISTS "Allow public read itinerary_reactions" ON public.itinerary_reactions;
DROP POLICY IF EXISTS "Allow authenticated insert itinerary_reactions" ON public.itinerary_reactions;
DROP POLICY IF EXISTS "Allow owners delete itinerary_reactions" ON public.itinerary_reactions;

CREATE POLICY "Allow public read itinerary_reactions"
ON public.itinerary_reactions FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated insert itinerary_reactions"
ON public.itinerary_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners delete itinerary_reactions"
ON public.itinerary_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7.3. Đánh dấu lưu trữ lịch trình (Bookmarks)
DROP POLICY IF EXISTS "Allow owners read own bookmarks" ON public.itinerary_bookmarks;
DROP POLICY IF EXISTS "Allow owners insert own bookmarks" ON public.itinerary_bookmarks;
DROP POLICY IF EXISTS "Allow owners delete own bookmarks" ON public.itinerary_bookmarks;

CREATE POLICY "Allow owners read own bookmarks"
ON public.itinerary_bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow owners insert own bookmarks"
ON public.itinerary_bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners delete own bookmarks"
ON public.itinerary_bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7.4. Bình luận lịch trình (Comments)
DROP POLICY IF EXISTS "Allow public read itinerary_comments" ON public.itinerary_comments;
DROP POLICY IF EXISTS "Allow authenticated insert itinerary_comments" ON public.itinerary_comments;
DROP POLICY IF EXISTS "Allow owners update itinerary_comments" ON public.itinerary_comments;
DROP POLICY IF EXISTS "Allow owners delete itinerary_comments" ON public.itinerary_comments;

CREATE POLICY "Allow public read itinerary_comments"
ON public.itinerary_comments FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated insert itinerary_comments"
ON public.itinerary_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners update itinerary_comments"
ON public.itinerary_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners delete itinerary_comments"
ON public.itinerary_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7.5. Cấu hình hệ thống (Settings)
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;

CREATE POLICY "Allow public read system_settings"
ON public.system_settings FOR SELECT
TO public
USING (true);

COMMIT;
```

---

## 📌 Hướng dẫn khi code Backend Spring Boot (`Review`)

Khi chuyển yêu cầu **"Chỉ có thể đánh giá khi đăng nhập"** vào Spring Boot:
1. **Lấy `currentUser` từ `SecurityUtils`**:
   ```java
   User currentUser = SecurityUtils.getCurrentUser();
   ```
2. **Gán thông tin vào `Review` Entity**:
   ```java
   Review review = Review.builder()
       .placeId(placeId)
       .userId(currentUser.getId())               // Bắt buộc ID người dùng
       .authorName(currentUser.getName())         // Lấy tên thật từ tài khoản
       .rating(request.getRating())
       .comment(request.getComment())
       .images(request.getImages())
       .build();
   ```
3. **Cấu hình Spring Security**:
   - `GET /api/places/{placeId}/reviews` -> `.permitAll()` (Cho phép mọi người xem đánh giá).
   - `POST /api/places/{placeId}/reviews` -> `.authenticated()` (Bắt buộc phải có Bearer Token đăng nhập).
