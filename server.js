require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const pool = require("./db");

const authRoutes = require("./routes/auth");
const assignmentRoutes = require("./routes/assignments");
const dashboardRoutes = require("./routes/dashboard");
const ordersRoutes = require("./routes/orders");
const uploadRoutes = require("./routes/uploads");
const profileRoutes = require("./routes/profile");
const settingsRoutes = require("./routes/settings");
const notificationRoutes = require("./routes/notifications");
const messageRoutes = require("./routes/messages");
const downloadRoutes = require("./routes/download");
const revisionRoutes = require("./routes/revisions");
const orderMessageRoutes = require("./routes/orderMessages");

const registerSocketHandlers = require("./socket");

const path = require("path");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
        methods: ["GET", "POST"],
    },
});

registerSocketHandlers(io);

app.set("io", io);

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
// STATIC FILES
// ==========================

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// ==========================
// API ROUTES
// ==========================

app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api/revisions", revisionRoutes);
app.use("/api/order-messages", orderMessageRoutes);

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

app.get("/api/auth/ping", (req, res) => {
    res.send("AUTH ROUTES WORK");
});

// ==========================
// START SERVER
// ==========================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});