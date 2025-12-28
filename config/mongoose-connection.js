const mongoose = require("mongoose");
const config = require("config");

mongoose
  .connect(`${config.get("MONGODB_URI")}`)
  .then(function () {
    console.log("db connected");
  })
  .catch(function (err) {
    console.log(err);
  });
