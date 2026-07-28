const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const db = require("../db");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userPromise = db.query(
      `
      SELECT
        id,
        name,
        email,
        created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    const statsPromise = db.query(
      `
      SELECT
        COUNT(*)::INT AS total_orders,

        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('pending')
        )::INT AS pending_orders,

        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('in progress','assigned')
        )::INT AS active_orders,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'completed'
        )::INT AS completed_orders

      FROM orders
      WHERE user_id = $1
      `,
      [userId]
    );

    const recentOrdersPromise = db.query(
      `
      SELECT
        id,
        title,
        subject,
        pages,
        budget,
        status,
        deadline,
        created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const upcomingDeadlinesPromise = db.query(
      `
      SELECT
        id,
        title,
        subject,
        status,
        deadline
      FROM orders
      WHERE
        user_id = $1
        AND deadline >= NOW()
        AND LOWER(status) <> 'completed'
      ORDER BY deadline ASC
      LIMIT 5
      `,
      [userId]
    );

    const [
      userResult,
      statsResult,
      recentOrdersResult,
      upcomingDeadlinesResult,
    ] = await Promise.all([
      userPromise,
      statsPromise,
      recentOrdersPromise,
      upcomingDeadlinesPromise,
    ]);

    if (!userResult.rows.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const stats = statsResult.rows[0];

    res.json({
      user: userResult.rows[0],

      totalOrders: stats.total_orders,

      activeOrders: stats.active_orders,

      completedOrders: stats.completed_orders,

      pendingPayments: 0,

      recentOrders: recentOrdersResult.rows,

      upcomingDeadlines: upcomingDeadlinesResult.rows,

      recentActivity: [],

      notifications: [],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load dashboard.",
    });
  }
});

module.exports = router;