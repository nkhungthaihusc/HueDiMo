# Spec: HueDiMo — AI Lập lộ trình (Itinerary AI)

> Người duyệt: chủ dự án · Ngày: 2026-09-08 · Trạng thái: chờ duyệt
> Nền tảng: my-app (Next.js 16 App Router), model opencode Zen `big-pickle`.

## Objective

Cho du khách kê lộ trình Huế tối ưu bằng AI: nhập **ngày đi → ngày về**, **sở thích**, **ngân sách
dự kiến**, **nơi ở hiện tại**, **địa điểm bắt đầu & kết thúc (tùy chọn)** → AI chọn/tạo lịch trình
theo ngày dựa trên **danh sách địa điểm hiện có** (seed + user-added) → hiện timeline trên panel +
đánh dấu/route trên bản đồ → **lưu localStorage**. Key LLM **chỉ ở server**.

## Pipeline

```
ItineraryFormPanel (client)
  │  POST /api/itinerary  {startDate, endDate, preferences, budget, currentLocation,
  │                        startPlaceId?, endPlaceId?, places: Place[]}   ← client gửi kèm catalog
  ▼
Route Handler app/api/itinerary/route.ts
  │  Đọc OPENCODE_ZEN_API_KEY (server env), build prompt, POST
  │  https://opencode.ai/zen/v1/chat/completions  model=big-pickle, response_format=json_object
  ▼
Validate + parse → { summary, totalEstimatedCost, days: [{ date, title, places:[{placeId, reason, estimatedCost}] }] }
  │  Lỗi parse/5xx → 502 { error }
  ▼
ItineraryResultPanel (client) → timeline, tổng chi phí, "Lưu lộ trình" + "Xem trên bản đồ"
```

## Quyết định thiết kế

- **Key bảo mật:** `OPENCODE_ZEN_API_KEY` trong `.env.local` (không có tiền tố `NEXT_PUBLIC`).
  Route handler đọc qua `process.env`; client tuyệt đối không nhận key. Server không log key.
- **Catalog địa điểm:** user-added places nằm ở localStorage (client) → **client gửi full catalog
  `places: Place[]` trong body**, server không cần biết nguồn dữ liệu.
- **AI chỉ được chọn `placeId` có trong catalog** (prompt + client validate lại). Nếu AI trả
  `placeId` không tồn tại → bỏ qua entry đó.
- **Start/end trống:** prompt yêu cầu AI lấy "nơi ở hiện tại" làm điểm xuất phát mặc định.
- **Thứ tự ngày:** server validate `startDate <= endDate`, budget > 0, preferences hợp lệ (500 nếu sai).
- **Format:** `response_format: { type: "json_object" }`; client có validator chặt; nếu AI trả
  JSON sai structure → retry 1 lần với prompt nhắc lỗi; vẫn lỗi → 502.
- **UI:** form + kết quả hiện **ở panel phải, thay thế danh sách** (cùng pattern PlaceDetailPanel).
  Nút vào: `✨ Lộ trình AI` trên TopBar.

## API contract

### POST /api/itinerary
Request:
```json
{
  "startDate": "2026-09-10",
  "endDate": "2026-09-12",
  "preferences": ["food", "temple"],
  "budget": 3000000,
  "currentLocation": "Khách sạn gần Cầu Trường Tiền",
  "startPlaceId": "quacong-something" | null,
  "endPlaceId": null,
  "places": [{ "id": "dai-noi", "name": "Đại Nội", "category": "ancient", "lat": 16.469, "lng": 107.577, "rating": 4.7, "description": "..." }]
}
```
Response 200:
```json
{
  "itinerary": {
    "summary": "3 ngày khám phá ẩm thực + chùa chiền...",
    "totalEstimatedCost": 1800000,
    "days": [
      { "date": "2026-09-10", "title": "Ngày 1: Hương vị Huế",
        "places": [ { "placeId": "dai-noi", "reason": "...", "estimatedCost": 150000 } ] }
    ]
  }
}
```
Response 502/500: `{ "error": "..." }` (UI hiện thông báo tiếng Việt).

### Types (`lib/itinerary/types.ts`)
`Itinerary`, `ItineraryDay`, `ItineraryPlace` như contract trên. Validator `parseItinerary(raw)`.

## Files (new/edited)

```
my-app/app/api/itinerary/route.ts          # NHỚ: đọc docs Next.js Route Handlers trước
my-app/lib/itinerary/types.ts              # types + validator
my-app/lib/itinerary/prompt.ts             # build catalog text + messages (tiếng Việt)
my-app/lib/itinerary/logic.ts              # lưu/load itinerary localStorage (huedimo_itineraries)
my-app/components/home/ItineraryFormPanel.tsx
my-app/components/home/ItineraryResultPanel.tsx
my-app/components/home/HomeClient.tsx      # (edit) state: itinerary view, kết quả, route
my-app/components/home/MapView.tsx         # (edit) vẽ polyline route (geoJSON source) + highlight
my-app/components/home/TopBar.tsx          # (edit) nút "✨ Lộ trình AI"
my-app/.env.local                          # thêm OPENCODE_ZEN_API_KEY (server-only)
```

## Hành vi chi tiết

### Form (ItineraryFormPanel)
- Trường: ngày bắt đầu (date), ngày kết thúc (date), sở thích (chip chọn từ CATEGORIES,
  multi-select), ngân sách dự kiến (number, đơn vị VND), nơi ở hiện tại (text), địa điểm bắt đầu
  + kết thúc (select từ danh sách places, option trống = "mặc định nơi ở").
- Validate client (Ngày hợp lệ, budget>0, có ít nhất 1 sở thích) → nút "Tạo lộ trình" disabled khi thiếu.
- Submit → gọi API (fetch), hiện trạng thái loading ("AI đang lên lộ trình cho bạn...") trên panel.
- Lỗi → dòng message đỏ + nút thử lại.

### Kết quả (ItineraryResultPanel)
- Đầu: summary + tổng chi phí ước tính (định dạng VND).
- Timeline theo ngày: title, từng place (emoji thể loại + tên + lý do + chi phí).
- Nút: "Xem trên bản đồ" (bật map highlight + polyline) và "Lưu lộ trình" (localStorage) và "← Quay lại".
- Place click → mở PlaceDetailPanel (chọn place đó).

### Map (Route + highlight)
- MapView nhận `routePlaces: Place[]` (khi xem lộ trình). Vẽ polyline nối các điểm theo thứ tự
  trong ngày (`fitBounds`), highlight marker của các place trong lộ trình (viền/đổi màu).
- Xóa polyline khi đóng kết quả.

### Storage
- Lưu: `huedimo_itineraries` (array). Result panel nút "Lưu lộ trình" → thêm vào; hiện "Đã lưu ✓".
- (Feature "Danh sách lộ trình đã lưu / chia sẻ" làm ở phase sau.)

## Prompt design (lib/itinerary/prompt.ts)
- System (tiếng Việt): bạn là chuyên gia du lịch Huế. Chỉ dùng placeId trong catalog.
  Trả JSON đúng structure; placeId phải có trong danh sách; sắp xếp logic theo vị trí/mỗi ngày;
  tránh địa điểm trùng; ngày begin=end cho phép 1 ngày. Min/max place mỗi ngày phù hợp (3–5).
- User: catalog (mỗi place 1 dòng gọn: id | tên | thể loại | rating | mô tả ngắn) + ngày đi/về +
  sở thích (nhãn tiếng Việt) + ngân sách VND + nơi ở + điểm đầu/cuối (start/end) + tip
  "nếu không có điểm đầu/cuối thì xuất phát từ nơi ở; ước tính chi phí theo giá trung bình Huế (VND)".

## Verification
- `pnpm lint` + `pnpm build` sạch.
- Gọi API bằng curl với key test → nhận itinerary JSON hợp lệ.
- UI: mở form → generate → timeline hiện → xem trên map (polyline + highlight) → lưu → reload còn.

## Open Questions
- Bạn cung cấp `OPENCODE_ZEN_API_KEY` để tôi đưa vào `.env.local` (hoặc tự điền). — cần key thật để test E2E.