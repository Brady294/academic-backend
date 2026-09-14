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
 * =========================================================
 * TECHNICAL / PROGRAMMING DETECTION
 * =========================================================
 *
 * Technical work is NOT automatically priced.
 *
 * The admin must review the technical requirements,
 * materials and complexity before providing the final price.
 */

const TECHNICAL_KEYWORDS = [
  "programming",
  "software",
  "coding",
  "computer science",
  "information technology",
  "software engineering",
  "data science",
  "artificial intelligence",
  "cybersecurity",
  "web development",
  "app development",
  "mobile development",
  "database",
  "sql",
  "python",
  "java",
  "javascript",
  "typescript",
  "c++",
  "c#",
  "matlab",
  "engineering",
  "program code",
  "source code",
  "debugging",
  "algorithm",
  "algorithms",
  "machine learning",
  "deep learning",
  "api development",
  "api integration",
  "backend development",
  "frontend development",
  "full stack",
  "full-stack",
];

/**
 * Determines whether an order is technical/programming work.
 */
function isTechnicalOrder({
  subject = "",
  service_type = "",
  title = "",
  instructions = "",
}) {
  const combinedText = [
    subject,
    service_type,
    title,
    instructions,
  ]
    .join(" ")
    .toLowerCase();

  return TECHNICAL_KEYWORDS.some((keyword) =>
    combinedText.includes(keyword.toLowerCase())
  );
}

/**
 * =========================================================
 * SUBMIT ASSIGNMENT (CLIENT)
 * =========================================================
 *
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

    if (!title || !subject || !instructions || !deadline) {
      return res.status(400).json({
        error:
          "Title, subject, instructions and deadline are required.",
      });
    }

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

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(
      "ASSIGNMENT SUBMISSION ERROR:",
      err
    );

    return res.status(500).json({
      error: "Assignment submission failed",
    });
  }
});

/**
 * =========================================================
 * UPLOAD FILE TO ASSIGNMENT (CLIENT)
 * =========================================================
 *
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

      /**
       * Make sure the assignment exists.
       */
      const assignmentResult = await pool.query(
        `SELECT *
         FROM assignments
         WHERE id = $1`,
        [assignmentId]
      );

      if (assignmentResult.rows.length === 0) {
        return res.status(404).json({
          error: "Assignment not found",
        });
      }

      const assignment =
        assignmentResult.rows[0];

      /**
       * Only the assignment owner or an admin
       * can upload files.
       */
      if (
        Number(assignment.user_id) !==
          Number(req.user.id) &&
        !req.user.is_admin
      ) {
        return res.status(403).json({
          error: "You are not allowed to upload files to this assignment",
        });
      }

      const result = await pool.query(
        `INSERT INTO assignment_files
         (
           assignment_id,
           original_name,
           stored_name,
           file_type,
           file_size
         )
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

      return res.status(201).json(
        result.rows[0]
      );
    } catch (err) {
      console.error(
        "FILE UPLOAD ERROR:",
        err
      );

      return res.status(500).json({
        error: "File upload failed",
      });
    }
  }
);

/**
 * =========================================================
 * UPDATE ASSIGNMENT STATUS (ADMIN)
 * =========================================================
 *
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
        [
          status,
          assignmentId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Assignment not found",
        });
      }

      return res.json(
        result.rows[0]
      );
    } catch (err) {
      console.error(
        "STATUS UPDATE ERROR:",
        err
      );

      return res.status(500).json({
        error: "Status update failed",
      });
    }
  }
);

/**
 * =========================================================
 * SET ASSIGNMENT PRICING (ADMIN)
 * =========================================================
 *
 * Requires authentication + admin privileges.
 *
 * This is where an admin can enter the final price,
 * especially for technical/programming work.
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

      const assignmentId =
        req.params.id;

      const total = Number(
        total_amount
      );

      const deposit = Number(
        deposit_amount
      );

      if (
        !Number.isFinite(total) ||
        total < 0
      ) {
        return res.status(400).json({
          error:
            "Total amount must be a valid non-negative number.",
        });
      }

      if (
        !Number.isFinite(deposit) ||
        deposit < 0
      ) {
        return res.status(400).json({
          error:
            "Deposit amount must be a valid non-negative number.",
        });
      }

      if (deposit > total) {
        return res.status(400).json({
          error:
            "Deposit cannot be greater than the total amount.",
        });
      }

      const result = await pool.query(
        `UPDATE assignments
         SET
           total_amount = $1,
           deposit_amount = $2
         WHERE id = $3
         RETURNING *`,
        [
          total,
          deposit,
          assignmentId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Assignment not found",
        });
      }

      return res.json(
        result.rows[0]
      );
    } catch (err) {
      console.error(
        "PRICING UPDATE ERROR:",
        err
      );

      return res.status(500).json({
        error: "Pricing update failed",
      });
    }
  }
);

/**
 * =========================================================
 * RECORD PAYMENT (CLIENT)
 * =========================================================
 *
 * Requires authentication.
 */
router.post(
  "/:id/pay",
  auth,
  async (req, res) => {
    try {
      const assignmentId =
        req.params.id;

      const {
        amount,
        method,
        reference,
      } = req.body;

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          error:
            "Payment amount must be a positive number.",
        });
      }

      /**
       * Get assignment.
       */
      const assignmentRes =
        await pool.query(
          `SELECT *
           FROM assignments
           WHERE id = $1`,
          [assignmentId]
        );

      if (
        assignmentRes.rows.length ===
        0
      ) {
        return res.status(404).json({
          error: "Assignment not found",
        });
      }

      const assignment =
        assignmentRes.rows[0];

      /**
       * Only the assignment owner or admin
       * can make/record a payment.
       */
      if (
        Number(assignment.user_id) !==
          Number(req.user.id) &&
        !req.user.is_admin
      ) {
        return res.status(403).json({
          error:
            "You are not allowed to make a payment for this assignment",
        });
      }

      /**
       * Record payment.
       */
      await pool.query(
        `INSERT INTO payments
         (
           assignment_id,
           amount,
           method,
           reference
         )
         VALUES ($1, $2, $3, $4)`,
        [
          assignmentId,
          numericAmount,
          method,
          reference,
        ]
      );

      const newPaid =
        Number(
          assignment.paid_amount || 0
        ) + numericAmount;

      let payment_status =
        "unpaid";

      if (
        newPaid >=
        Number(
          assignment.total_amount || 0
        )
      ) {
        payment_status =
          "fully_paid";
      } else if (
        newPaid >=
        Number(
          assignment.deposit_amount || 0
        )
      ) {
        payment_status =
          "deposit_paid";
      }

      const updated =
        await pool.query(
          `UPDATE assignments
           SET
             paid_amount = $1,
             payment_status = $2
           WHERE id = $3
           RETURNING *`,
          [
            newPaid,
            payment_status,
            assignmentId,
          ]
        );

      return res.json(
        updated.rows[0]
      );
    } catch (err) {
      console.error(
        "PAYMENT ERROR:",
        err
      );

      return res.status(500).json({
        error: "Payment failed",
      });
    }
  }
);

/**
 * =========================================================
 * DOWNLOAD FILE
 * =========================================================
 *
 * Owner or admin.
 *
 * Normal users must have fully paid before
 * downloading completed work.
 */
router.get(
  "/files/:fileId",
  auth,
  async (req, res) => {
    try {
      const fileId =
        req.params.fileId;

      const result =
        await pool.query(
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

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          error: "File not found",
        });
      }

      const file =
        result.rows[0];

      /**
       * Make sure the user owns the assignment
       * unless they are an admin.
       */
      if (
        Number(file.user_id) !==
          Number(req.user.id) &&
        !req.user.is_admin
      ) {
        return res.status(403).json({
          error:
            "You are not allowed to access this file",
        });
      }

      /**
       * PAYMENT LOCK
       */
      if (
        file.payment_status !==
          "fully_paid" &&
        !req.user.is_admin
      ) {
        return res.status(403).json({
          error:
            "Complete payment required",
        });
      }

      const filePath =
        path.join(
          __dirname,
          "../uploads",
          file.stored_name
        );

      return res.download(
        filePath,
        file.original_name
      );
    } catch (err) {
      console.error(
        "FILE DOWNLOAD ERROR:",
        err
      );

      return res.status(500).json({
        error:
          "File download failed",
      });
    }
  }
);

/**
 * =========================================================
 * PRICE PREVIEW (PUBLIC)
 * =========================================================
 *
 * IMPORTANT:
 *
 * This endpoint does NOT require authentication.
 *
 * The frontend sends the order information.
 *
 * The BACKEND determines the price.
 *
 * Normal academic work:
 *
 * High School = $10/page
 * University  = $12/page
 * Masters     = $18/page
 *
 * Deadline multiplier:
 *
 * < 12 hours = 2.0
 * <= 24 hours = 1.5
 * <= 72 hours = 1.2
 * > 72 hours = 1.0
 *
 * Deposit:
 *
 * 60% of total
 *
 * Technical/programming work:
 *
 * NO automatic price.
 * Admin review required.
 */
router.post(
  "/preview-price",
  async (req, res) => {
    try {
      const {
        pages,
        academic_level,
        subject,
        service_type,
        title,
        instructions,
        deadline_hours,
        currency = "USD",
      } = req.body;

      /**
       * Convert numeric values.
       */
      const numericPages =
        Number(pages);

      const numericDeadlineHours =
        Number(deadline_hours);

      /**
       * Normalize currency.
       */
      const requestedCurrency =
        String(currency || "USD")
          .trim()
          .toUpperCase();

      /**
       * =====================================================
       * VALIDATE PAGES
       * =====================================================
       */
      if (
        !Number.isFinite(
          numericPages
        ) ||
        numericPages <= 0
      ) {
        return res.status(400).json({
          error:
            "Pages must be a positive number",
        });
      }

      /**
       * =====================================================
       * VALIDATE ACADEMIC LEVEL
       * =====================================================
       */
      if (
        !academic_level ||
        typeof academic_level !==
          "string"
      ) {
        return res.status(400).json({
          error:
            "Academic level is required",
        });
      }

      /**
       * =====================================================
       * VALIDATE DEADLINE
       * =====================================================
       */
      if (
        !Number.isFinite(
          numericDeadlineHours
        ) ||
        numericDeadlineHours <= 0
      ) {
        return res.status(400).json({
          error:
            "Deadline must be in the future",
        });
      }

      /**
       * =====================================================
       * DETECT TECHNICAL ORDER
       * =====================================================
       */
      const technical =
        isTechnicalOrder({
          subject,
          service_type,
          title,
          instructions,
        });

      /**
       * =====================================================
       * TECHNICAL ORDER
       * =====================================================
       *
       * Do NOT calculate a price.
       */
      if (technical) {
        return res.json({
          technical: true,

          requires_admin_review:
            true,

          currency:
            requestedCurrency,

          base_price_per_page_usd:
            null,

          deadline_multiplier:
            null,

          price_per_page_usd:
            null,

          total_usd:
            null,

          deposit_usd:
            null,

          balance_usd:
            null,

          total_converted:
            null,

          deposit_converted:
            null,

          message:
            "Technical/programming work requires admin review. Please provide all necessary materials, source files, requirements, specifications and instructions. The final price will be provided by the admin.",
        });
      }

      /**
       * =====================================================
       * NORMAL ACADEMIC ORDER
       * =====================================================
       *
       * The backend pricing engine receives:
       *
       * pages
       * academic_level
       * deadline_hours
       */
      const pricing =
        calculatePrice(
          numericPages,
          academic_level,
          numericDeadlineHours
        );

      /**
       * =====================================================
       * CURRENCY CONVERSION
       * =====================================================
       */
      const convertedTotal =
        await convertFromUSD(
          pricing.total,
          requestedCurrency
        );

      const convertedDeposit =
        await convertFromUSD(
          pricing.deposit,
          requestedCurrency
        );

      /**
       * =====================================================
       * RETURN PRICE
       * =====================================================
       */
      return res.json({
        technical: false,

        requires_admin_review:
          false,

        currency:
          requestedCurrency,

        /**
         * Example:
         *
         * High School = 10
         * University  = 12
         * Masters     = 18
         */
        base_price_per_page_usd:
          pricing.basePricePerPage,

        /**
         * Deadline multiplier.
         */
        deadline_multiplier:
          pricing.deadlineMultiplier,

        /**
         * Base price × deadline multiplier.
         */
        price_per_page_usd:
          pricing.pricePerPage,

        /**
         * Pages × price per page.
         */
        total_usd:
          pricing.total,

        /**
         * 60% of total.
         */
        deposit_usd:
          pricing.deposit,

        /**
         * Remaining 40%.
         */
        balance_usd:
          pricing.balance,

        /**
         * Converted total.
         */
        total_converted:
          Number(
            convertedTotal
          ).toFixed(2),

        /**
         * Converted 60% deposit.
         */
        deposit_converted:
          Number(
            convertedDeposit
          ).toFixed(2),

        message:
          "Estimated price calculated successfully.",
      });
    } catch (err) {
      console.error(
        "PRICE PREVIEW ERROR:",
        err
      );

      return res.status(500).json({
        error:
          "Pricing calculation failed",

        message:
          err?.message ||
          "An unexpected pricing error occurred.",
      });
    }
  }
);

/**
 * =========================================================
 * EXPORT ROUTER
 * =========================================================
 */

module.exports = router;