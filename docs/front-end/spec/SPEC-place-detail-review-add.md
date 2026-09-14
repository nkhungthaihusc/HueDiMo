# Spec: HueDiMo — Chi tiết địa điểm + Đánh giá + Thêm địa điểm

> Người duyệt: chủ dự án HueDiMo
> Ngày: 2026-09-08
> Trạng thái: Approved mô tả thiết kế (chờ duyệt spec này)

## Objective

Mở rộng giao diện đã có (trang chủ Glass Radial) với 3 khả năng:

1. **Chi tiết địa điểm:** khi click một địa điểm (marker trên bản đồ hoặc trong danh sách),
   mở panel chi tiết **trượt từ bên phải**, thay thế/đè lên danh sách hiện tại.
2. **Đánh giá:** trong panel chi tiết có form chấm sao (1–5) + bình luận, hiển thị danh sách
   đánh giá. **Chưa yêu cầu đăng nhập** (gating login tính sau).
3. **Thêm địa điểm:** bấm nút "+" → vào chế độ chọn → **click trên bản đồ** → panel form
   nhảy lên (tọa độ tự điền từ vị trí click) → người dùng điền tên, thể loại, mô tả →
   lưu → địa điểm mới xuất hiện lên bản đồ + danh sách.

Người dùng: du khách tới Huế. Kế thừa theme tím/trắng, glass, bo tròn.

## Các quyết định thiết kế đã chốt

- **Vị trí thêm địa điểm:** click trên bản đồ; tọa độ `lat/lng` từ chỗ click.
- **Panel chi tiết:** trượt vào từ bên phải, thay thế/đè danh sách hiện tại (cùng khu vực
  panel phải).
- **Đăng nhập:** không gating trong lần này; làm UI/flow trước.

## Dữ liệu (mock + localStorage, chưa có backend)

- `Place` (có sẵn + người dùng thêm):
  `id, name, category, lat, lng, rating, description` (+ `isLocal?: true` khi do người
  dùng thêm, lưu `localStorage`).
- `Review`: `id, placeId, authorName, rating (1–5), comment, createdAt`.
  - Seed vài review mẫu cho một số địa điểm (`lib/data/reviews.ts`).
  - Review mới lưu `localStorage`.
- Keys localStorage: `huedimo_places` (địa điểm người dùng thêm), `huedimo_reviews`.

## UI / Components mới

```
my-app/components/home/
  PlaceDetailPanel.tsx   # panel phải: chi tiết + rating + danh sách review + form đánh giá
  AddPlacePanel.tsx      # panel form thêm địa điểm (tọa độ có sẵn)
  PlaceListPanel.tsx     # (edit) hiện danh sách; khi đang xem chi tiết → hiện PlaceDetailPanel
my-app/components/home/MapView.tsx  # (edit) thêm chế độ "add": click map → trả tọa độ;
                                    # marker cho cả PLACES + địa điểm người dùng thêm
my-app/components/home/HomeClient.tsx  # (edit) state: chế độ browse/add, place được chọn,
                                       # place đang thêm
my-app/lib/
  data/reviews.ts        # review mẫu
  data/places.ts         # (edit) thêm helper hook đọc + gộp localStorage
  review/logic.ts        # thêm/lưu review vào localStorage
  addplace/logic.ts      # thêm địa điểm vào localStorage
```

## Hành vi chi tiết

### Chi tiết địa điểm
- Click marker trên map HOẶC click item trong danh sách → `selectedPlace` set.
- Panel phải chuyển sang **PlaceDetailPanel** (trượt vào, glass, bo tròn).
- Detail hiển thị: header gradient + emoji thể loại, tên, thể loại, rating TB (tính từ
  reviews, fallback rating có sẵn), mô tả, danh sách review, form đánh giá.
- Nút "← Quay lại danh sách" đóng detail (về danh sách).

### Đánh giá
- Form: chọn 1–5 sao + ô bình luận + nút "Gửi đánh giá".
- Submit → lưu localStorage → cập nhật danh sách review + rating TB ngay.
- (Bỏ qua yêu cầu đăng nhập trong bản này.)

### Thêm địa điểm
- Nút "+ Thêm địa điểm" trên thanh trên cùng → chế độ chọn (cursor crosshair trên map).
- Click bản đồ → hiện **AddPlacePanel** với `lat/lng` đã điền.
- Form: tên (bắt buộc), thể loại (select từ CATEGORIES, mặc định "culture"), mô tả.
- Submit → lưu localStorage → đóng panel, thoát chế độ add, mở chi tiết địa điểm vừa thêm.
- Hủy/mở toilet → thoát chế độ add.

## Code Style / Enforcement

- Tiếp tục theme: `glass`/`glass-strong`, `rounded-2xl`, violet palette.
- Tên component/hàm tiếng Anh; **UI text tiếng Việt**.
- Client Components cho mọi state/tương tác (đúng pattern hiện tại).

## Verification

- `pnpm lint` và `pnpm build` sạch.
- Click địa điểm → panel chi tiết hiện (thay danh sách), đóng trả về danh sách.
- Gửi review → rating/phần review cập nhật + giữ sau reload (localStorage).
- "+ Thêm địa điểm" → click map → panel form với tọa độ → lưu → marker mới hiện trên
  map + có trong danh sách, giữ sau reload.

## Open Questions

- (Không còn câu hỏi chặn — đã chốt đủ cho bản template.)