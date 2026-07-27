const db = require("../db");

class Download {
  static async getDownloads(userId) {
    const { rows } = await db.query(
      `
      SELECT
        d.id,
        d.title,
        d.file_name,
        d.file_path,
        d.file_size,
        d.created_at,
        o.title AS order_title
      FROM downloads d
      LEFT JOIN orders o
        ON o.id = d.order_id
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC
      `,
      [userId]
    );

    return rows;
  }

  static async getDownload(id, userId) {
    const { rows } = await db.query(
      `
      SELECT *
      FROM downloads
      WHERE id=$1
      AND user_id=$2
      `,
      [id, userId]
    );

    return rows[0];
  }
}

module.exports = Download;