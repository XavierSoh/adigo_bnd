import { Language } from "../utils/i18n";

/**
 * Bilingual (fr/en) HTML email templates. Kept separate from
 * src/utils/i18n.ts (API JSON response strings) since these are full
 * documents, not single translated strings - but follow the same
 * `Language = 'fr' | 'en'` convention and the same fr-first/default
 * ordering as customer.preferred_language's DB default.
 *
 * Visual style uses ADIGO's actual brand red (#D32F2F, "Rouge Adigo" -
 * see adigo2/lib/src/design/admin_design_tokens.dart and
 * adigo_mobile/lib/core/theme/premium_colors.dart, both ported from
 * adigo_mobile/PREMIUM_DESIGN_SYSTEM.md) so emails, the desktop admin and
 * the mobile app read as the same product - not the purple/indigo this
 * file started with, which only ever matched src/public/index.html's own
 * (unrelated, never-brand-checked) gradient.
 */

export interface EmailContent {
    subject: string;
    html: string;
    text: string;
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #FF5252 0%, #D32F2F 100%)'; // same stops as premium_colors.dart's own gradient
const BRAND_ACCENT = '#D32F2F';

function layout(lang: Language, title: string, bodyHtml: string, footerNote: string): string {
    return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">
        <tr><td style="background:${BRAND_GRADIENT};padding:28px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px;">ADIGO</span>
        </td></tr>
        <tr><td style="padding:32px;color:#333333;font-size:15px;line-height:1.6;">
          <h1 style="font-size:19px;margin:0 0 16px;color:#222;">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px 28px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;">
          ${footerNote}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(url: string, label: string): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:${BRAND_GRADIENT};border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;">${label}</a>
      </td></tr>
    </table>`;
}

export function welcomeEmail(lang: Language, params: { firstName: string; verifyUrl: string }): EmailContent {
    const { firstName, verifyUrl } = params;

    if (lang === 'en') {
        return {
            subject: 'Welcome to ADIGO - please confirm your email',
            text: `Hi ${firstName},\n\nWelcome to ADIGO! Please confirm your email address by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.\n\n- The ADIGO team`,
            html: layout(lang, `Welcome, ${firstName}! 👋`, `
                <p>Thanks for creating an ADIGO account. Please confirm your email address to activate all features (bookings, wallet, notifications).</p>
                ${button(verifyUrl, 'Confirm my email')}
                <p style="color:#777;font-size:13px;">This link expires in 24 hours. If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all;">${verifyUrl}</span></p>
                <p style="color:#999;font-size:13px;">If you didn't create this account, you can safely ignore this email.</p>
            `, "You're receiving this email because an ADIGO account was created with this address."),
        };
    }

    return {
        subject: 'Bienvenue sur ADIGO - confirmez votre email',
        text: `Bonjour ${firstName},\n\nBienvenue sur ADIGO ! Merci de confirmer votre adresse email en visitant :\n${verifyUrl}\n\nCe lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email.\n\n- L'équipe ADIGO`,
        html: layout(lang, `Bienvenue, ${firstName} ! 👋`, `
            <p>Merci d'avoir créé un compte ADIGO. Confirmez votre adresse email pour activer toutes les fonctionnalités (réservations, portefeuille, notifications).</p>
            ${button(verifyUrl, 'Confirmer mon email')}
            <p style="color:#777;font-size:13px;">Ce lien expire dans 24 heures. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="word-break:break-all;">${verifyUrl}</span></p>
            <p style="color:#999;font-size:13px;">Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email en toute sécurité.</p>
        `, "Vous recevez cet email car un compte ADIGO a été créé avec cette adresse."),
    };
}

export function passwordResetEmail(lang: Language, params: { firstName: string; code: string }): EmailContent {
    const { firstName, code } = params;

    if (lang === 'en') {
        return {
            subject: 'Your ADIGO password reset code',
            text: `Hi ${firstName},\n\nYour password reset code is: ${code}\n\nEnter this code in the app to set a new password. It expires in 30 minutes. If you didn't request this, you can ignore this email - your password won't change.\n\n- The ADIGO team`,
            html: layout(lang, 'Password reset code', `
                <p>Hi ${firstName}, use this code in the app to set a new password:</p>
                <div style="text-align:center;margin:24px 0;">
                  <span style="display:inline-block;background:#f0f0f5;border-radius:8px;padding:16px 32px;font-size:28px;font-weight:bold;letter-spacing:6px;color:${BRAND_ACCENT};">${code}</span>
                </div>
                <p style="color:#777;font-size:13px;">This code expires in 30 minutes.</p>
                <p style="color:#999;font-size:13px;">If you didn't request a password reset, you can ignore this email - your password won't change.</p>
            `, "You're receiving this email because a password reset was requested for this ADIGO account."),
        };
    }

    return {
        subject: 'Votre code de réinitialisation ADIGO',
        text: `Bonjour ${firstName},\n\nVotre code de réinitialisation est : ${code}\n\nSaisissez ce code dans l'application pour définir un nouveau mot de passe. Il expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email - votre mot de passe ne changera pas.\n\n- L'équipe ADIGO`,
        html: layout(lang, 'Code de réinitialisation', `
            <p>Bonjour ${firstName}, utilisez ce code dans l'application pour définir un nouveau mot de passe :</p>
            <div style="text-align:center;margin:24px 0;">
              <span style="display:inline-block;background:#f0f0f5;border-radius:8px;padding:16px 32px;font-size:28px;font-weight:bold;letter-spacing:6px;color:${BRAND_ACCENT};">${code}</span>
            </div>
            <p style="color:#777;font-size:13px;">Ce code expire dans 30 minutes.</p>
            <p style="color:#999;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email - votre mot de passe ne changera pas.</p>
        `, "Vous recevez cet email car une réinitialisation de mot de passe a été demandée pour ce compte ADIGO."),
    };
}

// Security-notice style, no code/link - sent after BOTH the code-based
// reset flow (resetPassword) and the authenticated change-password flow
// succeed, so a customer is told either way.
export function passwordChangedEmail(lang: Language, params: { firstName: string }): EmailContent {
    const { firstName } = params;

    if (lang === 'en') {
        return {
            subject: 'Your ADIGO password was changed',
            text: `Hi ${firstName},\n\nThis confirms that your ADIGO account password was just changed. If you made this change, no action is needed.\n\nIf you didn't request this change, please contact our support team immediately.\n\n- The ADIGO team`,
            html: layout(lang, 'Password changed', `
                <p>Hi ${firstName}, this confirms that your ADIGO account password was just changed.</p>
                <p style="color:#999;font-size:13px;">If you made this change, no action is needed. If you didn't request this change, please contact our support team immediately.</p>
            `, "You're receiving this email because your ADIGO account password was changed."),
        };
    }

    return {
        subject: 'Votre mot de passe ADIGO a été modifié',
        text: `Bonjour ${firstName},\n\nCeci confirme que le mot de passe de votre compte ADIGO vient d'être modifié. Si vous êtes à l'origine de ce changement, aucune action n'est requise.\n\nSi vous n'êtes pas à l'origine de cette modification, contactez immédiatement notre support.\n\n- L'équipe ADIGO`,
        html: layout(lang, 'Mot de passe modifié', `
            <p>Bonjour ${firstName}, ceci confirme que le mot de passe de votre compte ADIGO vient d'être modifié.</p>
            <p style="color:#999;font-size:13px;">Si vous êtes à l'origine de ce changement, aucune action n'est requise. Sinon, contactez immédiatement notre support.</p>
        `, "Vous recevez cet email car le mot de passe de votre compte ADIGO a été modifié."),
    };
}

export function ticketPurchaseConfirmedEmail(lang: Language, params: {
    firstName: string; eventTitle: string; quantity: number; totalPrice: number; reference: string;
}): EmailContent {
    const { firstName, eventTitle, quantity, totalPrice, reference } = params;

    if (lang === 'en') {
        return {
            subject: 'Your ADIGO ticket is confirmed',
            text: `Hi ${firstName},\n\nYour purchase is confirmed: ${quantity} ticket(s) for ${eventTitle}.\nTotal paid: ${totalPrice} XAF\nReference: ${reference}\n\nSee you there!\n\n- The ADIGO team`,
            html: layout(lang, 'Ticket confirmed! 🎟️', `
                <p>Hi ${firstName}, your purchase is confirmed:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;border-radius:8px;margin:20px 0;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;font-weight:bold;color:#222;">${eventTitle}</p>
                    <p style="margin:0;color:#555;">${quantity} ticket(s) — ${totalPrice} XAF</p>
                    <p style="margin:8px 0 0;color:#999;font-size:13px;">Reference: ${reference}</p>
                  </td></tr>
                </table>
                <p style="color:#777;font-size:13px;">Keep this email as your receipt. See you there!</p>
            `, "You're receiving this email because a ticket was purchased on this ADIGO account."),
        };
    }

    return {
        subject: 'Votre billet ADIGO est confirmé',
        text: `Bonjour ${firstName},\n\nVotre achat est confirmé : ${quantity} billet(s) pour ${eventTitle}.\nTotal payé : ${totalPrice} XAF\nRéférence : ${reference}\n\nÀ bientôt !\n\n- L'équipe ADIGO`,
        html: layout(lang, 'Billet confirmé ! 🎟️', `
            <p>Bonjour ${firstName}, votre achat est confirmé :</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;border-radius:8px;margin:20px 0;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 6px;font-weight:bold;color:#222;">${eventTitle}</p>
                <p style="margin:0;color:#555;">${quantity} billet(s) — ${totalPrice} XAF</p>
                <p style="margin:8px 0 0;color:#999;font-size:13px;">Référence : ${reference}</p>
              </td></tr>
            </table>
            <p style="color:#777;font-size:13px;">Conservez cet email comme reçu. À bientôt !</p>
        `, "Vous recevez cet email car un billet a été acheté sur ce compte ADIGO."),
    };
}

export function verificationResultPage(lang: Language, ok: boolean): string {
    const title = ok
        ? (lang === 'en' ? 'Email confirmed!' : 'Email confirmé !')
        : (lang === 'en' ? 'Link invalid or expired' : 'Lien invalide ou expiré');
    const message = ok
        ? (lang === 'en'
            ? 'Your email address has been confirmed. You can go back to the ADIGO app.'
            : 'Votre adresse email a été confirmée. Vous pouvez retourner sur l\'application ADIGO.')
        : (lang === 'en'
            ? 'This verification link is invalid or has expired. Please request a new one from the app.'
            : 'Ce lien de vérification est invalide ou a expiré. Merci d\'en redemander un depuis l\'application.');
    const icon = ok ? '✅' : '⚠️';

    return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ADIGO</title></head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="background:#ffffff;border-radius:12px;padding:40px 32px;max-width:420px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:8px;">${icon}</div>
    <h1 style="font-size:20px;color:#222;margin:0 0 12px;">${title}</h1>
    <p style="color:#666;font-size:14px;line-height:1.6;">${message}</p>
  </div>
</body>
</html>`;
}
