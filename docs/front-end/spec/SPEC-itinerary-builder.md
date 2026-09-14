# Spec: Bộ tạo lộ trình thủ công + quản lý lộ trình đã lưu

Trạng thái: approved-by-user (9/2026). Kế thừa `SPEC-itinerary-ai.md`.

## Mục tiêu

1. Người dùng tự xây dựng lộ trình: chọn ngày đi/về, xếp địa điểm (từ catalog tìm kiếm) hoặc tự chỉ định địa điểm riêng (tên + chi phí), sắp xếp, sửa chi phí, đặt tên, lưu.
2. Cùng UI đó chỉnh sửa lộ trình do AI tạo / đã lưu.
3. Xem + quản lý danh sách lộ trình đã lưu: mở lại (chọn làm lộ trình hiện hành, vẽ polyline), đổi tên, xóa.

## Data model

- `ItineraryPlace` thêm `customName?: string`, `note?: string`. `placeId = "custom-<ts>-<n>"` cho địa điểm tự chỉ định; `reason` = ghi chú ngắn.
- Saved itinerary: `SavedItinerary = Itinerary & { id: string; title: string; createdAt: string; updatedAt: string }`, lưu trong `huedimo_itineraries`.
- `saveItinerary(itinerary, title?)` → upsert theo id; `deleteItinerary(id)`; `renameItinerary(id, title)`; `getItineraries()` (chuẩn hóa entry cũ thiếu id/title).
- Giá mặc định khi thêm catalog place = `place.price`; tổng chi phí luôn = sum entries (không tin field total).

## UI

### ItineraryBuilderPanel (w-80 glass, thay danh sách)
- Ô tên lộ trình (tùy chọn, default theo ngày) + 2 ô ngày đi/về (đổi ngày → dựng lại day tabs, giữ entries trùng ngày).
- Tabs theo ngày (cuộn ngang). Mỗi ngày: danh sách entry `[emoji] [name (+note)] [cost input] [▲][▼][✕]`.
- Nút "＋ Thêm địa điểm" trong ngày → chế độ picker: ô tìm kiếm + chips thể loại + danh sách kết quả còn trống (chưa dùng) + "＋" để thêm (cost default = price); kèm khối "Thêm địa điểm riêng": tên* + chi phí → thêm entry custom.
- Footer: tổng chi phí live + nút "Lưu lộ trình" (disabled khi không có entry). Lưu → upsert → đóng, hiển thị lộ trình (result panel).

### ItineraryResultPanel (bổ sung)
- Nút "✏️ Chỉnh sửa" mở builder với itinerary hiện tại.
- Entry `customName`: hiển thị tên đó (emoji 🗺️) khi placeId không có trong catalog.

### SavedItinerariesPanel (w-80 glass)
- Nút "＋ Lộ trình mới" → builder (trống). Danh sách row đã lưu: title, khoảng ngày, N ngày · M địa điểm, tổng chi phí.
- Thao tác: "Mở lại" (→ result panel + token để vẽ polyline + auto zoom), "Đổi tên" (inline input + lưu), "✕" (xóa, confirm bằng thẻ click 2 lần).

### TopBar / HomeClient
- TopBar thêm nút "🛠 Lộ trình của tôi". Precedence panel:
  `addPosition → savedList → builder → AI form → place detail → itinerary result → list`.
- Mở một state thì đóng các state cùng nhóm (addMode/showItineraryForm/selectedId…).

## Verification
- pnpm lint + build exit 0.
- Browser: tạo lộ trình tay (2 ngày, thêm catalog + 1 địa điểm riêng, sửa cost, sắp xếp), lưu → xuất hiện trong danh sách; mở lại vẽ polyline; đổi tên; xóa. AI result có thể bấm Chỉnh sửa.