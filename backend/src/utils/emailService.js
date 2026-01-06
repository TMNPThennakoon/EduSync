const nodemailer = require('nodemailer');

// Check if email credentials are configured
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

// Create reusable transporter only if credentials are available
let transporter = null;

if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  // Verify transporter configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email service configuration error:', error.message);
      console.error('   Please check your EMAIL_USER and EMAIL_PASS in .env file');
    } else {
      console.log('✅ Email service is ready to send messages');
    }
  });
} else {
  console.warn('⚠️  Email service not configured: EMAIL_USER and EMAIL_PASS not found in .env file');
  console.warn('   Email functionality will be disabled. Add credentials to enable email sending.');
}

// Email templates
const emailTemplates = {
  registrationPending: (firstName, lastName) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to EduSync</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                      🎓 Welcome to EduSync!
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                      Faculty of Technology - University of Colombo
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                      Hello ${firstName} ${lastName}! 👋
                    </h2>
                    
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for registering with <strong>EduSync</strong>, the Classroom Attendance & Gradebook Management System for the Faculty of Technology, University of Colombo.
                    </p>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
                        <strong>📋 Registration Status:</strong><br>
                        Your account is currently <strong style="color: #d97706;">PENDING ADMIN APPROVAL</strong>.
                      </p>
                    </div>
                    
                    <p style="margin: 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Our administrative team will review your registration details and verify your information. Once approved, you will receive another email notification and will be able to log in to your account.
                    </p>
                    
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 8px;">
                      <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 15px; font-weight: 600;">
                        ℹ️ What happens next?
                      </p>
                      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                        <li>Admin will review your registration</li>
                        <li>You'll receive an approval email once verified</li>
                        <li>You can then log in and start using EduSync</li>
                      </ul>
                    </div>
                    
                    <p style="margin: 30px 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      If you have any questions or need assistance, please don't hesitate to contact our support team.
                    </p>
                    
                    <div style="text-align: center; margin: 40px 0 20px 0;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        Best Regards,<br>
                        <strong style="color: #1f2937;">EduSync Team</strong><br>
                        <span style="color: #9ca3af;">Faculty of Technology</span><br>
                        <span style="color: #9ca3af;">University of Colombo</span>
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
                      This is an automated email. Please do not reply to this message.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      © ${new Date().getFullYear()} EduSync - All rights reserved
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  },

  registrationApproved: (firstName, lastName) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Approved - EduSync</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                      ✅ Account Approved!
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px;">
                      You can now access EduSync
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                      Hello ${firstName} ${lastName}! 🎉
                    </h2>
                    
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Great news! Your EduSync account has been <strong style="color: #059669;">approved</strong> by the administrator.
                    </p>
                    
                    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
                        <strong>🎊 Your account is now active!</strong><br>
                        You can now log in to EduSync and start using all the features.
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                        Login to EduSync →
                      </a>
                    </div>
                    
                    <p style="margin: 30px 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      If you have any questions or need assistance, please don't hesitate to contact our support team.
                    </p>
                    
                    <div style="text-align: center; margin: 40px 0 20px 0;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        Best Regards,<br>
                        <strong style="color: #1f2937;">EduSync Team</strong><br>
                        <span style="color: #9ca3af;">Faculty of Technology</span><br>
                        <span style="color: #9ca3af;">University of Colombo</span>
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
                      This is an automated email. Please do not reply to this message.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      © ${new Date().getFullYear()} EduSync - All rights reserved
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `;
  },

  announcement: (title, message, type) => {
    const isUrgent = type === 'urgent' || type === 'important';
    const headerColor = isUrgent ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)';
    const emoji = isUrgent ? '🚨' : '📢';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Announcement - EduSync</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: ${headerColor}; padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      ${emoji} New Announcement
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px; font-weight: 600;">
                      ${title}
                    </h2>
                    
                    <div style="background-color: #f9fafb; border-left: 4px solid ${isUrgent ? '#ef4444' : '#3b82f6'}; padding: 20px; margin: 20px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
                        ${message}
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0 20px 0;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                         style="display: inline-block; background: #4b5563; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        View in Dashboard →
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      © ${new Date().getFullYear()} EduSync - Faculty of Technology
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
};

// Send email function
const sendEmail = async (to, subject, htmlContent) => {
  // Check if transporter is configured
  if (!transporter) {
    console.warn('⚠️  Email not sent: Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: `"EduSync" <${emailUser}>`,
      to: to,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send registration pending email
const sendRegistrationPendingEmail = async (email, firstName, lastName) => {
  const subject = 'Welcome to EduSync - Registration Pending Approval';
  const htmlContent = emailTemplates.registrationPending(firstName, lastName);
  return await sendEmail(email, subject, htmlContent);
};

// Send registration approved email
const sendRegistrationApprovedEmail = async (email, firstName, lastName) => {
  const subject = 'EduSync Account Approved - You Can Now Login!';
  const htmlContent = emailTemplates.registrationApproved(firstName, lastName);
  return await sendEmail(email, subject, htmlContent);
};

module.exports = {
  sendEmail,
  sendRegistrationPendingEmail,
  sendRegistrationApprovedEmail,
  sendAnnouncementEmail: async (to, title, message, type) => {
    const subject = `[EduSync] ${type === 'urgent' ? 'URGENT: ' : ''}${title}`;
    const htmlContent = emailTemplates.announcement(title, message, type);
    return await sendEmail(to, subject, htmlContent);
  },
  emailTemplates
};

