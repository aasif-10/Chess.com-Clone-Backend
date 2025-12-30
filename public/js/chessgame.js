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
  roomId = id;
});
socket.on("playerRole", (role) => {
  playerRole = role;
});

socket.on("boardState", (fen) => {
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
  waitingElement.classList.remove("hidden");
  boardElement.classList.add("hidden");
  const userInfoElement = document.getElementById("user-info");
  userInfoElement.classList.add("hidden");
});

socket.on("startGame", () => {
  waitingElement.classList.add("hidden");
  boardElement.classList.remove("hidden");
  const userInfoElement = document.getElementById("user-info");
  userInfoElement.classList.remove("hidden");
});

socket.on("playersInfo", (players) => {
  document.getElementById("whitePlayer").textContent = players.white.name;
  document.getElementById("blackPlayer").textContent = players.black.name;
});
