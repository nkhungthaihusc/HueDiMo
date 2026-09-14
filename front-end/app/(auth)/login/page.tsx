import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Đăng nhập — HueDiMo" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <AuthForm mode="login" />
    </div>
  );
}
