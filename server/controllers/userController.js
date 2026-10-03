
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const {
  validateComplexPassword,
  isDefaultPassword,
} = require("../utils/passwordValidation");

const {
  createSession,
  invalidateSession,
} = require("../utils/sessionManager");

// Generate JWT
function signUserToken(user, mustChangePassword, sessionId, deviceId) {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      role: user.role,
      username: user.username,
      mustChangePassword,
      sessionId,
      deviceId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

// ==========================
// LOGIN
// ==========================
const login = async (req, res) => {
  try {
    const { username, password, deviceId } = req.body;

    console.log("Login:", username);

    // Device ID required
    if (!deviceId) {
      return res.status(400).json({
        msg: "Device ID is required.",
      });
    }

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        msg: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({
        msg: "Wrong password",
      });
    }

    // Create session
    const { sessionToken } = await createSession(
      user._id,
      deviceId,
      req.ip,
      req.get("user-agent")
    );

    // Check if default password
    const mustChangePassword = await isDefaultPassword(user);

    // Generate JWT
    const token = signUserToken(
      user,
      mustChangePassword,
      sessionToken,
      deviceId
    );

    res.json({
      token,
      name: user.name,
      username: user.username,
      company: user.company,
      role: user.role,
      mustChangePassword,
    });
  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      msg: "Server error",
    });
  }
};

// ==========================
// LOGOUT
// ==========================
const logout = async (req, res) => {
  try {
    await invalidateSession(req.user.id);

    res.json({
      msg: "Logged out successfully.",
    });
  } catch (err) {
    console.error("Logout error:", err);

    res.status(500).json({
      msg: err.message,
    });
  }
};

// ==========================
// CHANGE PASSWORD
// ==========================
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate fields
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        msg: "Please fill all fields.",
      });
    }

    // Validate new password complexity
    const validation = validateComplexPassword(newPassword);

    if (!validation.valid) {
      return res.status(400).json({
        msg: validation.msg,
      });
    }

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        msg: "User not found.",
      });
    }

    // Check old password
    const isMatch = await user.matchPassword(oldPassword);

    if (!isMatch) {
      return res.status(400).json({
        msg: "Old password is incorrect.",
      });
    }

    // Prevent same password
    if (oldPassword === newPassword) {
      return res.status(400).json({
        msg: "New password cannot be the same as old password.",
      });
    }

    // Update password
    user.password = newPassword;

    await user.save();

    // Generate new JWT
    const token = signUserToken(
      user,
      false,
      req.user.sessionId,
      req.user.deviceId
    );

    res.json({
      msg: "Password changed successfully!",
      token,
      mustChangePassword: false,
    });
  } catch (err) {
    console.error("Password change error:", err);

    res.status(500).json({
      msg: "Server error. Please try again.",
    });
  }
};

module.exports = {
  login,
  logout,
  changePassword,
};

