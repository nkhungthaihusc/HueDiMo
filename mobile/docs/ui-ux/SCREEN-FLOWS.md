# Bố cục và nghiệm thu màn hình

Dùng [hệ thống giao diện](DESIGN-SYSTEM.md) và các [spec tính năng](../README.md) cùng tài liệu này.

| Màn hình | Bố cục và hành vi |
|---|---|
| Bản đồ | Ô tìm kiếm ở trên, bộ lọc cuộn ngang bên dưới. Đặt thời tiết và định vị dọc cạnh bản đồ, phía trên bảng dưới. Dành vùng nhìn thấy cho điểm đang chọn và thông tin ghi công bản đồ. Khi không đủ chỗ, giảm nội dung xem trước trước khi thu nhỏ vùng chạm. |
| Bảng dưới bản đồ | Mặc định ở mức thấp với gợi ý đầu tiên và lối mở danh sách. Khi mở rộng, hiển thị thêm gợi ý theo thứ tự trong [mục lục UI/UX](README.md#thứ-tự-gợi-ý-khi-mở-app). Khi chọn một điểm, cùng bảng hiển thị tên, đánh giá nếu có, **Chỉ đường** và **Xem thêm**. Lời mời đăng nhập dùng cùng vùng khi phát sinh trên bản đồ. |
| Chi tiết địa điểm | Ảnh và tên ở đầu, tiếp theo là đánh giá, địa chỉ, giờ mở cửa và giá khi có. Mô tả, check-in và đánh giá nằm trong phần cuộn. **Chỉ đường** nằm cố định dưới, có khoảng đệm để phần cuối trang cuộn qua nút. Quay lại phục hồi điểm đang chọn. |
| Thời tiết | Tổng quan và cảnh báo ở đầu, sau đó chọn **Dự báo**, **Lượng mưa**, **Mực nước**. Mặc định mở **Dự báo**. Mỗi mục báo lỗi và cho thử lại riêng. |
| Lịch trình | Đặt **Tạo bằng AI** và **Tự xếp** trước **Đã lưu** và **Cộng đồng**. Biểu mẫu AI trên một màn hình cuộn, phần **Tùy chọn thêm** mặc định thu gọn. Kết quả mặc định ở **Ngày 1**, hàng chọn ngày cuộn ngang khi cần. Tổng chi phí và lưu áp dụng cho toàn chuyến. |
| Tự xếp và cộng đồng | Mở chọn điểm từ **Thêm địa điểm** của ngày đang chỉnh. Cộng đồng mở từ tab Lịch trình. Đặt tìm kiếm và bộ lọc trước danh sách, giữ trạng thái khi quay lại từ chi tiết. |
| Tài khoản và đăng nhập | Khách thấy **Đăng nhập**, **Bảng xếp hạng**, **Điều khoản**, **Quyền riêng tư**. Thành viên thấy hồ sơ, điểm và số lượt check-in trước các thao tác. Đăng nhập từ một thao tác cần tài khoản sẽ quay về đúng ngữ cảnh ban đầu. |
| Đóng góp và đánh giá | Giữ bản nháp khi chọn ảnh hoặc gặp lỗi. Báo lỗi cạnh trường liên quan. Dùng nút gửi có nhãn cụ thể, hiển thị tiến độ ảnh nếu có và xác nhận khi gửi thành công. |

## Nghiệm thu trên Android và iOS

1. Mở app khi chưa cấp vị trí. Thấy bản đồ và gợi ý mà chưa gặp hộp thoại quyền. Chọn gợi ý, mở **Xem thêm**, cuộn hết trang, mở chỉ đường rồi quay lại đúng điểm đã chọn.
2. Kiểm tra trên màn hình rộng khoảng 320 dp và khi tăng cỡ chữ hệ thống. Chữ tiếng Việt đầy đủ dấu. Nút chính vẫn bấm được. Cuộn đến nội dung cuối không bị thanh điều hướng, nút cố định hoặc bàn phím che.
3. Dùng TalkBack và VoiceOver để chọn địa điểm từ danh sách, thao tác với bảng dưới bằng nút, nhận biết tab đang chọn và nghe nhãn cảnh báo. Kiểm tra phân biệt danh mục bằng biểu tượng và chữ.
4. Tạo lịch hai ngày, đổi ngày và xác nhận tổng tiền và nút lưu vẫn áp dụng cho cả chuyến. Kiểm tra ngày đang chỉnh được giữ khi quay về từ màn chọn địa điểm.
5. Từ thao tác cần tài khoản, thử **Để sau**, hủy đăng nhập và đăng nhập thành công. Mỗi trường hợp đều đưa người dùng về đúng ngữ cảnh. Kiểm tra thao tác quay lại của hệ điều hành trên cả hai nền tảng.
6. Thử ảnh lỗi, danh sách rỗng, mất mạng và lỗi một nguồn thời tiết. Nhãn và thao tác tiếp theo vẫn rõ. Khi điện thoại đặt chế độ tối, app vẫn hiển thị giao diện sáng.
