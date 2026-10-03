
const express = require("express");

const router = express.Router();

const auth = require("../middleware/userAuth");

const {
  login,
  logout,
  changePassword,
} = require("../controllers/userController");

// Login
router.post("/login", login);

// Logout
router.post("/logout", auth, logout);

// Change password
router.patch("/change-password", auth, changePassword);

module.exports = router;

