const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to 'sendgrid', 'smtp', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendResetEmail = async (toEmail, resetLink) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASS is not configured in the backend .env file.');
  }

  const mailOptions = {
    from: `"Food Lover Restaurant" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your password for Food Lover',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #d4a574; text-align: center;">Food Lover Restaurant</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to choose a new one:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #d4a574; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #666;">If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} Food Lover Restaurant. All rights reserved.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('📧 Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendResetEmail,
  sendOtpEmail
};

/**
 * Send a 6-digit OTP to the user for password recovery.
 * @param {string} toEmail
 * @param {string} otp  — plain-text OTP (never stored server-side)
 */
async function sendOtpEmail(toEmail, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASS is not configured in the backend .env file.');
  }

  const mailOptions = {
    from: `"Food Lover Restaurant" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Password Reset Code — Food Lover',
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
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 OTP email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('📧 Error sending OTP email:', error);
    throw error;
  }
}
