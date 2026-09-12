/**
 * Test-only helper: prints a customer's email-verification token or
 * password-reset code straight from the database.
 *
 * Local SMTP is intentionally unconfigured (see EMAIL_NOTIFICATIONS_PLAN.md
 * — the real Postal credential never leaves the production VPS `.env`), so
 * the Flutter auth-flow tests can't read these values out of a real inbox.
 * They're still written to `customer.email_verification_token` /
 * `customer.password_reset_code` by register()/forgotPassword() regardless
 * of whether the email actually sent — this reads them directly so the
 * test can complete the verify/reset steps end-to-end. Not part of the
 * app; never invoked outside test/features/auth/auth_flow_test.dart.
 *
 * Usage: npx ts-node scripts/test_get_customer_secret.ts --email <email> --field <field>
 * field is one of: email_verification_token | password_reset_code
 * Prints the raw value to stdout (or the literal string "null"), nothing else.
 */
import prismaDb from "../src/config/prismaClient";

async function main() {
    const args = process.argv.slice(2);
    const emailIdx = args.indexOf('--email');
    const fieldIdx = args.indexOf('--field');
    const email = emailIdx !== -1 ? args[emailIdx + 1] : undefined;
    const field = fieldIdx !== -1 ? args[fieldIdx + 1] : undefined;

    if (!email || !field) {
        console.error('Usage: --email <email> --field <email_verification_token|password_reset_code>');
        process.exit(1);
    }
    if (field !== 'email_verification_token' && field !== 'password_reset_code') {
        console.error(`Unsupported field: ${field}`);
        process.exit(1);
    }

    const customer = await prismaDb.customer.findFirst({
        where: { email },
        select: { email_verification_token: true, password_reset_code: true },
    });

    console.log(customer ? String(customer[field] ?? 'null') : 'null');
    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
