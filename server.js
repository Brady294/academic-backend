require("dotenv").config();
const express = require("express");
const cors = require("cors");

const pool = require("./db");
const authRoutes = require("./routes/auth");
const assignmentRoutes = require("./routes/assignments");

const app = express();

console.log("SERVER FILE LOADED");

// ✅ CORS MUST COME FIRST
const allowedOrigins = [process.env.FRONTEND_URL];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


// ✅ BODY PARSER
app.use(express.json());

// ✅ ROOT DB HEALTH CHECK
app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("Database connected successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database connection failed");
  }
});

// ✅ SIMPLE TEST ROUTE
app.get("/test", (req, res) => {
  res.send("TEST ROUTE WORKS");
});

// ✅ AUTH ROUTES
app.use("/api/auth", authRoutes);

// ✅ ASSIGNMENT ROUTES
app.use("/api/assignments", assignmentRoutes);

// ✅ AUTH PING (AFTER ROUTES LOADED)
app.get("/api/auth/ping", (req, res) => {
  res.send("AUTH ROUTES WORK");
});

// ✅ START SERVER (ALWAYS LAST)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
