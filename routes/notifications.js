const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getNotifications,
  markRead,
  markAll,
  remove,
} = require("../controllers/notificationController");

router.get("/", auth, getNotifications);

router.put("/read-all", auth, markAll);

router.put("/:id", auth, markRead);

router.delete("/:id", auth, remove);

module.exports = router;