const mongoose = require("mongoose");
const config = require("config");
const db_connection = process.env.MONGODB_URI;
mongoose
  .connect(db_connection)
  .then(function () {
    console.log("db connected");
  })
  .catch(function (err) {
    console.log(err);
  });
