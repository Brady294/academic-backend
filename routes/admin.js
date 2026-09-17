const express = require("express");

const pool = require("../db");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD
|--------------------------------------------------------------------------
|
| GET /api/admin/dashboard
|
| Requires:
| 1. Authentication
| 2. Admin privileges
|
|--------------------------------------------------------------------------
*/

router.get("/dashboard", auth, admin, async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Platform statistics
    |--------------------------------------------------------------------------
    */

    const statisticsResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_orders,

        COUNT(*) FILTER (
          WHERE pricing_status = 'pending_review'
        )::int AS pending_orders,

        COALESCE(
          SUM(
            CASE
              WHEN budget IS NOT NULL
              THEN budget
              ELSE 0
            END
          ),
          0
        )::numeric AS total_revenue,

        COUNT(DISTINCT user_id)::int AS students
      FROM orders
    `);

    const statistics = statisticsResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Recent orders
    |--------------------------------------------------------------------------
    */

    const recentOrdersResult = await pool.query(`
      SELECT
        id,
        user_id,
        title,
        subject,
        service_type,
        academic_level,
        pages,
        budget,
        pricing_status,
        deadline,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `);

    /*
    |--------------------------------------------------------------------------
    | Additional dashboard counts
    |--------------------------------------------------------------------------
    */

    const completedOrdersResult = await pool.query(`
      SELECT COUNT(*)::int AS completed_orders
      FROM orders
      WHERE pricing_status = 'completed'
    `);

    /*
    |--------------------------------------------------------------------------
    | Unread messages
    |--------------------------------------------------------------------------
    |
    | We intentionally handle this separately so that a messaging-table
    | problem does not prevent the core dashboard from loading.
    |
    */

    let unreadMessages = 0;

    try {
      const unreadMessagesResult = await pool.query(`
        SELECT COUNT(*)::int AS unread_messages
        FROM messages
        WHERE is_read = false
      `);

      unreadMessages =
        unreadMessagesResult.rows[0]?.unread_messages || 0;
    } catch (messageError) {
      /*
       * The exact message schema can be wired in when we build
       * the admin messaging section.
       *
       * Dashboard should still load if the column/table differs.
       */
      console.warn(
        "Admin dashboard unread message count unavailable:",
        messageError.message
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      statistics: {
        totalOrders: Number(statistics.total_orders || 0),

        pendingOrders: Number(
          statistics.pending_orders || 0
        ),

        totalRevenue: Number(
          statistics.total_revenue || 0
        ),

        students: Number(
          statistics.students || 0
        ),

        completedOrders: Number(
          completedOrdersResult.rows[0]?.completed_orders || 0
        ),

        unreadMessages: Number(unreadMessages || 0),
      },

      recentOrders: recentOrdersResult.rows,
    });
  } catch (error) {
    console.error(
      "ADMIN DASHBOARD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to load admin dashboard",
    });
  }
});

module.exports = router;