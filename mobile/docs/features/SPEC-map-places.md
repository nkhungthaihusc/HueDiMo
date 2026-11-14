# Bản đồ và địa điểm

Phụ thuộc: [nền tảng](../engineering/SPEC-foundation.md). Cung cấp mô hình Place và thao tác chọn điểm cho lịch trình, đóng góp, đánh giá và check-in.

## Luồng

- Dùng cùng màu và biểu tượng của từng danh mục trên điểm ghim và bộ lọc. Bộ lọc luôn có nhãn chữ.
- Bảng gợi ý ban đầu dùng [danh sách địa điểm và thứ tự trong spec UI/UX](../ui-ux/README.md#thứ-tự-gợi-ý-khi-mở-app). Đối chiếu từng mục với danh mục công khai của Express và chỉ hiển thị các điểm còn xuất hiện trong đó. Giữ thứ tự khi kéo hoặc thu phóng bản đồ.

- Mở trực tiếp bản đồ Huế, tải địa điểm công khai, cho chuyển bản đồ/danh sách, đổi lớp và điều khiển theo web. Đối chiếu [MapView](../../../front-end/components/home/MapView.tsx) và [HomeClient](../../../front-end/components/home/HomeClient.tsx). Dùng style Goong nếu xác minh được cấu hình mobile; MapLibre là lựa chọn đề xuất từ pubspec hiện có.
- Ô tìm kiếm hỗ trợ tiếng Việt có/không dấu, gợi ý và lọc theo danh mục. Bản đồ chỉ dùng một bảng ở dưới: chọn gợi ý hoặc marker chuyển bảng sang xem nhanh với tên, đánh giá, **Chỉ đường** và **Xem thêm**. Giữ điểm đã chọn trong vùng nhìn thấy. **Xem thêm** mở trang chi tiết riêng; quay lại giữ bộ lọc, vị trí, mức zoom, kết quả tìm kiếm và điểm đã chọn. Đóng xem nhanh đưa bảng về gợi ý. Xem [quyết định UI/UX](../ui-ux/README.md).
- Chi tiết đọc từ Place đã tải, hiển thị ảnh, địa chỉ, giờ mở cửa, chi phí, mô tả, đánh giá và thông tin theo danh mục khi có. Đối chiếu [PlaceDetailPanel](../../../front-end/components/home/PlaceDetailPanel.tsx) và [logic tải Place](../../../front-end/lib/data/places.ts). Không đặt giá 0 hoặc giờ mở cửa giả cho trường thiếu. Mở Google Maps với tọa độ đích và vị trí gốc nếu có; có phương án mở URL khi thiếu app bản đồ.
- Chỉ xin vị trí khi người dùng chọn thao tác cần nó. Khi từ chối, giữ bản đồ Huế và cho chọn điểm thủ công. Yêu cầu trùng hoặc phản hồi tìm kiếm cũ không được thay kết quả mới.

## API

| Yêu cầu | Hợp đồng |
|---|---|
| GET /api/places | Công khai, tùy chọn `category`. Trả danh sách đã duyệt hoặc trạng thái null theo Express. Chuẩn hóa tọa độ, số và các trường snake_case ở lớp dữ liệu. |
| GET /api/places/search | Công khai, `q` và `limit`; mặc định 5, giới hạn 1–20. Dùng gợi ý có xếp hạng; danh sách đã lọc và marker lấy cùng tập kết quả mà UI đang hiển thị. |

Express [không có route chi tiết theo ID](../../../back-end/src/routes/places.routes.ts). Tra theo ID trong danh mục đã tải, làm mới danh mục khi cần. Nếu điểm của lịch trình không còn công khai, giữ thông tin lưu cùng lịch trình nếu có và hiển thị trạng thái thiếu địa điểm.

## Nghiệm thu

Trên trang chi tiết, nút **Chỉ đường** cố định ở dưới màn hình, trên vùng thao tác hệ thống. Cuộn tới cuối trang trên màn hình nhỏ và khi tăng cỡ chữ để kiểm tra nội dung cuối vẫn đọc được và nút vẫn mở chỉ đường đến đúng địa điểm.

Mở app và kiểm tra bảng gợi ý hiển thị đúng danh sách và thứ tự đã chốt. Kéo hoặc thu phóng bản đồ rồi kiểm tra lại thứ tự. Khi một địa điểm rời danh mục công khai, bảng gợi ý bỏ qua địa điểm đó.

Khách mở được bản đồ khi từ chối vị trí; tìm “Đại Nội” và “Dai Noi”, chọn kết quả, mở chỉ đường đúng tọa độ. Đổi bộ lọc rồi mở/đóng chi tiết không làm mất ngữ cảnh. Kiểm tra danh mục rỗng, ảnh thiếu, lỗi tải điểm, lỗi tải style và thao tác chọn bằng trình đọc màn hình.
