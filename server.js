require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const pool = require("./db");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const adminOrderRoutes = require("./routes/adminOrders");
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
const adminOrderActionRoutes = require("./routes/adminOrderActions");


const registerSocketHandlers = require("./socket");

const path = require("path");

const app = express();
const server = http.createServer(app);

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(express.json());
app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| STATIC FILES
|--------------------------------------------------------------------------
*/

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

app.use(
    "/api/admin/order-actions",
    adminOrderActionsRoutes
);

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

/*
 * Authentication
 */
app.use("/api/auth", authRoutes);

/*
 * Admin
 *
 * Admin dashboard:
 * GET /api/admin/dashboard
 *
 * The route itself is protected by:
 * authMiddleware
 * adminMiddleware
 */
app.use("/api/admin", adminRoutes);

/*
 * Assignments
 */
app.use("/api/assignments", assignmentRoutes);

/*
 * Existing dashboard routes
 */
app.use("/api/dashboard", dashboardRoutes);


app.use(
    "/api/admin/orders",
    adminOrdersRoutes
);
/*
 * Orders
 */
app.use("/api/orders", ordersRoutes);

/*
 * Uploads
 */
app.use("/api/uploads", uploadRoutes);

/*
 * Profile
 */
app.use("/api/profile", profileRoutes);

/*
 * Settings
 */
app.use("/api/settings", settingsRoutes);

/*
 * Notifications
 */
app.use("/api/notifications", notificationRoutes);

/*
 * Messages
 */
app.use("/api/messages", messageRoutes);

/*
 * Downloads
 */
app.use("/api/download", downloadRoutes);

/*
 * Revisions
 */
app.use("/api/revisions", revisionRoutes);

/*
 * Order messages
 */
app.use("/api/order-messages", orderMessageRoutes);

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/

app.get("/", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.send("Database connected successfully");
    } catch (err) {
        console.error(err);

        res.status(500).send(
            "Database connection failed"
        );
    }
});

/*
|--------------------------------------------------------------------------
| TEST ROUTE
|--------------------------------------------------------------------------
*/

app.get("/test", (req, res) => {
    res.send("TEST ROUTE WORKS");
});

/*
|--------------------------------------------------------------------------
| AUTH PING
|--------------------------------------------------------------------------
*/

app.get("/api/auth/ping", (req, res) => {
    res.send("AUTH ROUTES WORK");
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(
        `Server running on port ${PORT}`
    );
});