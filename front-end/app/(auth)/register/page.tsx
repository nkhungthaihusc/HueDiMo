import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Đăng ký — HueDiMo" };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <AuthForm mode="register" />
    </div>
  );
}
