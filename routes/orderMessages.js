const express = require("express");

const router = express.Router();

const {
    getOrderMessages,
    sendMessage,
    markMessageAsRead,
} = require("../controllers/orderMessageController");

const authMiddleware = require("../middleware/authMiddleware");

/*
|--------------------------------------------------------------------------
| Order Chat Routes
|--------------------------------------------------------------------------
|
| GET    /api/order-messages/orders/:orderId/messages
| POST   /api/order-messages/orders/:orderId/messages
| PUT    /api/order-messages/messages/:messageId/read
|
*/

router.get(
    "/orders/:orderId/messages",
    authMiddleware,
    getOrderMessages
);

router.post(
    "/orders/:orderId/messages",
    authMiddleware,
    sendMessage
);

router.put(
    "/messages/:messageId/read",
    authMiddleware,
    markMessageAsRead
);

module.exports = router;