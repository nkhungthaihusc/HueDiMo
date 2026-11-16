// Based on the Spring OTP email in OtpService.java. Inline styles support email clients.
export function buildOtpEmailHtml(otp: string, purpose: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mã xác thực OTP - HueDiMo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f5f3ff" style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #fdf4ff 100%); padding: 40px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 45px -15px rgba(109, 40, 217, 0.18); border: 1px solid #e9d5ff;">

                    <tr>
                        <td align="center" bgcolor="#6d28d9" style="background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%); padding: 42px 28px 36px 28px;">
                            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 50px; padding: 6px 18px; margin-bottom: 16px;">
                                <span style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">✨ HUEDIMO TRAVEL</span>
                            </div>
                            <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.3;">Xác thực tài khoản</h1>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #e9d5ff; font-weight: 400;">Đồng hành cùng bạn khám phá di sản Cố đô Huế</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 28px 16px 24px;">
                            <p style="margin: 0 0 14px 0; font-size: 16px; color: #1e1b4b; font-weight: 600;">Xin chào bạn,</p>
                            <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                                Cảm ơn bạn đã lựa chọn <strong>HueDiMo</strong>! Dùng mã dưới đây để xác nhận yêu cầu ${purpose}.
                            </p>

                            <div style="background: linear-gradient(145deg, #faf5ff 0%, #f3e8ff 100%); background-color: #f5f3ff; border: 2px dashed #c084fc; border-radius: 18px; padding: 20px 6px; margin: 24px 0; text-align: center;">
                                <div style="font-size: 12px; font-weight: 700; color: #7c3aed; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px;">
                                    MÃ XÁC THỰC CỦA BẠN (OTP)
                                </div>
                                <div style="display: inline-block; padding: 8px 12px 8px 18px; background-color: #ffffff; border: 2px solid #a855f7; border-radius: 12px; font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #581c87; white-space: nowrap; user-select: all;"><span dir="ltr">${otp}</span></div>
                                <div style="margin-top: 18px;">
                                    <span style="display: inline-block; background-color: #fee2e2; border: 1px solid #fecaca; color: #dc2626; font-size: 13px; font-weight: 600; padding: 6px 18px; border-radius: 50px;">
                                        ⏱️ Mã có hiệu lực trong <strong>5 phút</strong>
                                    </span>
                                </div>
                            </div>

                            <div style="background-color: #f8fafc; border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 16px 18px; margin-top: 24px;">
                                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
                                    🛡️ Lưu ý bảo mật
                                </div>
                                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #64748b; line-height: 1.6;">
                                    <li>Tuyệt đối <strong>không cung cấp mã OTP này</strong> cho bất kỳ ai, kể cả người tự xưng là nhân viên HueDiMo.</li>
                                    <li>Mã này chỉ được sử dụng một lần và sẽ tự động hết hiệu lực sau thời gian quy định.</li>
                                    <li>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email để đảm bảo an toàn.</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" bgcolor="#faf5ff" style="background-color: #faf5ff; border-top: 1px solid #f3e8ff; padding: 26px 20px; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #4c1d95;">
                                HueDiMo - Nền tảng Du lịch & Di sản Cố Đô Huế
                            </p>
                            <p style="margin: 0 0 14px 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                                Khám phá di tích lịch sử, văn hóa và ẩm thực Huế với lộ trình gợi ý thông minh.
                            </p>
                            <div style="height: 1px; background-color: #e2e8f0; width: 60px; margin: 12px auto;"></div>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                                Email này được gửi tự động từ hệ thống HueDiMo.<br/>
                                © 2026 HueDiMo. Mọi quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}
