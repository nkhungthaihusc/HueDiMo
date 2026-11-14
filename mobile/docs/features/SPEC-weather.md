# Thời tiết, lượng mưa và mực nước

Phụ thuộc: [nền tảng](../engineering/SPEC-foundation.md). Mở từ nút thời tiết trên Bản đồ, dùng được khi chưa đăng nhập.

Nút trên bản đồ hiển thị biểu tượng và nhiệt độ hiện tại khi có dữ liệu. Khi nguồn cung cấp cảnh báo, thêm nhãn ngắn để người dùng nhận ra mà không cần phân biệt màu. Khi thiếu nhiệt độ, giữ nút để người dùng vẫn mở được dự báo, lượng mưa và mực nước. Kiểm tra nút trong ba trạng thái có dữ liệu, có cảnh báo và thiếu nhiệt độ.

Màn chi tiết hiển thị thời tiết hiện tại và cảnh báo ở đầu. Bên dưới, người dùng chọn **Dự báo**, **Lượng mưa** hoặc **Mực nước** để xem nội dung tương ứng. Đổi mục vẫn giữ tổng quan. Khi một nguồn lỗi, hiển thị lỗi và nút thử lại trong mục đó, đồng thời cho phép chuyển sang các mục còn lại.

| Nguồn | Dữ liệu |
|---|---|
| Open-Meteo | Widget và dự báo chi tiết dùng tọa độ Huế theo [WeatherWidget](../../../front-end/components/home/WeatherWidget.tsx) và [WeatherDetailModal](../../../front-end/components/home/WeatherDetailModal.tsx). Đối chiếu query và các đơn vị của web khi chuyển sang Dart. |
| GET /api/weather/rainfall | `source: live/fallback, updatedAt, summary, stations, error?`. |
| GET /api/water-levels | `count, timestamp, summary, stations`. |

Open-Meteo là nguồn dự báo bên ngoài mà web hiện gọi trực tiếp; Express phục vụ dữ liệu quan trắc. Dùng [kiểu dữ liệu web](../../../front-end/lib/types/weather.ts) để đối chiếu tên trường trạm, tọa độ, mốc thời gian và cấp cảnh báo. Hiển thị ngày giờ theo Huế, đơn vị theo nguồn và nhãn dữ liệu dự phòng. Nếu chỉ một nguồn lỗi, các phần khác vẫn hoạt động. Giá trị thiếu không được diễn giải thành 0 hoặc an toàn. Cho thử lại riêng và phân biệt mốc quan trắc với mốc tải.

## Nghiệm thu

So sánh dự báo và hai nhóm trạm với web cùng thời điểm. Dùng fixture live, fallback, trạm thiếu giá trị và lỗi từng nguồn; kiểm tra nhãn, thời điểm và trạng thái dữ liệu. Từ bảng trạm có tọa độ, mở đúng vị trí theo luồng web.
