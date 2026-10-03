const express = require("express");
const User = require("../models/User");
const userAuth = require("../middleware/userAuth");
const router = express.Router();

// Create user (both ADMIN and USER) - SUPER_ADMIN only
router.post("/create-user", userAuth, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN")
      return res.status(403).json({ msg: "Forbidden" });

    const { name, username, password, role, enabled } = req.body;
    
    if (!username || !password)
      return res.status(400).json({ msg: "Username and password required" });

    if (!name)
      return res.status(400).json({ msg: "Name is required" });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ msg: "User already exists" });

    const validRoles = ["ADMIN", "USER"];
    const userRole = role && validRoles.includes(role) ? role : "USER";

    const user = new User({
      name,
      username,
      password,
      role: userRole,
      enabled: enabled !== undefined ? enabled : true
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      msg: `${userRole} created successfully`, 
      user: userResponse 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
});

// ============ GET ALL USERS ============
router.get("/users", userAuth, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN"&&req.user.role !== "ADMIN") 
      return res.status(403).json({ msg: "Forbidden" });

    // Get all users EXCEPT SUPER_ADMIN
    const users = await User.find({ 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ msg: err.message });
  }
});

// ============ GET ALL ADMINS (Excluding SUPER_ADMIN) ============
router.get("/admins", userAuth, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") 
      return res.status(403).json({ msg: "Forbidden" });

    // Get only ADMIN role (excluding SUPER_ADMIN)
    const admins = await User.find({ 
      role: "ADMIN" 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: admins
    });
  } catch (err) {
    console.error("Error fetching admins:", err);
    res.status(500).json({ msg: err.message });
  }
});

// ============ GET ALL USERS (Only USER role) ============
router.get("/users-only", userAuth, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") 
      return res.status(403).json({ msg: "Forbidden" });

    // Get only USER role
    const users = await User.find({ 
      role: "USER" 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ msg: err.message });
  }
});

// ============ DASHBOARD STATISTICS ============
router.get("/dashboard", userAuth, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") 
      return res.status(403).json({ msg: "Forbidden" });

    const allUsers = await User.find({});
    
    // Separate by role (SUPER_ADMIN is separate)
    const superAdmins = allUsers.filter(u => u.role === "SUPER_ADMIN");
    const admins = allUsers.filter(u => u.role === "ADMIN");
    const users = allUsers.filter(u => u.role === "USER");

    // User status (only USER role)
    const userStatus = {
      active: users.filter(u => u.enabled === true).length,
      inactive: users.filter(u => u.enabled === false).length,
    };

    // Admin status (only ADMIN role, excluding SUPER_ADMIN)
    const adminStatus = {
      active: admins.filter(u => u.enabled === true).length,
      inactive: admins.filter(u => u.enabled === false).length,
    };

    // SUPER_ADMIN status
    const superAdminStatus = {
      active: superAdmins.filter(u => u.enabled === true).length,
      inactive: superAdmins.filter(u => u.enabled === false).length,
    };

    // Total records
    const totalRecords = allUsers.length;

    const dashboardData = {
      users: {
        total: users.length,
        status: userStatus,
      },
      admins: {
        total: admins.length,
        status: adminStatus,
      },
      superAdmins: {
        total: superAdmins.length,
        status: superAdminStatus,
      },
      totalRecords: totalRecords,
      summary: {
        totalActive: allUsers.filter(u => u.enabled === true).length,
        totalInactive: allUsers.filter(u => u.enabled === false).length,
        totalUsersAndAdmins: users.length + admins.length,
        totalAllUsers: allUsers.length,
      }
    };

    res.json(dashboardData);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ msg: err.message });
  }
});

// ============ UPDATE USER ============
router.put("/user/:id", userAuth, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") 
      return res.status(403).json({ msg: "Forbidden" });

    const { name, username, password, role, enabled } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ msg: "Cannot modify SUPER_ADMIN" });
    }

    if (name) user.name = name;
    if (username) user.username = username;
    if (password) user.password = password;
    if (enabled !== undefined) user.enabled = enabled;
    
    if (role) {
      const validRoles = ["ADMIN", "USER"];
      if (validRoles.includes(role)) {
        user.role = role;
      } else {
        return res.status(400).json({ msg: "Invalid role. Must be ADMIN or USER" });
      }
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ msg: "User updated successfully", user: userResponse });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============ DELETE USER ============
router.delete("/user/:id", userAuth, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN")
      return res.status(403).json({ msg: "Forbidden" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ msg: "Cannot delete SUPER_ADMIN" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============ TOGGLE USER STATUS ============
router.patch("/toggle-status/:id", userAuth, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") 
      return res.status(403).json({ msg: "Forbidden" });

    const { enabled } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ msg: "Cannot modify SUPER_ADMIN" });
    }

    if (enabled !== undefined) {
      user.enabled = enabled;
      await user.save();
    }

    res.json({ 
      msg: `User ${user.enabled ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        enabled: user.enabled
      }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;