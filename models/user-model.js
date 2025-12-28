const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  googleId: {
    type: String,
    required: true,
  },
  name: String,
  email: String,
  photo: String,
});

module.exports = mongoose.model("user", userSchema);
