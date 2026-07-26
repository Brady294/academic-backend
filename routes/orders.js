const express = require("express");
const router = express.Router();

const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

/*
|--------------------------------------------------------------------------
| Create Order
|--------------------------------------------------------------------------
*/

router.post("/", authenticateToken, async (req, res) => {
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
      budget,
    } = req.body;

    if (
      !title ||
      !subject ||
      !service_type ||
      !academic_level ||
      !pages ||
      !spacing ||
      !deadline
    ) {
      return res.status(400).json({
        message: "Please fill all required fields.",
      });
    }

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
        budget
      )

      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )

      RETURNING *
      `,
      [
        req.user.id,
        title,
        subject,
        service_type,
        academic_level,
        pages,
        spacing,
        citation_style,
        deadline,
        instructions,
        budget || 0,
      ]
    );

    res.status(201).json({
      message: "Order created successfully.",
      order: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to create order.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Get My Orders
|--------------------------------------------------------------------------
*/

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM orders
      WHERE user_id=$1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch orders.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Get Single Order
|--------------------------------------------------------------------------
*/

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM orders
      WHERE id=$1
      AND user_id=$2
      `,
      [
        req.params.id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch order.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Update Order
|--------------------------------------------------------------------------
*/

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const {
      title,
      subject,
      pages,
      instructions,
      deadline,
    } = req.body;

    const result = await db.query(
      `
      UPDATE orders
      SET

      title=$1,
      subject=$2,
      pages=$3,
      instructions=$4,
      deadline=$5,
      updated_at=NOW()

      WHERE
      id=$6
      AND user_id=$7

      RETURNING *
      `,
      [
        title,
        subject,
        pages,
        instructions,
        deadline,
        req.params.id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    res.json({
      message: "Order updated.",
      order: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update order.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Delete Order
|--------------------------------------------------------------------------
*/

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `
      DELETE FROM orders
      WHERE
      id=$1
      AND user_id=$2
      RETURNING *
      `,
      [
        req.params.id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    res.json({
      message: "Order deleted successfully.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to delete order.",
    });
  }
});

module.exports = router;