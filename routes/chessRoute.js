const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares/isLoggedIn");
const { localSignup } = require("../controllers/localSignup");
const userModel = require("../models/user-model");
const passport = require("passport");

router.get("/signup", (req, res) => {
  res.render("signup");
});

router.get("/signin", (req, res) => {
  res.render("signin");
});

router.post("/signup", localSignup);

router.post(
  "/signin",
  passport.authenticate("local", {
    successRedirect: "/users/game",
    failureRedirect: "/users/signup",
  })
);

router.get("/game", isLoggedIn, (req, res) => {
  res.render("index", { user: req.user });
});

module.exports = router;
