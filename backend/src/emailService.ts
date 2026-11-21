/**
 * Training Management System - Email Notification Service
 * 
 * Configured with Nodemailer for sending TMS workflow emails:
 * - Training request submitted notifications (to supervisor/AO)
 * - Approval/rejection notifications (to employee)
 * - Program enrollment confirmations
 * - Password reset / account invites from Keycloak admin
 */

import nodemailer, { Transporter, SendMailOptions, SentMessageInfo } from 'nodemailer';

// ─── Email Configuration Interface ─────────────────────────────────────────

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromAddress: string;
  fromName: string;
}

// ─── TMS Email Template Interface ──────────────────────────────────────────

interface TmsEmailTemplate {
  to: string | string[];
  subject: string;
  template: 'training-request-submitted' 
           | 'training-request-approved' 
           | 'training-request-rejected'
           | 'training-program-created'
           | 'training-program-enrolled'
           | 'training-program-completed'
           | 'password-reset'
           | 'account-invite';
  data: {
    userName?: string;
    requestTitle?: string;
    programName?: string;
    justification?: string;
    approvalAction?: string;
    approverName?: string;
    comments?: string;
    startDate?: string;
    endDate?: string;
    resetToken?: string;
    inviteLink?: string;
    adminEmail?: string;
  };
}

// ─── Email Templates ──────────────────────────────────────────────────────

const EMAIL_TEMPLATES: Record<string, { subject: string; html: (data: TmsEmailTemplate['data']) => string }> = {
  'training-request-submitted': {
    subject: 'Training Request Submitted: {{programName}}',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Training Request Submitted</h2>
        <p>Hello {{userName}},</p>
        <p>A new training request has been submitted and requires your review:</p>
        <div style="background: #f8f9fa; border-left: 4px solid #3498db; padding: 15px; margin: 15px 0;">
          <p><strong>Program:</strong> ${data.programName || 'N/A'}</p>
          <p><strong>Justification:</strong> ${data.justification || 'N/A'}</p>
        </div>
        <p>Please log in to the Training Management System to review and take action.</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Training Management System &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  },
  
  'training-request-approved': {
    subject: 'Training Request Approved: {{programName}}',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">Request Approved</h2>
        <p>Hello {{userName}},</p>
        <p>Great news! Your training request has been <strong style="color: #27ae60;">approved</strong>.</p>
        <div style="background: #e8f8f0; border-left: 4px solid #27ae60; padding: 15px; margin: 15px 0;">
          <p><strong>Program:</strong> ${data.programName || 'N/A'}</p>
          <p><strong>Approved by:</strong> ${data.approverName || 'Supervisor'}</p>
          ${data.comments ? `<p><strong>Comments:</strong> ${data.comments}</p>` : ''}
        </div>
        <p>You may now proceed with the training enrollment process.</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Training Management System &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  },
  
  'training-request-rejected': {
    subject: 'Training Request Rejected: {{programName}}',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Request Rejected</h2>
        <p>Hello {{userName}},</p>
        <p>Your training request has been <strong style="color: #e74c3c;">rejected</strong>.</p>
        <div style="background: #fdf0ef; border-left: 4px solid #e74c3c; padding: 15px; margin: 15px 0;">
          <p><strong>Program:</strong> ${data.programName || 'N/A'}</p>
          <p><strong>Rejected by:</strong> ${data.approverName || 'Supervisor'}</p>
          ${data.comments ? `<p><strong>Reason:</strong> ${data.comments}</p>` : ''}
        </div>
        <p>Please contact your supervisor or HR if you have questions about this decision.</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Training Management System &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  },
  
  'training-program-created': {
    subject: 'New Training Program Available: {{programName}}',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 10px;">New Training Program</h2>
        <p>Hello {{userName}},</p>
        <p>A new training program has been created and is now available:</p>
        <div style="background: #ebf5fb; border-left: 4px solid #3498db; padding: 15px; margin: 15px 0;">
          <p><strong>Program:</strong> ${data.programName || 'N/A'}</p>
          ${data.startDate ? `<p><strong>Start Date:</strong> ${data.startDate}</p>` : ''}
          ${data.endDate ? `<p><strong>End Date:</strong> ${data.endDate}</p>` : ''}
        </div>
        <p>Log in to the TMS to view details and enroll.</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Training Management System &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  },
  
  'training-program-enrolled': {
    subject: 'Enrollment Confirmation: {{programName}}',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2980b9; border-bottom: 2px solid #2980b9; padding-bottom: 10px;">Enrollment Confirmed</h2>
        <p>Hello {{userName}},</p>
        <p>You have been successfully enrolled in the following training program:</p>
        <div style="background: #eaf2f8; border-left: 4px solid #2980b9; padding: 15px; margin: 15px 0;">
          <p><strong>Program:</strong> ${data.programName || 'N/A'}</p>
          ${data.startDate ? `<p><strong>Start Date:</strong> ${data.startDate}</p>` : ''}
          ${data.endDate ? `<p><strong>End Date:</strong> ${data.endDate}</p>` : ''}
        </div>
        <p>Please complete any required prerequisites before the start date.</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Training Management System &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  },
  
  'training-program-completed': {
    subject: 'Training Completion: {{programName}}',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a085; border-bottom: 2px solid #16a085; padding-bottom: 10px;">Training Completed</h2>
        <p>Hello {{userName}},</p>
        <p>Congratulations! You have completed the training program:</p>
        <div style="background: #e8f8f5; border-left: 4px solid #16a085; padding: 15px; margin: 15px 0;">
          <p><strong>Program:</strong> ${data.programName || 'N/A'}</p>
        </div>
        <p>Your training records have been updated automatically.</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Training Management System &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  },
  
  'password-reset': {
    subject: 'Password Reset - Training Management System',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e67e22; border-bottom: 2px solid #e67e22; padding-bottom: 10px;">Password Reset</h2>
        <p>Hello,</p>
        <p>A password reset has been requested for your Training Management System account.</p>
        <div style="background: #fef9e7; border-left: 4px solid #e67e22; padding: 15px; margin: 15px 0;">
          <p><strong>Reset Token:</strong></p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 10px; background: white; margin: 10px 0;">${data.resetToken || 'N/A'}</p>
        </div>
        <p>This token expires in 15 minutes. If you did not request this, please ignore this email.</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Training Management System &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  },
  
  'account-invite': {
    subject: 'Welcome to Training Management System - Account Invitation',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8e44ad; border-bottom: 2px solid #8e44ad; padding-bottom: 10px;">Account Invitation</h2>
        <p>Hello,</p>
        <p>You have been invited to join the Training Management System. Please click the link below to set up your account:</p>
        <div style="background: #f5eef8; border-left: 4px solid #8e44ad; padding: 15px; margin: 15px 0; text-align: center;">
          <a href="${data.inviteLink || '#'}" 
             style="display: inline-block; background: #8e44ad; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Set Up Account
          </a>
        </div>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Training Management System &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  },
};

// ─── Email Service Class ──────────────────────────────────────────────────

class EmailService {
  private transporter: Transporter;
  private config: EmailConfig;

  constructor(config?: Partial<EmailConfig>) {
    this.config = {
      host: config?.host || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: config?.port || parseInt(process.env.EMAIL_PORT || '587'),
      secure: config?.secure || false, // true for 465, false for 587
      auth: {
        user: config?.auth?.user || process.env.EMAIL_USER || '',
        pass: config?.auth?.pass || process.env.EMAIL_PASS || '',
      },
      fromAddress: config?.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'noreply@tms.local',
      fromName: config?.fromName || process.env.EMAIL_FROM_NAME || 'TMS Notifications',
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    // Verify transporter configuration on startup
    this.transporter.verify((error: Error | null, _success: boolean) => {
      if (error) {
        console.error('❌ Email Configuration Error:', error);
      } else {
        console.log('✅ Email server is configured and ready');
      }
    });
  }

  /**
   * Send a TMS workflow email using a template
   */
  async sendTmsEmail(template: TmsEmailTemplate): Promise<SentMessageInfo | void> {
    const t = EMAIL_TEMPLATES[template.template];
    
    if (!t) {
      console.error(`❌ Unknown email template: ${template.template}`);
      return;
    }

    // Process template with data
    let subject = t.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return (template.data as any)[key] || `{{${key}}}`;
    });

    let html = t.html(template.data).replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return (template.data as any)[key] || '';
    });

    const mailOptions: SendMailOptions = {
      from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
      to: template.to,
      subject: subject,
      html: html,
      text: this.stripHtml(html), // Plain text fallback
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${subject} -> ${template.to}`);
      return info;
    } catch (error) {
      console.error('❌ Email send error:', error);
      throw error;
    }
  }

  /**
   * Send a training request submitted notification (to supervisor/AO)
   */
  async sendRequestSubmitted(
    to: string | string[],
    userName: string,
    programName: string,
    justification: string,
  ): Promise<void> {
    await this.sendTmsEmail({
      to,
      subject: '',
      template: 'training-request-submitted',
      data: {
        userName,
        programName,
        justification,
      },
    });
  }

  /**
   * Send approval notification (to requesting employee)
   */
  async sendRequestApproved(
    to: string | string[],
    userName: string,
    programName: string,
    approverName: string,
    comments?: string,
  ): Promise<void> {
    await this.sendTmsEmail({
      to,
      subject: '',
      template: 'training-request-approved',
      data: {
        userName,
        programName,
        approvalAction: 'approved',
        approverName,
        comments,
      },
    });
  }

  /**
   * Send rejection notification (to requesting employee)
   */
  async sendRequestRejected(
    to: string | string[],
    userName: string,
    programName: string,
    approverName: string,
    comments?: string,
  ): Promise<void> {
    await this.sendTmsEmail({
      to,
      subject: '',
      template: 'training-request-rejected',
      data: {
        userName,
        programName,
        approvalAction: 'rejected',
        approverName,
        comments,
      },
    });
  }

  /**
   * Send new training program announcement
   */
  async sendProgramCreated(
    to: string | string[],
    userName: string,
    programName: string,
    startDate?: string,
    endDate?: string,
  ): Promise<void> {
    await this.sendTmsEmail({
      to,
      subject: '',
      template: 'training-program-created',
      data: {
        userName,
        programName,
        startDate,
        endDate,
      },
    });
  }

  /**
   * Send enrollment confirmation
   */
  async sendEnrollmentConfirmed(
    to: string | string[],
    userName: string,
    programName: string,
    startDate?: string,
    endDate?: string,
  ): Promise<void> {
    await this.sendTmsEmail({
      to,
      subject: '',
      template: 'training-program-enrolled',
      data: {
        userName,
        programName,
        startDate,
        endDate,
      },
    });
  }

  /**
   * Send training completion notification
   */
  async sendTrainingCompleted(
    to: string | string[],
    userName: string,
    programName: string,
  ): Promise<void> {
    await this.sendTmsEmail({
      to,
      subject: '',
      template: 'training-program-completed',
      data: {
        userName,
        programName,
      },
    });
  }

  /**
   * Send password reset email with token
   */
  async sendPasswordReset(
    to: string | string[],
    resetToken: string,
  ): Promise<void> {
    await this.sendTmsEmail({
      to,
      subject: '',
      template: 'password-reset',
      data: {
        resetToken,
      },
    });
  }

  /**
   * Send account invitation with Keycloak setup link
   */
  async sendAccountInvite(
    to: string | string[],
    inviteLink: string,
  ): Promise<void> {
    await this.sendTmsEmail({
      to,
      subject: '',
      template: 'account-invite',
      data: {
        inviteLink,
      },
    });
  }

  /**
   * Strip HTML tags for plain text email fallback
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Check email transport health
   */
  async isConfigured(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current email configuration (sensitive data masked)
   */
  getConfig(): {
    host: string;
    port: number;
    secure: boolean;
    authUser: string;
    fromAddress: string;
    fromName: string;
  } {
    return {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      authUser: this.config.auth.user || '(not set)',
      fromAddress: this.config.fromAddress,
      fromName: this.config.fromName,
    };
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────

const emailService = new EmailService();

export { EmailService, emailService };
export type { EmailConfig, TmsEmailTemplate };