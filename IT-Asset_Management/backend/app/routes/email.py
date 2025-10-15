from fastapi import APIRouter, HTTPException
from ..models import EmailSend
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

router = APIRouter()

async def send_email_smtp(to: str, subject: str, html_content: str):
    """Send email using SMTP"""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    from_email = os.getenv("SENDGRID_FROM_EMAIL", smtp_user)
    
    if not smtp_user or not smtp_pass:
        raise Exception("SMTP credentials not configured")
    
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"IT Asset Management <{from_email}>"
    message["To"] = to
    
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)
    
    try:
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            start_tls=True,
        )
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        raise Exception(f"Failed to send email: {str(e)}")

async def send_reset_email(email: str, reset_token: str):
    """Send password reset email"""
    api_base_url = os.getenv("API_BASE_URL", "https://it-asset-management-804186663775.europe-west1.run.app")
    reset_link = f"{api_base_url}/reset-password?token={reset_token}&email={email}"
    
    subject = "Password Reset Request - IT Asset Management"
    html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2C4B84;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You have requested to reset your password for the IT Asset Management system.</p>
            <p>Please click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background-color: #296bd5; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold;
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666;">{reset_link}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
                This is an automated message from IT Asset Management System.
            </p>
        </div>
    """
    
    await send_email_smtp(email, subject, html_content)

@router.post("/send-email")
async def send_custom_email(email_data: EmailSend):
    """Send custom email"""
    try:
        html_content = f'<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">{email_data.message}</pre>'
        await send_email_smtp(email_data.to, email_data.subject, html_content)
        return {"message": "Email sent successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.get("/test-email")
async def test_email():
    """Test email configuration"""
    try:
        test_recipient = os.getenv("SMTP_USER")
        await send_email_smtp(
            test_recipient,
            "SMTP Test Email",
            "<p>If you receive this email, your SMTP configuration is working correctly!</p>"
        )
        return {"success": True, "message": "Test email sent successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test email failed: {str(e)}")