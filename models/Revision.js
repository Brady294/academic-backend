const db = require("../config/db");

class Revision {
  static async getAll(userId) {
    const { rows } = await db.query(
      `
      SELECT
        r.*,
        o.title AS order_title
      FROM revisions r
      JOIN orders o
        ON o.id = r.order_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      `,
      [userId]
    );

    return rows;
  }

  static async create(
    userId,
    orderId,
    title,
    instructions
  ) {
    const { rows } = await db.query(
      `
      INSERT INTO revisions
      (
        user_id,
        order_id,
        title,
        instructions
      )
      VALUES($1,$2,$3,$4)
      RETURNING *
      `,
      [
        userId,
        orderId,
        title,
        instructions,
      ]
    );

    return rows[0];
  }
}

module.exports = Revision;