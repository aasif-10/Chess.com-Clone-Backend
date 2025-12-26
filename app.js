const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { Chess } = require("chess.js"); //Chess class from chess.js
const path = require("path");
const chess = new Chess();

let players = {};

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
  //   console.log("new user connected");
  //but frontend also needs to have socket.io library
  //   socket.on("choco", function () {
  //     console.log("choco received");
  //     //io.emit - send to all users
  //     //socket.emit - send to that particular user
  //     io.emit("chocoRes");
  //   });

  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b"); // (event name, data)
  } else {
    socket.emit("playerRole", null);
  }

  // player disconnection
  socket.on("disconnect", () => {
    if (players.white == socket.id) {
      delete players.white;
    } else if (players.black == socket.id) {
      delete players.black;
    }

    chess.reset();
    io.emit("boardState", chess.fen());
  });

  // making a move

  socket.on("move", (move) => {
    try {
      if (chess.turn() == "w" && socket.id != players.white) return;
      if (chess.turn() == "b" && socket.id != players.black) return;
      if (socket.id != players.white && socket.id != players.black) return;

      const result = chess.move(move); // null if invalid move
      if (result) {
        io.emit("boardState", chess.fen());
      } else {
        socket.emit("invalidMove", move);
      }
    } catch (err) {
      console.log(err);
    }
  });
});

server.listen(3000, function () {
  console.log("server is running");
});
