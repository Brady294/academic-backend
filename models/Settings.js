const db = require("../db");

class Settings {

    static async getSettings(userId) {

        const query = `
            SELECT
                email,
                is_verified
            FROM users
            WHERE id = $1
        `;

        const { rows } = await db.query(
            query,
            [userId]
        );

        return rows[0];

    }

    static async changePassword(
        userId,
        hashedPassword
    ) {

        const query = `
            UPDATE users
            SET password = $1
            WHERE id = $2
        `;

        await db.query(query, [
            hashedPassword,
            userId
        ]);

        return true;

    }

}

module.exports = Settings;