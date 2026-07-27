const db = require("../db");

class Notification {
  static async getAll(userId) {
    const query = `
      SELECT
        id,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await db.query(query, [userId]);

    return rows;
  }

  static async markAsRead(id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
      AND user_id = $2
    `;

    await db.query(query, [id, userId]);

    return true;
  }

  static async markAllAsRead(userId) {
    await db.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
      `,
      [userId]
    );

    return true;
  }

  static async deleteNotification(id, userId) {
    await db.query(
      `
      DELETE FROM notifications
      WHERE id = $1
      AND user_id = $2
      `,
      [id, userId]
    );

    return true;
  }
}

module.exports = Notification;