const mongoose = require("mongoose");

let isConnecting = false;
let reconnectTimer = null;

const connectDB = async () => {
  if (isConnecting) return;

  try {
    isConnecting = true;

    console.log('🔄 Attempting to connect to MongoDB...');
    console.log(
      'MongoDB URI:',
      process.env.MONGO_URI_0 ? '✓ Present' : '✗ Missing'
    );

    const conn = await mongoose.connect(process.env.MONGO_URI_0, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    isConnecting = false;

    // Clear retry timer if connected
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    return conn;

  } catch (err) {
    isConnecting = false;

    console.error(`❌ MongoDB Connection Error: ${err.message}`);

    console.log('⏰ Retrying connection in 5 seconds...');
    reconnectTimer = setTimeout(connectDB, 5000);
  }
};


/* =========================
   🔔 CONNECTION EVENTS
========================= */

mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('🔌 MongoDB disconnected');

  // Reconnect automatically
  if (!reconnectTimer) {
    console.log('🔄 Attempting reconnection in 5 seconds...');
    reconnectTimer = setTimeout(connectDB, 5000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('🔁 MongoDB reconnected');
});


/* =========================
   🛡️ GLOBAL ERROR HANDLING
========================= */

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
});      


module.exports = connectDB;