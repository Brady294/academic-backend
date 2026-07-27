const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getProfile,
  updateProfile,
  updateAvatar,
} = require("../controllers/profileController");

router.get(
  "/me",
  authMiddleware,
  getProfile
);

router.put(
  "/me",
  authMiddleware,
  updateProfile
);

router.put(
  "/avatar",
  authMiddleware,
  updateAvatar
);

module.exports = router;