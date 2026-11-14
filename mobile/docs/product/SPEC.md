# Spec HueDiMo Mobile 1.0

## Mục tiêu và phạm vi

Xây dựng app Flutter trong `mobile/` cho Android và iOS. Bản 1.0 phải hỗ trợ đầy đủ các luồng hiện có trên web dành cho khách và người dùng đăng nhập, với giao diện thiết kế cho điện thoại. Khi mở app bình thường, người dùng vào thẳng bản đồ Huế. Quản trị và kiểm duyệt thuộc dashboard web.

App dùng backend Express trong `back-end/`, dùng chung tài khoản và dữ liệu với web. Người dùng có thể tìm một địa điểm, xem thông tin và mở chỉ đường ngay từ bản đồ. Khi đăng nhập bằng tài khoản hiện có, họ có thể tiếp tục sử dụng các lịch trình đã lưu và các tính năng cộng đồng theo quyền của mình.

Xem [mục lục spec theo mô-đun](../README.md) để biết phần phụ thuộc và thứ tự triển khai. Spec mô-đun là tài liệu chi tiết cho từng luồng.

Mốc đối chiếu là hành vi trong mã nguồn web, gồm [HomeClient](../../../front-end/components/home/HomeClient.tsx), [các màn hình chính](../../../front-end/components/home), [đăng nhập và đăng ký](../../../front-end/components/auth/AuthForm.tsx) và [các client API](../../../front-end/lib/api). Khi gặp chênh lệch giữa README, giao diện và backend, dùng luồng web thực tế để xác định hành vi và kiểm tra lại hợp đồng trên môi trường nghiệm thu.

## Điều hướng và trải nghiệm

- Thanh điều hướng dưới có ba tab **Bản đồ**, **Lịch trình** và **Tài khoản**. Lịch trình cộng đồng mở từ tab **Lịch trình**. Thời tiết và mực nước mở từ bản đồ. Đề xuất địa điểm có thể bắt đầu từ bản đồ và xem lại trong Tài khoản.
- Bản đồ có tìm kiếm, bộ lọc, nút định vị và bảng gợi ý ở dưới. Khi chọn địa điểm, bảng gợi ý chuyển sang xem nhanh. **Xem thêm** mở trang chi tiết riêng. Khi quay lại, giữ vị trí bản đồ, bộ lọc, kết quả tìm kiếm và điểm đã chọn. Xem [quyết định UI/UX](../ui-ux/README.md).
- Mở bản đồ và dữ liệu công khai mà không yêu cầu đăng nhập. Khi khách thực hiện thao tác cần tài khoản, giải thích lý do và mở đăng nhập. Sau khi đăng nhập, quay lại ngữ cảnh trước đó và cho người dùng tiếp tục thao tác. Hủy đăng nhập giữ nguyên luồng khám phá.
- Chỉ xin vị trí khi người dùng chọn định vị, lấy tọa độ hiện tại hoặc check-in. Khi từ chối quyền, vẫn xem được bản đồ mặc định ở Huế, tìm kiếm và chọn điểm thủ công. Xin quyền ảnh hoặc camera khi thao tác tương ứng cần quyền.
- Hỗ trợ vùng an toàn, chữ tăng cỡ theo hệ thống, VoiceOver và TalkBack. Có danh sách địa điểm để chọn thay cho thao tác với marker. Kiểm tra thao tác quay lại trên Android và cử chỉ quay lại trên iOS.

## Tính năng và tiêu chí nghiệm thu

| Mô-đun | Hành vi cần có | Kiểm tra nghiệm thu |
|---|---|---|
| Bản đồ và địa điểm | Mở bản đồ Huế, tìm địa điểm, lọc danh mục, xem danh sách và marker, định vị, xem chi tiết và mở chỉ đường. Giữ các lớp, điều khiển bản đồ và trường chi tiết mà web cung cấp, gồm ảnh, địa chỉ, giá vé, giờ mở cửa, món ăn hoặc tiện ích khi có dữ liệu. | Mở app khi chưa đăng nhập và từ chối vị trí. Tìm một địa điểm có dấu và thử lại với từ khóa không dấu theo hành vi web. Kết quả danh sách và marker nhất quán. Chọn marker, xem dữ liệu tương ứng, mở chỉ đường đến đúng tọa độ rồi quay lại bản đồ. |
| Thời tiết và mực nước | Hiển thị thời tiết, lượng mưa và mực nước theo dữ liệu web, gồm trạm, thời gian đo, đơn vị, cảnh báo và trạng thái dữ liệu dự phòng nếu nguồn có cung cấp. | So sánh cùng trạm và thời điểm trên web và app. Khi thiếu dữ liệu hoặc mất mạng, hiển thị trạng thái phù hợp và cho thử lại. Dữ liệu cũ hiện thời điểm cập nhật. |
| Tài khoản | Đăng ký, đăng nhập, Google và Facebook theo luồng web, khôi phục phiên, cập nhật hồ sơ và ảnh đại diện, đăng xuất. Cung cấp Điều khoản, Quyền riêng tư và hướng dẫn xóa dữ liệu như web. | Dùng tài khoản hiện có, mở lại app và kiểm tra phiên. Thử đăng nhập OAuth thành công, hủy và callback lỗi trên hai nền tảng. Kiểm tra hết hạn phiên, cập nhật hồ sơ từ app rồi xem trên web và đăng xuất. |
| Lịch trình cá nhân | Tạo lịch trình bằng AI theo các tham số web hỗ trợ. Có luồng tự xếp lịch trình, xem ngày và điểm dừng, chi phí hoặc ngân sách theo web, lưu, xem lại, đổi quyền hiển thị và xóa. | Tạo một lịch trình AI và một lịch trình tự xếp, kiểm tra điểm dừng và chi phí, lưu rồi mở lại trên web bằng cùng tài khoản. Khi yêu cầu tạo thất bại, giữ dữ liệu nhập để thử lại. |
| Lịch trình cộng đồng | Duyệt và mở chi tiết lịch trình công khai. Hỗ trợ phản ứng, đánh dấu, sao chép về tài khoản, bình luận và xóa bình luận theo quyền hiện hành. | Khách xem được nội dung công khai theo quyền của web. Dùng hai tài khoản để kiểm tra công khai, riêng tư, sao chép và giới hạn xóa bình luận. Lịch trình sao chép chỉnh sửa độc lập với bản gốc. |
| Đánh giá và ảnh | Đọc đánh giá tại địa điểm. Người đăng nhập có thể chấm sao, viết đánh giá và đính kèm ảnh theo giới hạn backend. | Đăng đánh giá kèm ảnh, mở lại địa điểm và đối chiếu trên web. Khi tải ảnh thất bại, giữ nội dung đã nhập. Chạm nút gửi nhiều lần trong lúc đang xử lý chỉ tạo một yêu cầu từ giao diện. |
| Check-in và xếp hạng | Check-in theo quy tắc vị trí và tính điểm hiện có. Xem lịch sử hoặc trạng thái cá nhân và bảng xếp hạng theo web. | Kiểm tra vị trí hợp lệ, ngoài phạm vi và từ chối quyền. Trường hợp hợp lệ phản ánh đúng điểm và trạng thái do server trả. Trường hợp bị từ chối hiển thị lý do. |
| Đóng góp địa điểm | Chọn điểm trên bản đồ, lấy gợi ý địa chỉ khi có, nhập thông tin và ảnh, gửi đề xuất, xem danh sách đề xuất của mình và trạng thái duyệt. | Gửi một địa điểm từ app, kiểm tra ở dashboard web, đổi trạng thái bằng tài khoản quản trị và thấy trạng thái mới trên app. Địa điểm chờ duyệt tuân theo quyền hiển thị hiện có. |

Các thao tác đọc có trạng thái tải, rỗng, lỗi và thử lại. Các thao tác ghi có phản hồi đang gửi, thành công hoặc thất bại. Với lỗi mạng khi gửi, kiểm tra lại dữ liệu từ server trước khi đề nghị gửi lại thao tác có thể tạo bản ghi trùng.

## Tích hợp với hệ thống hiện có

| Luồng | Hợp đồng tham chiếu từ web |
|---|---|
| Địa điểm | `GET /api/places`, `POST /api/places`, `GET /api/places/my`, `/api/reverse-geocode`. Đối chiếu cách web lọc, tìm và lấy chi tiết trước khi chọn lọc cục bộ hay gọi API. |
| Thời tiết | `/api/weather/rainfall` và `/api/water-levels`. Đối chiếu thêm nguồn mà widget thời tiết dùng và cách phân biệt dữ liệu hiện tại với dự phòng. |
| Tài khoản | `/api/auth/register`, `/login`, `/me`, `/refresh`, `/profile`, `/logout` dưới cùng tiền tố `/api/auth`. Luồng OAuth web đi qua Supabase rồi gọi `/api/auth/oauth-login`. Kiểm tra callback mobile, quyền của từng nhà cung cấp và luồng xác thực thực tế trước khi chốt cấu hình phát hành. |
| Lịch trình | Web gọi `POST /api/itinerary` để tạo bằng AI và nhóm `/api/itineraries` cho `/my`, `/save`, `/community`, `/{id}`, `/{id}/visibility`, `/{id}/fork`, `/{id}/reaction`, `/{id}/bookmark` và `/{id}/comments`. |
| Ảnh, đánh giá, check-in | `/api/upload`, `/api/places/{placeId}/reviews`, `/api/checkins`, `/api/checkins/me` và `/api/leaderboard`. Dùng đúng trường multipart, mã lỗi, giới hạn ảnh và quy tắc điểm của backend. |

Các route tham chiếu lấy từ [Express](../../../back-end/src/app.ts). Đối chiếu hợp đồng trong các spec mô-đun với Express trên môi trường thử nghiệm trước khi nghiệm thu. Xem yêu cầu xác minh danh tính phía server trong [spec tài khoản](../features/SPEC-account.md) trước khi phát hành OAuth.

Đề xuất dùng `API_BASE_URL` theo môi trường, HTTPS cho bản phát hành và dữ liệu thử nghiệm riêng khi nghiệm thu. Giải mã cấu trúc phản hồi theo API hiện có. Lưu token trong vùng lưu trữ bảo mật, chỉ chạy một lần làm mới token tại một thời điểm và tránh ghi token hoặc vị trí chính xác vào log. Quyền truy cập, kiểm duyệt và tính điểm do server quyết định. Kiểm tra cấu hình style Goong và quyền dùng trên app trước khi chọn MapLibre làm trình hiển thị chính thức.

## Cấu trúc triển khai đề xuất

```text
mobile/
  lib/
    app/                # Điều hướng, theme, cấu hình
    core/               # HTTP, lưu trữ bảo mật, lỗi dùng chung
    features/           # Bản đồ, tài khoản, thời tiết, lịch trình, cộng đồng
  test/                 # Kiểm thử logic và widget
  integration_test/     # Kiểm thử luồng trên Android và iOS
  docs/product/SPEC.md
```

Dùng Dart theo lints của dự án, tên file `snake_case`, tên lớp `UpperCamelCase`. Ưu tiên các thư viện đã khai báo trong [pubspec](../../pubspec.yaml), như Dio, Riverpod và GoRouter. Đặt gọi API trong lớp dữ liệu của từng tính năng, ví dụ `final places = await placesRepository.search(query.trim());`. Widget chỉ hiển thị trạng thái và gửi thao tác của người dùng.

Thứ tự triển khai đề xuất là khung app và cấu hình → bản đồ, địa điểm và thời tiết công khai → tài khoản → lịch trình cá nhân → lịch trình cộng đồng, đánh giá, check-in và đóng góp. Các mốc này phục vụ tích hợp nội bộ. Bản 1.0 nghiệm thu tất cả các mô-đun.

## Kiểm thử và phát hành

Chạy từ `mobile/`. Thay giá trị ví dụ bằng ID thiết bị và URL môi trường thật.

```text
flutter pub get
flutter devices
flutter run -d DEVICE_ID --dart-define=API_BASE_URL=https://api.example.test
flutter analyze
flutter test
flutter test integration_test -d DEVICE_ID --dart-define=API_BASE_URL=https://api.example.test
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.example.test
flutter build ipa --release --dart-define=API_BASE_URL=https://api.example.test
```

Kiểm thử logic cho giải mã dữ liệu, phiên đăng nhập và quy tắc hiển thị. Kiểm thử widget cho trạng thái lỗi và quay lại từ chi tiết hoặc đăng nhập. Nghiệm thu toàn bộ bảng tính năng trên cả hai nền tảng với backend thử nghiệm. Dùng thiết bị thật để xác nhận vị trí, ảnh, OAuth, mở app chỉ đường và khôi phục phiên. Build và ký iOS cần môi trường macOS có cấu hình ký phù hợp.

Luôn giữ quyền truy cập và dữ liệu nhất quán giữa web và app. Xác nhận các thay đổi cần thiết với phần phụ trách backend khi hợp đồng API hoặc schema dùng chung thay đổi. Giữ khóa server và thông tin ký phát hành ngoài mã nguồn và bản cài.

## Quyết định cần chốt trước khi triển khai hoặc phát hành

- Xác nhận URL Express của môi trường nghiệm thu và cấu hình các dịch vụ thử nghiệm.
- Xác nhận phiên bản Android và iOS tối thiểu sau khi đối chiếu các plugin bản đồ, vị trí, ảnh và OAuth với thiết bị mục tiêu.
- Xác nhận kênh phát hành đầu tiên để chốt định danh app, cấu hình ký, callback và các yêu cầu của kênh phân phối. Bản đặc tả hiện giả định tiếng Việt và kết nối mạng là mặc định, với trạng thái lỗi rõ ràng khi mất mạng. Bản đồ offline và thông báo đẩy chưa nằm trong phạm vi đã xác nhận.
