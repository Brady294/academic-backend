const OrderMessage = require("../models/OrderMessage");
const db = require("../db");

/**
 * GET /api/order-messages/orders/:orderId/messages
 */
exports.getOrderMessages = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const { rows } = await db.query(
            `
            SELECT
                id,
                user_id,
                assigned_admin_id
            FROM orders
            WHERE id = $1
            `,
            [orderId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        const order = rows[0];

        const isOwner = order.user_id === userId;
        const isAssignedAdmin = order.assigned_admin_id === userId;

        if (!isOwner && !isAssignedAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        const messages = await OrderMessage.getMessages(orderId);

        await OrderMessage.markAsRead(orderId, userId);

        const io = req.app.get("io");

        io.to(`order_${orderId}`).emit("messages-read", {
            orderId,
            readerId: userId,
        });

        return res.json({
            success: true,
            messages,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to load messages.",
        });

    }
};

/**
 * POST /api/order-messages/orders/:orderId/messages
 */
exports.sendMessage = async (req, res) => {

    try {

        const { orderId } = req.params;

        const userId = req.user.id;

        const {
            message,
            attachmentUrl,
            attachmentName,
            attachmentSize,
        } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required.",
            });
        }

        const { rows } = await db.query(
            `
            SELECT
                id,
                user_id,
                assigned_admin_id
            FROM orders
            WHERE id = $1
            `,
            [orderId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        const order = rows[0];

        const isOwner = order.user_id === userId;
        const isAssignedAdmin = order.assigned_admin_id === userId;

        if (!isOwner && !isAssignedAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        const newMessage = await OrderMessage.sendMessage({

            orderId,

            senderId: userId,

            message: message.trim(),

            attachmentUrl,

            attachmentName,

            attachmentSize,

        });

        const io = req.app.get("io");

        io.to(`order_${orderId}`).emit(
            "new-message",
            newMessage
        );

        return res.status(201).json({

            success: true,

            message: newMessage,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Unable to send message.",

        });

    }

};

/**
 * PUT /api/order-messages/messages/:messageId/read
 */
exports.markMessageAsRead = async (req, res) => {

    try {

        const { messageId } = req.params;

        const userId = req.user.id;

        const { rows } = await db.query(
            `
            SELECT
                order_id
            FROM order_messages
            WHERE id = $1
            `,
            [messageId]
        );

        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Message not found.",

            });

        }

        const orderId = rows[0].order_id;

        await OrderMessage.markAsRead(
            orderId,
            userId
        );

        const io = req.app.get("io");

        io.to(`order_${orderId}`).emit(
            "messages-read",
            {
                orderId,
                readerId: userId,
            }
        );

        return res.json({

            success: true,

            message: "Messages marked as read.",

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Unable to update message.",

        });

    }

};