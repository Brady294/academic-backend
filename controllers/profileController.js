const Profile = require("../models/Profile");

exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.getProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    res.json(profile);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const profile = await Profile.updateProfile(
      req.user.id,
      req.body
    );

    res.json(profile);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    const result =
      await Profile.updateAvatar(
        req.user.id,
        avatar
      );

    res.json(result);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update avatar",
    });
  }
};