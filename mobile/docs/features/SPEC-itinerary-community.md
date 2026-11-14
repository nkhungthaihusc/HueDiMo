# Lịch trình cộng đồng

Phụ thuộc: [lịch trình cá nhân](SPEC-itinerary.md) và [tài khoản](SPEC-account.md).

Mục **Cộng đồng** trong tab **Lịch trình** hiển thị danh sách, tìm theo tiêu đề/tóm tắt, lọc phương tiện, số ngày, ngân sách và sắp xếp. Đặt lại trang khi đổi truy vấn; chỉ nối kết quả của truy vấn hiện tại, gộp theo ID. Mở chi tiết giữ bộ lọc khi quay lại. Khách đọc dữ liệu công khai; tương tác mở cổng đăng nhập. Khi sao chép thành công, mở bản mới thuộc tài khoản và giữ nguyên bản gốc.

| API | Hợp đồng |
|---|---|
| GET /api/itineraries/community | `search,transportMode,daysCount,maxBudget,sort,page,limit`; sort `newest/most_liked/most_viewed`; mặc định page 1 và limit 12, tối đa 50. Gửi Bearer nếu có cho trạng thái tương tác cá nhân. |
| GET /api/itineraries/{id} | Đọc chi tiết theo quyền của Express. |
| POST /api/itineraries/{id}/reaction | Bearer; toggle phản ứng. |
| POST /api/itineraries/{id}/bookmark | Bearer; toggle đánh dấu. |
| POST /api/itineraries/{id}/fork | Bearer; sao chép. |
| GET, POST /api/itineraries/{id}/comments | Đọc theo quyền tài nguyên. Ghi cần Bearer; gửi `content,rating` theo hợp đồng Express. |
| DELETE /api/itineraries/{id}/comments/{commentId} | Bearer; chỉ hiển thị thao tác phù hợp với quyền. |

Đọc các trường phản hồi theo [client web](../../../front-end/lib/api/itineraries.ts) và [controller](../../../back-end/src/controllers/itinerary.controller.ts). Khóa thao tác toggle trong lúc đang gửi; khi lỗi hoặc timeout tải lại trước khi cho thử lại. Khi lịch chuyển riêng tư hoặc biến mất, đóng dữ liệu cũ và giải thích trạng thái.

## Nghiệm thu

Hai tài khoản kiểm tra công khai/riêng tư, phân trang khi thay bộ lọc, phản ứng, đánh dấu, sao chép, bình luận, quyền xóa và cập nhật số đếm. Khách đọc được lịch công khai và không gửi được thao tác ghi qua giao diện.
