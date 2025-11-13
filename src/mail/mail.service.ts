import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendPasswordResetMail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Dispatch Bros Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password – Dispatch Bros',
      html: this.buildPasswordResetTemplate(resetUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${email}`, error.stack);
      throw new InternalServerErrorException('Failed to send password reset email. Please try again later.');
    }
  }

  private buildPasswordResetTemplate(resetUrl: string): string {
    return `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0; text-align: center;">
        <div style="max-width: 600px; background: #ffffff; margin: auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <div style="background: #111827; padding: 24px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Dispatch Bros</h1>
          </div>
          <div style="padding: 32px 24px; color: #374151;">
            <h2 style="margin-bottom: 16px; color: #111827;">Password Reset Request</h2>
            <p style="font-size: 15px; line-height: 1.6;">
              We received a request to reset your password.  
              If this was you, click the button below to create a new password.
            </p>
            <a href="${resetUrl}" 
              style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 500;">
              Reset My Password
            </a>
            <p style="font-size: 14px; color: #6b7280; margin-top: 16px;">
              This link will expire in <strong>15 minutes</strong>.  
              If you didn’t request a password reset, you can safely ignore this email.
            </p>
          </div>
          <div style="background: #f9fafb; padding: 16px; font-size: 12px; color: #9ca3af;">
            <p>© ${new Date().getFullYear()} Dispatch Bros. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;
  }
}

