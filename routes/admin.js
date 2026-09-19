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
*/

router.get("/dashboard", auth, admin, async (req, res) => {
    try {
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

        const statistics =
            statisticsResult.rows[0] || {};

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

        let unreadMessages = 0;

        try {
            const unreadMessagesResult =
                await pool.query(`
                    SELECT COUNT(*)::int AS unread_messages
                    FROM messages
                    WHERE is_read = false
                `);

            unreadMessages = Number(
                unreadMessagesResult.rows[0]
                    ?.unread_messages || 0
            );
        } catch (messageError) {
            console.warn(
                "Admin dashboard unread message count unavailable:",
                messageError.message
            );
        }

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

            recentOrders:
                recentOrdersResult.rows,
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


/*
|--------------------------------------------------------------------------
| ADMIN USERS
|--------------------------------------------------------------------------
|
| GET /api/admin/users
|
| Requires:
| 1. Authentication
| 2. Admin privileges
|
| Supports:
| - Search
| - Pagination
| - Student/admin filtering
|
|--------------------------------------------------------------------------
*/

router.get("/users", auth, admin, async (req, res) => {
    try {
        const page = Math.max(
            parseInt(req.query.page, 10) || 1,
            1
        );

        const limit = Math.min(
            Math.max(
                parseInt(req.query.limit, 10) || 10,
                1
            ),
            100
        );

        const offset = (page - 1) * limit;

        const search = String(
            req.query.search || ""
        ).trim();

        const role = String(
            req.query.role || "all"
        )
            .trim()
            .toLowerCase();

        /*
        |--------------------------------------------------------------------------
        | BUILD FILTERS
        |--------------------------------------------------------------------------
        */

        const conditions = [];
        const values = [];

        if (search) {
            values.push(`%${search}%`);

            conditions.push(`
                (
                    CAST(id AS TEXT) ILIKE $${values.length}
                    OR name ILIKE $${values.length}
                    OR email ILIKE $${values.length}
                    OR first_name ILIKE $${values.length}
                    OR last_name ILIKE $${values.length}
                    OR phone ILIKE $${values.length}
                )
            `);
        }

        if (role === "student") {
            conditions.push("is_admin = false");
        }

        if (role === "admin") {
            conditions.push("is_admin = true");
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        /*
        |--------------------------------------------------------------------------
        | TOTAL USERS
        |--------------------------------------------------------------------------
        */

        const countResult = await pool.query(
            `
                SELECT COUNT(*)::int AS total
                FROM users
                ${whereClause}
            `,
            values
        );

        const total = Number(
            countResult.rows[0]?.total || 0
        );

        /*
        |--------------------------------------------------------------------------
        | USERS
        |--------------------------------------------------------------------------
        |
        | Never return sensitive authentication fields.
        |
        */

        const usersResult = await pool.query(
            `
                SELECT
                    id,
                    name,
                    email,
                    first_name,
                    last_name,
                    phone,
                    country,
                    timezone,
                    university,
                    academic_level,
                    avatar,
                    is_admin,
                    is_verified,
                    created_at
                FROM users
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${values.length + 1}
                OFFSET $${values.length + 2}
            `,
            [
                ...values,
                limit,
                offset,
            ]
        );

        const totalPages = Math.max(
            Math.ceil(total / limit),
            1
        );

        return res.json({
            success: true,

            users: usersResult.rows,

            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });
    } catch (error) {
        console.error(
            "ADMIN USERS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Failed to load users.",
        });
    }
});


/*
|--------------------------------------------------------------------------
| EXPORT ROUTER
|--------------------------------------------------------------------------
*/

module.exports = router;