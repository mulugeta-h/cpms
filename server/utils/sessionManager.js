const crypto = require("crypto");
const Session = require("../models/Session");

const INACTIVITY_MS = 15 * 60 * 1000;

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createSession(userId, deviceId, ipAddress, userAgent) {
  const sessionToken = createSessionToken();

  const session = await Session.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      refreshToken: sessionToken,
      deviceId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      lastActivity: new Date(),
      lastLoginAt: new Date(),
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
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

  const inactiveMs = Date.now() - new Date(session.lastActivity).getTime();
  if (inactiveMs > INACTIVITY_MS) {
    session.isActive = false;
    session.lastLogoutAt = new Date();
    await session.save();
    return { valid: false, msg: "Session expired due to inactivity." };
  }

  session.lastActivity = new Date();
  await session.save();

  return { valid: true, session };
}

async function invalidateSession(userId) {
  await Session.findOneAndUpdate(
    { user: userId },
    { isActive: false, lastLogoutAt: new Date() },
  );
}

module.exports = {
  INACTIVITY_MS,
  createSession,
  validateSession,
  invalidateSession,
};
