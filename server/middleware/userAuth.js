const jwt = require("jsonwebtoken");
const { validateSession } = require("../utils/sessionManager");

const userAuth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.id;

    if (!decoded.sessionId) {
      return res.status(401).json({ msg: "Session invalid. Please log in again." });
    }

    const sessionCheck = await validateSession(
      userId,
      decoded.sessionId,
      decoded.deviceId,
    );

    if (!sessionCheck.valid) {
      return res.status(401).json({ msg: sessionCheck.msg });
    }

    req.user = {
      id: userId,
      name: decoded.name,
      username: decoded.username,
      role: decoded.role,
      company: decoded.company,
      sessionId: decoded.sessionId,
      deviceId: decoded.deviceId,
      mustChangePassword: decoded.mustChangePassword,
    };

    next();
  } catch (err) {
    return res.status(401).json({ msg: "Token invalid" });
  }
};

module.exports = userAuth;
