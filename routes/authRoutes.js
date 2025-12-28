const express = require("express");
const router = express.Router();
const passport = require("passport");
const { authCallback } = require("../controllers/handleAuthenticateCallback");
const { logout } = require("../controllers/logout");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/users/signup",
  }),
  authCallback
);

router.get("/logout", logout);

module.exports = router;
