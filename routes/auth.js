console.log("AUTH ROUTES LOADED");

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const router = express.Router();

/**
 * Generate 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create access and refresh tokens
 */
function createTokens(user) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
    },
    process.env.JWT_SECRET,
    { expiresIn: "20m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
}

/**
 * Health check
 */
router.get("/ping", (req, res) => {
  res.send("AUTH ROUTES WORK");
});

/**
 * REGISTER
 * Creates user, sends 6-digit verification code, but does NOT log in yet.
 */
router.post("/register", async (req, res) => {
  try {
    let { name, email, password, confirmPassword } = req.body;

    name = name?.trim();
    email = email?.trim().toLowerCase();
    password = password?.trim();
    confirmPassword = confirmPassword?.trim();

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Please fill in all required fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match",
      });
    }

    const existingUser = await pool.query(
      "SELECT id, email, is_verified FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    const user = await pool.query(
      `INSERT INTO users
        (name, email, password, is_verified, verification_code, verification_code_expires)
       VALUES
        ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, is_verified`,
      [
        name,
        email,
        hashedPassword,
        false,
        verificationCode,
        verificationCodeExpires,
      ]
    );

    await sendEmail({
      to: email,
      subject: "Verify your TopStudyTutor account",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Verify your TopStudyTutor account</h2>

          <p>Hello ${name},</p>

          <p>
            Welcome to <strong>TopStudyTutor</strong>!
          </p>

          <p>
            Use the 6-digit verification code below to activate your account:
          </p>

          <h1 style="letter-spacing: 4px;">
            ${verificationCode}
          </h1>

          <p>
            This verification code will expire in
            <strong>10 minutes</strong>.
          </p>

          <p>
            If you did not create a TopStudyTutor account,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return res.status(201).json({
      message:
        "Account created. Please check your email for the verification code.",
      email: user.rows[0].email,
      requiresVerification: true,
    });
  } catch (err) {
    console.error("REGISTER ERROR FULL:", err);
    console.error("REGISTER ERROR CODE:", err.code);
    console.error("REGISTER ERROR DETAIL:", err.detail);
    console.error("REGISTER ERROR MESSAGE:", err.message);

    if (err.code === "23505") {
      return res.status(400).json({
        error: "Email already registered",
      });
    }

    if (err.code === "23502") {
      return res.status(400).json({
        error: `Missing required database field: ${err.column}`,
      });
    }

    if (err.code === "42703") {
      return res.status(500).json({
        error: "Database column mismatch in users table",
      });
    }

    return res.status(500).json({
      error:
        err.message ||
        "Server error during registration",
    });
  }
});
/**
 * VERIFY EMAIL
 * Verifies 6-digit code, then logs the user in automatically.
 */
router.post("/verify-email", async (req, res) => {
  try {
    let { email, code } = req.body;

    email = email?.trim().toLowerCase();
    code = code?.trim();

    if (!email || !code) {
      return res.status(400).json({
        error: "Email and verification code are required",
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        error: "Verification code must be 6 numbers",
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, is_admin, is_verified, verification_code, verification_code_expires
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      const tokens = createTokens(user);

      return res.status(200).json({
        message: "Account is already verified",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_admin: user.is_admin,
          is_verified: user.is_verified,
        },
        ...tokens,
      });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({
        error: "Invalid verification code",
      });
    }

    if (
      !user.verification_code_expires ||
      new Date() > new Date(user.verification_code_expires)
    ) {
      return res.status(400).json({
        error:
          "Verification code has expired. Please request a new code.",
      });
    }

    const verifiedResult = await pool.query(
      `UPDATE users
       SET is_verified = true,
           verification_code = NULL,
           verification_code_expires = NULL
       WHERE LOWER(email) = LOWER($1)
       RETURNING id, name, email, is_admin, is_verified`,
      [email]
    );

    const verifiedUser = verifiedResult.rows[0];
    const tokens = createTokens(verifiedUser);

    return res.status(200).json({
      message: "Email verified successfully",
      user: verifiedUser,
      ...tokens,
    });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);

    return res.status(500).json({
      error: "Server error during email verification",
    });
  }
});

/**
 * RESEND VERIFICATION CODE
 */
router.post("/resend-code", async (req, res) => {
  try {
    let { email } = req.body;

    email = email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const result = await pool.query(
      "SELECT id, name, email, is_verified FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        error: "This account is already verified",
      });
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await pool.query(
      `UPDATE users
       SET verification_code = $1,
           verification_code_expires = $2
       WHERE LOWER(email) = LOWER($3)`,
      [verificationCode, verificationCodeExpires, email]
    );

    await sendEmail({
      to: email,
      subject: "Your new TopStudyTutor verification code",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Your new verification code</h2>

          <p>Hello ${user.name},</p>

          <p>
            You requested a new verification code for your
            <strong>TopStudyTutor</strong> account.
          </p>

          <p>
            Use the 6-digit verification code below to activate your account:
          </p>

          <h1 style="letter-spacing: 4px;">
            ${verificationCode}
          </h1>

          <p>
            This verification code will expire in
            <strong>10 minutes</strong>.
          </p>

          <p>
            If you did not request this code,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      message:
        "A new verification code has been sent to your email.",
    });
  } catch (err) {
    console.error("RESEND CODE ERROR:", err);

    return res.status(500).json({
      error:
        "Server error while resending verification code",
    });
  }
});
/**
 * LOGIN
 * Blocks login until email is verified.
 */
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email?.trim().toLowerCase();
    password = password?.trim();

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isValid) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        error:
          "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const tokens = createTokens(user);

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
        is_verified: user.is_verified,
      },
      ...tokens,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      error: "Server error during login",
    });
  }
});

/**
 * REFRESH ACCESS TOKEN
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token required",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const result = await pool.query(
      "SELECT id, email, is_admin, is_verified FROM users WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid refresh token",
      });
    }

    const user = result.rows[0];

    if (!user.is_verified) {
      return res.status(403).json({
        error:
          "Please verify your email before continuing.",
      });
    }

    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "20m",
      }
    );

    return res.json({
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error("REFRESH ERROR:", err);

    return res.status(401).json({
      error:
        "Invalid or expired refresh token",
    });
  }
});

/**
 * FORGOT PASSWORD
 * Sends password reset link
 */
router.post("/forgot-password", async (req, res) => {
  try {
    let { email } = req.body;

    email = email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const result = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    // Don't reveal whether the email exists
    if (result.rows.length === 0) {
      return res.status(200).json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const user = result.rows[0];

    // Generate secure random token
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Token expires in 30 minutes
    const resetTokenExpires = new Date(
      Date.now() + 30 * 60 * 1000
    );

    await pool.query(
      `UPDATE users
       SET reset_token = $1,
           reset_token_expires = $2
       WHERE id = $3`,
      [
        resetToken,
        resetTokenExpires,
        user.id,
      ]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject:
        "Reset your TopStudyTutor password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>TopStudyTutor Password Reset</h2>

          <p>Hello ${user.name},</p>

          <p>
            We received a request to reset the password for your
            <strong>TopStudyTutor</strong> account.
          </p>

          <p>
            Click the button below to create a new password.
          </p>

          <p style="margin:30px 0;">
            <a
              href="${resetLink}"
              style="
                background:#2563eb;
                color:#ffffff;
                text-decoration:none;
                padding:12px 24px;
                border-radius:6px;
                display:inline-block;
                font-weight:bold;
              "
            >
              Reset Password
            </a>
          </p>

          <p>
            This password reset link will expire in
            <strong>30 minutes</strong>.
          </p>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
            Your password will remain unchanged.
          </p>

          <hr style="margin:30px 0;">

          <p style="font-size:13px;color:#666;">
            © ${new Date().getFullYear()} TopStudyTutor.
            All rights reserved.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      err
    );

    return res.status(500).json({
      error:
        "Server error while processing password reset.",
    });
  }
});
/**
 * RESET PASSWORD
 */
router.post("/reset-password", async (req, res) => {
  try {
    let { token, password, confirmPassword } = req.body;

    token = token?.trim();
    password = password?.trim();
    confirmPassword = confirmPassword?.trim();

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match",
      });
    }

    const result = await pool.query(
      `SELECT id, reset_token, reset_token_expires
       FROM users
       WHERE reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid password reset token",
      });
    }

    const user = result.rows[0];

    if (
      !user.reset_token_expires ||
      new Date() > new Date(user.reset_token_expires)
    ) {
      return res.status(400).json({
        error: "Password reset link has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users
       SET password = $1,
           reset_token = NULL,
           reset_token_expires = NULL
       WHERE id = $2`,
      [
        hashedPassword,
        user.id,
      ]
    );

    return res.status(200).json({
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);

    return res.status(500).json({
      error: "Server error while resetting password",
    });
  }
});

module.exports = router;