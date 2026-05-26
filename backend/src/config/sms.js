const twilio = require('twilio');

/**
 * SECURITY: SMS OTP Delivery via Twilio
 *
 * How it secures the system:
 * - OTP is sent to the vehicle's REGISTERED owner phone number, not the claimant
 * - This proves the claimant has physical access to the owner's phone
 * - The OTP itself is never stored in plaintext — only its bcrypt hash is in the DB
 * - In trial mode, Twilio only sends to verified numbers (safe for development)
 *
 * DEV MODE OVERRIDES (see .env):
 * - DEV_FIXED_OTP=true            → always skip Twilio, accept DEV_OTP_VALUE
 * - DEV_OTP_FALLBACK_ON_FAIL=true → if Twilio fails (e.g. trial daily limit
 *                                   exceeded, invalid number), automatically
 *                                   fall back to the fixed OTP instead of
 *                                   returning 502
 * - DEV_OTP_VALUE=123456          → the fixed OTP (defaults to "123456")
 *
 * IMPORTANT: when this returns `{ dev: true, otp }` or `{ devFallback: true, otp }`,
 * the caller must use the returned `otp` field as the source of truth — that is
 * the OTP the user will actually enter in the app. The caller is responsible for
 * hashing THAT value, not the one passed in.
 */

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Dev-mode flags
const DEV_FIXED_OTP            = process.env.DEV_FIXED_OTP === 'true';
const DEV_OTP_FALLBACK_ON_FAIL = process.env.DEV_OTP_FALLBACK_ON_FAIL === 'true';
const DEV_OTP_VALUE            = process.env.DEV_OTP_VALUE || '123456';

// Only initialize Twilio client if credentials are present
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

const sendOTPSms = async (toPhoneNumber, otp, plateNumber) => {
  // ── DEV MODE: always use fixed OTP, never call Twilio ────────────────────
  if (DEV_FIXED_OTP) {
    console.log('─────────────────────────────────────────────────');
    console.log('🛠️  [DEV_FIXED_OTP] Twilio bypassed');
    console.log(`   To      : ${toPhoneNumber}`);
    console.log(`   Vehicle : ${plateNumber}`);
    console.log(`   OTP     : ${DEV_OTP_VALUE}  ← use this in the app`);
    console.log('─────────────────────────────────────────────────');
    return { dev: true, otp: DEV_OTP_VALUE };
  }

  const message =
    `AutoPass: A request was made to claim ownership of vehicle ${plateNumber}. ` +
    `Your verification code is: ${otp}. ` +
    `It expires in 15 minutes. If this wasn't you, ignore this message.`;

  // ── Twilio not configured — log to console for local dev ─────────────────
  if (!client) {
    console.log('─────────────────────────────────────────────────');
    console.log('📱 [DEV MODE] SMS not sent — Twilio not configured');
    console.log(`   To      : ${toPhoneNumber}`);
    console.log(`   Vehicle : ${plateNumber}`);
    console.log(`   OTP     : ${otp}`);
    console.log('─────────────────────────────────────────────────');
    return { dev: true, otp };
  }

  // ── Send real SMS via Twilio ──────────────────────────────────────────────
  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to:   toPhoneNumber,
    });
    console.log(`✅ OTP SMS sent to ${toPhoneNumber} — SID: ${result.sid}`);
    return { sent: true, sid: result.sid, otp };
  } catch (err) {
    console.error('❌ Twilio SMS failed:', err.message);

    // ── DEV MODE FALLBACK: Twilio failed → use fixed OTP instead of 502 ────
    if (DEV_OTP_FALLBACK_ON_FAIL) {
      console.log('─────────────────────────────────────────────────');
      console.log('🛠️  [DEV_OTP_FALLBACK_ON_FAIL] Twilio failed → using fixed OTP');
      console.log(`   To      : ${toPhoneNumber}`);
      console.log(`   Vehicle : ${plateNumber}`);
      console.log(`   Reason  : ${err.message}`);
      console.log(`   OTP     : ${DEV_OTP_VALUE}  ← use this in the app`);
      console.log('─────────────────────────────────────────────────');
      return { devFallback: true, otp: DEV_OTP_VALUE };
    }

    const error = new Error(
      'Failed to send OTP SMS. Please check the phone number is valid and try again.'
    );
    error.statusCode = 502;
    throw error;
  }
};

module.exports = { sendOTPSms };
