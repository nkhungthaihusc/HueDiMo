# Lịch trình cá nhân và AI

Phụ thuộc: [bản đồ và địa điểm](SPEC-map-places.md), [tài khoản](SPEC-account.md). Cung cấp mô hình lịch trình và màn chi tiết cho cộng đồng.

## Màn hình và hành vi

Màn đầu của tab **Lịch trình** ưu tiên hai lựa chọn **Tạo bằng AI** và **Tự xếp**. Đặt **Đã lưu** và **Cộng đồng** bên dưới. Hai cách tạo luôn xuất hiện, kể cả khi người dùng chưa có lịch trình. Xem [spec lịch trình cộng đồng](SPEC-itinerary-community.md).

Biểu mẫu **Tạo bằng AI** dùng một màn hình cuộn. Đặt ngày đi, sở thích và ngân sách trước mục **Tùy chọn thêm**. Mục này chứa phương tiện, số người, điểm đầu/cuối và ghi chú. Thu gọn mục vẫn giữ giá trị đã nhập. Khi một trường bên trong có lỗi, mở mục và đưa người dùng đến trường cần sửa.

Kết quả AI mở **Ngày 1** theo mặc định và có hàng chọn ngày. Chuyển ngày cập nhật danh sách điểm dừng theo thứ tự và chi phí dự kiến của ngày đó. Tổng chi phí vẫn tính trên mọi ngày. **Lưu lịch trình** lưu cả chuyến bất kể ngày đang xem. Kiểm tra bằng lịch trình ít nhất hai ngày.

Trong màn **Tự xếp**, bấm **Thêm địa điểm** từ ngày đang chỉnh để mở danh sách địa điểm công khai có tìm kiếm theo tên và lọc theo danh mục. Khi chọn một điểm, quay về ngày đó và hiển thị điểm vừa thêm. Hủy chọn giữ nguyên bản nháp. Kiểm tra thêm điểm vào **Ngày 2** của lịch trình hai ngày và xác nhận **Ngày 1** không bị thay đổi.

Tab Lịch trình có Tạo bằng AI, Tự xếp và Đã lưu. Form AI giữ ngày bắt đầu/kết thúc, sở thích, ngân sách VND, nơi ở, điểm đầu/cuối, phương tiện, số người và ghi chú. Cho xem lỗi tại trường, giữ form khi tạo thất bại và chặn gửi lặp trong lúc đang tạo. Luồng tự xếp cho thêm, bỏ và đổi thứ tự điểm theo ngày; đối chiếu [trình xếp](../../../front-end/components/home/ItineraryBuilderPanel.tsx) và [bảng ngân sách](../../../front-end/components/home/BudgetPanel.tsx). Chi tiết hiển thị ngày, điểm, lý do/ghi chú, chi phí và ước tính di chuyển theo [logic web](../../../front-end/lib/itinerary/types.ts). Các ước tính không phải thời gian chỉ đường trực tiếp.

Lưu cần đăng nhập. Màn Đã lưu đọc lịch trình của người dùng, cho mở, chỉnh sửa và lưu lại, thay đổi công khai/riêng tư và xóa theo web. Mặc định lưu riêng tư trừ khi người dùng chủ động chọn công khai. Kiểm tra khả năng lưu từng trường; bản nháp có thể chứa trường mà API hiện chưa lưu.

## Hợp đồng

| API | Đầu vào và kết quả |
|---|---|
| POST /api/itinerary | Công khai ở Express. `startDate, endDate` dạng YYYY-MM-DD, `preferences[]` không rỗng, `budget` dương, `currentLocation` chuỗi, `places[]` không rỗng gồm `id,name,lat,lng,category`; `startPlaceId,endPlaceId,transportMode,groupSize,notes` theo kiểu web. 422 dữ liệu sai, 500 thiếu cấu hình, 502 lỗi AI. |
| POST /api/itineraries/save | Bearer. Gửi `title,startDate,endDate,budget,totalEstimatedCost,transportMode,groupSize,currentLocation,preferences,summary,days,isPublic`; gửi `id` khi cập nhật. Dùng ID từ phản hồi và tải lại khi trạng thái lưu không rõ. |
| GET /api/itineraries/my | Bearer; lấy lịch trình của tài khoản. |
| GET /api/itineraries/{id} | Đọc chi tiết; gửi Bearer nếu có để xem mục riêng tư thuộc tài khoản. |
| PATCH /api/itineraries/{id}/visibility | Bearer; `{isPublic: bool}`. |
| DELETE /api/itineraries/{id} | Bearer; xác nhận trước khi xóa. |

Mô hình ngày gồm `date,title,places[]`; mỗi điểm có `placeId,reason,estimatedCost` và có thể có `customName,note`. Phân biệt payload AI và lưu. Kiểm tra lịch ngày hợp lệ, ID lạ, chi phí thiếu và lịch trống trước khi hiển thị. Xem [controller Express](../../../back-end/src/controllers/itinerary.controller.ts) và [client lưu](../../../front-end/lib/api/itineraries.ts).

## Nghiệm thu

Tạo AI và tự xếp, thay thứ tự, tính lại chi phí, lưu và mở cùng lịch trên web. Kiểm tra 422, AI lỗi và ngày kết thúc trước ngày bắt đầu. Dùng hai tài khoản kiểm tra lịch riêng tư, lưu cập nhật và xóa. Thử điểm đã bị gỡ khỏi danh mục và kiểm tra dự thảo vẫn mở được.
