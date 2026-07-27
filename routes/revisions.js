const express = require("express");

const router = express.Router();

const auth =
  require("../middleware/authMiddleware");

const {
  getRevisions,
  createRevision,
} = require("../controllers/revisionController");

router.get("/", auth, getRevisions);

router.post(
  "/",
  auth,
  createRevision
);

module.exports = router;