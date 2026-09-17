const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const db = require("../db");

const {
  calculatePrice,
} = require("../utils/pricing");

/*
|--------------------------------------------------------------------------
| Technical / Programming Subjects
|--------------------------------------------------------------------------
*/

const TECHNICAL_SUBJECTS = [
  "Computer Science",
  "Computer Engineering",
  "Software Engineering",
  "Information Technology",
  "Information Systems",
  "Data Science",
  "Web Development",
  "Electrical Engineering",
  "Electronic Engineering",
];

/*
|--------------------------------------------------------------------------
| Technical / Programming Services
|--------------------------------------------------------------------------
*/

const TECHNICAL_SERVICES = [
  "Programming",
  "Software Development",
  "Web Development",
  "Data Analysis",
  "Technical Project",
  "Engineering Project",
];

/*
|--------------------------------------------------------------------------
| Determine whether an order requires an admin quotation
|--------------------------------------------------------------------------
*/

function isTechnicalOrder(subject, serviceType) {
  const normalizedSubject = String(subject || "")
    .trim()
    .toLowerCase();

  const normalizedService = String(serviceType || "")
    .trim()
    .toLowerCase();

  const technicalSubject = TECHNICAL_SUBJECTS.some(
    (item) =>
      item.toLowerCase() === normalizedSubject
  );

  const technicalService = TECHNICAL_SERVICES.some(
    (item) =>
      item.toLowerCase() === normalizedService
  );

  return technicalSubject || technicalService;
}

/*
|--------------------------------------------------------------------------
| Calculate hours remaining until deadline
|--------------------------------------------------------------------------
*/

function getDeadlineHours(deadline) {
  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    throw new Error("Invalid deadline.");
  }

  const now = new Date();

  const hoursRemaining =
    (deadlineDate.getTime() - now.getTime()) /
    (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    throw new Error(
      "Deadline must be in the future."
    );
  }

  return hoursRemaining;
}

/*
|--------------------------------------------------------------------------
| Validate timezone
|--------------------------------------------------------------------------
|
| Examples:
|
| Africa/Nairobi
| America/New_York
| Europe/London
| Asia/Tokyo
|
*/

function isValidTimezone(timezone) {
  if (!timezone) {
    return false;
  }

  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });

    return true;
  } catch {
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Create Order
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        title,
        subject,
        service_type,
        academic_level,
        pages,
        spacing,
        citation_style,
        deadline,
        instructions,

        /*
         * NEW:
         * Timezone selected/detected by the client.
         *
         * Example:
         * Africa/Nairobi
         */
        client_timezone,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | Validate required fields
      |--------------------------------------------------------------------------
      */

      if (
        !title ||
        !subject ||
        !service_type ||
        !academic_level ||
        !pages ||
        !deadline
      ) {
        return res.status(400).json({
          message:
            "Please fill all required fields.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Determine client timezone
      |--------------------------------------------------------------------------
      |
      | The frontend should send the browser timezone.
      |
      | If it does not send one, we use UTC as a safe
      | backend fallback.
      |
      */

      const timezone =
        client_timezone &&
        isValidTimezone(client_timezone)
          ? client_timezone
          : "UTC";

      /*
      |--------------------------------------------------------------------------
      | Validate pages
      |--------------------------------------------------------------------------
      */

      const pageCount = Number(pages);

      if (
        !Number.isFinite(pageCount) ||
        pageCount < 1
      ) {
        return res.status(400).json({
          message:
            "Number of pages must be at least 1.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Check deadline
      |--------------------------------------------------------------------------
      */

      let deadlineHours;

      try {
        deadlineHours =
          getDeadlineHours(deadline);
      } catch (error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Determine technical order
      |--------------------------------------------------------------------------
      */

      const technicalOrder =
        isTechnicalOrder(
          subject,
          service_type
        );

      /*
      |--------------------------------------------------------------------------
      | Pricing variables
      |--------------------------------------------------------------------------
      */

      let budget = null;
      let depositAmount = null;
      let balanceAmount = null;
      let pricingStatus = "calculated";

      /*
      |--------------------------------------------------------------------------
      | Technical / Programming Order
      |--------------------------------------------------------------------------
      */

      if (technicalOrder) {
        pricingStatus =
          "pending_review";

        budget = null;
        depositAmount = null;
        balanceAmount = null;
      }

      /*
      |--------------------------------------------------------------------------
      | Normal Academic Order
      |--------------------------------------------------------------------------
      */

      else {
        try {
          const pricing =
            calculatePrice(
              pageCount,
              academic_level,
              deadlineHours
            );

          budget = pricing.total;
          depositAmount = pricing.deposit;
          balanceAmount = pricing.balance;
        } catch (error) {
          return res.status(400).json({
            message: error.message,
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Create order
      |--------------------------------------------------------------------------
      */

      const result = await db.query(
        `
        INSERT INTO orders
        (
          user_id,
          title,
          subject,
          service_type,
          academic_level,
          pages,
          spacing,
          citation_style,
          deadline,
          instructions,
          budget,
          pricing_status,
          client_timezone
        )

        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13
        )

        RETURNING *
        `,
        [
          req.user.id,
          title,
          subject,
          service_type,
          academic_level,
          pageCount,
          spacing || "Double",
          citation_style || null,
          deadline,
          instructions || "",
          budget,
          pricingStatus,

          /*
           * NEW:
           * Save the client's timezone.
           */
          timezone,
        ]
      );

      const order =
        result.rows[0];

      /*
      |--------------------------------------------------------------------------
      | Response for technical orders
      |--------------------------------------------------------------------------
      */

      if (technicalOrder) {
        return res.status(201).json({
          message:
            "Order submitted successfully. Our team will review your technical requirements and provide the final price.",

          pricingStatus:
            "pending_review",

          requiresAdminQuote: true,

          order,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Response for normal academic orders
      |--------------------------------------------------------------------------
      */

      return res.status(201).json({
        message:
          "Order created successfully.",

        pricingStatus:
          "calculated",

        requiresAdminQuote: false,

        pricing: {
          total: budget,
          deposit: depositAmount,
          balance: balanceAmount,
        },

        order,
      });
    } catch (err) {
      console.error(
        "Create Order Error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to create order.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get My Orders
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await db.query(
        `
        SELECT *
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      res.json(result.rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message:
          "Failed to fetch orders.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get Single Order
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await db.query(
        `
        SELECT *
        FROM orders
        WHERE id = $1
        AND user_id = $2
        `,
        [
          req.params.id,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Order not found.",
        });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message:
          "Failed to fetch order.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Update Order
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        title,
        subject,
        pages,
        instructions,
        deadline,

        /*
         * NEW:
         */
        client_timezone,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | Validate timezone if supplied
      |--------------------------------------------------------------------------
      */

      let timezone = client_timezone;

      if (timezone && !isValidTimezone(timezone)) {
        return res.status(400).json({
          message:
            "Invalid client timezone.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Update order
      |--------------------------------------------------------------------------
      */

      const result = await db.query(
        `
        UPDATE orders
        SET
          title = $1,
          subject = $2,
          pages = $3,
          instructions = $4,
          deadline = $5,
          client_timezone = COALESCE($6, client_timezone),
          updated_at = NOW()

        WHERE id = $7
        AND user_id = $8

        RETURNING *
        `,
        [
          title,
          subject,
          pages,
          instructions,
          deadline,
          timezone,
          req.params.id,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Order not found.",
        });
      }

      res.json({
        message:
          "Order updated.",

        order:
          result.rows[0],
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message:
          "Failed to update order.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Delete Order
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await db.query(
        `
        DELETE FROM orders
        WHERE id = $1
        AND user_id = $2
        RETURNING *
        `,
        [
          req.params.id,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Order not found.",
        });
      }

      res.json({
        message:
          "Order deleted successfully.",
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message:
          "Failed to delete order.",
      });
    }
  }
);

module.exports = router;