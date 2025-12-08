import { Resend } from 'resend';

// Lazy initialization of Resend client
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@sayso.app';
const FROM_NAME = process.env.FROM_NAME || 'SaySo';

interface ClaimReceivedEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
  businessCategory: string;
  businessLocation: string;
}

interface ClaimApprovedEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
  businessCategory: string;
  businessLocation: string;
  dashboardUrl: string;
}

export class EmailService {
  /**
   * Send "We received your claim" email
   */
  static async sendClaimReceivedEmail(data: ClaimReceivedEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const resend = getResendClient();
      if (!resend) {
        console.warn('RESEND_API_KEY not configured, skipping email');
        return { success: true }; // Don't fail if email is not configured
      }

      const { recipientEmail, recipientName, businessName, businessCategory, businessLocation } = data;

      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: recipientEmail,
        subject: `We received your business claim request`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Claim Request Received</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Claim Request Received</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="margin-top: 0;">${recipientName ? `Hi ${recipientName},` : 'Hi there,'}</p>
                
                <p>Thank you for submitting a claim request for <strong>${businessName}</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7D9B76;">
                  <p style="margin: 0 0 10px 0;"><strong>Business Details:</strong></p>
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${businessName}</p>
                  <p style="margin: 5px 0;"><strong>Category:</strong> ${businessCategory}</p>
                  <p style="margin: 5px 0;"><strong>Location:</strong> ${businessLocation}</p>
                </div>
                
                <p>We've received your request and our team will review it shortly. You'll receive an email notification once your claim has been reviewed.</p>
                
                <p>If you have any questions or need to provide additional information, please don't hesitate to contact our support team.</p>
                
                <p style="margin-top: 30px;">Best regards,<br>The SaySo Team</p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('Error sending claim received email:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendClaimReceivedEmail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send "Your claim is approved" email
   */
  static async sendClaimApprovedEmail(data: ClaimApprovedEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const resend = getResendClient();
      if (!resend) {
        console.warn('RESEND_API_KEY not configured, skipping email');
        return { success: true }; // Don't fail if email is not configured
      }

      const { recipientEmail, recipientName, businessName, businessCategory, businessLocation, dashboardUrl } = data;

      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: recipientEmail,
        subject: `Your business claim has been approved!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Claim Approved</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Claim Approved!</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="margin-top: 0;">${recipientName ? `Hi ${recipientName},` : 'Hi there,'}</p>
                
                <p>Great news! Your claim request for <strong>${businessName}</strong> has been approved.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7D9B76;">
                  <p style="margin: 0 0 10px 0;"><strong>Business Details:</strong></p>
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${businessName}</p>
                  <p style="margin: 5px 0;"><strong>Category:</strong> ${businessCategory}</p>
                  <p style="margin: 5px 0;"><strong>Location:</strong> ${businessLocation}</p>
                </div>
                
                <p>You now have full access to manage your business profile. You can:</p>
                <ul style="margin: 20px 0; padding-left: 20px;">
                  <li>Respond to customer reviews</li>
                  <li>Update business information</li>
                  <li>Connect with customers through direct messages</li>
                  <li>View analytics and insights</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
                </div>
                
                <p style="margin-top: 30px;">If you have any questions or need assistance, our support team is here to help.</p>
                
                <p>Best regards,<br>The SaySo Team</p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('Error sending claim approved email:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendClaimApprovedEmail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

