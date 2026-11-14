# Tải ảnh

Phụ thuộc: [nền tảng](SPEC-foundation.md). Dùng chung cho avatar, đánh giá và đề xuất.

- Chọn ảnh từ thư viện hoặc camera theo luồng tính năng. Hiển thị xem trước, bỏ ảnh, tiến độ và lỗi. Nếu người dùng hủy picker, giữ các ảnh đang chọn.
- `POST /api/upload?folder=avatars|places|reviews|general`, multipart `file` cho ảnh đơn hoặc `files` cho nhiều ảnh; tối đa 5 file mỗi lần và 10 MiB mỗi file. Loại ảnh theo [route upload](../../../back-end/src/routes/upload.routes.ts). Đọc URL/metadata theo [controller](../../../back-end/src/controllers/upload.controller.ts) và [client web](../../../front-end/lib/api/media.ts). Chỉ gửi URL đã nhận khi lưu thực thể.
- Route hiện không có middleware xác thực. Các thao tác người dùng dùng ảnh phải đi qua cổng đăng nhập của tính năng; nếu cần bảo vệ endpoint server, phối hợp cập nhật cả web và Express.
- Giữ URL của ảnh đã tải thành công khi bước lưu thất bại để người dùng thử lại. Với kết quả upload mơ hồ, báo rõ trạng thái và tránh tự tạo thêm bản sao.

## Nghiệm thu

Chọn, bỏ, tải một và nhiều ảnh. Thử ảnh quá giới hạn, MIME bị từ chối, người dùng từ chối quyền và timeout. Ảnh đã tải hiển thị được trên app và web sau khi lưu vào thực thể.
