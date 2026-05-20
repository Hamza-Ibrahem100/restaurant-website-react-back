/**
 * emailService.js
 * 
 * Email service using Resend API - WORKS ON VERCEL!
 * (No SMTP blocking issues)
 */

const { Resend } = require('resend');

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

/**
 * Send OTP email using Resend API
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit OTP code
 */
async function sendOtpEmail(toEmail, otp) {
  try {
    console.log('📧 Sending OTP email to:', toEmail);
    
    const data = await resend.emails.send({
      from: 'Food Lover <onboarding@resend.dev>',
      to: [toEmail],
      subject: 'Your Food Lover Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background:#1a1a1a; color:#fff;">
          <h2 style="color: #d4a574; text-align: center; margin-bottom: 4px;">Food Lover Restaurant</h2>
          <p style="text-align:center; color:#aaa; margin-top:0; font-size:14px;">Password Reset</p>
          <hr style="border:0; border-top:1px solid #333; margin:20px 0;" />
          <p style="color:#ddd;">Hello,</p>
          <p style="color:#ddd;">Use the code below to reset your password. This code expires in <strong style="color:#d4a574;">5 minutes</strong>.</p>
          <div style="text-align:center; margin: 32px 0;">
            <span style="
              display: inline-block;
              font-size: 42px;
              font-weight: bold;
              letter-spacing: 12px;
              color: #d4a574;
              background: #2a2a2a;
              padding: 16px 32px;
              border-radius: 8px;
              border: 2px solid #d4a574;
            ">${otp}</span>
          </div>
          <p style="font-size:13px; color:#888; text-align:center;">Never share this code with anyone.<br/>If you did not request a reset, you can safely ignore this email.</p>
          <hr style="border:0; border-top:1px solid #333; margin:20px 0;" />
          <p style="font-size:12px; color:#555; text-align:center;">© ${new Date().getFullYear()} Food Lover Restaurant. All rights reserved.</p>
        </div>
      `
    });
    
    console.log('✅ OTP email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Resend API error:', error);
    throw error;
  }
}

/**
 * Send password reset confirmation email
 */
async function sendResetConfirmationEmail(toEmail) {
  try {
    await resend.emails.send({
      from: 'Food Lover <onboarding@resend.dev>',
      to: [toEmail],
      subject: 'Password Reset Successfully - Food Lover',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #d4a574;">Password Reset Successful</h2>
          <p>Your password for Food Lover has been successfully reset.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        </div>
      `
    });
    console.log('✅ Confirmation email sent');
  } catch (error) {
    console.error('❌ Confirmation email error:', error);
  }
}

module.exports = {
  sendOtpEmail,
  sendResetConfirmationEmail
};