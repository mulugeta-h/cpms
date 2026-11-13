const crypto = require("crypto");
const Session = require("../models/Session");

const INACTIVITY_MS = 1 * 60 * 1000;

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createSession(userId, deviceId, ipAddress, userAgent) {
  const sessionToken = createSessionToken();
  const now = new Date();

  const session = await Session.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        user: userId,
        refreshToken: sessionToken,
        deviceId,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        lastActivity: now,
        lastIn: now,       // 👈 was "lastLoginAt" — not in schema
        lastSeen: now,     // 👈 was missing entirely
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { session, sessionToken };
}

async function validateSession(userId, sessionId, deviceId) {
  const session = await Session.findOne({ user: userId });

  if (!session || !session.isActive) {
    return { valid: false, msg: "Session expired. Please log in again." };
  }

  if (session.refreshToken !== sessionId) {
    return { valid: false, msg: "Logged in on another device." };
  }

  if (deviceId && session.deviceId !== deviceId) {
    return { valid: false, msg: "Session invalid. Please log in again." };
  }

  const now = new Date();
  const inactiveMs = now - new Date(session.lastActivity).getTime();

  if (inactiveMs > INACTIVITY_MS) {
    session.isActive = false;
    session.lastSeen = now;
    await session.save();
    return { valid: false, msg: "Session expired due to inactivity." };
  }

  session.lastActivity = now;
  session.lastSeen = now;   // 👈 heartbeat on every request
  await session.save();

  return { valid: true, session };
}

async function invalidateSession(userId) {
  await Session.findOneAndUpdate(
    { user: userId },
    { $set: { isActive: false, lastSeen: new Date() } }
  );
}

module.exports = {
  INACTIVITY_MS,
  createSession,
  validateSession,
  invalidateSession,
};