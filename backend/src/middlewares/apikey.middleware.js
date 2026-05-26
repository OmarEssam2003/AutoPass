/**
 * DEVICE API KEY MIDDLEWARE
 *
 * Used exclusively by Raspberry Pi / ANPR camera devices to POST detection events.
 * Each device sends a static key in the `x-api-key` header.
 * The key is stored in the environment as DEVICE_API_KEY.
 *
 * This is intentionally separate from JWT auth — devices don't log in,
 * they just carry a pre-shared key that never expires.
 *
 * To rotate the key: update DEVICE_API_KEY in .env and restart the server.
 * All devices must then be reconfigured with the new key.
 */
const validateApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];

  if (!key) {
    return res.status(401).json({
      status:  'error',
      message: 'Missing API key. Provide the device key in the x-api-key header.',
    });
  }

  if (key !== process.env.DEVICE_API_KEY) {
    return res.status(403).json({
      status:  'error',
      message: 'Invalid API key.',
    });
  }

  next();
};

module.exports = { validateApiKey };