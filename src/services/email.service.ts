import nodemailer, { Transporter } from "nodemailer";
import path from "path";

/**
 * Generic email sending via the self-hosted Postal mail server (see
 * BOOKING_MODULE_NOTES.md, "Email notifications" section, for how the
 * SMTP_* credentials were provisioned in Postal and why 127.0.0.1:25 is
 * used rather than the public postal.adigobookings.com hostname - the
 * backend runs on the same VPS as Postal).
 *
 * Deliberately never throws: a failed email must not fail the request that
 * triggered it (registration, booking, etc.) - callers fire-and-forget
 * (or await + ignore/log the boolean) and the caller's own success response
 * is unaffected either way.
 */

let transporter: Transporter | null = null;
let configWarningLogged = false;

function getTransporter(): Transporter | null {
    if (transporter) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        if (!configWarningLogged) {
            console.warn('⚠️  SMTP_HOST/PORT/USER/PASS not fully configured. Email notifications disabled.');
            configWarningLogged = true;
        }
        return null;
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: false,
        // The backend and Postal run on the same VPS, connected over
        // loopback (127.0.0.1) - nodemailer otherwise opportunistically
        // negotiates STARTTLS since Postal advertises it, and that fails
        // certificate hostname validation (the cert is issued for
        // postal.adigobookings.com, not 127.0.0.1). Traffic never leaves
        // the host, so skip TLS entirely here rather than disabling
        // certificate checks.
        ignoreTLS: true,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return transporter;
}

export interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    text: string;
}

// Logo shown in every email's header, referenced from templates.ts as
// `cid:adigo-logo` (an attachment, not a hotlinked <img src="https://...">)
// so it renders in every mail client without depending on the backend
// being publicly reachable or on remote-image-loading being allowed - see
// EMAIL_NOTIFICATIONS_PLAN.md. Copied (and resized down from the mobile
// app's 3326x2075 source) from adigo_mobile/assets/images/adigo_white_logo.png
// - white artwork, meant for the brand-red gradient header background.
// tsc doesn't copy this .png into dist/ on its own — see copy-assets.js,
// same class of gap as the migrations .sql files.
const LOGO_PATH = path.join(__dirname, '../emails/assets/adigo-logo-white.png');
const LOGO_CID = 'adigo-logo';

/**
 * Sends an email. Returns true on success, false on any failure
 * (including "not configured") - never throws.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
    const t = getTransporter();
    if (!t) return false;

    try {
        const info = await t.sendMail({
            from: process.env.SMTP_FROM || 'ADIGO <noreply@adigobookings.com>',
            to,
            subject,
            html,
            text,
            attachments: [
                {
                    filename: 'adigo-logo.png',
                    path: LOGO_PATH,
                    cid: LOGO_CID,
                },
            ],
        });
        console.log(`✅ Email sent (to=${to}, subject="${subject}", messageId=${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Email send failed (to=${to}, subject="${subject}"):`, error);
        return false;
    }
}
