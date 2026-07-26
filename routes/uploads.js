const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const db = require("../db");
const upload = require("../middleware/upload");
const authenticateToken = require("../middleware/authMiddleware");

/*
|--------------------------------------------------------------------------
| Upload File
|--------------------------------------------------------------------------
*/

router.post(
  "/:orderId",
  authenticateToken,
  (req, res) => {
    upload.single("file")(req, res, async (err) => {
      try {
        if (err) {
          return res.status(400).json({
            message: err.message,
          });
        }

        if (!req.file) {
          return res.status(400).json({
            message: "Please select a file.",
          });
        }

        const { orderId } = req.params;

        const order = await db.query(
          `
          SELECT id
          FROM orders
          WHERE id=$1
          AND user_id=$2
          `,
          [orderId, req.user.id]
        );

        if (order.rows.length === 0) {
          return res.status(404).json({
            message: "Order not found.",
          });
        }

        const result = await db.query(
          `
          INSERT INTO order_files
          (
            order_id,
            file_name,
            file_path,
            file_size
          )

          VALUES
          ($1,$2,$3,$4)

          RETURNING *
          `,
          [
            orderId,
            req.file.originalname,
            req.file.filename,
            req.file.size,
          ]
        );

        return res.status(201).json({
          message: "File uploaded successfully.",
          file: result.rows[0],
        });

      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message: "Upload failed.",
        });
      }
    });
  }
);

/*
|--------------------------------------------------------------------------
| Get Files
|--------------------------------------------------------------------------
*/

router.get(
  "/:orderId",
  authenticateToken,
  async (req, res) => {
    try {

      const { orderId } = req.params;

      const order = await db.query(
        `
        SELECT id
        FROM orders
        WHERE id=$1
        AND user_id=$2
        `,
        [orderId, req.user.id]
      );

      if (order.rows.length === 0) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }

      const files = await db.query(
        `
        SELECT *
        FROM order_files
        WHERE order_id=$1
        ORDER BY uploaded_at DESC
        `,
        [orderId]
      );

      res.json(files.rows);

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Failed to fetch files.",
      });

    }
  }
);

/*
|--------------------------------------------------------------------------
| Delete File
|--------------------------------------------------------------------------
*/

router.delete(
  "/file/:id",
  authenticateToken,
  async (req, res) => {
    try {

      const result = await db.query(
        `
        SELECT
            order_files.*,
            orders.user_id

        FROM order_files

        INNER JOIN orders
        ON orders.id=order_files.order_id

        WHERE order_files.id=$1
        `,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "File not found.",
        });
      }

      const file = result.rows[0];

      if (file.user_id !== req.user.id) {
        return res.status(403).json({
          message: "Unauthorized.",
        });
      }

      const filepath = path.join(
        __dirname,
        "../uploads",
        file.file_path
      );

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      await db.query(
        `
        DELETE
        FROM order_files
        WHERE id=$1
        `,
        [req.params.id]
      );

      res.json({
        message: "File deleted successfully.",
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Delete failed.",
      });

    }
  }
);

module.exports = router;