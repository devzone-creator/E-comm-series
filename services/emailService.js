import nodemailer from 'nodemailer';

class EmailService {
  static async createTransport() {
    // For testing, we'll use an Ethereal account.
    // In production, you should use a real email provider like SendGrid, Mailgun, etc.
    const testAccount = await nodemailer.createTestAccount();

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }

  static async sendVerificationEmail(userEmail, token) {
    try {
      const transporter = await this.createTransport();

      const verificationLink = `http://localhost:${process.env.PORT || 9099}/verify-email?token=${token}`;

      const mailOptions = {
        from: '"AfriGlam" <noreply@afriglam.com>',
        to: userEmail,
        subject: 'Verify Your Email Address',
        html: `
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}">${verificationLink}</a>
        `,
      };

      const info = await transporter.sendMail(mailOptions);

      console.log('✅ Verification email sent: %s', info.messageId);
      console.log('📧 Preview URL: %s', nodemailer.getTestMessageUrl(info));
      
      return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
    } catch (error) {
      console.error('❌ Failed to send verification email:', error.message);
      // Don't throw error - registration should still succeed even if email fails
      return { success: false, error: error.message };
    }
  }

  static async sendPasswordResetEmail(userEmail, token) {
    try {
      const transporter = await this.createTransport();

      const resetLink = `http://localhost:${process.env.PORT || 9099}/reset-password?token=${token}`;

      const mailOptions = {
        from: '"AfriGlam" <noreply@afriglam.com>',
        to: userEmail,
        subject: 'Reset Your Password',
        html: `
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      };

      const info = await transporter.sendMail(mailOptions);

      console.log('✅ Password reset email sent: %s', info.messageId);
      console.log('📧 Preview URL: %s', nodemailer.getTestMessageUrl(info));
      
      return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default EmailService;
