const mongoose = require("mongoose");
const userModel = require("./models/user-model");
const { Chess } = require("chess.js"); //Chess class from chess.js
const sharedSession = require("express-socket.io-session");

let rooms = {}; // roomId -> {chessInstance, players: {white: socketId, black: socketId}}
let waitingRoom = null;
let disconnectedUser = {};

module.exports = (io, session) => {
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

    let userid = null;
    let username = null;
    if (mongoose.isValidObjectId(userId)) {
      userid = userId;
    } else {
      username = userId;
    }

    let existingRoomId = null;
    let existingRole = null;

    for (const rid in rooms) {
      const room = rooms[rid];
      const isWhite =
        (userid &&
          room.players.white?.userId?.toString() === userid.toString()) ||
        (username && room.players.white?.name === username);
      const isBlack =
        (userid &&
          room.players.black?.userId?.toString() === userid.toString()) ||
        (username && room.players.black?.name === username);

      if (isWhite) {
        existingRoomId = rid;
        existingRole = "w";
        room.players.white.socketId = socket.id;
        break;
      }
      if (isBlack) {
        existingRoomId = rid;
        existingRole = "b";
        room.players.black.socketId = socket.id;
        break;
      }
    }

    if (existingRoomId) {
      // Clear any pending disconnection timeout for this user (using canonical string ID)
      const stringId = String(userId);
      if (disconnectedUser[stringId]) {
        clearTimeout(disconnectedUser[stringId]);
        delete disconnectedUser[stringId];
      }

      // Also clear by username just in case
      if (username && disconnectedUser[username]) {
        clearTimeout(disconnectedUser[username]);
        delete disconnectedUser[username];
      }

      socket.join(existingRoomId);
      socket.emit("playerRole", existingRole);
      socket.emit("roomJoined", existingRoomId);
      socket.emit("boardState", rooms[existingRoomId].chess.fen());
      socket.emit("startGame");
      socket.emit("playersInfo", {
        white: rooms[existingRoomId].players.white,
        black: rooms[existingRoomId].players.black,
      });

      // Notify the other player that this player has reconnected
      socket.to(existingRoomId).emit("opponentReconnected");
    } else {
      let user;
      if (mongoose.isValidObjectId(userId)) {
        user = await userModel.findById(userId);
      } else {
        user = await userModel.findOne({ name: userId });
      }

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
      const userId = socket.handshake.session.passport?.user;
      if (!userId) return;

      const stringId = String(userId);
      disconnectedUser[stringId] = setTimeout(() => {
        for (const roomId in rooms) {
          const room = rooms[roomId];

          if (
            room.players.white?.socketId === socket.id ||
            room.players.black?.socketId === socket.id
          ) {
            io.to(roomId).emit("gameOver");

            delete rooms[roomId];
            if (waitingRoom === roomId) waitingRoom = null;
            break;
          }
        }
        delete disconnectedUser[stringId];
      }, 20000); // 20 seconds grace period
    });
  });
};
