# Đóng góp địa điểm

Phụ thuộc: [bản đồ và địa điểm](SPEC-map-places.md), [tài khoản](SPEC-account.md), [ảnh](../engineering/SPEC-media.md).

Bắt đầu từ bản đồ hoặc Tài khoản. Chọn điểm thủ công hoặc dùng vị trí hiện tại. Gợi ý địa chỉ và cho sửa khi tra cứu thất bại. Form theo [AddPlacePanel](../../../front-end/components/home/AddPlacePanel.tsx) gồm tên, danh mục, vị trí, địa chỉ, chi phí, giờ mở cửa, thời lượng, thời điểm phù hợp, mô tả, ảnh, điểm nổi bật và ghi chú khi có. Giữ form trong phiên khi chọn ảnh, sửa tọa độ hoặc gửi lỗi. Khi thành công, mở danh sách đóng góp và hiện trạng thái chờ duyệt.

| API | Hợp đồng |
|---|---|
| GET /api/reverse-geocode | `lat,lng` làm query; đọc địa chỉ gợi ý, giữ giá trị đã sửa khi phản hồi đến trễ. |
| POST /api/places | Bearer; `name,category,lat,lng,address,price,opening_hours,estimated_duration_minutes,best_time_to_visit,description,image_url,images,highlights,notes`. Express kiểm tra latitude 15–18 và longitude 106–109. Trả địa điểm tạo với `status=pending`; 422 cho lỗi xác thực trường. |
| GET /api/places/my | Bearer; đọc đề xuất thuộc tài khoản và trạng thái backend. |

Đối chiếu [controller](../../../back-end/src/controllers/place.controller.ts). Dùng ID server trả. Chỉ hiện điểm công khai từ danh mục công khai; danh sách cá nhân có thể hiện đề xuất chưa duyệt theo quyền. Khi gửi bị timeout, tải danh sách cá nhân trước khi cho gửi lại.

## Nghiệm thu

Chọn tọa độ, thử lỗi tra địa chỉ và nhập tay, gửi ảnh và đề xuất. Tài khoản khác không thấy điểm chờ duyệt trong danh mục công khai. Quản trị viên duyệt hoặc từ chối bằng web, app cập nhật đúng trạng thái khi tải lại. Thử hết phiên giữa tải ảnh và gửi form.
