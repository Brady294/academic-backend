const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const data = await Notification.getAll(req.user.id);

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to fetch notifications.",
    });
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.markAsRead(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to update notification.",
    });
  }
};

exports.markAll = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to update notifications.",
    });
  }
};

exports.remove = async (req, res) => {
  try {
    await Notification.deleteNotification(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to delete notification.",
    });
  }
};