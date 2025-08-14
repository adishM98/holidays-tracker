import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USERNAME'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendWelcomeEmail(email: string, temporaryPassword: string): Promise<void> {
    const fromEmail = this.configService.get('FROM_EMAIL');
    const frontendUrl = this.configService.get('FRONTEND_URL');

    try {
      await this.transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Welcome to Leave Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Leave Management System</h2>
            <p>Your account has been created successfully. Please use the following credentials to log in:</p>
            
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Email:</strong> ${email}<br>
              <strong>Temporary Password:</strong> <code style="background-color: #e8e8e8; padding: 2px 4px;">${temporaryPassword}</code>
            </div>
            
            <p style="color: #d9534f;"><strong>Important:</strong> You must change your password on first login for security reasons.</p>
            
            <p>
              <a href="${frontendUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Login to System
              </a>
            </p>
            
            <p style="color: #666; font-size: 12px;">
              If you did not expect this email, please contact your system administrator.
            </p>
          </div>
        `,
      });
      
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const fromEmail = this.configService.get('FROM_EMAIL');
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await this.transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You requested a password reset for your Leave Management System account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <p>
              <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Reset Password
              </a>
            </p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
            
            <p style="color: #d9534f;"><strong>This link will expire in 1 hour.</strong></p>
            
            <p style="color: #666; font-size: 12px;">
              If you didn't request this password reset, please ignore this email. Your password will not be changed.
            </p>
          </div>
        `,
      });
      
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }

  async sendLeaveRequestNotification(
    managerEmail: string,
    employeeName: string,
    leaveType: string,
    startDate: Date,
    endDate: Date,
    reason?: string
  ): Promise<void> {
    const fromEmail = this.configService.get('FROM_EMAIL');
    const frontendUrl = this.configService.get('FRONTEND_URL');

    try {
      await this.transporter.sendMail({
        from: fromEmail,
        to: managerEmail,
        subject: `New Leave Request from ${employeeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Leave Request</h2>
            <p><strong>${employeeName}</strong> has submitted a new leave request:</p>
            
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Leave Type:</strong> ${leaveType}<br>
              <strong>Start Date:</strong> ${startDate.toDateString()}<br>
              <strong>End Date:</strong> ${endDate.toDateString()}<br>
              ${reason ? `<strong>Reason:</strong> ${reason}<br>` : ''}
            </div>
            
            <p>
              <a href="${frontendUrl}/manager/requests" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Review Request
              </a>
            </p>
          </div>
        `,
      });
      
      this.logger.log(`Leave request notification sent to ${managerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send leave request notification to ${managerEmail}`, error);
      throw error;
    }
  }

  async sendLeaveStatusNotification(
    employeeEmail: string,
    leaveType: string,
    startDate: Date,
    endDate: Date,
    status: string,
    approverName?: string,
    rejectionReason?: string
  ): Promise<void> {
    const fromEmail = this.configService.get('FROM_EMAIL');
    const frontendUrl = this.configService.get('FRONTEND_URL');

    const statusColor = status === 'approved' ? '#28a745' : '#dc3545';
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';

    try {
      await this.transporter.sendMail({
        from: fromEmail,
        to: employeeEmail,
        subject: `Leave Request ${statusText}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${statusColor};">Leave Request ${statusText}</h2>
            <p>Your leave request has been <strong style="color: ${statusColor};">${status}</strong>:</p>
            
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Leave Type:</strong> ${leaveType}<br>
              <strong>Start Date:</strong> ${startDate.toDateString()}<br>
              <strong>End Date:</strong> ${endDate.toDateString()}<br>
              ${approverName ? `<strong>Reviewed by:</strong> ${approverName}<br>` : ''}
              ${rejectionReason ? `<strong>Reason:</strong> ${rejectionReason}<br>` : ''}
            </div>
            
            <p>
              <a href="${frontendUrl}/employee/requests" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Details
              </a>
            </p>
          </div>
        `,
      });
      
      this.logger.log(`Leave status notification sent to ${employeeEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send leave status notification to ${employeeEmail}`, error);
      throw error;
    }
  }

  async sendBulkImportReport(
    adminEmail: string,
    result: {
      total: number;
      successful: number;
      failed: number;
      errors: Array<{ row: number; error: string; data: any }>;
    }
  ): Promise<void> {
    const fromEmail = this.configService.get('FROM_EMAIL');

    const errorRows = result.errors.length > 0 
      ? `
        <h4>Errors:</h4>
        <ul>
          ${result.errors.map(error => `
            <li>Row ${error.row}: ${error.error}</li>
          `).join('')}
        </ul>
      `
      : '';

    try {
      await this.transporter.sendMail({
        from: fromEmail,
        to: adminEmail,
        subject: `Bulk Import Results - ${result.successful}/${result.total} Successful`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Bulk Import Completed</h2>
            
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Total Records:</strong> ${result.total}<br>
              <strong>Successful:</strong> <span style="color: #28a745;">${result.successful}</span><br>
              <strong>Failed:</strong> <span style="color: #dc3545;">${result.failed}</span><br>
            </div>
            
            ${errorRows}
          </div>
        `,
      });
      
      this.logger.log(`Bulk import report sent to ${adminEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send bulk import report to ${adminEmail}`, error);
      throw error;
    }
  }
}