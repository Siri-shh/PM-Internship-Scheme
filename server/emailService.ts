/**
 * Email Service - Handles all email notifications
 * Uses Nodemailer with Gmail SMTP
 * Objection requests and whitelist now stored in PostgreSQL (persistent across restarts)
 */

import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

// Email configuration from environment
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Lazy import storage to avoid circular dependency
function getStorage() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { storage } = require('./storage');
    return storage;
}

// ObjectionRequest type (mirrors DB row shape for compatibility)
interface ObjectionRequest {
    token: string;
    email: string;
    name: string;
    detectedWord: string;
    createdAt: Date | null;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string | null;
}

// Create transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
export function initializeEmailService(): boolean {
    if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
        console.warn('[Email Service] SMTP credentials not configured. Email sending disabled.');
        return false;
    }

    try {
        transporter = nodemailer.createTransport(SMTP_CONFIG);
        console.log('[Email Service] Initialized successfully');
        return true;
    } catch (error) {
        console.error('[Email Service] Failed to initialize:', error);
        return false;
    }
}

/**
 * Send registration confirmation email
 */
export async function sendRegistrationConfirmation(
    toEmail: string,
    userName: string,
    userType: 'student' | 'company' = 'student'
): Promise<boolean> {
    if (!transporter) {
        console.warn('[Email Service] Transporter not initialized, skipping email');
        return false;
    }

    const mailOptions = {
        from: `"PM Internship Scheme" <${FROM_EMAIL}>`,
        to: toEmail,
        subject: '🎉 Welcome to PM Internship Scheme - Registration Successful!',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome, ${userName}! 🎊</h1>
        </div>
        <div class="content">
            <p>Dear ${userName},</p>
            <p>Congratulations! Your ${userType === 'company' ? 'company' : 'student'} account has been successfully created on the <strong>PM Internship Scheme</strong> portal.</p>
            
            <p><strong>What's next?</strong></p>
            <ul>
                ${userType === 'student' ? `
                <li>Complete your profile with education and skills</li>
                <li>Browse available internship opportunities</li>
                <li>Apply to positions matching your interests</li>
                ` : `
                <li>Complete your company profile</li>
                <li>Post internship opportunities</li>
                <li>Review student applications</li>
                `}
            </ul>
            
            <center>
                <a href="${APP_URL}" class="button">Go to Portal</a>
            </center>
        </div>
        <div class="footer">
            <p>This is an automated message from PM Internship Scheme.</p>
            <p>If you didn't create this account, please contact support immediately.</p>
        </div>
    </div>
</body>
</html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email Service] Registration confirmation sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('[Email Service] Failed to send registration email:', error);
        return false;
    }
}

/**
 * Generate objection token and store request in DB
 */
export async function createObjectionRequest(
    email: string,
    name: string,
    detectedWord: string
): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await getStorage().createObjectionRequest(token, email, name, detectedWord);
    return token;
}

/**
 * Send explicit word notification email with objection URL
 */
export async function sendExplicitWordNotification(
    toEmail: string,
    userName: string,
    detectedWord: string
): Promise<{ sent: boolean; objectionToken?: string }> {
    // Create objection request in DB and get token
    const objectionToken = await createObjectionRequest(toEmail, userName, detectedWord);
    const objectionUrl = `${APP_URL}/objection/${objectionToken}`;

    if (!transporter) {
        console.warn('[Email Service] Transporter not initialized, skipping email');
        return { sent: false, objectionToken };
    }

    const mailOptions = {
        from: `"PM Internship Scheme" <${FROM_EMAIL}>`,
        to: toEmail,
        subject: '⚠️ Registration Attempt - Content Policy Notice',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #fffbeb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #f59e0b; }
        .warning-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Content Policy Notice</h1>
        </div>
        <div class="content">
            <p>Dear User,</p>
            
            <p>Your recent registration attempt on the <strong>PM Internship Scheme</strong> portal was flagged by our content moderation system.</p>
            
            <div class="warning-box">
                <strong>Reason:</strong> The username or email you provided contains content that violates our community guidelines.
            </div>
            
            <p><strong>What happened?</strong></p>
            <p>Our automated system detected potentially inappropriate language in your registration details. This is to ensure a safe and professional environment for all users.</p>
            
            <p><strong>Believe this is a mistake?</strong></p>
            <p>If you believe your username was incorrectly flagged (for example, it's your real name or a legitimate word), you can submit an objection for manual review:</p>
            
            <center>
                <a href="${objectionUrl}" class="button">Submit Objection for Review</a>
            </center>
            
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
                <strong>Objection ID:</strong> ${objectionToken.substring(0, 8)}...<br>
                This link will expire in 24 hours.
            </p>
        </div>
        <div class="footer">
            <p>This is an automated message from PM Internship Scheme.</p>
            <p>If you did not attempt to register, please ignore this email.</p>
        </div>
    </div>
</body>
</html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email Service] Explicit word notification sent to ${toEmail}`);
        return { sent: true, objectionToken };
    } catch (error) {
        console.error('[Email Service] Failed to send explicit word notification:', error);
        return { sent: false, objectionToken };
    }
}

/**
 * Get objection request by token (from DB)
 */
export async function getObjectionRequest(token: string): Promise<ObjectionRequest | null> {
    return getStorage().getObjectionByToken(token);
}

// Whitelist functions now use DB via storage

/**
 * Check if name or email is whitelisted (from DB)
 */
export async function isWhitelisted(name: string, email: string): Promise<boolean> {
    return getStorage().isWhitelisted(name, email);
}

/**
 * Add name/email to whitelist (in DB)
 */
export async function addToWhitelist(name: string, email: string): Promise<void> {
    return getStorage().addToWhitelist(name, email);
}

/**
 * Send approval notification email
 */
export async function sendApprovalEmail(
    toEmail: string,
    userName: string
): Promise<boolean> {
    if (!transporter) {
        console.warn('[Email Service] Transporter not initialized, skipping email');
        return false;
    }

    const mailOptions = {
        from: `"PM Internship Scheme" <${FROM_EMAIL}>`,
        to: toEmail,
        subject: '✅ Your Objection Has Been Approved!',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ecfdf5; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #10b981; }
        .success-box { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Objection Approved!</h1>
        </div>
        <div class="content">
            <p>Dear ${userName},</p>
            
            <div class="success-box">
                <strong>Great news!</strong> Your objection has been reviewed and approved by our admin team.
            </div>
            
            <p>Your username has been whitelisted and you can now complete your registration.</p>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Go to the registration page</li>
                <li>Use the same name and email as before</li>
                <li>Complete your registration</li>
            </ul>
            
            <center>
                <a href="${APP_URL}/register" class="button">Complete Registration</a>
            </center>
        </div>
        <div class="footer">
            <p>This is an automated message from PM Internship Scheme.</p>
            <p>Thank you for your patience during the review process.</p>
        </div>
    </div>
</body>
</html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email Service] Approval notification sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('[Email Service] Failed to send approval email:', error);
        return false;
    }
}

/**
 * Send rejection notification email
 */
export async function sendRejectionEmail(
    toEmail: string,
    userName: string
): Promise<boolean> {
    if (!transporter) {
        console.warn('[Email Service] Transporter not initialized, skipping email');
        return false;
    }

    const mailOptions = {
        from: `"PM Internship Scheme" <${FROM_EMAIL}>`,
        to: toEmail,
        subject: '❌ Objection Review Result',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dc2626; }
        .info-box { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Objection Not Approved</h1>
        </div>
        <div class="content">
            <p>Dear ${userName},</p>
            
            <div class="info-box">
                After careful review, our admin team was unable to approve your objection.
            </div>
            
            <p>The username you attempted to register with does not meet our community guidelines.</p>
            
            <p><strong>What can you do?</strong></p>
            <ul>
                <li>Try registering with a different username</li>
                <li>Ensure your username is professional and appropriate</li>
                <li>Use your real name or a suitable alternative</li>
            </ul>
            
            <center>
                <a href="${APP_URL}/register" class="button">Try Again</a>
            </center>
        </div>
        <div class="footer">
            <p>This is an automated message from PM Internship Scheme.</p>
            <p>If you believe this decision was made in error, please contact support.</p>
        </div>
    </div>
</body>
</html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email Service] Rejection notification sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('[Email Service] Failed to send rejection email:', error);
        return false;
    }
}

/**
 * Update objection status and handle whitelist/notifications (for admin portal)
 * Now fully async using DB storage
 */
export async function updateObjectionStatus(
    token: string,
    status: 'approved' | 'rejected'
): Promise<{ success: boolean; emailSent: boolean }> {
    const request = await getStorage().updateObjectionStatus(token, status);
    if (!request) return { success: false, emailSent: false };

    let emailSent = false;

    if (status === 'approved') {
        await addToWhitelist(request.name, request.email);
        emailSent = await sendApprovalEmail(request.email, request.name);
    } else if (status === 'rejected') {
        emailSent = await sendRejectionEmail(request.email, request.name);
    }

    return { success: true, emailSent };
}

/**
 * Get all pending objection requests (for admin portal) from DB
 */
export async function getPendingObjections(): Promise<ObjectionRequest[]> {
    return getStorage().getPendingObjections();
}

