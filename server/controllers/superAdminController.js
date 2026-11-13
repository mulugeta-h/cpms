const User = require("../models/User");
const Session = require("../models/Session");

// Roles SUPER_ADMIN is allowed to CREATE / ASSIGN.
// SUPER_ADMIN itself is intentionally excluded.
const ASSIGNABLE_ROLES = [
  "ALL_ADMIN",
  "ALL_VIEW",
  "EST_ADMIN",
  "DC_ADMIN",
  "USER",
];

// ============ CREATE USER ============
const createUser = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN")
      return res.status(403).json({ msg: "Forbidden" });

    const { name, username, password, role, enabled } = req.body;

    if (!username || !password)
      return res.status(400).json({ msg: "Username and password required" });

    if (!name) return res.status(400).json({ msg: "Name is required" });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ msg: "User already exists" });

    const userRole =
      role && ASSIGNABLE_ROLES.includes(role) ? role : "USER";

    const user = new User({
      name,
      username,
      password,
      role: userRole,
      enabled: enabled !== undefined ? enabled : true,
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      msg: `${userRole} created successfully`,
      user: userResponse,
    });
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// ============ GET ALL USERS (every role) ============
const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN" && req.user.role !== "ALL_VIEW")
      return res.status(403).json({ msg: "Forbidden" });

    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// ============ DASHBOARD STATISTICS ============
const getDashboardStats = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN")
      return res.status(403).json({ msg: "Forbidden" });

    // ── 1. All users, grouped by role ─────────────────────────────
    const allUsers = await User.find({}).lean();

    const ROLES = [
      "SUPER_ADMIN",
      "ALL_ADMIN",
      "ALL_VIEW",
      "EST_ADMIN",
      "DC_ADMIN",
      "USER",
    ];

    const byRole = Object.fromEntries(
      ROLES.map((r) => [r, allUsers.filter((u) => u.role === r)])
    );

    const statusOf = (arr) => ({
      total: arr.length,
      active: arr.filter((u) => u.enabled === true).length,
      inactive: arr.filter((u) => u.enabled === false).length,
    });

    // ── 2. Active sessions ────────────────────────────────────────
    const SESSION_FRESH_MS = 30 * 60 * 1000; // 30 min
    const freshCutoff = new Date(Date.now() - SESSION_FRESH_MS);

    const sessions = await Session.find({
      isActive: true,
      lastIn: { $ne: null },
      lastActivity: { $gte: freshCutoff },
    })
      .populate("user", "name username role enabled")
      .sort({ lastActivity: -1 })
      .lean();

    const liveSessions = sessions.filter(
      (s) => s.user && s.user.enabled === true
    );

    const activeByRole = Object.fromEntries(
      ROLES.map((r) => [
        r,
        liveSessions.filter((s) => s.user.role === r).length,
      ])
    );

    const sessionList = liveSessions.map((s) => ({
      sessionId: s._id,
      userId: s.user._id,
      name: s.user.name,
      username: s.user.username,
      role: s.user.role,
      deviceId: s.deviceId,
      ipAddress: s.ipAddress || null,
      userAgent: s.userAgent || null,
      lastIn: s.lastIn,
      lastActivity: s.lastActivity,
      lastSeen: s.lastSeen,
    }));

    // ── 3. Recent sessions (last 100, any status) ─────────────────
    //    Sorted by last activity. Includes active, manual-logout,
    //    idle-expired, admin-killed, security-killed, etc.
    const RECENT_LIMIT = 100;

    const recentRaw = await Session.find({ lastIn: { $ne: null } })
      .populate("user", "name username role enabled")
      .sort({ lastActivity: -1 })
      .limit(RECENT_LIMIT)
      .lean();

    // Derive a status string per row so the UI doesn't need business
    // logic. Priority: explicit expiredReason > isActive+stale > active.
    const deriveStatus = (s) => {
      if (s.expiredReason) return s.expiredReason; // 'manual' | 'inactivity' | 'security' | 'admin' | ...
      if (!s.isActive) return "ended";             // flag off, no reason recorded
      const idleMs = Date.now() - new Date(s.lastActivity).getTime();
      if (idleMs > SESSION_FRESH_MS) return "stale"; // flag on but no recent activity
      return "active";
    };

    const recentList = recentRaw.map((s) => ({
      sessionId: s._id,
      userId: s.user?._id || null,
      name: s.user?.name || "—",
      username: s.user?.username || "—",
      role: s.user?.role || null,
      userEnabled: s.user?.enabled ?? null,
      deviceId: s.deviceId || null,
      ipAddress: s.ipAddress || null,
      userAgent: s.userAgent || null,
      lastIn: s.lastIn,
      lastActivity: s.lastActivity,
      lastSeen: s.lastSeen || null,
      expiredAt: s.expiredAt || null,
      expiredReason: s.expiredReason || null,
      isActive: !!s.isActive,
      status: deriveStatus(s),
    }));

    const recentByStatus = recentList.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    // ── 4. Response ───────────────────────────────────────────────
    res.json({
      // per-role status blocks
      superAdmins: statusOf(byRole.SUPER_ADMIN),
      allAdmins:   statusOf(byRole.ALL_ADMIN),
      allViews:    statusOf(byRole.ALL_VIEW),
      estAdmins:   statusOf(byRole.EST_ADMIN),
      dcAdmins:    statusOf(byRole.DC_ADMIN),
      users:       statusOf(byRole.USER),

      // overall totals
      totalRecords: allUsers.length,
      summary: {
        totalActive:   allUsers.filter((u) => u.enabled === true).length,
        totalInactive: allUsers.filter((u) => u.enabled === false).length,
        totalAllUsers: allUsers.length,
      },

      // active sessions block (unchanged)
      activeSessions: {
        total: liveSessions.length,
        byRole: activeByRole,
        list: sessionList,
        freshnessWindowMinutes: SESSION_FRESH_MS / 60000,
      },

      // recent sessions block (new)
      recentSessions: {
        total: recentList.length,
        limit: RECENT_LIMIT,
        byStatus: recentByStatus,
        list: recentList,
        freshnessWindowMinutes: SESSION_FRESH_MS / 60000,
      },
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ msg: err.message });
  }
};

//============ UPDATE USER ============
const updateUser = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN")
      return res.status(403).json({ msg: "Forbidden" });

    const { name, username, password, role, enabled } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "SUPER_ADMIN")
      return res.status(403).json({ msg: "Cannot modify SUPER_ADMIN" });

    if (name) user.name = name;
    if (username) user.username = username;
    if (password) user.password = password;
    if (enabled !== undefined) user.enabled = enabled;

    if (role) {
      if (!ASSIGNABLE_ROLES.includes(role))
        return res.status(400).json({
          msg: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
        });
      user.role = role;
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ msg: "User updated successfully", user: userResponse });
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// ============ DELETE USER ============
const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN")
      return res.status(403).json({ msg: "Forbidden" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "SUPER_ADMIN")
      return res.status(403).json({ msg: "Cannot delete SUPER_ADMIN" });

    // Clean up any sessions belonging to this user
    await Session.deleteMany({ user: user._id });

    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// ============ TOGGLE USER STATUS ============
const toggleUserStatus = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN")
      return res.status(403).json({ msg: "Forbidden" });

    const { enabled } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "SUPER_ADMIN")
      return res.status(403).json({ msg: "Cannot modify SUPER_ADMIN" });

    if (enabled !== undefined) {
      user.enabled = enabled;
      await user.save();

      // Disabling a user should kill their live sessions immediately
      if (enabled === false) {
        await Session.updateMany(
          { user: user._id, isActive: true },
          { $set: { isActive: false } }
        );
      }
    }

    res.json({
      msg: `User ${user.enabled ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        enabled: user.enabled,
      },
    });
  } catch (err) {
    console.error("toggleUserStatus error:", err);
    res.status(500).json({ msg: err.message });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getDashboardStats,
  updateUser,
  deleteUser,
  toggleUserStatus,
};