const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const db = require("../db");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query(
      `
      SELECT
        id,
        name,
        email,
        created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const statsResult = await db.query(
      `
      SELECT
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE status = 'Pending') AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'In Progress') AS active_orders,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed_orders
      FROM orders
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    const recentOrders = await db.query(
      `
      SELECT
        id,
        title,
        subject,
        status,
        deadline,
        created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [req.user.id]
    );

    res.json({
      user: userResult.rows[0],
      stats: statsResult.rows[0],
      recentOrders: recentOrders.rows,
      notifications: [],
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to load dashboard.",
    });
  }
});

module.exports = router;