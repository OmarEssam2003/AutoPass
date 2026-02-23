const authService = require('./auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    return res.status(200).json({
      status:  'success',
      message: 'Login successful.',
      token:   result.token,
      account: result.account,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };