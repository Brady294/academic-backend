const db = require("../config/db");

class Message {

    static async getConversations(userId){

        const {rows}=await db.query(
        `
        SELECT *
        FROM conversations
        WHERE student_id=$1
        ORDER BY updated_at DESC
        `,
        [userId]
        );

        return rows;

    }

    static async getMessages(conversationId,userId){

        const {rows}=await db.query(

        `
        SELECT m.*
        FROM messages m

        JOIN conversations c
        ON c.id=m.conversation_id

        WHERE c.id=$1
        AND c.student_id=$2

        ORDER BY created_at ASC

        `,
        [conversationId,userId]

        );

        return rows;

    }

    static async createConversation(userId,subject){

        const {rows}=await db.query(

        `
        INSERT INTO conversations

        (student_id,subject)

        VALUES($1,$2)

        RETURNING *

        `,

        [

            userId,

            subject

        ]

        );

        return rows[0];

    }

    static async sendMessage(

        conversationId,

        sender,

        message,

        attachment

    ){

        const {rows}=await db.query(

        `

        INSERT INTO messages

        (

        conversation_id,

        sender,

        message,

        attachment

        )

        VALUES($1,$2,$3,$4)

        RETURNING *

        `,

        [

            conversationId,

            sender,

            message,

            attachment

        ]

        );

        await db.query(

        `

        UPDATE conversations

        SET updated_at=CURRENT_TIMESTAMP

        WHERE id=$1

        `,

        [conversationId]

        );

        return rows[0];

    }

}

module.exports=Message;