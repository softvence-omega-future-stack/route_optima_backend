import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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

  // Send password reset email
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
      throw new InternalServerErrorException(
        'Failed to send password reset email. Please try again later.',
      );
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

  // Send job confirmation email to customer
  async sendJobConfirmationEmail(
    job: any,
    technician: any,
    preferences: any,
  ): Promise<{ sent: boolean; message: string }> {
    if (!job.customerEmail) {
      return { sent: false, message: 'Customer email not provided' };
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Dispatch Bros" <${process.env.EMAIL_USER}>`,
      to: job.customerEmail,
      subject: `Job Confirmation Notice – Dispatch Bros`,
      html: this.buildJobConfirmationTemplate(job, technician),
    };

    try {
      await this.transporter.sendMail(mailOptions);

      return { sent: true, message: 'Email sent successfully' };
    } catch (error) {
      this.logger.error(`Email failed:`, error.stack);
      return { sent: false, message: 'Email sending failed' };
    }
  }

  private buildJobConfirmationTemplate(job: any, technician: any): string {
    return `
  <div style="font-family: 'Segoe UI', Roboto, Arial; background:#f5f6f7; padding:30px;">
    <div style="max-width:650px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.1);">

      <div style="background:#111827; padding:22px; text-align:center;">
        <h1 style="color:white; margin:0; font-size:24px;">Dispatch Bros</h1>
      </div>

      <div style="padding:28px;">
        <h2 style="color:#111827; margin-bottom:12px;">Your Scheduled Service Is Confirmed</h2>
        <p style="color:#4b5563; font-size:15px;">
          Your booking has been successfully scheduled. Below are your job and technician details:
        </p>

        <div style="margin-top:20px; background:#f9fafb; padding:18px; border-radius:8px;">
          <h3 style="margin:0 0 10px 0; color:#111827;">Job Details</h3>
          <p style="margin:0; color:#4b5563;">
            <strong>Customer:</strong> ${job.customerName}<br>
            <strong>Address:</strong> ${job.serviceAddress}<br>
            <strong>Phone:</strong> ${job.customerPhone}<br>
           <strong>Schedule:</strong> ${job.scheduledDate.toLocaleDateString()} (${job.timeSlot?.label ?? 'N/A'})<br>
            <strong>Description:</strong> ${job.jobDescription}
          </p>
        </div>

        <div style="margin-top:20px; background:#eef2ff; padding:18px; border-radius:8px;">
          <h3 style="margin:0 0 10px 0; color:#1e3a8a;">Technician Assigned</h3>
          <p style="margin:0; color:#1e3a8a;">
            <strong>Name:</strong> ${technician.name}<br>
            <strong>Phone:</strong> ${technician.phone}<br>
          </p>
        </div>
      </div>

      <div style="background:#f3f4f6; padding:12px; text-align:center; color:#9ca3af; font-size:12px;">
        © ${new Date().getFullYear()} Dispatch Bros. All rights reserved.
      </div>

    </div>
  </div>
  `;
  }

  // Send welcome email to newly created dispatcher with login credentials
  async sendDispatcherWelcomeEmail(
    email: string,
    name: string,
    password: string,
  ): Promise<void> {
    const loginUrl = `${process.env.CLIENT_URL}/login`;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Dispatch Bros" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Dispatch Bros - Your Account Details',
      html: this.buildDispatcherWelcomeTemplate(name, email, password, loginUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Dispatcher welcome email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send welcome email to ${email}`, error.stack);
      throw new InternalServerErrorException(
        'Failed to send welcome email. Please contact support for your login credentials.',
      );
    }
  }

  private buildDispatcherWelcomeTemplate(
    name: string,
    email: string,
    password: string,
    loginUrl: string,
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0; text-align: center;">
        <div style="max-width: 600px; background: #ffffff; margin: auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <div style="background: #111827; padding: 24px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Dispatch Bros</h1>
          </div>
          <div style="padding: 32px 24px; color: #374151; text-align: left;">
            <h2 style="margin-bottom: 16px; color: #111827;">Welcome to the Team, ${name}!</h2>
            <p style="font-size: 15px; line-height: 1.6;">
              Your dispatcher account has been successfully created by the administrator. 
              You can now access the Dispatch Bros platform using the credentials below.
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #2563eb;">
              <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">Your Login Credentials</h3>
              <p style="margin: 8px 0; font-size: 14px;">
                <strong style="color: #111827;">Email:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${email}</code>
              </p>
              <p style="margin: 8px 0; font-size: 14px;">
                <strong style="color: #111827;">Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${password}</code>
              </p>
            </div>

            <a href="${loginUrl}" 
              style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 500;">
              Login to Dashboard
            </a>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 24px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⚠️ Security Reminder:</strong> For your security, please change your password after your first login. 
                Keep your credentials confidential and do not share them with anyone.
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
              If you have any questions or need assistance, please contact your administrator.
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
