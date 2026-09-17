const express = require("express");

const pool = require("../db");

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET ALL ORDERS
|--------------------------------------------------------------------------
|
| GET /api/admin/orders
|
| Query parameters:
|
| page
| limit
| search
| status
| pricing_status
| sort
|
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    auth,
    admin,
    async (req, res) => {
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

            const offset =
                (page - 1) * limit;

            const search =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";

            const status =
                typeof req.query.status === "string"
                    ? req.query.status.trim()
                    : "";

            const pricingStatus =
                typeof req.query.pricing_status === "string"
                    ? req.query.pricing_status.trim()
                    : "";

            const sort =
                String(
                    req.query.sort || "desc"
                ).toLowerCase() === "asc"
                    ? "ASC"
                    : "DESC";

            /*
            |--------------------------------------------------------------------------
            | Build WHERE clause
            |--------------------------------------------------------------------------
            */

            const conditions = [];
            const values = [];

            /*
            |--------------------------------------------------------------------------
            | Search
            |--------------------------------------------------------------------------
            */

            if (search) {
                values.push(`%${search}%`);

                const searchParam =
                    `$${values.length}`;

                conditions.push(`
                    (
                        CAST(o.id AS TEXT) ILIKE ${searchParam}
                        OR o.title ILIKE ${searchParam}
                        OR o.subject ILIKE ${searchParam}
                        OR o.service_type ILIKE ${searchParam}
                        OR o.academic_level ILIKE ${searchParam}
                        OR CAST(o.user_id AS TEXT) ILIKE ${searchParam}
                    )
                `);
            }

            /*
            |--------------------------------------------------------------------------
            | Status
            |--------------------------------------------------------------------------
            */

            if (status) {
                values.push(status);

                conditions.push(
                    `o.status = $${values.length}`
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Pricing status
            |--------------------------------------------------------------------------
            */

            if (pricingStatus) {
                values.push(pricingStatus);

                conditions.push(
                    `o.pricing_status = $${values.length}`
                );
            }

            const whereClause =
                conditions.length > 0
                    ? `WHERE ${conditions.join(" AND ")}`
                    : "";

            /*
            |--------------------------------------------------------------------------
            | Total count
            |--------------------------------------------------------------------------
            */

            const countResult =
                await pool.query(
                    `
                    SELECT COUNT(*)::INTEGER AS total

                    FROM orders o

                    ${whereClause}
                    `,
                    values
                );

            const total =
                countResult.rows[0]?.total || 0;

            /*
            |--------------------------------------------------------------------------
            | Fetch orders
            |--------------------------------------------------------------------------
            */

            const limitParam =
                `$${values.length + 1}`;

            const offsetParam =
                `$${values.length + 2}`;

            const orderValues = [
                ...values,
                limit,
                offset,
            ];

            const result =
                await pool.query(
                    `
                    SELECT
                        o.id,
                        o.user_id,

                        o.title,
                        o.subject,
                        o.service_type,
                        o.academic_level,

                        o.pages,
                        o.spacing,
                        o.citation_style,

                        o.deadline,
                        o.instructions,

                        o.budget,

                        o.status,
                        o.pricing_status,

                        o.assigned_admin_id,

                        o.client_timezone,

                        o.created_at,
                        o.updated_at

                    FROM orders o

                    ${whereClause}

                    ORDER BY
                        o.created_at ${sort}

                    LIMIT ${limitParam}
                    OFFSET ${offsetParam}
                    `,
                    orderValues
                );

            const totalPages =
                Math.max(
                    Math.ceil(total / limit),
                    1
                );

            /*
            |--------------------------------------------------------------------------
            | Response
            |--------------------------------------------------------------------------
            */

            return res.json({
                success: true,

                orders: result.rows,

                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
            });
        } catch (error) {
            console.error(
                "ADMIN ORDERS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Failed to fetch admin orders.",
            });
        }
    }
);

/*
|--------------------------------------------------------------------------
| GET ORDER STATISTICS
|--------------------------------------------------------------------------
|
| GET /api/admin/orders/statistics
|
|--------------------------------------------------------------------------
*/

router.get(
    "/statistics",
    auth,
    admin,
    async (req, res) => {
        try {
            const result =
                await pool.query(`
                    SELECT
                        COUNT(*)::INTEGER
                            AS total_orders,

                        COUNT(*) FILTER (
                            WHERE status = 'Pending'
                        )::INTEGER
                            AS pending_orders,

                        COUNT(*) FILTER (
                            WHERE status = 'In Progress'
                        )::INTEGER
                            AS in_progress_orders,

                        COUNT(*) FILTER (
                            WHERE status = 'Completed'
                        )::INTEGER
                            AS completed_orders,

                        COUNT(*) FILTER (
                            WHERE status = 'Cancelled'
                        )::INTEGER
                            AS cancelled_orders,

                        COUNT(*) FILTER (
                            WHERE pricing_status = 'pending_review'
                        )::INTEGER
                            AS pricing_review_orders,

                        COUNT(DISTINCT user_id)::INTEGER
                            AS total_students,

                        COALESCE(
                            SUM(
                                COALESCE(budget, 0)
                            ),
                            0
                        ) AS total_budget

                    FROM orders
                `);

            const row =
                result.rows[0] || {};

            return res.json({
                success: true,

                statistics: {
                    totalOrders:
                        Number(
                            row.total_orders || 0
                        ),

                    pendingOrders:
                        Number(
                            row.pending_orders || 0
                        ),

                    inProgressOrders:
                        Number(
                            row.in_progress_orders || 0
                        ),

                    completedOrders:
                        Number(
                            row.completed_orders || 0
                        ),

                    cancelledOrders:
                        Number(
                            row.cancelled_orders || 0
                        ),

                    pricingReviewOrders:
                        Number(
                            row.pricing_review_orders || 0
                        ),

                    totalStudents:
                        Number(
                            row.total_students || 0
                        ),

                    totalBudget:
                        Number(
                            row.total_budget || 0
                        ),
                },
            });
        } catch (error) {
            console.error(
                "ADMIN ORDER STATISTICS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Failed to fetch order statistics.",
            });
        }
    }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE ORDER
|--------------------------------------------------------------------------
|
| GET /api/admin/orders/:id
|
| This will be used by the Admin Order Details page.
|
|--------------------------------------------------------------------------
*/

router.get(
    "/:id",
    auth,
    admin,
    async (req, res) => {
        try {
            const orderId =
                parseInt(req.params.id, 10);

            if (!Number.isInteger(orderId)) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid order ID.",
                });
            }

            const result =
                await pool.query(
                    `
                    SELECT
                        o.id,
                        o.user_id,

                        o.title,
                        o.subject,
                        o.service_type,
                        o.academic_level,

                        o.pages,
                        o.spacing,
                        o.citation_style,

                        o.deadline,
                        o.instructions,

                        o.budget,

                        o.status,
                        o.pricing_status,

                        o.assigned_admin_id,

                        o.client_timezone,

                        o.created_at,
                        o.updated_at

                    FROM orders o

                    WHERE o.id = $1

                    LIMIT 1
                    `,
                    [orderId]
                );

            if (
                result.rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Order not found.",
                });
            }

            return res.json({
                success: true,
                order: result.rows[0],
            });
        } catch (error) {
            console.error(
                "ADMIN SINGLE ORDER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Failed to fetch order.",
            });
        }
    }
);

module.exports = router;