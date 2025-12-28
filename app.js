require("dotenv").config();

const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { Chess } = require("chess.js"); //Chess class from chess.js
const path = require("path");
const passport = require("passport");
const expressSession = require("express-session");
const sharedSession = require("express-socket.io-session");
const passportConfig = require("./config/passport-config");
passportConfig(passport);
const mongooseConnection = require("./config/mongoose-connection");
const userModel = require("./models/user-model");

const app = express();
const server = http.createServer(app); //create HTTP server
const io = socket(server); // bind socket.io to that server

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

const session = expressSession({
  secret: "someSecret",
  resave: false,
  saveUninitialized: true,
});

app.use(session);
app.use(passport.initialize());
app.use(passport.session());

// routes
const chessRoute = require("./routes/chessRoute");
const authRoutes = require("./routes/authRoutes");

app.use("/users", chessRoute);
app.use("/auth", authRoutes);

let rooms = {}; // roomId -> {chessInstance, players: {white: socketId, black: socketId}}
let waitingRoom = null;

io.use(
  sharedSession(session, {
    autoSave: true,
  })
);

io.on("connection", async (socket) => {
  const userId = socket.handshake.session.passport?.user;
  if (!userId) {
    socket.emit("error", "not authenticated!");
    return;
  }

  const user = await userModel.findById(userId);

  if (!waitingRoom) {
    let roomId = `room-${socket.id}`;
    waitingRoom = roomId;

    rooms[roomId] = {
      chess: new Chess(),
      players: {
        white: {
          socketId: socket.id,
          userId: user._id,
          name: user.name,
          photo: user.photo,
        },
        black: null,
      },
    };

    socket.join(roomId);
    socket.emit("playerRole", "w");
    socket.emit("roomJoined", roomId);
    socket.emit("waiting");
  } else {
    let roomId = waitingRoom;
    let room = rooms[roomId];
    room.players.black = {
      socketId: socket.id,
      userId: user._id,
      name: user.name,
      photo: user.photo,
    };
    socket.join(roomId);
    socket.emit("playerRole", "b");
    socket.emit("roomJoined", roomId);

    io.to(roomId).emit("boardState", rooms[roomId].chess.fen());
    waitingRoom = null;
    io.to(roomId).emit("startGame");

    io.to(roomId).emit("playersInfo", {
      white: room.players.white,
      black: room.players.black,
    });
  }

  // making a move
  socket.on("move", ({ move, roomId }) => {
    try {
      const room = rooms[roomId];
      const chess = room.chess;
      const players = room.players;

      if (!players.white.socketId || !players.black.socketId) {
        socket.emit("waitingForOpponent");
        return;
      }

      if (chess.turn() == "w" && socket.id != players.white.socketId) return;
      if (chess.turn() == "b" && socket.id != players.black.socketId) return;

      const result = chess.move(move); // null if invalid move
      if (result) {
        io.to(roomId).emit("boardState", chess.fen());
        const isCheckmate = chess.isCheckmate();
        if (isCheckmate) {
          io.to(roomId).emit("checkmate", {
            winner: chess.turn() === "w" ? "b" : "w",
          });
        }
      } else {
        socket.emit("invalidMove");
      }
    } catch (err) {
      console.log(err);
    }
  });

  // player disconnection
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (
        room.players.white.socketId === socket.id ||
        room.players.black.socketId === socket.id
      ) {
        io.to(roomId).emit("gameOver");

        delete rooms[roomId];
        if (waitingRoom === roomId) waitingRoom = null;
        break;
      }
    }
  });
});

server.listen(3000, function () {
  console.log("server is running");
});
