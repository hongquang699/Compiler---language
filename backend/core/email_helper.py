import os
import random
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Cấu hình SMTP Gmail mặc định (LOCAL CP Studio)
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "pvananh2805@gmail.com")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "zhzz anmq scmb oazq")

def generate_otp() -> str:
    """Sinh mã OTP 6 chữ số ngẫu nhiên"""
    return f"{random.randint(100000, 999999)}"

def send_otp_email(to_email: str, otp_code: str, subject: str = "LOCAL CP — Mã xác thực Email đăng ký") -> bool:
    """
    Gửi email OTP xác minh chuẩn giao diện LOCAL CP Studio đến người dùng.
    Trả về True nếu gửi thành công, False nếu thất bại.
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[EmailHelper] Lỗi: Chưa cấu hình SMTP_EMAIL hoặc SMTP_PASSWORD")
        return False

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .email-container {{
                font-family: 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif;
                background-color: #050e1b;
                color: #e2e8f0;
                padding: 40px 20px;
                border-radius: 16px;
                max-width: 550px;
                margin: 0 auto;
                border: 1px solid #1e293b;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }}
            .logo {{
                font-size: 24px;
                font-weight: 800;
                color: #22d3ee;
                text-align: center;
                margin-bottom: 25px;
                letter-spacing: 0.05em;
                font-family: 'JetBrains Mono', monospace, sans-serif;
            }}
            .logo span {{
                color: #8b5cf6;
            }}
            .content {{
                background: linear-gradient(145deg, #091b2f, #071324);
                padding: 32px 28px;
                border-radius: 12px;
                border: 1px solid rgba(34, 211, 238, 0.15);
                line-height: 1.6;
            }}
            .otp-box {{
                font-family: 'JetBrains Mono', monospace, sans-serif;
                font-size: 36px;
                font-weight: 800;
                color: #22d3ee;
                text-align: center;
                padding: 18px;
                background-color: #020812;
                border-radius: 10px;
                margin: 25px 0;
                letter-spacing: 0.25em;
                border: 1px dashed rgba(34, 211, 238, 0.4);
                box-shadow: inset 0 0 15px rgba(34, 211, 238, 0.1);
            }}
            .badge {{
                display: inline-block;
                padding: 4px 10px;
                background: rgba(34, 211, 238, 0.15);
                color: #22d3ee;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 12px;
            }}
            .footer {{
                font-size: 12px;
                color: #64748b;
                text-align: center;
                margin-top: 28px;
                line-height: 1.5;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="logo">⚡ LOCAL CP <span>STUDIO</span></div>
            <div class="content">
                <div class="badge">EMAIL VERIFICATION</div>
                <h3 style="margin-top:0; color:#f8fafc; font-size: 20px;">Xác minh mã OTP của bạn</h3>
                <p>Xin chào,</p>
                <p>Bạn nhận được email này vì đã đăng ký tài khoản trên hệ thống <strong>LOCAL CP Studio</strong>.</p>
                <p>Vui lòng sử dụng mã xác minh OTP bên dưới để hoàn tất đăng ký. Mã này có hiệu lực trong vòng <strong>10 phút</strong>:</p>
                <div class="otp-box">{otp_code}</div>
                <p style="color:#94a3b8; font-size:13px;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Không chia sẻ mã OTP này với bất kỳ ai để bảo mật tài khoản.</p>
            </div>
            <div class="footer">
                © 2026 LOCAL CP Studio. All rights reserved.<br>
                Hệ thống luyện tập & thi đấu thuật toán trực tuyến.
            </div>
        </div>
    </body>
    </html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"LOCAL CP Studio <{SMTP_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        server.quit()
        print(f"[EmailHelper] Đã gửi email OTP thành công tới {to_email}")
        return True
    except Exception as e:
        print(f"[EmailHelper] Lỗi khi gửi email: {e}")
        return False
