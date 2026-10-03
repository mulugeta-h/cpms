const bcrypt = require("bcrypt");
const User = require("../models/User");

const createSuperAdmin = async () => {
  try {
    // Check if a super admin already exists
    const existing = await User.findOne({ role: "SUPER_ADMIN" });

    if (existing) {
      console.log("✅ Super Admin already exists.");
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash("12345678", 10);

    // Create the super admin
    const admin = new User({
      name: "Mulugeta Haile",
      username: "anbesa",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      enabled: true
    });

    await admin.save();

    console.log("✅ Super Admin created successfully.");
    console.log("Username: anbesa");
    console.log("Password: 12345678");
  } catch (err) {
    console.error("❌ Error creating Super Admin:", err);
  }
};

module.exports = { createSuperAdmin };