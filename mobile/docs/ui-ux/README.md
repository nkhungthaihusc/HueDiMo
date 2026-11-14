# UI/UX HueDiMo Mobile

Tài liệu này ghi nhận các quyết định UI/UX cho Android và iOS. Phạm vi tính năng và API nằm trong [spec tổng](../product/SPEC.md) và [mục lục mô-đun](../README.md).

## Đã chốt

- Bản 1.0 dùng giao diện sáng trên cả Android và iOS, kể cả khi điện thoại đang đặt chế độ tối. Dùng tông nền ấm ở các màn nội dung và màu tím cho thao tác chính.
- Dùng Geist như web cho toàn app trên Android và iOS, gồm tiêu đề, nội dung, nhãn nút và biểu mẫu. Kiểm tra dấu tiếng Việt và khả năng đọc khi tăng cỡ chữ hệ thống.

- Khi mở app bình thường, màn hình đầu tiên là bản đồ Huế.
- Bản 1.0 có đủ luồng web dành cho khách và người dùng đăng nhập. App dùng giao diện thiết kế cho điện thoại.
- Kế thừa nhận diện web và thêm chất Huế. Giữ màu tím làm màu chính, dùng ảnh địa phương và tông nền ấm ở các màn nội dung như chi tiết địa điểm và lịch trình. Trên bản đồ, ưu tiên độ rõ của điểm ghim và nút bấm.
- Màn bản đồ ban đầu có điểm ghim, ô tìm kiếm, bộ lọc, nút định vị và bảng gợi ý thấp ở dưới. Người dùng có thể chạm một gợi ý để xem chi tiết, kéo bảng lên để xem thêm hoặc thu gọn để có thêm không gian cho bản đồ.
- Khi mở app, bảng gợi ý hiển thị các địa điểm nổi bật ở Huế từ danh sách chọn sẵn cho bản 1.0. Danh sách gồm nhiều danh mục và giữ nguyên thứ tự khi người dùng kéo hoặc thu phóng bản đồ.
- Mỗi danh mục địa điểm có màu và biểu tượng riêng, dùng nhất quán trên điểm ghim và bộ lọc. Bộ lọc có nhãn chữ để người dùng nhận ra danh mục ngay cả khi khó phân biệt màu.
- Bản đồ có nút thời tiết nhỏ với biểu tượng và nhiệt độ hiện tại khi có dữ liệu. Nếu có cảnh báo, hiện dấu hiệu kèm nhãn ngắn. Chạm nút để xem dự báo, lượng mưa và mực nước.
- Màn thời tiết đặt điều kiện hiện tại và cảnh báo ở đầu, sau đó có ba mục **Dự báo**, **Lượng mưa** và **Mực nước**.
- Bản đồ chỉ có một bảng phía dưới tại mỗi thời điểm. Chạm điểm ghim hoặc gợi ý chuyển bảng sang xem nhanh với tên, đánh giá, **Chỉ đường** và **Xem thêm**. Điểm được chọn vẫn nhìn thấy trên bản đồ. Ảnh có thể ẩn khi màn hình nhỏ hoặc chữ lớn.
- **Xem thêm** mở trang riêng cho ảnh, giờ mở cửa, giá, check-in và đánh giá. Quay lại khôi phục vị trí bản đồ, bộ lọc và điểm đang xem. Đóng xem nhanh đưa bảng về gợi ý.
- Trên trang chi tiết địa điểm, nút **Chỉ đường** cố định ở dưới màn hình và nằm trên vùng thao tác hệ thống. Nội dung cuộn tới hết mà không bị nút che.

- Thanh điều hướng dưới có ba tab **Bản đồ**, **Lịch trình** và **Tài khoản**. Lịch trình cộng đồng mở từ tab **Lịch trình**.
- Khi khách mở tab **Tài khoản**, hiển thị nút **Đăng nhập** và các lối vào công khai **Bảng xếp hạng**, **Điều khoản** và **Quyền riêng tư**. Chỉ mở màn đăng nhập khi khách bấm nút.
- Sau khi đăng nhập, đầu tab **Tài khoản** hiển thị ảnh đại diện, tên, điểm và số lượt check-in. Bên dưới có **Chỉnh sửa hồ sơ**, **Địa điểm đã đóng góp**, **Bảng xếp hạng** và **Đăng xuất**.
- Khi mở tab **Lịch trình**, ưu tiên hai lựa chọn **Tạo bằng AI** và **Tự xếp**. Đặt **Đã lưu** và **Cộng đồng** bên dưới để người dùng truy cập từ cùng màn hình.
- Biểu mẫu **Tạo bằng AI** nằm trên một màn hình cuộn. Ngày đi, sở thích và ngân sách xuất hiện trước. Phương tiện, số người, điểm đầu/cuối và ghi chú nằm trong mục **Tùy chọn thêm**.
- Kết quả AI mặc định mở **Ngày 1**. Người dùng chọn **Ngày 1**, **Ngày 2** và các ngày tiếp theo để xem các điểm dừng theo thứ tự và chi phí dự kiến. Tổng chi phí và nút **Lưu lịch trình** áp dụng cho cả chuyến.
- Trong màn **Tự xếp**, nút **Thêm địa điểm** mở danh sách tìm theo tên hoặc lọc theo danh mục. Chọn một điểm sẽ thêm điểm đó vào ngày đang chỉnh.
- Lần mở đầu tiên vào thẳng bản đồ Huế mà không hỏi quyền vị trí. Chỉ hỏi khi người dùng bấm **Vị trí của tôi**, chọn dùng vị trí hiện tại để đề xuất địa điểm hoặc check-in. Nếu họ từ chối, bản đồ và chọn điểm thủ công vẫn dùng được. Check-in chỉ tiếp tục khi có vị trí hợp lệ.
- Khi khách chọn một thao tác cần tài khoản, như check-in, lưu lịch trình hoặc viết đánh giá, hiện lời mời tại chỗ giải thích lý do với hai nút **Đăng nhập** và **Để sau**. Trên bản đồ, lời mời dùng chung vùng bảng dưới. **Để sau** hoặc hủy đăng nhập khôi phục nội dung trước đó. Đăng nhập thành công đưa người dùng về đúng địa điểm hoặc lịch trình để họ chủ động tiếp tục thao tác.

## Tài liệu triển khai

- [Hệ thống giao diện](DESIGN-SYSTEM.md) quy định bảng màu, Geist, biểu tượng danh mục và các thành phần Flutter dùng chung.
- [Bố cục và nghiệm thu màn hình](SCREEN-FLOWS.md) quy định vị trí thao tác, chuyển trạng thái và các luồng cần kiểm tra trên hai nền tảng.

## Thứ tự gợi ý khi mở app

Thứ tự cố định cho bản 1.0, dựa trên mức độ nhận diện du lịch ước tính. [Cẩm nang du lịch Việt Nam về Huế](https://vietnam.travel/vi/place-to-go/north-central-coast/hue/) là nguồn tham khảo về các điểm nổi bật. Danh sách không dùng số lượt khách hay điểm đánh giá làm thước đo.

1. Đại Nội Huế (`dai-noi`)
2. Chùa Thiên Mụ (`chua-thien-mu`)
3. Lăng Khải Định (`lang-co`)
4. Cầu Tràng Tiền và Phố đi bộ Nguyễn Đình Chiểu (`cau-truong-tien`)
5. Chợ Đông Ba (`cho-dong-ba`)
6. Làng hương Thủy Xuân (`lang-huong-thuy-xuan`)

Khi tích hợp, kiểm tra ID với danh mục công khai của Express trên môi trường nghiệm thu. Hiển thị theo thứ tự trên và bỏ qua điểm chưa có trong danh mục công khai.
