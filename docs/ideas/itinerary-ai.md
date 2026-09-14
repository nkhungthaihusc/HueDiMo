# AI Lập Lộ Trình (Itinerary AI)

Ngày: 2026-09-08 · Trạng thái: Approved (người dùng gật đầu) · Model: opencode Zen `big-pickle`

## Problem Statement
Làm sao để du khách kê được trải nghiệm Huế tối ưu mà chỉ cần nhập vài thông tin?

## Recommended Direction
Form "Lập lộ trình AI" (glass panel): nhập ngày đi/về, sở thích, ngân sách dự kiến (VND),
nơi ở hiện tại, + địa điểm bắt đầu & kết thúc (tùy chọn) → gọi opencode Zen model
`big-pickle` (endpoint `chat/completions`, key server-side) → trả lịch trình JSON theo ngày
(địa điểm, lý do chọn, ước tính chi phí) → hiện timeline trên panel + vẽ marker/đường đi trên
bản đồ → lưu localStorage.

## Key Assumptions to Validate
- [ ] `big-pickle` trả JSON đúng format ta require (dùng `response_format: json_object` + validation)
- [ ] Key Zen từ người dùng chạy được qua Route Handler Next.js
- [ ] Lịch trình chỉ nên dùng địa điểm có trong danh sách (seed + user-added)

## MVP Scope
Form lộ trình + gọi AI + timeline panel + đánh dấu trên map + lưu local

## Not Doing (and Why)
- Tính toán chi phí chi tiết theo giá địa điểm — thuộc feature "Dự toán ngân sách" (thêm giá có
sẵn, dùng chung sau)
- Chỉnh sửa lịch trình kéo-thả — làm sau
- Chat AI hội thoại nhiều vòng — chỉ 1 lần generate
- Bất kỳ gating đăng nhập nào — như đã thống nhất

## Open Questions
- Địa điểm bắt đầu/kết thúc nếu để trống thì lấy nơi ở hiện tại làm gốc? → (chốt: có) ở MVP
  ta vẫn đưa câu hỏi này vào prompt cho AI; nếu AI thiếu thì fallback nơi ở hiện tại.