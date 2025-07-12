const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isEnabled = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      // Check if email credentials are provided
      if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
        console.log('📧 Email service disabled: No credentials provided');
        console.log('💡 To enable email service, set EMAIL_USERNAME and EMAIL_PASSWORD in .env');
        this.isEnabled = false;
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        },
        // Additional SMTP settings for better reliability
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 20000,
        rateLimit: 5
      });

      // Verify transporter configuration only if credentials are provided
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('📧 Email transporter verification failed:', error);
          console.log('💡 Please check your email credentials in .env file');
          this.isEnabled = false;
        } else {
          console.log('✅ Email service is ready to send messages');
          this.isEnabled = true;
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise} Promise resolving to email info
   */
  async sendEmail(options) {
    // Check if email service is enabled
    if (!this.isEnabled || !this.transporter) {
      console.log('📧 Email service disabled - email not sent');
      return { message: 'Email service disabled' };
    }

    const {
      to,
      subject,
      text,
      html,
      from = process.env.EMAIL_USERNAME
    } = options;

    const mailOptions = {
      from,
      to,
      subject,
      text,
      html
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   * @param {string} to - Recipient email
   * @param {string} username - User's username
   * @param {string} verificationToken - Email verification token
   * @returns {Promise} Promise resolving to email info
   */
  async sendWelcomeEmail(to, username, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const subject = 'Welcome to StackIt - Verify Your Email';
    const text = `
      Welcome to StackIt, ${username}!
      
      Thank you for joining our Q&A community. To complete your registration, please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create this account, please ignore this email.
      
      Best regards,
      The StackIt Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to StackIt!</h2>
        
        <p>Hi ${username},</p>
        
        <p>Thank you for joining our Q&A community. To complete your registration, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        
        <p style="color: #666; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          Best regards,<br>
          The StackIt Team
        </p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} username - User's username
   * @param {string} resetToken - Password reset token
   * @returns {Promise} Promise resolving to email info
   */
  async sendPasswordResetEmail(to, username, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const subject = 'StackIt - Password Reset Request';
    const text = `
      Hi ${username},
      
      You requested a password reset for your StackIt account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this reset, please ignore this email and your password will remain unchanged.
      
      Best regards,
      The StackIt Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Password Reset Request</h2>
        
        <p>Hi ${username},</p>
        
        <p>You requested a password reset for your StackIt account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        
        <p style="color: #666; font-size: 14px;">If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          Best regards,<br>
          The StackIt Team
        </p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send notification email
   * @param {string} to - Recipient email
   * @param {string} username - User's username
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @returns {Promise} Promise resolving to email info
   */
  async sendNotificationEmail(to, username, type, data) {
    let subject, text, html;

    switch (type) {
      case 'new_answer':
        subject = `New answer on your question - ${data.questionTitle}`;
        text = `
          Hi ${username},
          
          ${data.senderName} posted a new answer to your question "${data.questionTitle}".
          
          View the answer: ${data.url}
          
          Best regards,
          The StackIt Team
        `;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Answer on Your Question</h2>
            <p>Hi ${username},</p>
            <p><strong>${data.senderName}</strong> posted a new answer to your question "<em>${data.questionTitle}</em>".</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Answer
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Best regards,<br>The StackIt Team</p>
          </div>
        `;
        break;

      case 'answer_accepted':
        subject = 'Your answer was accepted!';
        text = `
          Hi ${username},
          
          Great news! Your answer to "${data.questionTitle}" was accepted by ${data.senderName}.
          
          View the question: ${data.url}
          
          Best regards,
          The StackIt Team
        `;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Your Answer Was Accepted!</h2>
            <p>Hi ${username},</p>
            <p>Great news! Your answer to "<em>${data.questionTitle}</em>" was accepted by <strong>${data.senderName}</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.url}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Question
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Best regards,<br>The StackIt Team</p>
          </div>
        `;
        break;

      default:
        subject = 'New notification from StackIt';
        text = `Hi ${username}, you have a new notification from StackIt.`;
        html = `<p>Hi ${username}, you have a new notification from StackIt.</p>`;
    }

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send bulk emails
   * @param {Array} recipients - Array of recipient objects {email, username, data}
   * @param {string} templateType - Email template type
   * @param {Object} commonData - Common data for all emails
   * @returns {Promise} Promise resolving to array of email results
   */
  async sendBulkEmails(recipients, templateType, commonData = {}) {
    const emailPromises = recipients.map(recipient => {
      const { email, username, data = {} } = recipient;
      const mergedData = { ...commonData, ...data };

      switch (templateType) {
        case 'notification':
          return this.sendNotificationEmail(email, username, mergedData.type, mergedData);
        default:
          throw new Error(`Unknown email template type: ${templateType}`);
      }
    });

    try {
      const results = await Promise.allSettled(emailPromises);
      return results;
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
