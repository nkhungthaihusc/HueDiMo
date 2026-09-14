# Spec: HueDiMo — Trang chủ "Glass Radial" + Auth

> Người duyệt: người dùng (chủ dự án HueDiMo)
> Ngày: 2026-09-07
> Trạng thái: **Approved** (chờ chốt build order)

## Objective

Xây giao diện đầu tiên cho app du lịch Huế (HueDiMo):

- **Trang chủ** với bản đồ **Goong Map (MapLibre)** full-screen, hiển thị vị trí người
  dùng hiện tại (geolocation), marker các địa điểm du lịch (dữ liệu **mock**), và các
  overlay component kiểu **glass** (search bar ở trên, danh sách địa điểm ở phải) cộng
  với **radial menu** để lọc địa điểm theo thể loại.
- **Trang đăng nhập / đăng ký / đăng xuất** — UI demo, lưu trạng thái trong
  `localStorage`, **không** nối backend.

Người dùng: **du khách tới Huế**.

## Đối tượng người dùng & bối cảnh (từ interview-me)

- **Outcome:** Trang chủ + auth cho app bản đồ du lịch Huế.
- **User:** Du khách tới Huế.
- **Why now:** Cần "bộ mặt" UI hiện đại để thấy được tổng thể app trước.
- **Success:** Trang chủ render đẹp, bản đồ lấy vị trí người dùng, bộ lọc hoạt động,
  flow đăng nhập/đăng ký/đăng xuất chạy được.
- **Constraint:** Map miễn phí (Goong Map qua MapLibre). Công nghệ cố định
  Next.js App Router + Tailwind v4 + TS.
- **Out of scope (lần này):** chat, tìm bạn đồng hành, recommend lộ trình, lập lịch
  trình, sự kiện realtime, đánh giá/thêm địa điểm.

## Idea đã chọn (từ idea-refine) — "Glass Radial"

Bản đồ full-screen làm nền. Overlay hai lớp:

1. **Floating Glass Panels**
   - Trên cùng: search bar lớn, glass-morphism (`backdrop-blur`), căn giữa.
   - Phải: panel danh sách địa điểm, có thể collapse.
   - Dưới phải: nút "Vị trí của tôi" + zoom controls.
2. **Radial Menu**
   - Nút tròn lớn góc trái dưới, glass style.
   - Bấm mở menu ring: các thể loại địa điểm (Làng, Đền, Quán ăn, Khách sạn,
     Thiên nhiên, Văn hóa...).
   - Click thể loại → marker trên map + danh sách bên phải lọc theo.
   - Giới hạn 6–8 thể loại chính.

Màu sắc: **tím nhạt** (violet) + trắng, component bo tròn (`rounded-2xl`), glass
(`bg-white/40`, `backdrop-blur`).

## Tech Stack

- Next.js **16.3.4** (App Router) — Turbopack mặc định (`next dev` / `next build`)
- React **19.2**, TypeScript **5**, Tailwind **v4**
- **Goong Map** qua gói npm `@goongmaps/maplibre-gl-goong` (+ `maplibre-gl`)
- Style URL: `https://tiles.goong.io/assets/goong_map_web.json`
- API key qua env `NEXT_PUBLIC_GOONG_API_KEY` (đặt trong `my-app/.env.local`)

## Commands (chạy trong `my-app/`)

```
Dev:    pnpm dev
Build:  pnpm build
Lint:   pnpm lint        # = eslint (next lint đã bị loại bỏ trong v16)
Start:  pnpm start
```

## Project Structure (mới tạo)

```
my-app/app/
  layout.tsx            # (đã có) — bọc AuthProvider
  page.tsx              # Trang chủ — server component, render <HomeClient/>
  login/page.tsx
  register/page.tsx
  globals.css           # (đã có) — theme tím/trắng + glass utilities
my-app/components/
  auth/AuthProvider.tsx   # client — context user trong localStorage
  home/HomeClient.tsx     # client — layout tổng thể trang chủ
  home/MapView.tsx        # client — Goong Map + geolocation + markers
  home/SearchBar.tsx      # client — search overlay glass
  home/PlaceListPanel.tsx # client — danh sách địa điểm bên phải
  home/RadialMenu.tsx     # client — radial menu lọc thể loại
  my-app/components/ui/Glass.tsx  # wrapper glass-morphism (hoặc CSS module)
my-app/lib/
  types.ts                # Place, Category, User types
  data/places.ts          # mock dữ liệu địa điểm Huế
  data/categories.ts      # thể loại cho radial menu
  auth/logic.ts           # login/register/logout helpers (localStorage)
```

> Lưu ý đường dẫn: project dùng đường dẫn `@/*` trỏ tới `my-app/` (xem
> `tsconfig.json`). Nên có thể đặt `components/` và `lib/` ở `my-app/`.

## Guidelines quan trọng (Next.js 16)

- **Client Components** (file có `'use client'`) cho mọi thứ dùng browser API:
  `navigator.geolocation`, `localStorage`, state, event handlers, thư viện map.
- `params` / `searchParams` là **Promise** — phải `await`.
- **Không** dùng `next/image` với local image có query string (cần config). Dùng
  `<img>` hoặc URL tĩnh cho ảnh mock khi cần.
- Dùng Tailwind utilities; CSS Modules khi cần scope cụ thể.

## Code Style

- Server component default; client khi cần interactivity.
- Tên tiếng Anh. Components PascalCase, hàm/biến camelCase.
- Màu chủ đạo: violet (tím nhạt) + trắng; `rounded-2xl`; glass (`backdrop-blur`,
  `bg-white/40`).

## Testing Strategy

- Chưa có test framework (package.json không có vitest/jest). Lần này verify bằng
  **lint + build + kiểm tra thủ công trong trình duyệt** (geolocation, filter, auth).
- **Không** thêm dependency test mới trong lần này (ask first nếu cần).

## Boundaries

- **Always:** chạy `pnpm lint` + `pnpm build` trước khi xong; validate input form;
  dùng dữ liệu mock.
- **Ask first:** thêm dependency mới (ngoài `@goongmaps/maplibre-gl-goong` +
  `maplibre-gl`), thay đổi cấu trúc thư mục lớn, nối backend/DB thật.
- **Never:** đưa token/key thật vào mã nguồn (chỉ qua `.env.local` dạng
  `NEXT_PUBLIC_`); commit secret/key.

## Success Criteria

- [ ] `pnpm build` và `pnpm lint` chạy sạch không lỗi.
- [ ] `/` hiển thị bản đồ Goong full-screen, vị trí người dùng hiện ra (khi cấp
      quyền), marker địa điểm mock hiện trên map.
- [ ] Radial menu mở và lọc được địa điểm theo thể loại; danh sách bên phải cập
      nhật theo filter.
- [ ] Search bar tìm/lọc địa điểm hoạt động.
- [ ] `/login`, `/register` hoạt động; đăng nhập → chuyển về trang chủ; đăng xuất
      xóa trạng thái; trạng thái giữ qua reload (localStorage).
- [ ] Giao diện tông tím/trắng, glass, bo tròn hiện đại trên desktop (desktop-first).

## Open Questions

- [x] Thư viện map: dùng **Goong Map** qua `@goongmaps/maplibre-gl-goong`.
- [x] API key: `NEXT_PUBLIC_GOONG_API_KEY` trong `.env.local` (do người dùng cung cấp).
- [ ] (Có thể để trống — các điểm sẽ đóng khi bắt đầu build.)
