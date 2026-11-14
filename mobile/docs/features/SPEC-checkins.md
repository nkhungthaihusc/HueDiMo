# Check-in và bảng xếp hạng

Phụ thuộc: [địa điểm](SPEC-map-places.md), [tài khoản](SPEC-account.md).

Nút check-in ở chi tiết địa điểm. Sau đăng nhập, xin vị trí hiện tại và xử lý từ chối, tắt dịch vụ hoặc timeout. Gửi tọa độ khi có kết quả hợp lệ; không gửi khi thiếu tọa độ. Hiển thị điểm và tổng lượt theo phản hồi. Lịch sử trả danh sách ID đã check-in, không suy ra từ danh sách này rằng người dùng đã check-in hôm nay. Bảng xếp hạng dùng thứ hạng server.

| API | Hợp đồng |
|---|---|
| GET /api/leaderboard | Công khai; `limit` mặc định 20, giới hạn 5–50; mỗi mục có `id,name,avatar_url,role,points,checkin_count,rank`. |
| POST /api/checkins | Bearer; `placeId,userLat,userLng,note?`. 201 có `checkinId,placeId,pointsEarned,totalPoints,totalCheckins,message`; 403 quá xa, 409 đã check-in điểm này trong ngày, 422 thiếu ID. |
| GET /api/checkins/me | Bearer; `{checkedPlaceIds}`. |

[Service Express](../../../back-end/src/services/leaderboard.service.ts) dùng bán kính 550 m gồm dung sai GPS và hiện chỉ kiểm tra khoảng cách khi nhận cả hai tọa độ. Nếu quy tắc check-in phải được thực thi với mọi client, Express cần bắt buộc xác thực đầu vào vị trí và bảo đảm chống trùng dưới thao tác đồng thời. App lấy quyết định và số điểm từ server.

## Nghiệm thu

Trên thiết bị thật thử gần, xa, từ chối quyền và gửi lại trong ngày. Kiểm tra điểm và xếp hạng sau thao tác. Khi timeout, hiển thị trạng thái chưa xác nhận, tải lại dữ liệu trước khi cho gửi lại.
