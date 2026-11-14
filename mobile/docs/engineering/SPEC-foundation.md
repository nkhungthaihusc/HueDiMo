# Nền tảng Flutter

Phụ thuộc: không. Đầu vào: [spec tổng](../product/SPEC.md). Backend duy nhất của app là Express trong [back-end](../../../back-end).

URL mặc định của app là `https://huedimobe.hungthaisoft.id.vn`. Khi phát triển với Express cục bộ hoặc môi trường thử nghiệm, truyền `API_BASE_URL` để thay URL mặc định.

## Chạy môi trường phát triển

1. Từ `back-end/`, cấu hình `.env` theo [mẫu](../../../back-end/.env.example), dùng DB và dịch vụ thử nghiệm, đặt `PORT=3002`, chạy `npm install` và `npm run dev`. Express chỉ lắng nghe sau khi kết nối DB. Mở `/api/docs` và kiểm tra `GET /api/places`.
2. Từ `mobile/`, chạy `flutter pub get`, `flutter devices` và `flutter run -d DEVICE_ID --dart-define=API_BASE_URL=BASE_URL`. Android emulator có thể dùng `http://10.0.2.2:3002`; máy thật dùng IP LAN của máy chạy Express hoặc URL HTTPS thử nghiệm. Với iOS Simulator cùng máy chạy Express, thử localhost. Chỉ cho phép HTTP trong cấu hình phát triển nếu cần.
3. Trước khi bàn giao chạy `flutter analyze` và `flutter test`. Lệnh integration và build ở [spec tổng](../product/SPEC.md). Build và ký iOS trên macOS.

## Hợp đồng giữa các mô-đun

- `lib/app/` chứa cấu hình, theme và GoRouter; `lib/core/` chứa Dio, kiểu lỗi, lưu trữ; `lib/features/<module>/` chứa UI, trạng thái Riverpod và repository. Dùng `test/` cho unit/widget và `integration_test/` cho luồng thật. Giữ kiểu dữ liệu của từng tính năng tại nơi sở hữu.
- Base URL là origin, đường dẫn ở spec bắt đầu bằng `/api`. Express trả thành công `{data: T}` và lỗi `{error: {code, message, details?}}`. Giữ status và lỗi trường khi có; phân biệt timeout, ngoại tuyến, lỗi máy chủ và phản hồi sai cấu trúc.
- Tách yêu cầu công khai, tùy chọn phiên và bắt buộc phiên. Đưa access token vào Bearer ở hai trường hợp sau khi có phiên. Xử lý vòng đời phiên theo [tài khoản](../features/SPEC-account.md). Với ghi dữ liệu và endpoint dạng toggle, không tự gửi lại sau timeout; tải lại trạng thái trước.
- Các màn hình có loading, dữ liệu rỗng, lỗi và retry; giữ nội dung người dùng đang nhập nếu có thể. Hỗ trợ VoiceOver, TalkBack, cỡ chữ hệ thống và vùng an toàn. Tiếng Việt mặc định. Log dùng trạng thái/mã lỗi, không chứa token, mật khẩu hoặc tọa độ cá nhân.

## Nghiệm thu

Build chạy trên Android và iOS. Khi mở app vào Bản đồ; đổi tab rồi quay lại giữ bộ lọc và góc nhìn. Kiểm thử client với phản hồi thành công, 401, 422, timeout và JSON không hợp lệ. Xác nhận build release dùng URL HTTPS đúng môi trường, không chứa bí mật server.
