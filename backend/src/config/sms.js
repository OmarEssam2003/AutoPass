const twilio = require('twilio');

/**
 * SECURITY: SMS OTP Delivery via Twilio
 *
 * How it secures the system:
 * - OTP is sent to the vehicle's REGISTERED owner phone number, not the claimant
 * - This proves the claimant has physical access to the owner's phone
 * - The OTP itself is never stored in plaintext — only its bcrypt hash is in the DB
 * - In trial mode, Twilio only sends to verified numbers (safe for development)
 */

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Only initialize Twilio client if credentials are present
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Sends an OTP SMS to the given phone number.
 * Falls back to console.log if Twilio is not configured (safe for local dev).
 *
 * @param {string} toPhoneNumber - The recipient phone number (e.g. "+201001234567")
 * @param {string} otp           - The 6-digit OTP to send
 * @param {string} plateNumber   - The vehicle plate number (for context in the message)
 */
const sendOTPSms = async (toPhoneNumber, otp, plateNumber) => {
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
    return { dev: true, otp }; // return OTP so it can be included in dev response
  }

  // ── Send real SMS via Twilio ──────────────────────────────────────────────
  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to:   toPhoneNumber,
    });
    console.log(`✅ OTP SMS sent to ${toPhoneNumber} — SID: ${result.sid}`);
    return { sent: true, sid: result.sid };
  } catch (err) {
    // Log the Twilio error but don't crash the request
    // Instead throw a user-friendly error
    console.error('❌ Twilio SMS failed:', err.message);
    const error = new Error(
      'Failed to send OTP SMS. Please check the phone number is valid and try again.'
    );
    error.statusCode = 502;
    throw error;
  }
};

module.exports = { sendOTPSms };