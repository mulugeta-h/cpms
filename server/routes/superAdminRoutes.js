const express = require("express");
const router = express.Router();

const userAuth = require("../middleware/userAuth");
const superAdminController = require("../controllers/superAdminController");

// Apply authentication to every route below
router.use(userAuth);

// Create user (ADMIN or USER)
router.post("/create-user", superAdminController.createUser);

// Get all users (every role: SUPER_ADMIN, ADMIN, USER)
router.get("/users", superAdminController.getAllUsers);

// Dashboard statistics
router.get("/dashboard", superAdminController.getDashboardStats);

// Update user
router.put("/user/:id", superAdminController.updateUser);

// Delete user
router.delete("/user/:id", superAdminController.deleteUser);

// Toggle user status
router.patch("/toggle-status/:id", superAdminController.toggleUserStatus);

module.exports = router;