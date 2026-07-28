const db = require("../db");

class OrderMessage {

    // ============================================
    // Get all messages for an order
    // ============================================

    static async getMessages(orderId) {

        const { rows } = await db.query(
            `
            SELECT
                om.id,
                om.order_id,
                om.sender_id,
                om.message,
                om.attachment_url,
                om.attachment_name,
                om.attachment_size,
                om.is_read,
                om.created_at,

                u.name,
                u.email,
                u.is_admin

            FROM order_messages om

            INNER JOIN users u
                ON u.id = om.sender_id

            WHERE om.order_id = $1

            ORDER BY om.created_at ASC
            `,
            [orderId]
        );

        return rows;

    }

    // ============================================
    // Send Message
    // ============================================

    static async sendMessage({

        orderId,
        senderId,
        message,
        attachmentUrl = null,
        attachmentName = null,
        attachmentSize = null,

    }) {

        const { rows } = await db.query(
            `
            WITH inserted AS (

                INSERT INTO order_messages
                (
                    order_id,
                    sender_id,
                    message,
                    attachment_url,
                    attachment_name,
                    attachment_size
                )

                VALUES
                ($1,$2,$3,$4,$5,$6)

                RETURNING *

            )

            SELECT

                inserted.id,
                inserted.order_id,
                inserted.sender_id,
                inserted.message,
                inserted.attachment_url,
                inserted.attachment_name,
                inserted.attachment_size,
                inserted.is_read,
                inserted.created_at,

                u.name,
                u.email,
                u.is_admin

            FROM inserted

            INNER JOIN users u
                ON u.id = inserted.sender_id
            `,
            [
                orderId,
                senderId,
                message,
                attachmentUrl,
                attachmentName,
                attachmentSize,
            ]
        );

        return rows[0];

    }

    // ============================================
    // Mark Messages Read
    // ============================================

    static async markAsRead(orderId, userId) {

        await db.query(
            `
            UPDATE order_messages

            SET is_read = TRUE

            WHERE order_id = $1
              AND sender_id <> $2
              AND is_read = FALSE
            `,
            [
                orderId,
                userId,
            ]
        );

    }

}

module.exports = OrderMessage;