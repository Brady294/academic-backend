const express = require("express");

const pool = require("../db");

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Allowed order statuses
|--------------------------------------------------------------------------
|
| These match the values used by the orders.status column.
|
*/

const ALLOWED_STATUSES = [
    "Pending",
    "In Progress",
    "Completed",
    "Cancelled",
];

/*
|--------------------------------------------------------------------------
| UPDATE ORDER STATUS
|--------------------------------------------------------------------------
|
| PATCH /api/admin/order-actions/:id/status
|
| Body:
|
| {
|     "status": "In Progress"
| }
|
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/status",
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

            const {
                status,
            } = req.body;

            /*
            |--------------------------------------------------------------------------
            | Validate status
            |--------------------------------------------------------------------------
            */

            if (
                typeof status !== "string" ||
                !ALLOWED_STATUSES.includes(status)
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid order status.",
                    allowedStatuses:
                        ALLOWED_STATUSES,
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Check order exists
            |--------------------------------------------------------------------------
            */

            const existingOrder =
                await pool.query(
                    `
                    SELECT
                        id,
                        status
                    FROM orders
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [orderId]
                );

            if (
                existingOrder.rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Order not found.",
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Update status
            |--------------------------------------------------------------------------
            */

            const result =
                await pool.query(
                    `
                    UPDATE orders

                    SET
                        status = $1,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = $2

                    RETURNING
                        id,
                        status,
                        pricing_status,
                        assigned_admin_id,
                        updated_at
                    `,
                    [
                        status,
                        orderId,
                    ]
                );

            return res.json({
                success: true,

                message:
                    "Order status updated successfully.",

                order:
                    result.rows[0],
            });
        } catch (error) {
            console.error(
                "ADMIN UPDATE ORDER STATUS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Failed to update order status.",
            });
        }
    }
);

/*
|--------------------------------------------------------------------------
| ASSIGN ORDER TO ADMIN
|--------------------------------------------------------------------------
|
| PATCH /api/admin/order-actions/:id/assign
|
| Body:
|
| {
|     "admin_id": 5
| }
|
| To remove an assignment:
|
| {
|     "admin_id": null
| }
|
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/assign",
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

            const {
                admin_id: adminId,
            } = req.body;

            /*
            |--------------------------------------------------------------------------
            | Check order exists
            |--------------------------------------------------------------------------
            */

            const existingOrder =
                await pool.query(
                    `
                    SELECT id
                    FROM orders
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [orderId]
                );

            if (
                existingOrder.rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Order not found.",
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Allow null to unassign
            |--------------------------------------------------------------------------
            */

            if (
                adminId === null ||
                adminId === undefined
            ) {
                const result =
                    await pool.query(
                        `
                        UPDATE orders

                        SET
                            assigned_admin_id = NULL,
                            updated_at = CURRENT_TIMESTAMP

                        WHERE id = $1

                        RETURNING
                            id,
                            assigned_admin_id,
                            updated_at
                        `,
                        [orderId]
                    );

                return res.json({
                    success: true,

                    message:
                        "Order unassigned successfully.",

                    order:
                        result.rows[0],
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Validate admin ID
            |--------------------------------------------------------------------------
            */

            const parsedAdminId =
                parseInt(
                    adminId,
                    10
                );

            if (
                !Number.isInteger(
                    parsedAdminId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid admin ID.",
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Verify administrator exists
            |--------------------------------------------------------------------------
            |
            | We use the users table because orders.assigned_admin_id
            | references users(id).
            |
            */

            const adminUser =
                await pool.query(
                    `
                    SELECT
                        id,
                        is_admin
                    FROM users
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [parsedAdminId]
                );

            if (
                adminUser.rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Administrator not found.",
                });
            }

            if (
                !adminUser.rows[0].is_admin
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Selected user is not an administrator.",
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Assign order
            |--------------------------------------------------------------------------
            */

            const result =
                await pool.query(
                    `
                    UPDATE orders

                    SET
                        assigned_admin_id = $1,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = $2

                    RETURNING
                        id,
                        assigned_admin_id,
                        updated_at
                    `,
                    [
                        parsedAdminId,
                        orderId,
                    ]
                );

            return res.json({
                success: true,

                message:
                    "Order assigned successfully.",

                order:
                    result.rows[0],
            });
        } catch (error) {
            console.error(
                "ADMIN ASSIGN ORDER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Failed to assign order.",
            });
        }
    }
);

/*
|--------------------------------------------------------------------------
| GET ADMIN USERS
|--------------------------------------------------------------------------
|
| GET /api/admin/order-actions/admins
|
| Used by the order assignment dropdown.
|
|--------------------------------------------------------------------------
*/

router.get(
    "/admins",
    auth,
    admin,
    async (req, res) => {
        try {
            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        first_name,
                        last_name,
                        email
                    FROM users
                    WHERE is_admin = TRUE
                    ORDER BY
                        first_name ASC,
                        last_name ASC
                    `
                );

            return res.json({
                success: true,
                admins: result.rows,
            });
        } catch (error) {
            console.error(
                "ADMIN USERS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Failed to fetch administrators.",
            });
        }
    }
);

module.exports = router;