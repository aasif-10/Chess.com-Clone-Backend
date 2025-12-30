const socket = io();

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const waitingElement = document.getElementById("waitingScreen");

let roomId = null;
let draggedPiece = null;
let playerRole = null;
let sourceSquare = null;

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = squareIndex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerHTML = `<img src="/images/${
          square.color
        }${square.type.toUpperCase()}.png" alt="${square.color}${
          square.type
        }">`;
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: squareIndex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(sourceSquare, targetSource);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

const handleMove = (source, target) => {
  const move = {
    from: String.fromCharCode(97 + source.col) + (8 - source.row),
    to: String.fromCharCode(97 + target.col) + (8 - target.row),
    promotion: "q", // always promote to a queen for simplicity
  };

  socket.emit("move", { move, roomId });
};

socket.on("roomJoined", (id) => {
  console.log("Joined room:", id);
  roomId = id;
});

socket.on("playerRole", (role) => {
  console.log("Your role is:", role);
  playerRole = role;
});

socket.on("boardState", (fen) => {
  console.log("Board state updated");
  chess.load(fen);
  renderBoard();
});

socket.on("invalidMove", () => {
  alert("Invalid Move!");
});

socket.on("gameOver", () => {
  alert("Opponent Disconnected. Game Over.");
});

socket.on("opponentReconnected", () => {
  alert("Opponent reconnected! The game continues.");
});

socket.on("waitingForOpponent", () => {
  alert("Waiting for opponent to join...");
});

socket.on("checkmate", (winner) => {
  if (winner.winner === playerRole) {
    alert("Checkmate! You win!");
  } else {
    alert("Checkmate! You lose!");
  }
});

socket.on("waiting", () => {
  console.log("Client state: WAITING");
  if (waitingElement) waitingElement.classList.remove("hidden");
  if (boardElement) boardElement.classList.add("hidden");
  const userInfoElement = document.getElementById("user-info");
  if (userInfoElement) userInfoElement.classList.add("hidden");
});

socket.on("startGame", () => {
  console.log("Client state: START_GAME");
  if (waitingElement) waitingElement.classList.add("hidden");
  if (boardElement) boardElement.classList.remove("hidden");
  const userInfoElement = document.getElementById("user-info");
  if (userInfoElement) userInfoElement.classList.remove("hidden");
  renderBoard();
});

socket.on("playersInfo", (players) => {
  console.log("Updating players info:", players);
  const whiteP = document.getElementById("whitePlayer");
  const blackP = document.getElementById("blackPlayer");

  // SAFE CHECKS: Prevent JS crash if players data is partial
  if (whiteP && players.white) {
    whiteP.textContent = players.white.name || "White";
  }
  if (blackP && players.black) {
    blackP.textContent = players.black.name || "Black";
  }
});

socket.on("connect", () => console.log("Socket connected to server"));
socket.on("connect_error", (err) =>
  console.error("Socket connection error:", err)
);
socket.on("error", (err) => console.error("Socket error:", err));
