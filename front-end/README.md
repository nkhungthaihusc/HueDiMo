This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Kiểm thử E2E với Playwright

Chạy trong thư mục `front-end`.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e
pnpm exec playwright show-report
```

Playwright tự chạy Next.js tại `127.0.0.1:3100`. Bộ test chạy trên Chromium desktop và cấu hình mobile Pixel 7. Để chạy riêng mobile, dùng `pnpm test:e2e --project=mobile`. Khi có lỗi, ảnh chụp và trace nằm trong `test-results/`.

Bộ test bao phủ các route Next.js hiện có, với kịch bản cho tìm kiếm địa điểm, xác thực, lịch trình AI, chính sách và điều hướng quản trị. API được giả lập ở tầng mạng để chạy bằng tài khoản thử nghiệm và tránh ghi vào cơ sở dữ liệu. Bộ này chưa xác minh tích hợp với backend thật, đăng nhập thành công qua Google/Facebook hay dữ liệu bản đồ Goong thật.

Để chạy riêng hai kịch bản bố cục của trang bản đồ, dùng `pnpm test:e2e -g "màn hình hẹp|hướng dẫn đặt ghim"`. Kịch bản mobile kiểm tra vùng cuộn và nút quay lại của bảng thời tiết ở 360×640. Kịch bản desktop kiểm tra thanh hướng dẫn đặt ghim ở 1920×900 sau khi đăng nhập.

Khi mở rộng độ phủ, dùng danh sách luồng theo vai trò và trạng thái dữ liệu. Ưu tiên gửi đóng góp rồi duyệt, gửi đánh giá rồi kiểm duyệt, check-in, và lưu rồi chia sẻ lịch trình. Kiểm tra các thao tác ghi trên staging với tài khoản và dữ liệu thử nghiệm. Dùng thiết bị thật để xác minh các thao tác phụ thuộc GPS, bàn phím và trình duyệt mobile.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
