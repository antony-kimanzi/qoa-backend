import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { createTestAccount } from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private isConfigured = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Production email configuration
      const host = this.configService.get('SMTP_HOST');
      const user = this.configService.get('SMTP_USER');
      const pass = this.configService.get('SMTP_PASS');

      if (!host || !user || !pass) {
        this.logger.warn(
          '⚠️ SMTP configuration incomplete. Email sending will be disabled.',
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: host,
        port: this.configService.get('SMTP_PORT') || 587,
        secure: this.configService.get('SMTP_SECURE') === 'true',
        auth: {
          user: user,
          pass: pass,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      this.logger.log('✅ Email service configured for production');
    } catch (error) {
      this.logger.error(
        'Failed to initialize email service:',
        error instanceof Error ? error.message : String(error),
      );
      this.isConfigured = false;
    }
  }

  async sendWelcomeEmail(email: string, username: string) {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn(
        `Email not sent to ${email} - email service not configured`,
      );
      return null;
    }

    try {
      const mailOptions = {
        from:
          this.configService.get('SMTP_FROM') ||
          '"QOA Store" <noreply@qoastore.com>',
        to: email,
        subject: 'Welcome to QOA Store! 🎉',
        html: this.getWelcomeEmailTemplate(username),
      };

      const info = await this.transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`Welcome email sent to ${email}`);
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      } else {
        this.logger.log(`Welcome email sent to ${email}`);
      }

      return info;
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${email}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private getWelcomeEmailTemplate(username: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to QOA Store! 🛍️</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>Thank you for joining QOA Store. We're thrilled to have you on board!</p>
              <p>Here's what you can do now:</p>
              <ul>
                <li>Browse our collection of quality products</li>
                <li>Save your favorite items</li>
                <li>Track your orders</li>
                <li>Enjoy secure payments</li>
              </ul>
              <p>Start exploring our store and discover amazing products!</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Start Shopping</a>
              <p style="margin-top: 20px; color: #666;">If you have any questions, feel free to reply to this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} QOA Store. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
