# Đánh giá địa điểm

Phụ thuộc: [địa điểm](SPEC-map-places.md), [tài khoản](SPEC-account.md), [ảnh](../engineering/SPEC-media.md).

Mở từ bảng địa điểm. Danh sách công khai có tác giả, điểm, nội dung, ảnh và ngày. Form theo web yêu cầu đăng nhập, chọn 1–5 sao, nhập bình luận và có thể đính kèm ảnh. Giữ form khi lỗi tải ảnh hoặc gửi, khóa nút gửi khi đang xử lý. Khi thành công, tải lại danh sách và điểm trung bình.

| API | Hợp đồng |
|---|---|
| GET /api/places/{placeId}/reviews | Công khai; đọc đánh giá của địa điểm. |
| POST /api/places/{placeId}/reviews | `authorName,rating,comment,images[]`; 201 trả đánh giá đã tạo, 422 điểm hoặc bình luận sai, 404 không có địa điểm. Ảnh là URL tải thành công. |

[Express hiện chưa xác thực route ghi](../../../back-end/src/routes/review.routes.ts) và [controller](../../../back-end/src/controllers/review.controller.ts) lưu tên tác giả từ payload. Cổng đăng nhập của app đáp ứng luồng UI; quyền ghi thực sự và liên kết người dùng cần sửa phía Express nếu được dùng làm điều kiện phát hành. Phối hợp để client web gửi phiên tương thích trước khi siết route.

## Nghiệm thu

Đọc khi là khách, mở đăng nhập khi định viết, đăng kèm ảnh, mở lại và đối chiếu trên web. Thử điểm ngoài phạm vi, bình luận rỗng, ảnh lỗi, địa điểm đã xóa và chạm gửi liên tiếp.
