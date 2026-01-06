import React from 'react';
import { X, Mail } from 'lucide-react';

const EmailPreview = ({ isOpen, onClose, emailType = 'pending', firstName = 'John', lastName = 'Doe' }) => {
  if (!isOpen) return null;

  const emailTemplates = {
    pending: {
      subject: 'Welcome to EduSync - Registration Pending Approval',
      content: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
              🎓 Welcome to EduSync!
            </h1>
            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
              Faculty of Technology - University of Colombo
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
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
            
            <div style="text-align: center; margin: 40px 0 20px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Best Regards,<br>
                <strong style="color: #1f2937;">EduSync Team</strong><br>
                <span style="color: #9ca3af;">Faculty of Technology</span><br>
                <span style="color: #9ca3af;">University of Colombo</span>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
              This is an automated email. Please do not reply to this message.
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              © ${new Date().getFullYear()} EduSync - All rights reserved
            </p>
          </div>
        </div>
      `
    },
    approved: {
      subject: 'EduSync Account Approved - You Can Now Login!',
      content: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
              ✅ Account Approved!
            </h1>
            <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px;">
              You can now access EduSync
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
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
              <a href="/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                Login to EduSync →
              </a>
            </div>
            
            <div style="text-align: center; margin: 40px 0 20px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Best Regards,<br>
                <strong style="color: #1f2937;">EduSync Team</strong><br>
                <span style="color: #9ca3af;">Faculty of Technology</span><br>
                <span style="color: #9ca3af;">University of Colombo</span>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
              This is an automated email. Please do not reply to this message.
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              © ${new Date().getFullYear()} EduSync - All rights reserved
            </p>
          </div>
        </div>
      `
    }
  };

  const template = emailTemplates[emailType] || emailTemplates.pending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">Email Preview</h2>
              <p className="text-sm text-blue-100">{template.subject}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div 
            className="bg-white rounded-lg shadow-sm mx-auto"
            dangerouslySetInnerHTML={{ __html: template.content }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;



