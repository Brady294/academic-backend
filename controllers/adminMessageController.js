const db = require("../db");

/*
|--------------------------------------------------------------------------
| GET ADMIN CONVERSATIONS
|--------------------------------------------------------------------------
|
| GET /api/admin/messages
|
| Returns all conversations for the admin.
|
*/

exports.getAdminConversations = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                c.*,

                u.id AS student_id,
                u.first_name,
                u.last_name,
                u.name AS student_name,
                u.email AS student_email

            FROM conversations c

            LEFT JOIN users u
                ON u.id = c.student_id

            ORDER BY c.updated_at DESC
        `);

        return res.json({
            success: true,
            conversations: rows,
        });

    } catch (error) {
        console.error(
            "GET ADMIN CONVERSATIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Unable to load conversations.",
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET ADMIN CONVERSATION MESSAGES
|--------------------------------------------------------------------------
|
| GET /api/admin/messages/:id
|
| Admin can view messages belonging to any conversation.
|
*/

exports.getAdminMessages = async (req, res) => {
    try {
        const conversationId = Number(req.params.id);

        if (!Number.isInteger(conversationId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid conversation ID.",
            });
        }

        /*
        |----------------------------------------------------------------------
        | Verify conversation exists
        |----------------------------------------------------------------------
        */

        const conversationResult = await db.query(
            `
            SELECT
                c.*,

                u.id AS student_id,
                u.first_name,
                u.last_name,
                u.name AS student_name,
                u.email AS student_email

            FROM conversations c

            LEFT JOIN users u
                ON u.id = c.student_id

            WHERE c.id = $1
            `,
            [conversationId]
        );

        if (conversationResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found.",
            });
        }

        /*
        |----------------------------------------------------------------------
        | Get messages
        |----------------------------------------------------------------------
        */

        const messagesResult = await db.query(
            `
            SELECT
                m.*

            FROM messages m

            WHERE m.conversation_id = $1

            ORDER BY m.created_at ASC
            `,
            [conversationId]
        );

        return res.json({
            success: true,

            conversation:
                conversationResult.rows[0],

            messages:
                messagesResult.rows,
        });

    } catch (error) {
        console.error(
            "GET ADMIN MESSAGES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Unable to load messages.",
        });
    }
};


/*
|--------------------------------------------------------------------------
| SEND ADMIN MESSAGE
|--------------------------------------------------------------------------
|
| POST /api/admin/messages/:id
|
| Expected body:
|
| {
|     "message": "Hello",
|     "attachment": null
| }
|
*/

exports.sendAdminMessage = async (req, res) => {
    try {
        const conversationId = Number(req.params.id);

        const message =
            typeof req.body.message === "string"
                ? req.body.message.trim()
                : "";

        const attachment =
            req.body.attachment || null;

        if (!Number.isInteger(conversationId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid conversation ID.",
            });
        }

        if (!message && !attachment) {
            return res.status(400).json({
                success: false,
                error: "Message or attachment is required.",
            });
        }

        /*
        |----------------------------------------------------------------------
        | Verify conversation
        |----------------------------------------------------------------------
        */

        const conversationResult = await db.query(
            `
            SELECT id
            FROM conversations
            WHERE id = $1
            `,
            [conversationId]
        );

        if (conversationResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found.",
            });
        }

        /*
        |----------------------------------------------------------------------
        | Insert admin message
        |----------------------------------------------------------------------
        |
        | Your student controller currently uses:
        |
        | sender = "student"
        |
        | Therefore the corresponding admin sender value is:
        |
        | sender = "admin"
        |
        */

        const messageResult = await db.query(
            `
            INSERT INTO messages
            (
                conversation_id,
                sender,
                message,
                attachment
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4
            )
            RETURNING *
            `,
            [
                conversationId,
                "admin",
                message || null,
                attachment,
            ]
        );

        /*
        |----------------------------------------------------------------------
        | Update conversation timestamp
        |----------------------------------------------------------------------
        */

        await db.query(
            `
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [conversationId]
        );

        return res.status(201).json({
            success: true,
            message: messageResult.rows[0],
        });

    } catch (error) {
        console.error(
            "SEND ADMIN MESSAGE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Unable to send message.",
        });
    }
};