const db = require("../config/db");

class Profile {

    static async getProfile(userId) {

        const query = `
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
                is_verified,
                created_at
            FROM users
            WHERE id = $1
        `;

        const { rows } = await db.query(
            query,
            [userId]
        );

        return rows[0];

    }

    static async updateProfile(userId, data) {

        const {

            first_name,
            last_name,
            phone,
            country,
            timezone,
            university,
            academic_level

        } = data;

        const query = `
            UPDATE users
            SET

                first_name = $1,
                last_name = $2,
                phone = $3,
                country = $4,
                timezone = $5,
                university = $6,
                academic_level = $7

            WHERE id = $8

            RETURNING
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
                is_verified,
                created_at
        `;

        const { rows } = await db.query(

            query,

            [

                first_name,
                last_name,
                phone,
                country,
                timezone,
                university,
                academic_level,
                userId

            ]

        );

        return rows[0];

    }

    static async updateAvatar(
        userId,
        avatar
    ) {

        const query = `
            UPDATE users
            SET avatar = $1
            WHERE id = $2

            RETURNING avatar
        `;

        const { rows } = await db.query(

            query,

            [

                avatar,
                userId

            ]

        );

        return rows[0];

    }

}

module.exports = Profile;