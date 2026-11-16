# HueDiMo (Huế Đi Mô) 🏮🗺️

> **HueDiMo** ("Huế Đi Mô" — câu phương ngữ thân thương hỏi bạn đi đâu đó ở Huế) là nền tảng bản đồ du lịch thông minh, gợi ý lịch trình khám phá văn hóa & ẩm thực cố đô Huế. Ứng dụng tích hợp bản đồ số tương tác cao, cảnh báo thời tiết & mực nước sông thời gian thực, cùng trợ lý AI tạo lịch trình cá nhân hóa.

---

## 🌟 Tính năng nổi bật

### 1. Bản đồ số Du lịch Cố Đô (Interactive Map)
- **Bản đồ MapLibre GL**: Trực quan hóa tọa độ các điểm đến tại Huế với hiệu ứng mượt mà, hỗ trợ định vị người dùng, xoay 3D và lớp bản đồ tùy biến.
- **Phân loại đa dạng**: Di tích lịch sử (Đại Nội, Lăng tẩm), Đền chùa tâm linh, Ẩm thực & Món ngon Huế, Cafe view đẹp, Khách sạn nghỉ dưỡng, Làng nghề truyền thống,...
- **Radial Menu & Panel chi tiết**: Khám phá thông tin nhanh, tra cứu menu món ăn, giá vé tham quan, thời điểm lý tưởng và review từ cộng đồng.

### 2. Dự báo Thời tiết & Mực nước Sông Hương
- **Thời tiết thời gian thực**: Cập nhật thông tin nhiệt độ, độ ẩm, khả năng mưa theo trạm khí tượng Huế.
- **Theo dõi mực nước sông Hương / VFASS**: Cung cấp dữ liệu mực nước và lượng mưa hỗ trợ du khách chủ động lịch trình trong những ngày thời tiết biến động.

### 3. Gợi ý Lịch trình Du lịch Thông minh (AI Itinerary)
- **Tạo lịch trình theo nhu cầu**: Lựa chọn số ngày, ngân sách, phong cách chuyến đi (ẩm thực, di sản, chữa lành, chill cafe).
- **Tối ưu hóa đường đi**: Sắp xếp thứ tự các điểm ghé thăm hợp lý theo tọa độ địa lý nhằm tiết kiệm thời gian di chuyển.
- **Lưu trữ & Quản lý**: Xem lại lịch trình yêu thích dễ dàng khi đăng nhập tài khoản.

### 4. Đóng góp Điểm đến & Đánh giá Cộng đồng
- **Check-in & Điểm thưởng**: Tích lũy điểm khi tương tác, leo bảng xếp hạng (Leaderboard) "Thổ địa Huế".
- **Đóng góp địa điểm**: Người dân và du khách có thể đề xuất thêm tọa độ quán ngon, góc check-in mới (được duyệt bởi Admin).
- **Đánh giá & Ảnh thực tế**: Viết cảm nhận và tải ảnh chất lượng cao lên hệ thống lưu trữ đám mây.

### 5. Hệ thống Quản trị Toàn diện (Admin Dashboard)
- Quản lý người dùng, phân quyền (Admin / User).
- Kiểm duyệt địa điểm do người dùng đóng góp.
- Quản lý bài đánh giá, xem nhật ký hệ thống (System Audit Logs).

---

## 🏗️ Kiến trúc & Công nghệ sử dụng

Dự án được cấu trúc theo mô hình **Monorepo** tinh gọn:

```
HueDiMo/
├── back-end/               # Express.js REST API & PostgreSQL / Supabase
│   ├── src/
│   │   ├── config/         # Kết nối Database, cấu hình môi trường
│   │   ├── controllers/    # Xử lý nghiệp vụ chính
│   │   ├── docs/           # Tài liệu Swagger/OpenAPI 3.0
│   │   ├── middleware/     # Auth JWT, Logger, Role guards
│   │   ├── models/         # Schema, query cơ sở dữ liệu
│   │   ├── routes/         # Khai báo các API routes
│   │   └── services/       # Logic nghiệp vụ (Auth, AI, Weather...)
│   └── package.json
│
├── front-end/              # Next.js 16 (App Router) + React 19 + Tailwind CSS
│   ├── app/                # Cấu trúc trang (Home, Auth, Admin, API Routes)
│   ├── components/         # Giao diện bản đồ, panel, modal, widget
│   ├── hooks/              # Custom hooks (Scroll, Geolocation...)
│   ├── lib/                # Client API, định nghĩa kiểu dữ liệu, utils
│   └── package.json
│
├── package.json            # Root workspace scripts (chạy đồng thời FE & BE)
└── README.md
```

### Công nghệ cốt lõi:
- **Frontend**:
  - **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
  - **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Glassmorphism UI
  - **Bản đồ**: [MapLibre GL](https://maplibre.org/)
  - **Biểu tượng**: [Lucide React](https://lucide.dev/)
- **Backend**:
  - **Runtime & Framework**: [Node.js](https://nodejs.org/), [Express.js 5](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/)
  - **Database**: [PostgreSQL](https://www.postgresql.org/) / [Supabase](https://supabase.com/)
  - **Authentication**: JWT (Access Token 15 phút, Refresh Token Rotation 30 ngày)
  - **API Documentation**: [Swagger UI / OpenAPI 3.0](https://swagger.io/)
  - **Storage**: Supabase Storage

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### Yêu cầu tiên quyết
- **Node.js**: >= 20.x
- **Package Manager**: [pnpm](https://pnpm.io/) (khuyến nghị) hoặc `npm`
- Đã cấu hình tài khoản **PostgreSQL / Supabase**

---

### 1. Clone mã nguồn
```bash
git clone https://github.com/nkhungthaihusc/HueDiMo.git
cd HueDiMo
```

---

### 2. Cấu hình biến môi trường (.env)

#### Cấu hình Backend:
Tạo file `back-end/.env`:
```env
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>

# JWT Secrets
JWT_SECRET=your_super_secret_access_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key

# Supabase Storage (nếu sử dụng tính năng upload ảnh)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: API Keys thời tiết / AI Itinerary
OPENAI_API_KEY=your_openai_or_gemini_key
```

#### Cấu hình Frontend:
Tạo file `front-end/.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

### 3. Cài đặt thư viện (Dependencies)

Tại thư mục gốc của dự án:
```bash
pnpm run install:all
```
*(Hoặc vào từng thư mục `back-end` và `front-end` rồi chạy `pnpm install`)*

---

### 4. Khởi chạy môi trường phát triển (Development)

Bạn có thể chạy cả **Frontend** và **Backend** cùng một lúc từ thư mục gốc:
```bash
pnpm run dev
```

Hoặc chạy độc lập từng bên:
- **Backend (Port 3000)**:
  ```bash
  pnpm run dev:backend
  ```
  Truy cập Swagger API Docs tại: `http://localhost:3000/api/docs`
- **Frontend (Port 3001 hoặc 3000 tùy Next.js gán)**:
  ```bash
  pnpm run dev:frontend
  ```
  Truy cập giao diện tại: `http://localhost:3000` (hoặc cổng hiển thị trên terminal)

---

## 📖 Tài liệu API (Swagger UI)

Khi Backend đang chạy, mở trình duyệt và truy cập:
👉 **`http://localhost:3000/api/docs`**

Tài liệu Swagger liệt kê chi tiết:
- `/api/auth`: Đăng ký, Đăng nhập, Refresh Token, Đăng xuất
- `/api/places`: Danh sách địa điểm, Tìm kiếm, Đóng góp địa điểm
- `/api/places/{placeId}/reviews`: Đánh giá & nhận xét kèm ảnh
- `/api/weather` & `/api/water-levels`: Dữ liệu trạm khí tượng & thủy văn Huế
- `/api/itinerary`: Lập lịch trình du lịch thông minh
- `/api/leaderboard`: Bảng xếp hạng điểm thưởng đóng góp
- `/api/admin/*`: Quản trị phê duyệt và thống kê

---

## 👥 Đóng góp phát triển (Contributing)

1. Fork dự án
2. Tạo nhánh tính năng mới (`git checkout -b feature/tinh-nang-moi`)
3. Commit thay đổi (`git commit -m 'feat: thêm tính năng mới'`)
4. Push lên nhánh của bạn (`git push origin feature/tinh-nang-moi`)
5. Mở một **Pull Request**

---

## 📄 Bản quyền (License)

Dự án phát triển cho cộng đồng yêu Huế và du khách thập phương. Phân phối dưới giấy phép [MIT](LICENSE).


### OTP qua email cho tài khoản HueDiMo trên web

1. Áp dụng [migration OTP](supabase/migrations/V3_auth_email_otps.sql) để mở rộng bảng `public.otps` hiện có trên Supabase. Nếu Spring vẫn kết nối vào cùng cơ sở dữ liệu, triển khai bản Spring có truy vấn `purpose IS NULL` sau migration và trước khi triển khai Express. Spring giữ các bản ghi OTP đăng ký hiện có.
2. Cấu hình `AUTH_OTP_SECRET`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME` và `MAIL_PASSWORD` trong `back-end/.env` hoặc trên dịch vụ Express. Tạo `AUTH_OTP_SECRET` bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` và dùng cùng giá trị trên các instance Express. Các biến `MAIL_*` dùng cùng cấu hình SMTP với Spring. Cổng 587 dùng STARTTLS, cổng 465 dùng TLS ngay khi kết nối.
3. Triển khai Express và frontend. Với **Tạo tài khoản** và **Hồ sơ → Đổi mật khẩu**, điền biểu mẫu rồi nhập OTP trong hộp thoại **Xác minh và lưu**. Với **Đăng nhập → Quên mật khẩu?**, nhập email và xác minh OTP trước, sau đó mới nhập hai lần mật khẩu mới. Đặt lại mật khẩu áp dụng cho tài khoản có mật khẩu HueDiMo.

Mã gồm 6 chữ số, có hiệu lực trong 5 phút và chỉ dùng một lần cho đúng email và thao tác. Có tối đa 5 lượt thử mỗi mã và cần chờ 60 giây giữa hai lần gửi cho cùng email và thao tác. Express giới hạn các yêu cầu gửi mã công khai theo IP. Nếu chạy sau reverse proxy, cấu hình `TRUSTED_PROXY_ADDRESSES` bằng danh sách IP hoặc CIDR của các proxy tin cậy.

Trên Render Free, cấu hình `RESEND_API_KEY` và `MAIL_FROM` trên dịch vụ Express để gửi email qua HTTPS. `MAIL_FROM` là địa chỉ thuộc tên miền đã xác minh trên Resend, ví dụ `HueDiMo <otp@example.com>`. Khi có `RESEND_API_KEY`, Express gửi qua Resend. `AUTH_OTP_SECRET` vẫn cần có.

### Khóa Goong cho bản đồ web

Đặt khóa Maptiles mới trong `GOONG_MAP_KEY` của backend Express. Đặt
`GOONG_MAP_PROXY_ORIGIN` thành địa chỉ công khai của backend, ví dụ
`https://api.example.com` hoặc `http://localhost:3002` khi phát triển.
Frontend cần `NEXT_PUBLIC_BACKEND_URL` trỏ đến backend đó. Xóa
`NEXT_PUBLIC_GOONG_API_KEY` khỏi cấu hình build frontend, triển khai lại hai
dịch vụ và thu hồi khóa đã xuất hiện trong bản build cũ.

Proxy chỉ chuyển tiếp tài nguyên bản đồ đến Goong và vẫn phục vụ khách chưa
đăng nhập. Giới hạn lưu lượng theo IP tại hạ tầng triển khai nếu cần bảo vệ
hạn mức của khóa.
