const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, trim: true,lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["SUPER_ADMIN", "ADMIN", "USER"],
    required: true
  },
  enabled: {
  type: Boolean, required: true, default: true
},

  createdAt: { type: Date, default: Date.now },

});

// Hash password
userSchema.pre("save", async function (next) {

  if (!this.isModified("password")) return next();

  // skip hashing if already bcrypt hash
  if (this.password.startsWith("$2")) return next();

  this.password = await bcrypt.hash(this.password, 10);

  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
