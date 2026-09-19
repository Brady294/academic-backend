const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const {
    getAdminConversations,
    getAdminMessages,
    sendAdminMessage,
} = require("../controllers/adminMessageController");

/*
|--------------------------------------------------------------------------
| ADMIN MESSAGES
|--------------------------------------------------------------------------
|
| GET  /api/admin/messages
| GET  /api/admin/messages/:id
| POST /api/admin/messages/:id
|
| Requires:
| 1. Authentication
| 2. Admin privileges
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET ADMIN CONVERSATIONS
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    auth,
    admin,
    getAdminConversations
);

/*
|--------------------------------------------------------------------------
| GET CONVERSATION MESSAGES
|--------------------------------------------------------------------------
*/

router.get(
    "/:id",
    auth,
    admin,
    getAdminMessages
);

/*
|--------------------------------------------------------------------------
| SEND ADMIN MESSAGE
|--------------------------------------------------------------------------
*/

router.post(
    "/:id",
    auth,
    admin,
    sendAdminMessage
);

module.exports = router;