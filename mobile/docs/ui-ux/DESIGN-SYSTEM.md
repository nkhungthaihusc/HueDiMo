# Hệ thống giao diện HueDiMo 1.0

Áp dụng cho Flutter trên Android và iOS. Dùng giao diện sáng, màu tím kế thừa web và nền ấm cho các màn nội dung. Dùng ảnh thật của địa điểm khi có dữ liệu, với nền thay thế trung tính khi thiếu ảnh hoặc tải thất bại.

## Màu theo vai trò

| Vai trò | Màu | Cách dùng |
|---|---|---|
| Nền nội dung | `#FAF7F2` | Trang chi tiết, lịch trình, tài khoản |
| Bề mặt | `#FFFFFF` | Bảng bản đồ, thanh điều hướng, ô nhập và thẻ |
| Chữ chính | `#1C1921` | Tiêu đề và nội dung chính |
| Chữ phụ | `#5F5865` | Mô tả, thời điểm cập nhật, thông tin phụ |
| Viền phân cách | `#DDD5CC` | Đường phân cách và viền thẻ |
| Viền điều khiển | `#817788` | Ô nhập hoặc điều khiển cần viền để nhận biết |
| Tím chính | `#6D28D9` | Nút chính với chữ trắng, viền focus |
| Tím nhấn khi bấm | `#5B21B6` | Trạng thái nhấn của nút chính |
| Nền mục đang chọn | `#F5F3FF` | Tab hoặc bộ lọc đã chọn |
| Thành công | `#166534` trên `#DCFCE7` | Có nhãn hoặc biểu tượng kèm theo |
| Cảnh báo | `#92400E` trên `#FEF3C7` | Có nhãn ngắn, gồm cảnh báo thời tiết |
| Lỗi | `#B91C1C` trên `#FEE2E2` | Thông báo lỗi và lỗi biểu mẫu |

Dùng chữ thường với tỷ lệ tương phản tối thiểu 4,5:1. Kiểm tra nhãn, điểm ghim và vòng chọn trên nền bản đồ thực tế. Nút trên bản đồ dùng bề mặt trắng để chữ và biểu tượng dễ nhận ra.

## Kiểu chữ và kích thước

Dùng Geist với tài nguyên font đóng gói cùng app, có đủ dấu tiếng Việt. Các kích thước sau là mặc định trước khi áp dụng cỡ chữ hệ thống.

| Vai trò | Cỡ chữ | Độ đậm |
|---|---:|---:|
| Tiêu đề trang | 28 | 700 |
| Tiêu đề mục | 20 | 600 |
| Tên địa điểm hoặc tiêu đề thẻ | 16 | 600 |
| Nội dung và ô nhập | 16 | 400 |
| Nhãn nút | 14 | 600 |
| Thông tin phụ và nhãn tab | 12 | 500 |

Dùng các khoảng cách 4, 8, 12, 16, 24 và 32 dp. Lề trang mặc định 16 dp. Bo góc 12 dp cho nút và ô nhập, 16 dp cho thẻ, 24 dp cho hai góc trên của bảng bản đồ. Vùng chạm ít nhất 48 × 48 dp. Chiều cao được tăng theo nội dung khi cỡ chữ lớn.

## Danh mục địa điểm

Dùng biểu tượng Material có sẵn trong Flutter. Điểm ghim dùng biểu tượng trắng trên màu danh mục. Bộ lọc dùng cùng biểu tượng và màu, luôn kèm nhãn chữ. Mục được chọn có thêm viền hoặc dấu chọn. Với ID mới hoặc lạ, dùng mục **Địa điểm**. Giữ ID và alias tương thích với [danh mục web](../../../front-end/lib/data/categories.ts).

| ID | Nhãn | Màu | Biểu tượng Flutter |
|---|---|---|---|
| `ancient` | Di tích cổ | `#6D28D9` | `Icons.account_balance` |
| `spiritual` | Chùa & Tâm linh | `#A21CAF` | `Icons.temple_buddhist` |
| `food` | Ẩm thực | `#C2410C` | `Icons.restaurant` |
| `coffee` | Cà phê & Trà | `#92400E` | `Icons.coffee` |
| `hotel` | Khách sạn | `#0E7490` | `Icons.hotel` |
| `nature` | Thiên nhiên | `#15803D` | `Icons.park` |
| `beach` | Bãi biển | `#0369A1` | `Icons.beach_access` |
| `cultural` | Văn hóa & Di sản | `#854D0E` | `Icons.palette` |
| `craft_village` | Làng nghề | `#BE185D` | `Icons.handyman` |
| `entertainment` | Giải trí & Phố đêm | `#4338CA` | `Icons.theater_comedy` |
| `shopping` | Chợ & Mua sắm | `#0F766E` | `Icons.shopping_bag` |
| Khác | Địa điểm | `#475569` | `Icons.place` |

Chuẩn hóa `temple → spiritual` và `culture → cultural`. Tập trung bảng ánh xạ vào một nơi để điểm ghim, danh sách và bộ lọc dùng cùng dữ liệu.

## Thành phần dùng chung

- **Thanh điều hướng** dùng biểu tượng bản đồ, lịch và tài khoản với nhãn luôn hiện. Tab đang mở có nền tím nhạt và được trình đọc màn hình thông báo là đã chọn.
- **Nút** có kiểu chính nền tím, kiểu phụ có viền hoặc chữ tím, kiểu xóa dùng màu lỗi. Khi đang gửi, giữ nhãn có nghĩa, báo trạng thái và khóa lần gửi tiếp theo.
- **Ô nhập** có nhãn cố định và lỗi ngay dưới trường. Trường đang focus vẫn nhìn thấy khi bàn phím mở.
- **Bảng bản đồ** có cách mở rộng hoặc thu gọn bằng nút có nhãn, ngoài cử chỉ kéo. Mỗi thời điểm hiện một nội dung.
- **Trạng thái dữ liệu** dùng vùng đang tải, nội dung rỗng có hướng đi tiếp hoặc lỗi có **Thử lại**. Cảnh báo dùng chữ và biểu tượng. Giảm chuyển động theo cài đặt hệ thống.
