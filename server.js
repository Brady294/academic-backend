const assignmentRoutes = require("./routes/assignments");
console.log("SERVER FILE LOADED");
require("dotenv").config();
const express = require("express");
const pool = require("./db");
const authRoutes = require("./routes/auth");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));


app.use(express.json());

// Test DB
app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("Database connected successfully");
  } catch {
    res.status(500).send("Database connection failed");
  }
});
app.get("/test", (req, res) => {
  res.send("TEST ROUTE WORKS");
});

// Auth routes
app.use("/api/auth", require("./routes/auth"));


app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});
app.use("/api/assignments", assignmentRoutes);

app.get("/api/auth/ping", (req, res) => {
  res.send("AUTH ROUTES WORK");
});


