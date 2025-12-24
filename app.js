const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { Chess } = require("chess.js"); //Chess class from chess.js
const path = require("path");

const chess = new Chess();

const app = express();
const server = http.createServer(app); //create HTTP server
const io = socket(server); // bind socket.io to that server

// routes
const chessRoute = require("./routes/chessRoute");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use("/", chessRoute);

io.on("connection", (socket) => {
  //socket - unique info about each connection/user
  console.log("new user connected");
  //but frontend also needs to have socket.io library
});

server.listen(3000, function () {
  console.log("server is running");
});
