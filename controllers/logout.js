module.exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      res.clearCookie("connect.sid");
      res.redirect("/users/signin");
    });
  });
};
