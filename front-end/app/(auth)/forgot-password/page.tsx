import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Quên mật khẩu — HueDiMo" };

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <AuthForm mode="reset" />
    </div>
  );
}
