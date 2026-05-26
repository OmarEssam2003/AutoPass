/**
 * dashboard.router.js
 *
 * Serves the AutoPass admin dashboard from Express.
 *
 * Mount in app.js BEFORE your /api routes:
 *
 *   const dashboardRouter = require('./dashboard.router');
 *   app.use('/dashboard', dashboardRouter);
 *
 * Then open: http://localhost:3000/dashboard
 */

const express = require('express');
const path    = require('path');
const router  = express.Router();

// ── Dashboard folder: D:\CE Courses For GU\autopass-dashboard ────────────────
// __dirname is  D:\CE Courses For GU\backend\src
// So go up 2 levels (..\.. = D:\CE Courses For GU), then into autopass-dashboard
const DASHBOARD_DIR = path.join(__dirname, '..', '..', 'autopass-dashboard');

// ── Serve static assets (css/, js/, pages/, images/) ─────────────────────────
router.use(express.static(DASHBOARD_DIR));

// ── GET /dashboard  →  index.html ─────────────────────────────────────────────
router.get('/', (req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, 'index.html'));
});

// ── GET /dashboard/pages/:page  →  pages/<page>.html ─────────────────────────
router.get('/pages/:page', (req, res, next) => {
  const safeName = path.basename(req.params.page); // prevents path traversal
  res.sendFile(path.join(DASHBOARD_DIR, 'pages', safeName), err => {
    if (err) next(); // let Express handle 404
  });
});

module.exports = router;
