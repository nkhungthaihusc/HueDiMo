# mobile

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Đặc tả

- [Mục lục spec và thứ tự triển khai](docs/README.md)
- [Spec tổng thể HueDiMo Mobile 1.0](docs/product/SPEC.md)

## Chạy mốc bản đồ

Từ thư mục `mobile/`, chạy `flutter pub get` và `flutter run -d DEVICE_ID`.
App mặc định tải địa điểm từ `https://huedimobe.hungthaisoft.id.vn/api/places`.
Đổi máy chủ bằng `--dart-define=API_BASE_URL=https://api.example.com`.
Đổi nhà cung cấp bản đồ bằng `MAP_TILE_URL`, `MAP_ATTRIBUTION` và
`MAP_ATTRIBUTION_URL` qua `--dart-define`. Mốc phát triển dùng OpenStreetMap.
