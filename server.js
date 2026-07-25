require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const pool = require("./db");
const authRoutes = require("./routes/auth");
const assignmentRoutes = require("./routes/assignments");

const app = express();

console.log("SERVER FILE LOADED");

// ==========================
// CORS
// ==========================

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ==========================
// MIDDLEWARE
// ==========================

app.use(express.json());
app.use(cookieParser());

// ==========================
// ROOT
// ==========================

app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("Database connected successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database connection failed");
  }
});

app.get("/test", (req, res) => {
  res.send("TEST ROUTE WORKS");
});

// ==========================
// ROUTES
// ==========================

app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);

app.get("/api/auth/ping", (req, res) => {
  res.send("AUTH ROUTES WORK");
});

// ==========================
// START SERVER
// ==========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});