const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourupdatesagent.com';
    this.fromName = process.env.FROM_NAME || 'Your Updates Agent';
  }

  async initialize() {
    try {
      // Configure transporter based on environment
      if (process.env.NODE_ENV === 'production') {
        // Production email configuration (e.g., SendGrid, AWS SES, etc.)
        this.transporter = nodemailer.createTransporter({
          service: process.env.EMAIL_SERVICE || 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      } else {
        // Development/testing configuration (use Ethereal Email)
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      }

      // Verify transporter
      await this.transporter.verify();
      this.initialized = true;
      
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      // Continue without email service
      this.initialized = false;
    }
  }

  async sendNewsletter(userEmail, userName, newsletter, streamTitle) {
    try {
      if (!this.initialized) {
        logger.warn('Email service not initialized, skipping newsletter email');
        return false;
      }

      const subject = `📰 New ${newsletter.is_automated ? 'Automated' : 'Manual'} Newsletter: ${streamTitle}`;
      
      const htmlContent = this.generateNewsletterHTML(newsletter, streamTitle, userName);
      const textContent = this.generateNewsletterText(newsletter, streamTitle, userName);

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: userEmail,
        subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Newsletter email preview:', nodemailer.getTestMessageUrl(result));
      }
      
      logger.info(`Newsletter email sent to ${userEmail}`);
      return true;
    } catch (error) {
      logger.error('Error sending newsletter email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    try {
      if (!this.initialized) {
        logger.warn('Email service not initialized, skipping welcome email');
        return false;
      }

      const subject = '🎉 Welcome to Your Updates Agent!';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Your Updates Agent!</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'there'}!</h2>
              <p>Thank you for joining Your Updates Agent. You're now ready to stay informed on any topic through our intelligent automated research and scheduled newsletters.</p>
              
              <h3>What you can do:</h3>
              <ul>
                <li>Ask me to research any topic you're interested in</li>
                <li>Set up automated updates (daily, weekly, bi-weekly, or monthly)</li>
                <li>Receive personalized newsletters with the latest developments</li>
                <li>Ask follow-up questions about your newsletters</li>
                <li>Modify your update schedules anytime</li>
              </ul>
              
              <p>To get started, simply tell me what you'd like to research and how often you'd like updates!</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Start Your First Research Stream</a>
              
              <p>If you have any questions, just reply to this email.</p>
              
              <p>Happy researching!<br>
              The Your Updates Agent Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Welcome to Your Updates Agent!

        Hello ${userName || 'there'}!

        Thank you for joining Your Updates Agent. You're now ready to stay informed on any topic through our intelligent automated research and scheduled newsletters.

        What you can do:
        - Ask me to research any topic you're interested in
        - Set up automated updates (daily, weekly, bi-weekly, or monthly)
        - Receive personalized newsletters with the latest developments
        - Ask follow-up questions about your newsletters
        - Modify your update schedules anytime

        To get started, simply tell me what you'd like to research and how often you'd like updates!

        Visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

        If you have any questions, just reply to this email.

        Happy researching!
        The Your Updates Agent Team
      `;

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: userEmail,
        subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Welcome email preview:', nodemailer.getTestMessageUrl(result));
      }
      
      logger.info(`Welcome email sent to ${userEmail}`);
      return true;
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    try {
      if (!this.initialized) {
        logger.warn('Email service not initialized, skipping password reset email');
        return false;
      }

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      const subject = '🔐 Password Reset Request';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .warning { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'there'}!</h2>
              <p>We received a request to reset your password for Your Updates Agent.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
              </div>
              
              <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              
              <p>If the button doesn't work, copy and paste this link into your browser:<br>
              ${resetUrl}</p>
              
              <p>Best regards,<br>
              The Your Updates Agent Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Password Reset Request

        Hello ${userName || 'there'}!

        We received a request to reset your password for Your Updates Agent.

        Click this link to reset your password:
        ${resetUrl}

        Important: This link will expire in 1 hour for security reasons.

        If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

        Best regards,
        The Your Updates Agent Team
      `;

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: userEmail,
        subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Password reset email preview:', nodemailer.getTestMessageUrl(result));
      }
      
      logger.info(`Password reset email sent to ${userEmail}`);
      return true;
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      return false;
    }
  }

  generateNewsletterHTML(newsletter, streamTitle, userName) {
    const content = newsletter.content
      .replace(/^# /gm, '<h1>')
      .replace(/^## /gm, '<h2>')
      .replace(/^### /gm, '<h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Georgia, serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; }
          .header { background: #1F2937; color: white; padding: 30px; text-align: center; }
          .content { padding: 40px; }
          .footer { background: #F3F4F6; padding: 20px; text-align: center; color: #6B7280; }
          h1 { color: #1F2937; }
          h2 { color: #374151; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; }
          h3 { color: #4B5563; }
          .meta { background: #F9FAFB; padding: 15px; border-left: 4px solid #3B82F6; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📰 ${newsletter.title}</h1>
            <p>Your automated research newsletter</p>
          </div>
          <div class="content">
            <div class="meta">
              <strong>Hello ${userName || 'there'}!</strong><br>
              Generated on ${new Date(newsletter.generated_at).toDateString()}<br>
              Research confidence: ${Math.round((newsletter.confidence || 0.8) * 100)}%
            </div>
            
            ${content}
          </div>
          <div class="footer">
            <p>This newsletter was automatically generated by Your Updates Agent.</p>
            <p>You can modify your update schedule or ask follow-up questions anytime in the app.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateNewsletterText(newsletter, streamTitle, userName) {
    // Convert markdown to plain text
    const content = newsletter.content
      .replace(/^#{1,3} /gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\- /gm, '• ');

    return `
${newsletter.title}
Your automated research newsletter

Hello ${userName || 'there'}!

Generated on ${new Date(newsletter.generated_at).toDateString()}
Research confidence: ${Math.round((newsletter.confidence || 0.8) * 100)}%

${content}

---

This newsletter was automatically generated by Your Updates Agent.
You can modify your update schedule or ask follow-up questions anytime in the app.
    `.trim();
  }

  isInitialized() {
    return this.initialized;
  }
}

module.exports = EmailService; 