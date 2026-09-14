import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import AuthGuard from "@/components/auth/AuthGuard";
import GlobalHorizontalScroll from "@/components/ui/GlobalHorizontalScroll";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HueDiMo — Di sản văn hóa với hội nhập và phát triển",
  description: "HueDiMo: Di sản văn hóa với hội nhập và phát triển. Bản đồ du lịch cố đô Huế, điểm đến, ẩm thực và hành trình khám phá.",
  icons: {
    icon: [
      { url: "/logo.jpg" },
      { url: "https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/473616240_1779979822801506_5513169442076253620_n.jpg" },
    ],
    shortcut: "/logo.jpg",
    apple: [
      { url: "/logo.jpg" },
      { url: "https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/473616240_1779979822801506_5513169442076253620_n.jpg" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full overflow-hidden overscroll-none antialiased`}
    >
      <head>
        <link rel="icon" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </head>
      <body className="fixed inset-0 h-full w-full overflow-hidden overscroll-none flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <AuthGuard>
              <GlobalHorizontalScroll />
              {children}
            </AuthGuard>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
