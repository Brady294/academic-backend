console.log("AUTH ROUTES LOADED");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
router.get("/ping", (req, res) => {
  res.send("AUTH ROUTES WORK");
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email",
      [name, email, hashedPassword]
    );

    res.status(201).json(user.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "User already exists or invalid data" });
  }
});
// LOGIN
router.post("/login", async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body);

    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    console.log("DB RESULT:", result.rows);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password);
    console.log("PASSWORD MATCH:", isValid);

    if (!isValid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

   
const token = jwt.sign(
  { id: user.id, email: user.email, is_admin: user.is_admin },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

    res.json({ token });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
