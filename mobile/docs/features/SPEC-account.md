# Tài khoản và phiên

Phụ thuộc: [nền tảng](../engineering/SPEC-foundation.md), [ảnh](../engineering/SPEC-media.md) khi đổi avatar. Cung cấp trạng thái phiên và cổng yêu cầu đăng nhập cho các tính năng ghi.

Tab **Tài khoản** có màn dành cho khách với nút **Đăng nhập** và các lối vào **Bảng xếp hạng**, **Điều khoản**, **Quyền riêng tư**. Kiểm tra cả ba mục đều mở được khi chưa đăng nhập và nút **Đăng nhập** đưa khách đến màn xác thực.

Khi đã đăng nhập, đầu tab **Tài khoản** hiển thị ảnh đại diện, tên, điểm và số lượt check-in. Bên dưới đặt **Chỉnh sửa hồ sơ**, **Địa điểm đã đóng góp**, **Bảng xếp hạng** và **Đăng xuất**. Sau khi check-in thành công, cập nhật điểm và số lượt theo phản hồi máy chủ. Kiểm tra tab hiển thị số mới khi quay lại sau một lần check-in.

Khi khách chọn thao tác cần tài khoản, hiện lời mời tại chỗ với lý do, nút **Đăng nhập** và **Để sau**. Trên bản đồ, lời mời dùng chung vùng bảng dưới. Lưu ngữ cảnh của màn hình để khôi phục khi người dùng chọn **Để sau**, hủy hoặc đăng nhập thành công. Người dùng chủ động tiếp tục thao tác sau khi quay lại. Xem [quyết định UI/UX](../ui-ux/README.md).

## Luồng và hợp đồng Express

| API | Yêu cầu và kết quả |
|---|---|
| POST /api/auth/register | `name, email, password`; trả hồ sơ và bộ token. |
| POST /api/auth/login | `email, password`; trả hồ sơ và bộ token. |
| POST /api/auth/refresh | `refreshToken`; cập nhật access token, refresh token và thời hạn từ phản hồi. |
| GET /api/auth/me | Bearer; tải hồ sơ hiện tại. |
| PATCH /api/auth/profile | Bearer; `name, avatar_url` theo thay đổi; cập nhật từ phản hồi. |
| POST /api/auth/logout | `refreshToken`; thu hồi phiên nếu gọi được và xóa phiên trên máy. |
| POST /api/auth/oauth-login | Web hiện gửi `email, name, avatarUrl, provider`. Hợp đồng này cần được cập nhật để Express xác minh bằng chứng đăng nhập trước khi dùng để phát hành app. |

Đối chiếu [controller](../../../back-end/src/controllers/auth.controller.ts) và [client web](../../../front-end/lib/auth/logic.ts). Bộ token gồm `accessToken`, `refreshToken` và các mốc hết hạn khi có. Dùng secure storage cho phiên. Chỉ một yêu cầu refresh được chạy đồng thời; request mới chờ kết quả. Khi refresh bị từ chối, chuyển về khách và mời đăng nhập lại. Khi lỗi mạng tạm thời, giữ thông tin phiên để thử lại. Khi đăng xuất hoặc đổi tài khoản, xóa dữ liệu riêng khỏi trạng thái UI; phản hồi từ phiên cũ không được ghi đè phiên mới.

OAuth Google/Facebook phải quay lại app qua callback đã đăng ký cho từng môi trường và nền tảng. Sau khi người dùng xác thực qua Supabase, Express phải xác minh token và lấy danh tính từ bằng chứng đã kiểm tra, trước khi cấp JWT HueDiMo. Kiểm tra tác động đến callback web khi sửa hợp đồng. Giữ liên kết Điều khoản, Quyền riêng tư và hướng dẫn xóa dữ liệu như web.

## Nghiệm thu

Đăng ký và dùng được tài khoản web hiện có. Đóng/mở app giữ phiên hợp lệ. Kiểm tra nhiều yêu cầu gặp 401 chỉ sinh một lần refresh, thu hồi phiên, ngoại tuyến, đổi avatar, hủy OAuth và callback lỗi. Với OAuth, dữ liệu hồ sơ do client tự khai không đủ để cấp phiên. Quay lại đúng màn hình sau đăng nhập; thao tác ghi cần xác nhận được người dùng tiếp tục chủ động.
