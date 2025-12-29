const mongoose = require("mongoose");
const plm = require("passport-local-mongoose").default;

const userSchema = mongoose.Schema({
  googleId: {
    type: String,
  },
  name: String,
  password: String,
  email: String,
  photo: String,
});

userSchema.plugin(plm, { usernameField: "name" });

module.exports = mongoose.model("user", userSchema);
