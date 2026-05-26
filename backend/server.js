require('dotenv').config();
const app  = require('./src/app');
const pool = require('./src/config/db');
const { connectMongoDB } = require('./src/config/mongodb');

const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP — wait for MongoDB THEN start the HTTP server
// Previously connectMongoDB() was fire-and-forget so the server started
// before MongoDB was ready, causing getMongoDB() to throw on first request.
// ─────────────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectMongoDB();
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log(`🚗  AutoPass Backend`);
    console.log(`🌐  Server     : http://localhost:${PORT}`);
    console.log(`📚  API Docs   : http://localhost:${PORT}/api-docs`);
    console.log(`❤️   Health     : http://localhost:${PORT}/health`);
    console.log(`🛠   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('─────────────────────────────────────────');
  });

  // ── Graceful Shutdown ───────────────────────────────────────────────────────
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

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
};

start();