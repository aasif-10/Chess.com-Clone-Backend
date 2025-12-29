const userModel = require("../models/user-model");
const passport = require("passport");

module.exports.localSignup = async function (req, res) {
  try {
    var userData = new userModel({
      name: req.body.name,
    });

    await userModel
      .register(userData, req.body.password)
      .then(function (registeredUser) {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/users/game");
        });
      });
  } catch (err) {
    res.redirect("/users/signin");
  }
};
