const express = require("express");

const router = express.Router();

const auth =
  require("../middleware/authMiddleware");

const {
  getDownloads,
  downloadFile,
} = require("../controllers/downloadController");

router.get("/", auth, getDownloads);

router.get("/:id", auth, downloadFile);

module.exports = router;