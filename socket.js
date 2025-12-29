const userModel = require("./models/user-model");
const { Chess } = require("chess.js"); //Chess class from chess.js
const sharedSession = require("express-socket.io-session");

let rooms = {}; // roomId -> {chessInstance, players: {white: socketId, black: socketId}}
let waitingRoom = null;

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
};
