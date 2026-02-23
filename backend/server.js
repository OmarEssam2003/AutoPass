require('dotenv').config();
const app  = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`🚗  AutoPass Backend`);
  console.log(`🌐  Server     : http://localhost:${PORT}`);
  console.log(`📚  API Docs   : http://localhost:${PORT}/api-docs`);
  console.log(`❤️   Health     : http://localhost:${PORT}/health`);
  console.log(`🛠   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('─────────────────────────────────────────');
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Ensures DB connections are properly closed when the process is terminated,
// preventing connection leaks in production.
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await pool.end();
    console.log('PostgreSQL pool closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections — log and exit cleanly
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});