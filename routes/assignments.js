const express = require("express");
const pool = require("../db");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");
const path = require("path");
const { calculatePrice } = require("../utils/pricing");
const { convertFromUSD } = require("../utils/currency");

const router = express.Router();

/**
 * SUBMIT ASSIGNMENT (CLIENT)
 * Requires authentication.
 */
router.post("/", auth, async (req, res) => {
  try {
    const {
      title,
      subject,
      instructions,
      deadline,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO assignments
       (user_id, title, subject, instructions, deadline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.id,
        title,
        subject,
        instructions,
        deadline,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Assignment submission failed",
    });
  }
});

/**
 * UPLOAD FILE TO ASSIGNMENT (CLIENT)
 * Requires authentication.
 */
router.post(
  "/:id/upload",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "No file uploaded",
        });
      }

      const result = await pool.query(
        `INSERT INTO assignment_files
         (assignment_id, original_name, stored_name, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          assignmentId,
          file.originalname,
          file.filename,
          file.mimetype,
          file.size,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "File upload failed",
      });
    }
  }
);

/**
 * UPDATE ASSIGNMENT STATUS (ADMIN)
 * Requires authentication + admin privileges.
 */
router.patch(
  "/:id/status",
  auth,
  admin,
  async (req, res) => {
    try {
      const { status } = req.body;
      const assignmentId = req.params.id;

      const validStatuses = [
        "submitted",
        "in_progress",
        "completed",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: "Invalid status",
        });
      }

      const result = await pool.query(
        `UPDATE assignments
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, assignmentId]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Status update failed",
      });
    }
  }
);

/**
 * SET ASSIGNMENT PRICING (ADMIN)
 * Requires authentication + admin privileges.
 */
router.patch(
  "/:id/pricing",
  auth,
  admin,
  async (req, res) => {
    try {
      const {
        total_amount,
        deposit_amount,
      } = req.body;

      const assignmentId = req.params.id;

      const result = await pool.query(
        `UPDATE assignments
         SET total_amount = $1,
             deposit_amount = $2
         WHERE id = $3
         RETURNING *`,
        [
          total_amount,
          deposit_amount,
          assignmentId,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Pricing update failed",
      });
    }
  }
);

/**
 * RECORD PAYMENT (CLIENT)
 * Requires authentication.
 */
router.post(
  "/:id/pay",
  auth,
  async (req, res) => {
    try {
      const assignmentId = req.params.id;

      const {
        amount,
        method,
        reference,
      } = req.body;

      await pool.query(
        `INSERT INTO payments
         (assignment_id, amount, method, reference)
         VALUES ($1, $2, $3, $4)`,
        [
          assignmentId,
          amount,
          method,
          reference,
        ]
      );

      const assignmentRes = await pool.query(
        "SELECT * FROM assignments WHERE id = $1",
        [assignmentId]
      );

      const assignment = assignmentRes.rows[0];

      const newPaid =
        Number(assignment.paid_amount) +
        Number(amount);

      let payment_status = "unpaid";

      if (
        newPaid >=
        Number(assignment.total_amount)
      ) {
        payment_status = "fully_paid";
      } else if (
        newPaid >=
        Number(assignment.deposit_amount)
      ) {
        payment_status = "deposit_paid";
      }

      const updated = await pool.query(
        `UPDATE assignments
         SET paid_amount = $1,
             payment_status = $2
         WHERE id = $3
         RETURNING *`,
        [
          newPaid,
          payment_status,
          assignmentId,
        ]
      );

      res.json(updated.rows[0]);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Payment failed",
      });
    }
  }
);

/**
 * DOWNLOAD FILE
 * Owner or admin.
 * Payment must be fully completed for normal users.
 */
router.get(
  "/files/:fileId",
  auth,
  async (req, res) => {
    try {
      const fileId = req.params.fileId;

      const result = await pool.query(
        `SELECT
           af.*,
           a.user_id,
           a.payment_status
         FROM assignment_files af
         JOIN assignments a
           ON af.assignment_id = a.id
         WHERE af.id = $1`,
        [fileId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "File not found",
        });
      }

      const file = result.rows[0];

      // PAYMENT LOCK
      if (
        file.payment_status !== "fully_paid" &&
        !req.user.is_admin
      ) {
        return res.status(403).json({
          error: "Complete payment required",
        });
      }

      const filePath = path.join(
        __dirname,
        "../uploads",
        file.stored_name
      );

      res.download(
        filePath,
        file.original_name
      );
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "File download failed",
      });
    }
  }
);

/**
 * PRICE PREVIEW (PUBLIC)
 *
 * IMPORTANT:
 * This endpoint intentionally does NOT use auth.
 *
 * Visitors can calculate a price on the homepage
 * before logging in or creating an account.
 */
router.post(
  "/preview-price",
  async (req, res) => {
    try {
      const {
        pages,
        deadline_hours,
        currency = "USD",
      } = req.body;

      const numericPages = Number(pages);
      const numericDeadlineHours =
        Number(deadline_hours);

      /**
       * Validate pages.
       */
      if (
        !Number.isFinite(numericPages) ||
        numericPages <= 0
      ) {
        return res.status(400).json({
          error: "Pages must be a positive number",
        });
      }

      /**
       * Validate deadline.
       */
      if (
        !Number.isFinite(
          numericDeadlineHours
        ) ||
        numericDeadlineHours <= 0
      ) {
        return res.status(400).json({
          error: "Deadline must be in the future",
        });
      }

      /**
       * Calculate price using the existing
       * backend pricing engine.
       */
      const pricing = calculatePrice(
        numericPages,
        numericDeadlineHours
      );

      /**
       * Convert USD to requested currency.
       */
      const convertedTotal =
        await convertFromUSD(
          pricing.total,
          currency
        );

      const convertedDeposit =
        await convertFromUSD(
          pricing.deposit,
          currency
        );

      /**
       * Return complete pricing information.
       */
      res.json({
        currency,

        price_per_page_usd:
          pricing.pricePerPage,

        total_usd:
          pricing.total,

        deposit_usd:
          pricing.deposit,

        total_converted:
          Number(convertedTotal).toFixed(2),

        deposit_converted:
          Number(convertedDeposit).toFixed(2),
      });
    } catch (err) {
      console.error(
        "PRICE PREVIEW ERROR:",
        err
      );

      res.status(500).json({
        error: "Pricing calculation failed",
      });
    }
  }
);

module.exports = router;