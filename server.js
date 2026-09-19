require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const pool = require("./db");

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require("./routes/auth");

const adminRoutes = require("./routes/admin");
const adminOrderRoutes = require("./routes/adminOrders");
const adminOrderActionRoutes = require("./routes/adminOrderActions");

// NEW ADMIN ROUTES

const adminMessagesRoutes = require("./routes/adminMessages");

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

// ============================================================
// SOCKET.IO
// ============================================================

const registerSocketHandlers = require("./socket");

// ============================================================
// PATH
// ============================================================

const path = require("path");

// ============================================================
// APP
// ============================================================

const app = express();

const server = http.createServer(app);

// ============================================================
// SOCKET.IO CONFIGURATION
// ============================================================

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

// ============================================================
// CORS
// ============================================================

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
    })
);

// ============================================================
// GENERAL MIDDLEWARE
// ============================================================

app.use(express.json());

app.use(cookieParser());

// ============================================================
// STATIC FILES
// ============================================================

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

// ============================================================
// AUTHENTICATION
// ============================================================

app.use(
    "/api/auth",
    authRoutes
);

// ============================================================
// ADMIN DASHBOARD
// ============================================================
//
// GET /api/admin/dashboard
//
// ============================================================

app.use(
    "/api/admin",
    adminRoutes
);

// ============================================================
// ADMIN USERS
// ============================================================
//
// GET    /api/admin/users
// GET    /api/admin/users/:id
// PATCH  /api/admin/users/:id
//
// ============================================================



// ============================================================
// ADMIN MESSAGES
// ============================================================
//
// GET    /api/admin/messages
// GET    /api/admin/messages/:id
// POST   /api/admin/messages/:id
//
// ============================================================

app.use(
    "/api/admin/messages",
    adminMessagesRoutes
);

// ============================================================
// ADMIN ORDERS
// ============================================================
//
// GET    /api/admin/orders
// GET    /api/admin/orders/:id
//
// ============================================================

app.use(
    "/api/admin/orders",
    adminOrderRoutes
);

// ============================================================
// ADMIN ORDER ACTIONS
// ============================================================
//
// PATCH /api/admin/order-actions/:id/status
// PATCH /api/admin/order-actions/:id/assign
//
// ============================================================

app.use(
    "/api/admin/order-actions",
    adminOrderActionRoutes
);

// ============================================================
// ASSIGNMENTS
// ============================================================

app.use(
    "/api/assignments",
    assignmentRoutes
);

// ============================================================
// USER DASHBOARD
// ============================================================

app.use(
    "/api/dashboard",
    dashboardRoutes
);

// ============================================================
// USER ORDERS
// ============================================================

app.use(
    "/api/orders",
    ordersRoutes
);

// ============================================================
// UPLOADS
// ============================================================

app.use(
    "/api/uploads",
    uploadRoutes
);

// ============================================================
// PROFILE
// ============================================================

app.use(
    "/api/profile",
    profileRoutes
);

// ============================================================
// SETTINGS
// ============================================================

app.use(
    "/api/settings",
    settingsRoutes
);

// ============================================================
// NOTIFICATIONS
// ============================================================

app.use(
    "/api/notifications",
    notificationRoutes
);

// ============================================================
// MESSAGES
// ============================================================

app.use(
    "/api/messages",
    messageRoutes
);

// ============================================================
// DOWNLOADS
// ============================================================

app.use(
    "/api/download",
    downloadRoutes
);

// ============================================================
// REVISIONS
// ============================================================

app.use(
    "/api/revisions",
    revisionRoutes
);

// ============================================================
// ORDER MESSAGES
// ============================================================

app.use(
    "/api/order-messages",
    orderMessageRoutes
);

// ============================================================
// ROOT / DATABASE HEALTH CHECK
// ============================================================

app.get("/", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.send(
            "Database connected successfully"
        );
    } catch (err) {
        console.error(
            "Database health check failed:",
            err
        );

        res.status(500).send(
            "Database connection failed"
        );
    }
});

// ============================================================
// TEST ROUTE
// ============================================================

app.get("/test", (req, res) => {
    res.send("TEST ROUTE WORKS");
});

// ============================================================
// AUTH PING
// ============================================================

app.get(
    "/api/auth/ping",
    (req, res) => {
        res.send("AUTH ROUTES WORK");
    }
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use(
    (req, res) => {
        res.status(404).json({
            error: "Route not found",
            path: req.originalUrl,
        });
    }
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (err, req, res, next) => {
        console.error(
            "SERVER ERROR:",
            err
        );

        res.status(
            err.status || 500
        ).json({
            error:
                err.message ||
                "Internal server error",
        });
    }
);

// ============================================================
// START SERVER
// ============================================================

const PORT =
    process.env.PORT || 5000;

server.listen(
    PORT,
    () => {
        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `Frontend URL: ${process.env.FRONTEND_URL}`
        );
    }
);