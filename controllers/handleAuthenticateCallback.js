module.exports.authCallback = (req, res) => {
  req.session.save((err) => {
    if (err) return res.redirect("/users/signin");
    res.redirect("/users/game");
  });
};
