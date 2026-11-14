# Đặc tả HueDiMo Mobile

| Thư mục | Nội dung |
|---|---|
| [product/](product/SPEC.md) | Phạm vi sản phẩm, yêu cầu chung và nghiệm thu bản 1.0. |
| [engineering/](engineering/SPEC-foundation.md) | Khung Flutter, môi trường Express và dịch vụ dùng chung. |
| [features/](features/SPEC-map-places.md) | Luồng nghiệp vụ, API và nghiệm thu theo tính năng. Xem mục lục mô-đun bên dưới. |
| [ui-ux/](ui-ux/README.md) | Quyết định giao diện và tương tác cho Android và iOS. |

Đọc [spec tổng](product/SPEC.md) để nắm phạm vi 1.0, sau đó mở spec của mô-đun được giao. App dùng Express trong `back-end/`. Nguồn dữ liệu bên ngoài của từng tính năng được ghi trong spec tương ứng.

| Mô-đun | Trách nhiệm | Phụ thuộc |
|---|---|---|
| [foundation](engineering/SPEC-foundation.md) | Khung app, cấu hình, HTTP | — |
| [map-places](features/SPEC-map-places.md) | Bản đồ và địa điểm | foundation |
| [weather](features/SPEC-weather.md) | Thời tiết và quan trắc | foundation |
| [media](engineering/SPEC-media.md) | Tải ảnh | foundation |
| [account](features/SPEC-account.md) | Tài khoản và phiên | foundation, media |
| [itinerary](features/SPEC-itinerary.md) | Lịch trình cá nhân và AI | map-places, account |
| [itinerary-community](features/SPEC-itinerary-community.md) | Lịch trình cộng đồng | itinerary, account |
| [reviews](features/SPEC-reviews.md) | Đánh giá địa điểm | map-places, account, media |
| [checkins](features/SPEC-checkins.md) | Check-in và xếp hạng | map-places, account |
| [contributions](features/SPEC-contributions.md) | Đóng góp địa điểm | map-places, account, media |

## Bắt đầu triển khai

1. Chạy Express với DB thử nghiệm, xác nhận `GET /api/places` từ thiết bị hoặc emulator theo [nền tảng](engineering/SPEC-foundation.md).
2. Làm luồng đầu tiên theo `foundation` và `map-places`: mở app vào bản đồ Huế, tải dữ liệu thật và chạm một điểm để xem chi tiết. Nghiệm thu trên Android và iOS.
3. Tiếp theo làm `weather` và `media`, rồi `account`. Thực hiện `itinerary` trước `itinerary-community`; các luồng `reviews`, `checkins` và `contributions` có thể triển khai khi các phần phụ thuộc sẵn sàng.
4. Với mỗi mô-đun, đối chiếu màn web và controller, ghi lại sai khác giữa hợp đồng trong repo và môi trường thử nghiệm, rồi chạy tiêu chí nghiệm thu của spec. Các thứ tự trên là mốc nội bộ; bản 1.0 nghiệm thu toàn bộ mô-đun.

Mẫu giao việc: “Đọc `mobile/docs/README.md`, `mobile/docs/product/SPEC.md` và spec của mô-đun được giao cùng các spec phụ thuộc. Triển khai các luồng và chạy tiêu chí nghiệm thu trong spec. Ghi rõ phần cần sửa ở Express và phần chưa thể kiểm tra trên thiết bị.”
