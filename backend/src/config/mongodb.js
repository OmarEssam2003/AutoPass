const { MongoClient } = require('mongodb');

let db = null;

const connectMongoDB = async () => {
  if (db) return db;

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB_NAME || 'autopass');
  console.log('✅ MongoDB connected:', db.databaseName);
  return db;
};

const getMongoDB = () => {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return db;
};

module.exports = { connectMongoDB, getMongoDB };