package com.huedimo.modules.auth.otp;

import java.io.UnsupportedEncodingException;
import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {
    private final OtpRepository otpRepository;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${spring.mail.username}")
    private String fromEmail;

    /**
     * Tạo mã OTP 6 số, lưu vào DB và gửi qua Email
     */
    @Transactional
    public void generateAndSendOtp(String email) {
        String normalizedEmail = email.toLowerCase().trim();

        // Sinh mã OTP 6 số ngẫu nhiên (ví dụ: 123456)
        int randomCode = secureRandom.nextInt(1_000_000);
        String otpCode = String.format("%06d", randomCode);

        // Hết hạn sau 5 phút
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(5);

        Otp otp = Otp.builder()
                .email(normalizedEmail)
                .otpCode(otpCode)
                .expiryTime(expiryTime)
                .used(false)
                .build();
        otpRepository.save(otp);

        sendOtpEmail(normalizedEmail, otpCode);
    }

    /**
     * Xác thực mã OTP bước 2 (verify-otp): Kiểm tra tính chính xác và đánh dấu verified = true
     */
    @Transactional
    public void verifyOtp(String email, String otpCode) {
        String normalizedEmail = email.toLowerCase().trim();

        Otp otp = otpRepository.findTopByEmailOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã OTP nào cho email này!"));

        if (Boolean.TRUE.equals(otp.getUsed())) {
            throw new RuntimeException("Mã OTP này đã được sử dụng!");
        }

        if (LocalDateTime.now().isAfter(otp.getExpiryTime())) {
            throw new RuntimeException("Mã OTP đã hết hạn! Vui lòng yêu cầu mã mới.");
        }

        if (!otp.getOtpCode().equals(otpCode.trim())) {
            throw new RuntimeException("Mã OTP không chính xác!");
        }

        // Đánh dấu mã OTP đã được kiểm tra thành công
        otp.setVerified(true);
        otpRepository.save(otp);
    }

    /**
     * Kiểm tra trạng thái đã verify khi người dùng nhấn Đăng ký (bước 3), sau đó đánh dấu used = true
     */
    @Transactional
    public void consumeVerifiedOtpForRegistration(String email) {
        String normalizedEmail = email.toLowerCase().trim();

        Otp otp = otpRepository.findTopByEmailOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("Email chưa được xác thực mã OTP!"));

        if (Boolean.TRUE.equals(otp.getUsed())) {
            throw new RuntimeException("Mã OTP cho email này đã được sử dụng!");
        }

        if (!Boolean.TRUE.equals(otp.getVerified())) {
            throw new RuntimeException("Email chưa được xác thực OTP! Vui lòng xác thực trước khi đăng ký.");
        }

        // Cho phép tối đa 15 phút sau khi gửi OTP để hoàn tất đăng ký
        if (LocalDateTime.now().isAfter(otp.getCreatedAt().plusMinutes(15))) {
            throw new RuntimeException("Phiên xác thực đã hết hạn! Vui lòng gửi lại OTP.");
        }

        // Đánh dấu đã dùng
        otp.setUsed(true);
        otpRepository.save(otp);
    }

    /**
     * Hỗ trợ xác thực và dùng trực tiếp (nếu form gửi cả OTP lúc đăng ký)
     */
    @Transactional
    public void validateOtp(String email, String otpCode) {
        String normalizedEmail = email.toLowerCase().trim();

        Otp otp = otpRepository.findTopByEmailOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã OTP nào cho email này!"));

        if (Boolean.TRUE.equals(otp.getUsed())) {
            throw new RuntimeException("Mã OTP này đã được sử dụng!");
        }

        if (LocalDateTime.now().isAfter(otp.getExpiryTime())) {
            throw new RuntimeException("Mã OTP đã hết hạn! Vui lòng yêu cầu mã mới.");
        }

        if (!otp.getOtpCode().equals(otpCode.trim())) {
            throw new RuntimeException("Mã OTP không chính xác!");
        }

        // Đánh dấu mã OTP đã được dùng thành công
        otp.setVerified(true);
        otp.setUsed(true);
        otpRepository.save(otp);
    }

    /**
     * Gửi mail chứa OTP giao diện sang trọng, chuyên nghiệp và tương thích mọi ứng dụng email
     */
    private void sendOtpEmail(String toEmail, String otpCode) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "HueDiMo - Du Lịch & Di Sản Huế");
            helper.setTo(toEmail);
            helper.setSubject("🔐 [" + otpCode + "] Mã xác thực tài khoản HueDiMo (Hiệu lực 5 phút)");

            String content = buildOtpEmailHtml(otpCode);

            helper.setText(content, true);
            mailSender.send(message);
            log.info("Đã gửi OTP thành công tới: {}", toEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Lỗi khi gửi email tới {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Không thể gửi email OTP, vui lòng kiểm tra lại cấu hình email!");
        }
    }

    /**
     * Tạo mẫu HTML Email OTP với thiết kế hiện đại, gradient tím đặc trưng Cố Đô Huế,
     * định dạng table chuẩn email client chống vỡ khung trên Gmail / Outlook / Apple Mail / Mobile.
     */
    private String buildOtpEmailHtml(String otpCode) {
        StringBuilder digitCells = new StringBuilder();
        for (char ch : otpCode.toCharArray()) {
            digitCells.append("""
                <td style="padding: 0 4px;" align="center">
                    <div style="width: 44px; height: 54px; line-height: 54px; text-align: center; background-color: #ffffff; border: 2px solid #a855f7; border-radius: 12px; font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 32px; font-weight: 800; color: #581c87; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);">
                        %c
                    </div>
                </td>
            """.formatted(ch));
        }

        String template = """
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Mã xác thực OTP - HueDiMo</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f3ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
                <!-- OUTER WRAPPER WITH GRADIENT BACKGROUND -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f5f3ff" style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #fdf4ff 100%); padding: 40px 12px;">
                    <tr>
                        <td align="center">
                            <!-- MAIN CARD CONTAINER -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 45px -15px rgba(109, 40, 217, 0.18); border: 1px solid #e9d5ff;">

                                <!-- HERO BANNER WITH BRAND GRADIENT -->
                                <tr>
                                    <td align="center" bgcolor="#6d28d9" style="background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%); padding: 42px 28px 36px 28px;">
                                        <!-- BRAND PILL BADGE -->
                                        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 50px; padding: 6px 18px; margin-bottom: 16px;">
                                            <span style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">✨ HUEDIMO TRAVEL</span>
                                        </div>
                                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.3;">Xác Thực Tài Khoản</h1>
                                        <p style="margin: 8px 0 0 0; font-size: 14px; color: #e9d5ff; font-weight: 400;">Đồng hành cùng bạn khám phá di sản Cố đô Huế</p>
                                    </td>
                                </tr>

                                <!-- CARD BODY -->
                                <tr>
                                    <td style="padding: 36px 32px 28px 32px;">
                                        <p style="margin: 0 0 14px 0; font-size: 16px; color: #1e1b4b; font-weight: 600;">Xin chào bạn,</p>
                                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                                            Cảm ơn bạn đã lựa chọn <strong>HueDiMo</strong>! Bạn đang thực hiện bước xác thực tài khoản trên ứng dụng. Vui lòng sử dụng mã bảo mật (OTP) dưới đây để hoàn tất quá trình:
                                        </p>

                                        <!-- OTP DIGITS CONTAINER -->
                                        <div style="background: linear-gradient(145deg, #faf5ff 0%, #f3e8ff 100%); background-color: #f5f3ff; border: 2px dashed #c084fc; border-radius: 18px; padding: 26px 16px; margin: 24px 0; text-align: center;">
                                            <div style="font-size: 12px; font-weight: 700; color: #7c3aed; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px;">
                                                MÃ XÁC THỰC CỦA BẠN (OTP)
                                            </div>
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                                                <tr>
                                                    {{DIGIT_CELLS}}
                                                </tr>
                                            </table>
                                            <div style="margin-top: 18px;">
                                                <span style="display: inline-block; background-color: #fee2e2; border: 1px solid #fecaca; color: #dc2626; font-size: 13px; font-weight: 600; padding: 6px 18px; border-radius: 50px;">
                                                    ⏱️ Mã có hiệu lực trong <strong>5 phút</strong>
                                                </span>
                                            </div>
                                        </div>

                                        <!-- SECURITY ADVISORY -->
                                        <div style="background-color: #f8fafc; border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 16px 18px; margin-top: 24px;">
                                            <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
                                                🛡️ Lưu ý an toàn bảo mật:
                                            </div>
                                            <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #64748b; line-height: 1.6;">
                                                <li>Tuyệt đối <strong>không cung cấp mã OTP này</strong> cho bất kỳ ai, kể cả người tự xưng là nhân viên HueDiMo.</li>
                                                <li>Mã này chỉ được sử dụng một lần và sẽ tự động hết hiệu lực sau thời gian quy định.</li>
                                                <li>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email để đảm bảo an toàn.</li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>

                                <!-- CARD FOOTER -->
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
        """;

        return template.replace("{{DIGIT_CELLS}}", digitCells.toString());
    }
}
