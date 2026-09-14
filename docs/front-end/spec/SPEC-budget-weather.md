# Spec: Dự toán chi phí + Widget thời tiết/đồng hồ

Trạng thái: approved (9/2026).

## 1. Dự toán chi phí (chế độ riêng)

- `Itinerary` thêm `budget?: number` (VND).
  - AI: server đính `budget` từ request vào itinerary trả về (sau `capToBudget`).
  - Builder thủ công: thêm ô nhập ngân sách; lưu kèm.
  - `parseItinerary` giữ `budget` nếu hợp lệ (>0, finite).
- `logic.ts` thêm `setItineraryBudget(id, budget)` (upsert field, giữ title/id/createdAt).
- Panel mới `BudgetPanel` ("💰 Dự toán", mở từ TopBar):
  - Với mỗi lộ trình đã lưu: title + ngày, chi đã dùng `formatVND`, ngân sách (inline sửa), thanh tiến độ %, badge "Dư X"/"Vượt X"/"= ngân sách", breakdown theo thể loại (emoji + chi phí, nhóm theo category của place; địa điểm riêng → "Khác").
  - Nút "Mở" → mở lộ trình (vẽ polyline).
  - Tổng cộng toàn panel: tổng chi, tổng ngân sách.
- `ItineraryResultPanel`: dòng nhỏ trong summary box hiển thị budget vs chi (Dư/Vượt).

## 2. Widget góc trái trên

- Component `WeatherWidget` (client, top-left, `pointer-events-none`, refresh 10 phút):
  - Đồng hồ + ngày (tiếng Việt, cập nhật mỗi giây).
  - "Huế" + thời tiết hiện tại: nhiệt độ, cảm giác, độ ẩm, mô tả + emoji (WMO → tiếng Việt, theo `is_day`).
  - Dự báo theo giờ: 5 giờ tiếp theo (giờ + nhiệt độ + emoji).
- Nguồn: Open-Meteo (public, không key): `forecast?latitude=16.4637&longitude=107.5907&current=...&hourly=temperature_2m,weather_code&timezone=Asia/Ho_Chi_Minh&forecast_days=1&forecast_hours=6`. Lỗi mạng → ẩn phần thời tiết, giữ đồng hồ.

## Verification
- lint + build exit 0.
- Browser: widget hiện giờ/ngày/thời tiết Huế + 5h tới; tạo/đặt budget cho lộ trình → panel Dự toán cập nhật thanh + breakdown + Dư/Vượt; Mở lại chạy polyline.