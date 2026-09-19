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
    | PLATFORM STATISTICS
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | orders.status is the actual order lifecycle status.
    |
    | orders.pricing_status is NOT the same thing.
    |
    | Therefore:
    |
    | Pending orders  -> status = Pending
    | Completed       -> status = Completed
    |
    |--------------------------------------------------------------------------
    */

    const statisticsResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_orders,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'pending'
        )::int AS pending_orders,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'in progress'
        )::int AS in_progress_orders,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'completed'
        )::int AS completed_orders,

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

    const statistics = statisticsResult.rows[0] || {};

    /*
    |--------------------------------------------------------------------------
    | RECENT ORDERS
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
        spacing,
        citation_style,
        deadline,
        instructions,
        budget,
        status,
        pricing_status,
        client_timezone,
        assigned_admin_id,
        created_at,
        updated_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `);

    /*
    |--------------------------------------------------------------------------
    | UNREAD MESSAGES
    |--------------------------------------------------------------------------
    |
    | The exact messages schema may differ from the dashboard requirement.
    | We therefore keep this query isolated so a messaging problem does not
    | prevent the entire admin dashboard from loading.
    |
    */

    let unreadMessages = 0;

    try {
      const unreadMessagesResult = await pool.query(`
        SELECT COUNT(*)::int AS unread_messages
        FROM messages
        WHERE is_read = false
      `);

      unreadMessages = Number(
        unreadMessagesResult.rows[0]?.unread_messages || 0
      );
    } catch (messageError) {
      console.warn(
        "Admin dashboard unread message count unavailable:",
        messageError.message
      );

      unreadMessages = 0;
    }

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      statistics: {
        totalOrders: Number(
          statistics.total_orders || 0
        ),

        pendingOrders: Number(
          statistics.pending_orders || 0
        ),

        inProgressOrders: Number(
          statistics.in_progress_orders || 0
        ),

        completedOrders: Number(
          statistics.completed_orders || 0
        ),

        totalRevenue: Number(
          statistics.total_revenue || 0
        ),

        students: Number(
          statistics.students || 0
        ),

        unreadMessages: Number(
          unreadMessages || 0
        ),
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