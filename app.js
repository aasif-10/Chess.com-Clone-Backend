require("dotenv").config();

// const
const express = require("express");
const http = require("http");
const socket = require("socket.io");
const path = require("path");
const passport = require("passport");
const expressSession = require("express-session");
const MongoStore = require("connect-mongo");
const passportConfig = require("./config/passport-config");
passportConfig(passport);
const mongooseConnection = require("./config/mongoose-connection");

const helmet = require("helmet");
const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "https://cdn.socket.io",
          "https://cdnjs.cloudflare.com",
        ],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https://*"], // Allow external images (avatars)
        "connect-src": ["'self'", "https://cdn.socket.io", "wss://*", "ws://*"],
      },
    },
  })
);

const server = http.createServer(app); //create HTTP server
const io = socket(server); // bind socket.io to that server

// use
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

const session = expressSession({
  secret: process.env.EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: (MongoStore.default || MongoStore).create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions",
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: "lax",
  },
});

// use
app.use(session);
app.use(passport.initialize());
app.use(passport.session());

// socket
const socketHandle = require("./socket");
socketHandle(io, session);

// routes
const chessRoute = require("./routes/chessRoute");
const authRoutes = require("./routes/authRoutes");

app.get("/", (req, res) => {
  res.redirect("/users/signin");
});

app.use("/users", chessRoute);
app.use("/auth", authRoutes);

server.listen(process.env.PORT || 3000, function () {
  console.log("server is running");
});
